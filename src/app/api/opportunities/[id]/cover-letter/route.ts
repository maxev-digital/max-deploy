import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { buildCoverLetterHtml } from '@/lib/cover-letter';
import { generateCoverLetterPdf } from '@/lib/generate-pdf';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROFILE = `
Name: Will Austin
Skills: Next.js, TypeScript, Python, PostgreSQL, Prisma, Claude/Anthropic API, MCP protocol,
        multi-model routing, agentic system design, REST API design, Docker, VPS deployment,
        Twilio, ElevenLabs, Stripe Connect, IMAP email clients, BullMQ/Redis
Experience: 6 FDE client engagements across 8 industries, 14 production AI endpoints,
            13 production platforms — all in active production against real operational data
Background: 12 years in general management and P&L ownership at multi-location operations,
            followed by systems leadership in commercial construction managing seven-figure projects,
            competitive proposals, and complex multi-stakeholder delivery. This deep business and
            operational context is embedded in every system built — scoped with real constraints,
            communicated to non-technical stakeholders, shipped against defined success criteria.
            This dual business + technical profile is Will's core differentiator: he operates
            comfortably with C-suite executives AND goes deep on architecture and implementation.
Engineering Approach: Treats Claude as primary engineering teammate, not a coding assistant.
            Provides clear business vision, detailed requirements, success criteria, and problem context.
            Follows a structured 7-step delivery framework on every project: discovery and business
            alignment, rapid scoping, architecture and context setup, agentic build, stakeholder
            validation, production deployment with observability, and continuous iteration.
            Works in plan mode — Claude proposes architecture, selects tools, generates implementation.
            Reviews every output, validates architectural decisions, enforces quality and production
            standards, makes final implementation calls, and takes complete ownership of results.
            This is how 13 production platforms and 14 live AI endpoints were built and maintained —
            delivering at the velocity of a full engineering team with complete technical accountability.
Preferred roles: FDE, Applied AI Engineer, AI Platform Engineer, Solutions Architect, Solutions Engineer,
                 Technical Lead, Technical Specialist, Customer Engineer, Implementation Lead
Contact: 214-232-0222 · info@max-ev-holdings.com · Little Elm TX · github.com/maxev-digital · maxevdigital.com
`.trim();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const opp = await prisma.opportunity.findUnique({ where: { id } });
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // If no jdText, try to scrape applyUrl
  let jdText = opp.jdText;
  if (!jdText && opp.applyUrl) {
    try {
      const r = await fetch(opp.applyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const html = await r.text();
        jdText = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 5000);
      }
    } catch { /* continue without JD */ }
  }

  const isFde = [
    'FDE', 'Forward Deployed', 'Applied AI', 'Solutions Engineer', 'Solutions Architect',
    'AI Platform', 'Technical Specialist', 'Technical Lead', 'Implementation', 'Customer Engineer',
    'Client Engineer', 'Deployment', 'Field Engineer',
  ].some(kw => opp.role.toLowerCase().includes(kw.toLowerCase()) || (opp.classification ?? '').includes('FDE'));

  const FDE_FRAMEWORK = `
IMPORTANT FOR THIS ROLE TYPE: Will has a proven, named 7-step delivery framework he follows on every client engagement. Reference it by name ("structured 7-step delivery framework" or "7-step deployment methodology") naturally in the intro or a bullet — do not list the steps, just reference the framework as something real and practiced:
  1. Discovery & Business Alignment — structured session to define the real problem, success criteria, and constraints
  2. Rapid Scoping — smallest valuable v1, bias for shipping over perfection
  3. Architecture & Context Setup — multi-model routing strategy, context engineering, prevents drift
  4. Agentic Build Phase — Claude Code CLI as primary environment, MCP, Zod validation, HITL checkpoints
  5. Stakeholder Validation — working software in front of users same-day or next-day
  6. Production Deployment & Observability — real data over staging, full observability on AI flows
  7. Continuous Iteration — driven by actual usage and business outcomes
Core principles: Bias for shipping · AI as primary teammate · Business ownership · End-to-end accountability
BUSINESS LEADERSHIP CONTEXT: Will's 12 years as a General Manager and systems leadership in commercial construction is relevant background for client-facing roles — mention it naturally as context that informs how he approaches technical work. Do not editorialize about it being rare or uniquely valuable — just include it as a fact and let the hiring manager draw their own conclusions.`;

  const prompt = `You are writing a targeted cover letter for Will Austin applying to a specific job.${isFde ? '\n' + FDE_FRAMEWORK : ''}

CANDIDATE PROFILE:
${PROFILE}

JOB:
Company: ${opp.company}
Role: ${opp.role}
${opp.salaryMin ? `Salary: $${opp.salaryMin.toLocaleString()}${opp.salaryMax ? `–$${opp.salaryMax.toLocaleString()}` : '+'}` : ''}
Job Description:
${jdText ? jdText.slice(0, 4000) : 'No full job description available — write a strong general cover letter for this role type based on the company name and role title only. Be specific about Will\'s work that maps to this role classification.'}

Generate cover letter content. Be specific to THIS job and THIS company — reference exact skills, tools, or priorities from the JD.
Use <strong>bold</strong> tags for emphasis inside bullets. Keep bullets dense and specific, not generic.

TONE AND FRAMING RULES:
- Write with quiet confidence — state facts and let the hiring manager draw conclusions
- Never editorialize about how rare, uniquely qualified, or perfectly matched Will is — the evidence does that work
- Avoid phrases like: "uniquely positioned," "rare combination," "exactly what you need," "this is what makes," "this is the differentiator"
- Lead with the company's problem or the specific role requirement, then connect Will's actual work to it — not the other way around
- Each bullet should describe what was built or done, not claim how impressive it is
- The 7-step delivery framework is a named methodology — reference it by name naturally, do not list or explain the steps
- Specific always beats general — reference exact tools, systems, or outcomes from Will's work that map to exact JD language

Return ONLY valid JSON, no other text:
{
  "headerTitle": "<Role Title> · <Company>",
  "subjectText": "<Role> — <Company> · <salary if known or 'Salary undisclosed'>",
  "intro": "<2-3 sentences — open with what drew Will to this specific role or company, or a specific requirement from the JD, then connect it directly to his work. Do not open by describing how qualified he is. HTML allowed, use <strong> for emphasis only on specific facts.>",
  "bullets": [
    "<bullet 1 — bold label naming the specific capability, then 2-3 sentences describing the actual work that demonstrates it — tied directly to a JD requirement. No superlatives.>",
    "<bullet 2 — different angle, same specificity>",
    "<bullet 3 — different angle, same specificity>",
    "<bullet 4 — optional, only if a critical JD requirement isn't covered above>"
  ],
  "closingLine": "<1 sentence — availability, location, travel. Direct and short.>"
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

    // Save HTML first so the /api/render/[id] endpoint can serve it
    const existing = (opp.analysisJson as Record<string, unknown>) ?? {};
    await prisma.opportunity.update({
      where: { id },
      data: { analysisJson: { ...existing, coverLetterHtml: html, coverLetterConfig: cfg } },
    });

    // Generate PDF via localhost (so Chromium can load Google Fonts correctly)
    const pdfPath = await generateCoverLetterPdf(id);

    await prisma.opportunity.update({
      where: { id },
      data: {
        coverLetterUrl: pdfPath ?? `/cover-letter/${id}`,
        analysisJson:   { ...existing, coverLetterHtml: html, coverLetterConfig: cfg, coverLetterPdf: pdfPath },
      },
    });

    return NextResponse.json({ html, pdfUrl: pdfPath, config: cfg });
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
