import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export async function POST(req: NextRequest) {
  await requireAuth();

  let accountId: string | null = null;
  try { const b = await req.json(); accountId = b?.accountId ?? null; } catch {}

  const accounts = accountId
    ? await prisma.emailAccount.findMany({ where: { id: accountId, isActive: true } })
    : await prisma.emailAccount.findMany({ where: { isActive: true } });

  if (!accounts.length) return NextResponse.json({ error: 'No email account configured' }, { status: 400 });

  let totalSynced = 0;

  for (const account of accounts) {
    const client = new ImapFlow({
      host: account.imapHost, port: account.imapPort, secure: true,
      auth: { user: account.imapUser, pass: account.imapPass },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        const since = account.lastSyncAt ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const uids  = await client.search({ since }, { uid: true });

        if (!uids || uids.length === 0) { lock.release(); continue; }

        const uidRange = uids.slice(-50).join(',');

        for await (const msg of client.fetch(uidRange, { uid: true, envelope: true }, { uid: true })) {
          try {
            const raw    = await client.download(String(msg.uid), undefined, { uid: true });
            const parsed = await simpleParser(raw.content);
            const mid    = parsed.messageId ?? `uid-${msg.uid}-${account.id}`;

            if (await prisma.emailMessage.findUnique({ where: { messageId: mid } })) continue;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const from    = parsed.from as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const to      = parsed.to   as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cc      = parsed.cc   as any;

            const attachmentMeta = parsed.attachments?.map(a => ({
              filename:    a.filename ?? 'attachment',
              contentType: a.contentType,
              size:        a.size,
              content:     a.content.toString('base64'),
            })) ?? [];

            await prisma.emailMessage.create({
              data: {
                accountId:    account.id,
                uid:          msg.uid,
                messageId:    mid,
                folder:       'INBOX',
                subject:      parsed.subject ?? null,
                fromEmail:    from?.value?.[0]?.address ?? '',
                fromName:     from?.value?.[0]?.name    ?? null,
                toRaw:        JSON.stringify(to?.value  ?? []),
                ccRaw:        cc ? JSON.stringify(cc?.value ?? []) : null,
                bodyHtml:     typeof parsed.html === 'string' ? parsed.html : null,
                bodyText:     parsed.text ?? null,
                snippet:      (parsed.text ?? '').slice(0, 200),
                hasAttachment: attachmentMeta.length > 0,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                attachments:  attachmentMeta.length > 0 ? (attachmentMeta as any) : null,
                inReplyTo:    parsed.inReplyTo ?? null,
                receivedAt:   parsed.date ?? new Date(),
              },
            });
            totalSynced++;
          } catch { /* skip malformed */ }
        }
      } finally { lock.release(); }

      await client.logout();
      await prisma.emailAccount.update({ where: { id: account.id }, data: { lastSyncAt: new Date() } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'IMAP error';
      console.error(`Sync failed for ${account.email}:`, message);
    }
  }

  return NextResponse.json({ synced: totalSynced });
}
