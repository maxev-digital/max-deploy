import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await requireAuth();
  const { folder, accountId } = await req.json();
  const where: Record<string, unknown> = { isRead: false };
  if (folder)    where.folder    = folder;
  if (accountId) where.accountId = accountId;
  const { count } = await prisma.emailMessage.updateMany({ where, data: { isRead: true } });
  return NextResponse.json({ marked: count });
}
