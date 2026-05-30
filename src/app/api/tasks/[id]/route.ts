import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const body = await req.json();
  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(body.status     !== undefined && { status:      body.status }),
      ...(body.priority   !== undefined && { priority:    body.priority }),
      ...(body.title      !== undefined && { title:       body.title }),
      ...(body.notes      !== undefined && { notes:       body.notes }),
      ...(body.status === 'DONE'        && { completedAt: new Date() }),
    },
  });
  return NextResponse.json({ task });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
