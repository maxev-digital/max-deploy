import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { buildCoverLetterHtml } from '@/lib/cover-letter';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROFILE = `
Name: Will Austin
Skills: Next.js, TypeScript, Python, PostgreSQL, Prisma, Claude/Anthropic API, MCP protocol,
        multi-model routing, agentic system design, REST API design, Docker, VPS deployment,
        Twilio, ElevenLabs, Stripe Connect, IMAP email clients, BullMQ/Redis
Experience: Solo full-stack builder, 6 FDE engagements across 8 industries,
            14 production AI endpoints, 13 production platforms
Background: Former GM/GC (P&L ownership), self-taught, no CS degree
Preferred roles: FDE, Applied AI Engineer, AI Platform Engineer, Solutions Engineer
Contact: 214-232-0222 · gte.apw@gmail.com · Little Elm TX · github.com/maxev-digital · maxevdigital.com
`.trim();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const opp = await prisma.opportunity.findUnique({ where: { id } });
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!opp.jdText) return NextResponse.json({ error: 'No JD text — cannot draft cover letter' }, { status: 400 });

  const isFde = ['FDE', 'Forward Deployed', 'Applied AI', 'Solutions Engineer', 'AI Platform']
    .some(kw => opp.role.toLowerCase().includes(kw.toLowerCase()) || (opp.classification ?? '').includes('FDE'));

  const FDE_FRAMEWORK = `
IMPORTANT FOR FDE ROLES: Will has a proven 7-step FDE deployment framework. For FDE/Forward Deployed/Solutions Engineer roles, you MUST incorporate this into the intro paragraph and/or one of the bullets — it should feel natural, not listed, but the methodology must be evident:
  1. Discovery & Business Alignment (15-30 min structured session, problem statement + success criteria)
  2. Rapid Scoping & Success Definition (smallest valuable v1, "ship rough this week over perfect next month")
  3. Architecture & Context Setup (CLAUDE.md-style context files, multi-model routing strategy, prevents AI slop)
  4. Agentic Build Phase (Claude Code CLI as primary environment, MCP, Zod, HITL checkpoints, end-to-end ownership)
  5. Stakeholder Validation (working software in front of users same-day or next-day)
  6. Production Deployment & Observability (deploy early to production — real data > staging)
  7. Continuous Iteration (daily/weekly driven by actual usage and business outcomes)
Core principles: Bias for shipping · AI as primary teammate (not autocomplete) · Direct communication · Business ownership · End-to-end accountability
Reference this methodology naturally in the context of the specific company's needs.`;

  const prompt = `You are writing a targeted cover letter for Will Austin applying to a specific job.${isFde ? '\n' + FDE_FRAMEWORK : ''}

CANDIDATE PROFILE:
${PROFILE}

JOB:
Company: ${opp.company}
Role: ${opp.role}
${opp.salaryMin ? `Salary: $${opp.salaryMin.toLocaleString()}${opp.salaryMax ? `–$${opp.salaryMax.toLocaleString()}` : '+'}` : ''}
Job Description:
${opp.jdText.slice(0, 4000)}

Generate cover letter content. Be specific to THIS job and THIS company — reference exact skills, tools, or priorities from the JD.
Use <strong>bold</strong> tags for emphasis inside bullets. Keep bullets dense and specific, not generic.

Return ONLY valid JSON, no other text:
{
  "headerTitle": "<Role Title> · <Company>",
  "subjectText": "<Role> — <Company> · <salary if known or 'Salary undisclosed'>",
  "intro": "<2-3 sentence opening paragraph — explain why Will fits this specific company. Reference something specific from the JD. HTML allowed, use <strong> for emphasis.>",
  "bullets": [
    "<bullet 1 — lead with bold label like <strong>Production AI systems, already shipped</strong> — then 2-4 specific sentences tying Will's actual work to the JD requirements>",
    "<bullet 2 — different angle, same specificity>",
    "<bullet 3 — different angle, same specificity>",
    "<bullet 4 — optional 4th bullet only if needed to cover a critical JD requirement not hit in 1-3>"
  ],
  "closingLine": "<1 sentence close — availability, location, urgency. E.g. 'Available immediately, remote-first, open to Dallas on-site.'>"
}`;

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      messages:   [{ role: 'user', content: prompt }],
    });

    const raw  = (msg.content[0] as { type: string; text: string }).text.trim();
    const cfg  = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''));

    const html = buildCoverLetterHtml({
      company:          opp.company,
      role:             opp.role,
      headerTitle:      cfg.headerTitle,
      subjectText:      cfg.subjectText,
      intro:            cfg.intro,
      bullets:          cfg.bullets,
      closingLine:      cfg.closingLine,
      showFdeFramework: isFde,
    });

    // Save HTML to opportunity record
    await prisma.opportunity.update({
      where: { id },
      data:  { coverLetterUrl: `/cover-letter/${id}`, notes: (opp.notes ?? '') },
    });

    // Store the HTML in a separate field via analysisJson extension (reuse analysisJson.coverLetterHtml)
    const existing = (opp.analysisJson as Record<string, unknown>) ?? {};
    await prisma.opportunity.update({
      where: { id },
      data:  { analysisJson: { ...existing, coverLetterHtml: html, coverLetterConfig: cfg } },
    });

    return NextResponse.json({ html, config: cfg });
  } catch (e) {
    console.error('[cover-letter] Error:', (e as Error).message);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const opp = await prisma.opportunity.findUnique({ where: { id } });
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const analysis = (opp.analysisJson as Record<string, unknown>) ?? {};
  const html = analysis.coverLetterHtml as string | undefined;
  if (!html) return NextResponse.json({ error: 'No cover letter drafted yet' }, { status: 404 });

  return NextResponse.json({ html, config: analysis.coverLetterConfig ?? null });
}
