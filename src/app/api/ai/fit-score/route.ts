import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const USER_PROFILE = `
Skills: Next.js, TypeScript, Python, PostgreSQL, Prisma, BullMQ/Redis, Claude/Anthropic API, MCP protocol, multi-model routing, Zod, agentic system design, REST API design, Docker, VPS deployment, Twilio, ElevenLabs, Stripe Connect, IMAP email clients
Experience: Solo full-stack builder, 14 production AI endpoints, 13 production platforms, 4 external client engagements
Background: Former GM/GC (P&L ownership), self-taught, no CS degree
Preferred roles: FDE, Applied AI Engineer, AI Platform Engineer, Solutions Engineer, Head of AI/Technology
Salary floor: $120K FT / $85/hr contract
Geography: Remote preferred, TX remote ok, Dallas possible
Deal breakers: On-site 5d/wk, <$100K, no AI component
`;

export async function POST(req: NextRequest) {
  await requireAuth();
  const { jdText } = await req.json();
  if (!jdText?.trim()) return NextResponse.json({ error: 'JD text required' }, { status: 400 });

  const prompt = `Score this job opportunity for the following engineer profile:
${USER_PROFILE}

Job Description:
${jdText.slice(0, 5000)}

Return ONLY a JSON object:
{
  "score": <integer 0-100>,
  "classification": "<FDE|AI_Engineer|CSM|Director|Contract|Skip>",
  "salaryAssessment": "<string>",
  "strengths": ["<string>", ...],
  "gaps": ["<string>", ...],
  "positioning": "<how to frame the application>",
  "coverLetterAngle": "<opening angle for cover letter>",
  "recommendedAction": "<apply_now|apply_with_note|save|skip|watch>",
  "reasoning": "<1-2 sentence summary>"
}`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  let result: Record<string, unknown> = {};
  try {
    const match = text.match(/\{[\s\S]+\}/);
    if (match) result = JSON.parse(match[0]);
  } catch { /* keep empty */ }

  return NextResponse.json(result);
}
