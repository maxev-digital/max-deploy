import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  await requireAuth();
  const { oppId } = await req.json();
  if (!oppId) return NextResponse.json({ error: 'oppId required' }, { status: 400 });

  const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Return cached result if already generated for this opportunity
  const existing = opp.analysisJson as Record<string, unknown> | null;
  if (existing?.interviewPrep) {
    return NextResponse.json({ questions: existing.interviewPrep, cached: true });
  }

  // Fetch live context in parallel
  const [profile, contracts] = await Promise.all([
    prisma.userProfile.findFirst(),
    prisma.contract.findMany({
      where: { status: 'active' },
      select: { client: true, projectName: true, rate: true, rateType: true },
    }),
  ]);

  const profileCtx = profile ? `
Name: ${profile.name}
Summary: ${profile.profileSummary ?? ''}
Skills: ${(profile.skills as string[]).join(', ')}
Target titles: ${(profile.targetTitles as string[]).join(', ')}
Work preference: ${profile.workType} | ${profile.geoPref}
` : '';

  const contractCtx = contracts.length > 0
    ? `Active client engagements:\n${contracts.map(c => `- ${c.client}: ${c.projectName}`).join('\n')}`
    : '';

  // Use prior fit analysis if available to frame questions around known gaps/strengths
  const analysisCtx = existing ? `
Prior fit analysis for this specific role:
- Fit score: ${existing.fitScore ?? 'unscored'}
- Strengths identified: ${Array.isArray(existing.matchStrengths) ? (existing.matchStrengths as string[]).join(', ') : 'N/A'}
- Gaps identified: ${Array.isArray(existing.gaps) ? (existing.gaps as string[]).join(', ') : 'none'}
- Positioning: ${existing.reasoning ?? ''}
` : '';

  const prompt = `You are a technical interview coach preparing this specific candidate for an upcoming interview.

CANDIDATE PROFILE:
${profileCtx}
${contractCtx}

INTERVIEW: ${opp.company} — ${opp.role}
${opp.jdText ? `JOB DESCRIPTION:\n${opp.jdText.slice(0, 3000)}` : '(No JD available — generate questions based on company and role title only)'}
${analysisCtx}

Generate 6 high-probability interview questions for this specific company and role. Write suggested answers that reference the candidate's ACTUAL projects by name — reference MAX-DEPLOY (their Career OS built in Next.js 15), Roof Works of Texas (admin + CRM + IVR), Paloma Home Services (SMS lead gen + Twilio), APW (real-time craps strategy simulator + voice coaching), and the candidate's experience shipping 13 production platforms solo as a forward deployment engineer.

Return ONLY a JSON array:
[
  {
    "category": "<Behavioral|Technical|System Design|Situational|Product|Culture>",
    "question": "<the exact likely interview question>",
    "suggestedAnswer": "<a strong 3-5 sentence answer grounded in the candidate's real projects and experience>"
  }
]

Distribution: 2 Behavioral, 2 Technical, 1 System Design, 1 Situational. Weight questions toward what this specific company and role would prioritize.`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  let questions: Record<string, string>[] = [];
  try {
    const match = text.match(/\[[\s\S]+\]/);
    if (match) questions = JSON.parse(match[0]);
  } catch { /* keep empty */ }

  // Cache on the opportunity record — won't regenerate unless explicitly refreshed
  await prisma.opportunity.update({
    where: { id: oppId },
    data: {
      analysisJson: { ...(existing ?? {}), interviewPrep: questions } as object,
    },
  });

  return NextResponse.json({ questions, cached: false });
}

// Force-refresh: clears cached prep and regenerates
export async function DELETE(req: NextRequest) {
  await requireAuth();
  const { oppId } = await req.json();
  if (!oppId) return NextResponse.json({ error: 'oppId required' }, { status: 400 });

  const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const existing = (opp.analysisJson as Record<string, unknown> | null) ?? {};
  const { interviewPrep: _, ...rest } = existing;
  await prisma.opportunity.update({ where: { id: oppId }, data: { analysisJson: rest as object } });

  return NextResponse.json({ ok: true });
}
