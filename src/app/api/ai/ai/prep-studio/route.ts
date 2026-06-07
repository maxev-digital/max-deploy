import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function scrapeUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobParser/1.0)' },
  });
  let html = await res.text();
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
             .replace(/<style[\s\S]*?<\/style>/gi, '')
             .replace(/<[^>]+>/g, ' ')
             .replace(/\s+/g, ' ')
             .trim()
             .slice(0, 6000);
  return html;
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const { company, role, jdText, jdUrl } = await req.json();

  if (!company?.trim() || !role?.trim()) {
    return NextResponse.json({ error: 'company and role required' }, { status: 400 });
  }
  if (!jdText?.trim() && !jdUrl?.trim()) {
    return NextResponse.json({ error: 'jdText or jdUrl required' }, { status: 400 });
  }

  let resolvedJd = jdText?.trim() ?? '';
  if (!resolvedJd && jdUrl?.trim()) {
    try {
      resolvedJd = await scrapeUrl(jdUrl.trim());
    } catch {
      return NextResponse.json({ error: 'Could not fetch URL' }, { status: 400 });
    }
  }

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
` : `Skills: Next.js, TypeScript, Python, PostgreSQL, Prisma, BullMQ/Redis, Claude/Anthropic API, MCP protocol, multi-model routing, REST API design, Docker, VPS deployment, Twilio, ElevenLabs, Stripe
Background: Former GM/GC (12yr P&L ownership), self-taught full-stack, AI-native FDE operating model`;

  const contractCtx = contracts.length > 0
    ? `Active client engagements:\n${contracts.map(c => `- ${c.client}: ${c.projectName}`).join('\n')}`
    : '';

  const prompt = `You are a technical interview coach and job fit analyst. Analyze this job opportunity against the candidate profile and produce a complete two-round interview prep package.

CANDIDATE PROFILE:
${profileCtx}
${contractCtx}

Real projects to reference in answers: MAX-DEPLOY (Career OS in Next.js 15), Roof Works of Texas (admin + CRM + IVR for roofing company), Paloma Home Services (SMS lead gen + Twilio), APW (real-time craps strategy simulator + ElevenLabs voice coaching). Candidate ships production AI systems solo across multiple client engagements as a forward deployment engineer.

TARGET ROLE: ${company} — ${role}
JOB DESCRIPTION:
${resolvedJd.slice(0, 4000)}

Return ONLY a JSON object with this exact structure:
{
  "fitScore": <integer 0-100>,
  "classification": "<FDE|AI_Engineer|Solutions|CSM|Director|Skip>",
  "salaryAssessment": "<brief salary fit note>",
  "recommendedAction": "<apply_now|apply_with_note|watch|skip>",
  "reasoning": "<1-2 sentence overall fit summary>",
  "strengths": ["<skill or experience that directly matches JD>", ...],
  "gaps": ["<JD requirement not strongly in candidate profile>", ...],
  "gapFraming": {
    "<gap name>": "<2-3 sentence script for how to answer this gap — reference the closest real-work analog from the candidate's actual projects>"
  },
  "keyTalkingPoints": ["<what to lead with — specific to this company and role>", ...],
  "coverLetterAngle": "<opening angle for cover letter — 1 sentence>",
  "questions": [
    {
      "category": "<Behavioral|Technical|System Design|Situational>",
      "question": "<exact likely Round 1 interview question>",
      "suggestedAnswer": "<strong 3-5 sentence answer grounded in candidate's real projects>"
    }
  ],
  "deepDiveQuestions": [
    {
      "tool": "<specific tool or technology from the JD — e.g. Terraform, AWS Bedrock, Kubernetes, DORA>",
      "question": "<precise Round 2 technical question probing depth on this specific tool>",
      "suggestedAnswer": "<honest 3-5 sentence answer — acknowledge depth of knowledge accurately, bridge to closest real analog from candidate's work, describe how they'd ramp>"
    }
  ]
}

For "questions": 6 total — 2 Behavioral, 2 Technical, 1 System Design, 1 Situational. Weight toward what this company would prioritize.
For "deepDiveQuestions": 4-5 questions, one per major tool/technology explicitly named in the JD. These simulate second-round technical depth probing — the interviewer already knows the candidate can do the job broadly, now they're testing specific tool fluency.`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  // Strip markdown code fences if present, then extract JSON object
  let text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  let result: Record<string, unknown> = {};
  try {
    const match = text.match(/\{[\s\S]+\}/);
    if (match) result = JSON.parse(match[0]);
  } catch { /* return empty */ }

  return NextResponse.json(result);
}
