import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status: 'sent', sentAt: new Date() },
  });
  return NextResponse.json({ invoice });
}
