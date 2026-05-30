import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(req.url);
  const stage   = searchParams.get('stage');
  const minimal = searchParams.get('minimal') === '1';

  let where: Record<string, unknown> = {};

  if (stage === 'inbox') {
    where.stage = 'inbox';
  } else if (stage === 'active') {
    where.stage = { in: ['target', 'applied', 'screening', 'interview', 'final', 'offer'] };
  } else if (stage) {
    where.stage = stage;
  }

  const opportunities = minimal
    ? await prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, company: true, role: true, stage: true },
      })
    : await prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { contacts: true, outreachLogs: { orderBy: { sentAt: 'desc' }, take: 1 } },
      });

  return NextResponse.json({ opportunities });
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();

  const opp = await prisma.opportunity.create({
    data: {
      company:     body.company,
      role:        body.role,
      stage:       body.stage ?? 'inbox',
      salaryMin:   body.salaryMin ?? null,
      salaryMax:   body.salaryMax ?? null,
      applyUrl:    body.applyUrl ?? null,
      source:      body.source ?? 'manual',
      jdText:      body.jdText ?? null,
      notes:       body.notes ?? null,
      lastActivity: new Date(),
    },
  });

  return NextResponse.json({ opportunity: opp }, { status: 201 });
}
