import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const body = await req.json();
  const account = await prisma.emailAccount.update({
    where: { id },
    data: {
      ...(body.label    !== undefined && { label:    body.label }),
      ...(body.fromName !== undefined && { fromName: body.fromName }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.imapPass && { imapPass: body.imapPass }),
      ...(body.smtpPass && { smtpPass: body.smtpPass }),
    },
  });
  return NextResponse.json({ account });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  await prisma.emailAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
