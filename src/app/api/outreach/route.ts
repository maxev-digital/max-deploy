import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  await requireAuth();
  const logs = await prisma.outreachLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { opportunity: { select: { company: true, role: true } } },
  });
  return NextResponse.json({ logs });
}
