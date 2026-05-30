import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ImapFlow } from 'imapflow';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const msg = await prisma.emailMessage.findUnique({
    where: { id },
    include: { account: { select: { email: true, fromName: true, label: true } } },
  });
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!msg.isRead && !msg.isDraft) {
    await prisma.emailMessage.update({ where: { id }, data: { isRead: true } });
  }
  return NextResponse.json({ message: { ...msg, isRead: true } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const body = await req.json();

  // Handle IMAP folder move (archive/trash)
  if (body.moveTo && !body.skipImap) {
    const msg = await prisma.emailMessage.findUnique({
      where: { id },
      include: { account: true },
    });
    if (msg && msg.uid > 0) {
      try {
        const client = new ImapFlow({
          host: msg.account.imapHost, port: msg.account.imapPort, secure: true,
          auth: { user: msg.account.imapUser, pass: msg.account.imapPass },
          logger: false,
        });
        await client.connect();
        const lock = await client.getMailboxLock(msg.folder);
        try {
          const destFolder = body.moveTo === 'TRASH' ? 'Trash' : body.moveTo === 'ARCHIVE' ? 'Archive' : body.moveTo;
          await client.messageMove(String(msg.uid), destFolder, { uid: true });
        } catch { /* ignore if folder doesn't exist on server */ }
        finally { lock.release(); }
        await client.logout();
      } catch { /* continue even if IMAP move fails */ }
    }
  }

  const updated = await prisma.emailMessage.update({
    where: { id },
    data: {
      ...(body.isRead     !== undefined && { isRead:     body.isRead }),
      ...(body.isStarred  !== undefined && { isStarred:  body.isStarred }),
      ...(body.moveTo     !== undefined && { folder:     body.moveTo }),
      ...(body.subject    !== undefined && { subject:    body.subject }),
      ...(body.bodyHtml   !== undefined && { bodyHtml:   body.bodyHtml }),
      ...(body.toRaw      !== undefined && { toRaw:      body.toRaw }),
    },
  });
  return NextResponse.json({ message: updated });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  await prisma.emailMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
