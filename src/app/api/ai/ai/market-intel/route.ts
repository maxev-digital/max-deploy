import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

let cache: { data: unknown; at: number } | null = null;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  await requireAuth();

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.data);
  }

  const opps = await prisma.opportunity.findMany({
    select: {
      stage: true, source: true, classification: true,
      fitScore: true, salaryMin: true, salaryMax: true,
      appliedAt: true, createdAt: true, recommendedAction: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  if (opps.length < 3) {
    const fallback = { insights: [
      { title: 'Building Pipeline', color: '#2563EB', body: 'Add more opportunities to unlock market intelligence. Once your pipeline has 5+ records, Claude will surface patterns and signals from your data.' },
      { title: 'Sources Matter', color: '#14B8AD', body: 'Configure RSS feeds and ATS watchlists in Settings to auto-populate your inbox. Diverse sources give you better signal on which channels produce the best-fit roles.' },
      { title: 'Score Everything', color: '#D08E14', body: 'Use the JD Fit Scorer on every opportunity you are serious about. The scoring data trains the pattern engine to surface better insights over time.' },
    ]};
    return NextResponse.json(fallback);
  }

  const byStage = opps.reduce((acc, o) => { acc[o.stage] = (acc[o.stage] || 0) + 1; return acc; }, {} as Record<string, number>);
  const bySource = opps.reduce((acc, o) => { const k = o.source ?? 'direct'; acc[k] = (acc[k] || 0) + 1; return acc; }, {} as Record<string, number>);
  const byClass = opps.reduce((acc, o) => { const k = o.classification ?? 'unscored'; acc[k] = (acc[k] || 0) + 1; return acc; }, {} as Record<string, number>);
  const scored = opps.filter(o => o.fitScore !== null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, o) => s + (o.fitScore ?? 0), 0) / scored.length) : null;
  const applied = opps.filter(o => o.appliedAt || ['applied','phone_screen','interview','offer'].includes(o.stage)).length;
  const responseRate = opps.length > 0 ? Math.round((applied / opps.length) * 100) : 0;

  const stats = { total: opps.length, byStage, bySource, byClass, avgFitScore: avgScore, applied, responseRate };

  const prompt = `You are a job search strategist. Analyze this candidate's actual pipeline data and generate 3 market intelligence insights.

Pipeline data:
${JSON.stringify(stats, null, 2)}

Return ONLY a JSON object:
{
  "insights": [
    {
      "title": "<short title, 3-5 words>",
      "color": "<one of: #2563EB | #14B8AD | #D08E14>",
      "body": "<2-3 sentence actionable insight based on the actual numbers above. Reference specific metrics.>"
    }
  ]
}

Make each insight actionable and specific to the data. First insight: pipeline health/stage distribution. Second: source quality/where to focus. Third: scoring patterns or gap analysis.`;

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  let result: unknown = null;
  try {
    const match = text.match(/\{[\s\S]+\}/);
    if (match) result = JSON.parse(match[0]);
  } catch { /* fallback */ }

  if (!result) {
    result = { insights: [
      { title: 'Pipeline Active', color: '#2563EB', body: `${opps.length} opportunities tracked across ${Object.keys(byStage).length} stages. Your pipeline is live — keep sourcing to build signal.` },
      { title: 'Source Distribution', color: '#14B8AD', body: `Top sources: ${Object.entries(bySource).sort((a,b) => b[1]-a[1]).slice(0,2).map(([k,v]) => `${k} (${v})`).join(', ')}. Diversify if one source dominates.` },
      { title: 'Scoring Coverage', color: '#D08E14', body: `${scored.length} of ${opps.length} opportunities scored${avgScore ? ` — avg fit score ${avgScore}/100` : ''}. Score more roles to surface better patterns.` },
    ]};
  }

  cache = { data: result, at: Date.now() };
  return NextResponse.json(result);
}
