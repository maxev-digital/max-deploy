import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const STAGE_COLORS: Record<string, string> = {
  inbox:     '#6B7280',
  target:    '#2563EB',
  applied:   '#D08E14',
  screening: '#9333EA',
  interview: '#14B8AD',
  final:     '#059669',
  offer:     '#16A34A',
};

export async function GET() {
  await requireAuth();

  const grouped = await prisma.opportunity.groupBy({
    by: ['stage'],
    _count: { id: true },
  });

  const stages = grouped.map(g => ({
    stage: g.stage,
    count: g._count.id,
    color: STAGE_COLORS[g.stage] ?? '#6B7280',
  }));

  return NextResponse.json({ stages });
}
