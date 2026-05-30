import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(req.url);
  const folder    = searchParams.get('folder') ?? 'INBOX';
  const accountId = searchParams.get('accountId');
  const q         = searchParams.get('q')?.trim();
  const limit     = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset    = parseInt(searchParams.get('offset') ?? '0');

  const where: Record<string, unknown> = { folder };
  if (accountId) where.accountId = accountId;
  if (q) {
    where.OR = [
      { subject:   { contains: q, mode: 'insensitive' } },
      { fromEmail: { contains: q, mode: 'insensitive' } },
      { fromName:  { contains: q, mode: 'insensitive' } },
      { snippet:   { contains: q, mode: 'insensitive' } },
    ];
  }

  const [messages, total, unreadCount] = await Promise.all([
    prisma.emailMessage.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take:   limit,
      skip:   offset,
      include: { account: { select: { id: true, email: true, fromName: true, label: true } } },
    }),
    prisma.emailMessage.count({ where }),
    prisma.emailMessage.count({ where: { folder: 'INBOX', isRead: false, ...(accountId ? { accountId } : {}) } }),
  ]);

  return NextResponse.json({ messages, total, unreadCount, offset, limit });
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();
  // Save draft
  const msg = await prisma.emailMessage.create({
    data: {
      accountId:   body.accountId,
      folder:      'DRAFT',
      isDraft:     true,
      subject:     body.subject ?? null,
      fromEmail:   body.fromEmail ?? '',
      toRaw:       JSON.stringify(body.to ? [{ address: body.to }] : []),
      ccRaw:       body.cc ? JSON.stringify([{ address: body.cc }]) : null,
      bodyHtml:    body.bodyHtml ?? null,
      bodyText:    body.bodyHtml?.replace(/<[^>]+>/g, '') ?? null,
      snippet:     (body.bodyHtml ?? '').replace(/<[^>]+>/g, '').slice(0, 200),
      attachments: body.attachments ?? null,
      inReplyTo:   body.inReplyTo ?? null,
      receivedAt:  new Date(),
    },
  });
  return NextResponse.json({ message: msg }, { status: 201 });
}
