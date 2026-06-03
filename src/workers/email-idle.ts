/**
 * IMAP IDLE monitor — persistent connection, zero polling.
 * The server pushes a notification the moment new mail arrives.
 * Syncs to DB immediately on notification, then re-enters IDLE.
 *
 * Uses source:true in fetch to avoid nested download() calls that
 * conflict with an open fetch stream and hang indefinitely.
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

  // Use UID-based tracking instead of date-based SINCE.
  // IMAP SINCE uses INTERNALDATE (server delivery date), which can differ from the
  // email's Date header. Using the highest known UID avoids timezone/date-mismatch bugs.
  const maxUidRow = await prisma.emailMessage.aggregate({
    where: { accountId, uid: { gt: 0 } },
    _max: { uid: true },
  });
  const knownMaxUid = maxUidRow._max.uid ?? 0;

  try {
    const lock = await client.getMailboxLock('INBOX');
    let synced = 0;
    try {
      // Search for UIDs strictly greater than highest we've seen, or all if inbox is fresh
      const searchCriteria = knownMaxUid > 0
        ? { uid: `${knownMaxUid + 1}:*` }
        : { all: true };
      const uids = await client.search(searchCriteria as any, { uid: true });
      console.log(`[idle] UID search (knownMax=${knownMaxUid}) => UIDs: ${JSON.stringify(uids)}`);
      if (!uids || !Array.isArray(uids) || uids.length === 0) return;

      // Filter to only truly new UIDs (server may return * which includes last msg)
      const newUids = (uids as number[]).filter(u => u > knownMaxUid);
      if (newUids.length === 0) return;
      const uidRange = newUids.slice(-30).join(',');

      // Use source:true to get the full message body in one FETCH command.
      // Calling download() inside a for-await fetch loop issues a nested IMAP
      // command while the stream is still open, which hangs the connection.
      for await (const msg of client.fetch(uidRange, { uid: true, source: true }, { uid: true })) {
        const hasSource = !!((msg as any).source);
        console.log(`[idle] UID ${msg.uid} hasSource=${hasSource}`);
        try {
          const parsed = await simpleParser((msg as any).source);
          const mid    = parsed.messageId ?? `uid-${msg.uid}-${accountId}`;
          const exists = await prisma.emailMessage.findUnique({ where: { messageId: mid } });
          console.log(`[idle] UID ${msg.uid} mid=${mid} alreadyInDB=${!!exists}`);
          if (exists) continue;

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
        } catch (e) {
          console.error(`[idle] UID ${msg.uid} parse/save error:`, (e as Error).message);
        }
      }
    } finally { lock.release(); }

    if (synced > 0) {
      await prisma.emailAccount.update({ where: { id: accountId }, data: { lastSyncAt: new Date(), lastUid: knownMaxUid + synced } });
      console.log(`[idle] Synced ${synced} new message(s) for ${account.email}`);

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
          true
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

    client.on('error', (err: Error) => {
      console.error(`[idle] Socket error for ${account.email}:`, err.message);
    });

    try {
      await client.connect();

      // Initial sync — syncNewMessages manages its own lock
      await syncNewMessages(client, account.id);

      console.log(`[idle] Entering IDLE for ${account.email}`);

      // IDLE loop — acquire and release lock per iteration so syncNewMessages can also lock
      while (true) {
        const lock = await client.getMailboxLock('INBOX');
        let idleResult: unknown;
        try {
          idleResult = await Promise.race([
            client.idle(),
            new Promise<'timeout'>(res => setTimeout(() => res('timeout'), IDLE_TIMEOUT)),
          ]);
        } finally {
          lock.release();
        }

        if (idleResult !== 'timeout') {
          console.log(`[idle] New mail notification for ${account.email}`);
          await syncNewMessages(client, account.id);
        }
      }
    } catch (e) {
      console.error(`[idle] Connection error for ${account.email}:`, (e as Error).message);
    } finally {
      try { await client.logout(); } catch {}
    }

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
  for (const account of accounts) {
    idleLoop(account).catch(e => console.error('[idle] Fatal error:', e));
  }
  console.log(`[idle] Started ${accounts.length} IDLE monitor(s)`);
}
