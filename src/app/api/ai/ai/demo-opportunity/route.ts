import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeDemo } from '@/lib/demo-analysis';

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();

  // Single opportunity
  if (body.oppId) {
    const opp = await prisma.opportunity.findUnique({
      where: { id: body.oppId },
      select: { id: true, company: true, role: true, jdText: true },
    });
    if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!opp.jdText) return NextResponse.json({ error: 'No JD text on file' }, { status: 400 });
    const result = await analyzeDemo(opp);
    await prisma.$disconnect();
    return NextResponse.json(result ?? { error: 'Analysis failed' });
  }

  // Batch sweep
  if (body.batch) {
    const opps = await prisma.opportunity.findMany({
      where: {
        jdText: { not: null },
        stage: { in: ['inbox', 'applied', 'screening'] },
      },
      select: { id: true, company: true, role: true, jdText: true, analysisJson: true },
      take: 20,
    });

    const toProcess = opps.filter(o => {
      const aj = (o.analysisJson ?? {}) as Record<string, unknown>;
      return !aj.demoAnalysis;
    });

    const results: Record<string, unknown>[] = [];
    for (const opp of toProcess) {
      const r = await analyzeDemo(opp);
      if (r) results.push({ oppId: opp.id, company: opp.company, ...r });
    }

    await prisma.$disconnect();
    return NextResponse.json({ processed: results.length, results });
  }

  return NextResponse.json({ error: 'Provide oppId or batch:true' }, { status: 400 });
}
