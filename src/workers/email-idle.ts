/**
 * IMAP IDLE monitor — persistent connection, zero polling.
 * The server pushes a notification the moment new mail arrives.
 * Syncs to DB immediately on notification, then re-enters IDLE.
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '../lib/prisma';
import { sendTelegram, tgBold } from '../lib/telegram';
import { slackAlert } from '../lib/slack';

const RECONNECT_DELAY = 10_000; // 10s before reconnect on error
const IDLE_TIMEOUT    = 25 * 60 * 1000; // 25 min (servers drop idle after 30)

async function syncNewMessages(client: ImapFlow, accountId: string) {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!account) return;

  const since = account.lastSyncAt ?? new Date(Date.now() - 30 * 86400000);

  try {
    const lock = await client.getMailboxLock('INBOX');
    let synced = 0;
    try {
      const uids = await client.search({ since }, { uid: true });
      if (!uids || !Array.isArray(uids) || uids.length === 0) return;

      const uidRange = (uids as number[]).slice(-30).join(',');
      for await (const msg of client.fetch(uidRange, { uid: true, envelope: true }, { uid: true })) {
        try {
          const raw    = await client.download(String(msg.uid), undefined, { uid: true });
          const parsed = await simpleParser(raw.content);
          const mid    = parsed.messageId ?? `uid-${msg.uid}-${accountId}`;
          if (await prisma.emailMessage.findUnique({ where: { messageId: mid } })) continue;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const from = parsed.from as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const to   = parsed.to   as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cc   = parsed.cc   as any;

          const attachmentMeta = parsed.attachments?.map(a => ({
            filename: a.filename ?? 'attachment', contentType: a.contentType,
            size: a.size, content: a.content.toString('base64'),
          })) ?? [];

          await prisma.emailMessage.create({
            data: {
              accountId, uid: msg.uid, messageId: mid, folder: 'INBOX',
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
          synced++;
        } catch { /* skip malformed */ }
      }
    } finally { lock.release(); }

    if (synced > 0) {
      await prisma.emailAccount.update({ where: { id: accountId }, data: { lastSyncAt: new Date() } });
      console.log(`[idle] Synced ${synced} new message(s) for ${account.email}`);

      // Get the newest message for the notification
      const newest = await prisma.emailMessage.findFirst({
        where: { accountId, folder: 'INBOX', isRead: false },
        orderBy: { receivedAt: 'desc' },
      });
      if (newest) {
        const from    = newest.fromName ?? newest.fromEmail;
        const subject = newest.subject ?? '(no subject)';
        const snippet = newest.snippet ?? '';

        await sendTelegram(
          `📧 ${tgBold('New Email')} — ${from}\n<i>${subject}</i>\n${snippet.slice(0, 100)}${snippet.length > 100 ? '…' : ''}`,
          true // silent notification
        );
        await slackAlert(
          `📧 New Email — ${from}`,
          `*Subject:* ${subject}\n${snippet.slice(0, 200)}`,
          '#14B8AD'
        );
      }
    }
  } catch (e) {
    console.error('[idle] Sync error:', (e as Error).message);
  }
}

async function idleLoop(account: { id: string; email: string; imapHost: string; imapPort: number; imapUser: string; imapPass: string }) {
  console.log(`[idle] Starting IDLE monitor for ${account.email}`);

  while (true) {
    const client = new ImapFlow({
      host: account.imapHost, port: account.imapPort, secure: true,
      auth: { user: account.imapUser, pass: account.imapPass },
      logger: false,
    });

    try {
      await client.connect();
      await client.getMailboxLock('INBOX');

      // Do an initial sync in case anything arrived while we were disconnected
      await syncNewMessages(client, account.id);

      console.log(`[idle] Entering IDLE for ${account.email}`);

      // IDLE loop — re-enters every IDLE_TIMEOUT ms to prevent server drop
      while (true) {
        // client.idle() resolves when the server sends EXISTS (new mail) or a timeout
        const idleResult = await Promise.race([
          client.idle(),
          new Promise<'timeout'>(res => setTimeout(() => res('timeout'), IDLE_TIMEOUT)),
        ]);

        if (idleResult !== 'timeout') {
          // Server pushed a notification — sync immediately
          console.log(`[idle] New mail notification for ${account.email}`);
          await syncNewMessages(client, account.id);
        }
        // Whether timeout or notification, loop and re-enter IDLE
      }
    } catch (e) {
      console.error(`[idle] Connection error for ${account.email}:`, (e as Error).message);
    } finally {
      try { await client.logout(); } catch {}
    }

    // Wait before reconnecting
    console.log(`[idle] Reconnecting ${account.email} in ${RECONNECT_DELAY / 1000}s...`);
    await new Promise(res => setTimeout(res, RECONNECT_DELAY));
  }
}

export async function startEmailIdleMonitors() {
  const accounts = await prisma.emailAccount.findMany({ where: { isActive: true } });
  if (!accounts.length) {
    console.log('[idle] No active email accounts — skipping IDLE monitors');
    return;
  }
  // Start a persistent IDLE loop for each account (non-blocking)
  for (const account of accounts) {
    idleLoop(account).catch(e => console.error('[idle] Fatal error:', e));
  }
  console.log(`[idle] Started ${accounts.length} IDLE monitor(s)`);
}
