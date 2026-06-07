import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CL_TO_SECTOR: Record<string, string> = {
  'FDE':                   'Applied AI / FDE',
  'AI_Engineer':            'AI Engineering',
  'Director':               'AI Leadership',
  'Solutions':              'Solutions Architecture',
  'FullStack':              'Full Stack AI',
  'CSM':                    'Customer Success',
  'Contract':               'Applied AI / FDE',
  'Marketing':              'AI Strategy',
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sector  = searchParams.get('sector') || '';
  const source  = searchParams.get('source') || '';
  const q       = searchParams.get('q') || '';
  const page    = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const PER     = 25;

  const where: Record<string, unknown> = {
    fitScore: { gte: 70 },
    stage:    { notIn: ['archived', 'dead'] },
  };
  if (q) {
    where.OR = [
      { company: { contains: q, mode: 'insensitive' } },
      { role:    { contains: q, mode: 'insensitive' } },
    ];
  }
  if (source) where.source = { contains: source, mode: 'insensitive' };

  const opps = await prisma.opportunity.findMany({
    where,
    select: {
      id: true, company: true, role: true, classification: true,
      salaryMin: true, salaryMax: true, source: true,
      applyUrl: true, createdAt: true,
    },
    orderBy: { fitScore: 'desc' },
  });

  const mapped = opps.map(o => ({
    id:        o.id,
    company:   o.company,
    role:      o.role.trim(),
    sector:    CL_TO_SECTOR[o.classification ?? ''] ?? 'Other',
    salaryMin: o.salaryMin,
    salaryMax: o.salaryMax,
    source:    o.source,
    applyUrl:  o.applyUrl,
    postedAt:  o.createdAt.toISOString().slice(0, 10),
  }));

  const filtered = sector ? mapped.filter(o => o.sector === sector) : mapped;
  const total    = filtered.length;
  const jobs     = filtered.slice((page - 1) * PER, page * PER);

  return NextResponse.json({ total, page, perPage: PER, jobs });
}
