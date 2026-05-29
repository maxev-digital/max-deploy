import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  await requireAuth();

  const opps = await prisma.opportunity.findMany({
    select: {
      stage: true, source: true, classification: true, fitScore: true,
      salaryMin: true, salaryMax: true, appliedAt: true, lastActivity: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  if (opps.length < 5) {
    return NextResponse.json({ patterns: [
      { insight: 'Not enough data for pattern analysis yet', signal: 'neutral', metric: `${opps.length} records`, detail: 'Add more opportunities and let the pipeline mature before running analysis.' }
    ]});
  }

  const summary = {
    total: opps.length,
    byStage: Object.entries(
      opps.reduce((acc, o) => ({ ...acc, [o.stage]: (acc[o.stage as string] || 0) + 1 }), {} as Record<string, number>)
    ),
    bySource: Object.entries(
      opps.reduce((acc, o) => ({ ...acc, [o.source ?? 'unknown']: (acc[o.source ?? 'unknown'] || 0) + 1 }), {} as Record<string, number>)
    ),
    avgFitScore: opps.filter(o => o.fitScore).reduce((s, o) => s + (o.fitScore ?? 0), 0) / (opps.filter(o => o.fitScore).length || 1),
    byClassification: Object.entries(
      opps.reduce((acc, o) => ({ ...acc, [o.classification ?? 'unknown']: (acc[o.classification ?? 'unknown'] || 0) + 1 }), {} as Record<string, number>)
    ),
  };

  const prompt = `Analyze this job search pipeline data and surface 3-5 actionable patterns.

Pipeline summary:
${JSON.stringify(summary, null, 2)}

Return a JSON array of patterns:
[
  {
    "insight": "<one-sentence insight>",
    "signal": "positive|negative|neutral",
    "metric": "<key number>",
    "detail": "<one sentence explanation>"
  }
]

Return ONLY the JSON array.`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  let patterns: unknown[] = [];
  try {
    const match = text.match(/\[[\s\S]+\]/);
    if (match) patterns = JSON.parse(match[0]);
  } catch { /* keep empty */ }

  return NextResponse.json({ patterns });
}
