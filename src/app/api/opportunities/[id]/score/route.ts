import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const USER_PROFILE = `
Skills: Next.js, TypeScript, Python, PostgreSQL, Prisma, BullMQ/Redis, Claude/Anthropic API, MCP protocol, multi-model routing, Zod, agentic system design, REST API design, Docker, VPS deployment, Twilio, ElevenLabs, Stripe Connect, IMAP email clients
Experience type: Solo full-stack builder, technical product owner, client delivery (4 external engagements), AI-native engineering
Background: Former GM/GC (P&L ownership), self-taught, no CS degree, 14 production AI endpoints, 13 production platforms
Preferred roles: FDE, Applied AI Engineer, AI Platform Engineer, Solutions Engineer, Head of AI/Technology
Salary floor: $120K full-time / $85/hr contract
Geography: Remote preferred, TX remote acceptable, Dallas area possible
Work type: Full-time, contract, or both simultaneously
Deal breakers: On-site 5 days/week, <$100K, no AI component
`;

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const opp = await prisma.opportunity.findUnique({ where: { id } });
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!opp.jdText) return NextResponse.json({ error: 'No JD text to score' }, { status: 400 });

  const prompt = `You are a career advisor scoring a job opportunity for this engineer profile:
${USER_PROFILE}

Job: ${opp.company} — ${opp.role}
JD: ${opp.jdText.slice(0, 4000)}

Return a JSON object with these exact fields:
{
  "fitScore": <integer 0-100>,
  "classification": "<FDE|AI_Engineer|CSM|Director|Contract|Skip>",
  "salaryAssessment": "<string>",
  "matchStrengths": ["<string>", ...],
  "gaps": ["<string>", ...],
  "recommendedAction": "<apply_now|apply_with_note|save|skip|watch>",
  "urgency": "<fresh|normal|stale>",
  "reasoning": "<1-2 sentence summary>"
}

Return ONLY the JSON object, no other text.`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  let analysis: Record<string, unknown> = {};
  try {
    const match = text.match(/\{[\s\S]+\}/);
    if (match) analysis = JSON.parse(match[0]);
  } catch { /* use empty */ }

  await prisma.opportunity.update({
    where: { id },
    data: {
      fitScore: typeof analysis.fitScore === 'number' ? analysis.fitScore : null,
      classification: typeof analysis.classification === 'string' ? analysis.classification : null,
      recommendedAction: typeof analysis.recommendedAction === 'string' ? analysis.recommendedAction : null,
      analysisJson: analysis as object,
    },
  });

  return NextResponse.json({ analysis });
}
