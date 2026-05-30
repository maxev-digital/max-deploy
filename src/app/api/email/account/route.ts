import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  await requireAuth();
  const accounts = await prisma.emailAccount.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();
  const account = await prisma.emailAccount.upsert({
    where:  { email: body.email },
    update: {
      label:    body.label    ?? 'Inbox',
      imapHost: body.imapHost ?? 'imap.hostinger.com',
      imapPort: Number(body.imapPort ?? 993),
      imapUser: body.imapUser ?? body.email,
      ...(body.imapPass && { imapPass: body.imapPass }),
      smtpHost: body.smtpHost ?? 'smtp.hostinger.com',
      smtpPort: Number(body.smtpPort ?? 465),
      smtpUser: body.smtpUser ?? body.email,
      ...(body.smtpPass && { smtpPass: body.smtpPass }),
      fromName: body.fromName ?? 'Will Austin',
      isActive: true,
    },
    create: {
      email:    body.email,
      label:    body.label    ?? 'Inbox',
      imapHost: body.imapHost ?? 'imap.hostinger.com',
      imapPort: Number(body.imapPort ?? 993),
      imapUser: body.imapUser ?? body.email,
      imapPass: body.imapPass ?? '',
      smtpHost: body.smtpHost ?? 'smtp.hostinger.com',
      smtpPort: Number(body.smtpPort ?? 465),
      smtpUser: body.smtpUser ?? body.email,
      smtpPass: body.smtpPass ?? '',
      fromName: body.fromName ?? 'Will Austin',
    },
  });
  return NextResponse.json({ account });
}
