import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const opp = await prisma.opportunity.findUnique({
    where: { id },
    include: { contacts: true, outreachLogs: true, offer: true },
  });
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ opportunity: opp });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = { lastActivity: new Date() };
  if (body.stage !== undefined) { update.stage = body.stage; if (body.stage === 'applied') update.appliedAt = new Date(); }
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.fitScoreOverride !== undefined) update.fitScoreOverride = body.fitScoreOverride;
  if (body.followUpDue !== undefined) update.followUpDue = body.followUpDue ? new Date(body.followUpDue) : null;

  const opp = await prisma.opportunity.update({ where: { id }, data: update });
  return NextResponse.json({ opportunity: opp });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  await prisma.opportunity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
