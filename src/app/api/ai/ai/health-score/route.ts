import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  await requireAuth();

  const now = new Date();
  const two = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [inboxCount, activeApps, staleCount, contracts, offers, followUpsDue] = await Promise.all([
    prisma.opportunity.count({ where: { stage: 'inbox' } }),
    prisma.opportunity.count({ where: { stage: { in: ['applied', 'screening', 'interview', 'final', 'offer'] } } }),
    prisma.opportunity.count({ where: { stage: { in: ['applied', 'screening'] }, lastActivity: { lt: two } } }),
    prisma.contract.count({ where: { status: 'active' } }),
    prisma.opportunity.count({ where: { stage: 'offer' } }),
    prisma.opportunity.count({ where: { followUpDue: { lte: now }, stage: { notIn: ['inbox', 'rejected', 'withdrawn', 'accepted'] } } }),
  ]);

  const prompt = `Score this job search pipeline health on a 0-100 scale. Return JSON only.

Data:
- Inbox queue: ${inboxCount} (large queues = discovery is working)
- Active applications: ${activeApps}
- Stale applications (14d+): ${staleCount} (0 is ideal)
- Active contracts: ${contracts}
- Active offers: ${offers}
- Follow-ups overdue: ${followUpsDue} (0 is ideal)

Return this JSON:
{
  "overall": <integer 0-100>,
  "grade": "<A+|A|A-|B+|B|B-|C+|C|D>",
  "summary": "<one phrase>",
  "dimensions": [
    {"label": "Discovery", "score": <0-100>, "trend": "up|down|stable", "detail": "<short stat>"},
    {"label": "Pipeline Activity", "score": <0-100>, "trend": "up|down|stable", "detail": "<short stat>"},
    {"label": "Follow-Up Hygiene", "score": <0-100>, "trend": "up|down|stable", "detail": "<short stat>"},
    {"label": "Revenue Floor", "score": <0-100>, "trend": "up|down|stable", "detail": "<short stat>"}
  ]
}`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  let result: Record<string, unknown> = { overall: 0, grade: 'D', summary: '', dimensions: [] };
  try {
    const match = text.match(/\{[\s\S]+\}/);
    if (match) result = JSON.parse(match[0]);
  } catch { /* keep default */ }

  return NextResponse.json(result);
}
