import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  await requireAuth();
  const contracts = await prisma.contract.findMany({
    orderBy: { createdAt: 'desc' },
    include: { milestones: true },
  });
  return NextResponse.json({ contracts });
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();
  const contract = await prisma.contract.create({
    data: {
      client:           body.client,
      projectName:      body.projectName,
      rateType:         body.rateType,
      rate:             Number(body.rate),
      hoursPerWeek:     body.hoursPerWeek ? Number(body.hoursPerWeek) : null,
      totalValue:       body.totalValue ? Number(body.totalValue) : null,
      startDate:        body.startDate ? new Date(body.startDate) : null,
      endDate:          body.endDate ? new Date(body.endDate) : null,
      autoRenew:        body.autoRenew ?? false,
      renewalNoticeDays: body.renewalNoticeDays ? Number(body.renewalNoticeDays) : null,
      status:           body.status || 'active',
      sowUrl:           body.sowUrl || null,
      notes:            body.notes || null,
    },
  });
  return NextResponse.json({ contract }, { status: 201 });
}
