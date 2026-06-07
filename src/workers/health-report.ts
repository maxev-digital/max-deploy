import { prisma } from '../lib/prisma';
import { sendTelegram, tgBold, tgCode, tgItalic } from '../lib/telegram';

const RSS_SOURCES  = ['wwr', 'remotive', 'custom', 'rss', 'indeed'];
const ATS_SOURCES  = ['greenhouse', 'lever', 'ashby', 'ats'];

export async function generateHealthReport() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);

  // ── New opportunities last 24h ────────────────────────────────────────────
  const newOpps = await prisma.opportunity.findMany({
    where:  { createdAt: { gte: since24h } },
    select: { source: true, fitScore: true },
  });

  const total       = newOpps.length;
  const rssCount    = newOpps.filter(o => RSS_SOURCES.includes(o.source ?? '')).length;
  const atsCount    = newOpps.filter(o => ATS_SOURCES.includes(o.source ?? '')).length;
  const alertCount  = newOpps.filter(o => o.source === 'email_job_alert').length;
  const recruiterCount = newOpps.filter(o => o.source === 'recruiter_inbound').length;

  const scored      = newOpps.filter(o => o.fitScore !== null);
  const failedScore = total - scored.length;
  const avgScore    = scored.length > 0
    ? Math.round(scored.reduce((s, o) => s + (o.fitScore ?? 0), 0) / scored.length)
    : 0;
  const highConf    = scored.filter(o => (o.fitScore ?? 0) >= 80).length;

  // ── Unscored backlog (all active, not just 24h) ───────────────────────────
  const unscoredBacklog = await prisma.opportunity.count({
    where: { fitScore: null, stage: { notIn: ['archived', 'rejected'] } },
  });

  // ── RSS feed health ───────────────────────────────────────────────────────
  const feeds        = await prisma.rssFeed.findMany({ where: { active: true } });
  const feedsOk      = feeds.filter(f => (f.consecutiveFailures ?? 0) === 0);
  const feedsFailing = feeds.filter(f => (f.consecutiveFailures ?? 0) > 0);

  // ── ATS health ───────────────────────────────────────────────────────────
  const atsTotal  = await prisma.targetCompany.count({
    where: { watchlist: true, atsType: { notIn: ['none', null] }, atsSlug: { not: '' } },
  });
  const atsPolled = await prisma.targetCompany.count({
    where: { watchlist: true, lastPolled: { gte: since24h } },
  });

  // ── Email health ─────────────────────────────────────────────────────────
  const emailsReceived = await prisma.emailMessage.count({
    where: { receivedAt: { gte: since24h } },
  });
  const emailAccount = await prisma.emailAccount.findFirst({ where: { isActive: true } });
  const idleActive   = emailAccount
    ? (emailAccount.lastSyncAt && emailAccount.lastSyncAt > new Date(Date.now() - 60 * 60 * 1000))
    : false;

  // ── Duplicate detection (same company+role, last 7d, >1 record) ──────────
  const dupeRows = await prisma.$queryRaw<{ company: string; role: string; cnt: bigint }[]>`
    SELECT company, role, COUNT(*) as cnt
    FROM "Opportunity"
    WHERE "createdAt" >= ${since7d}
    AND stage NOT IN ('archived', 'rejected')
    GROUP BY company, role
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 5
  `;
  const dupeCount = dupeRows.reduce((s, r) => s + (Number(r.cnt) - 1), 0);

  // ── Stage pipeline snapshot ───────────────────────────────────────────────
  const stageGroups = await prisma.opportunity.groupBy({
    by: ['stage'],
    _count: { id: true },
    where: { stage: { notIn: ['archived', 'rejected'] } },
  });
  const stageMap: Record<string, number> = {};
  for (const g of stageGroups) stageMap[g.stage] = g._count.id;

  // ── Build message ─────────────────────────────────────────────────────────
  const ok  = (b: boolean) => b ? '✅' : '❌';
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'America/Chicago',
  });

  const lines: string[] = [
    `${tgBold(`Pipeline Health — ${date}`)}`,
    `─────────────────────`,

    // New opps
    `${tgBold('New (24h)')}  ${tgCode(String(total))} total`,
    `RSS: ${rssCount}  ATS: ${atsCount}  Email alert: ${alertCount}  Recruiter: ${recruiterCount}`,
    ``,

    // Scoring
    `${tgBold('Scoring')}  ${scored.length}/${total} scored  ${failedScore > 0 ? `❌ ${failedScore} failed` : '✅ all scored'}`,
    `Avg fit: ${tgCode(String(avgScore))}  High (80+): ${highConf}  Backlog: ${unscoredBacklog}`,
    ``,

    // Dupes
    `${tgBold('Dupes (7d)')}  ${dupeCount > 0 ? `⚠️ ${dupeCount} extra records` : '✅ none'}`,
    dupeCount > 0
      ? tgItalic(dupeRows.slice(0, 3).map(d => `${d.company} ×${d.cnt}`).join(', '))
      : '',

    ``,
    `─────────────────────`,

    // Channel health
    `${ok(feedsOk.length > 0)} RSS  ${feedsOk.length} ok  ${feedsFailing.length > 0 ? `❌ ${feedsFailing.length} failing` : ''}`,
    feedsFailing.length > 0
      ? tgItalic(feedsFailing.slice(0, 3).map(f => f.name).join(', '))
      : '',

    `${ok(atsPolled > 0)} ATS  ${atsPolled}/${atsTotal} polled  +${atsCount} jobs`,
    `${ok(!!idleActive)} Email IDLE  ${emailsReceived} received`,

    ``,
    `─────────────────────`,

    // Pipeline snapshot
    `${tgBold('Pipeline')}`,
    `Inbox: ${stageMap['inbox'] ?? 0}  Applied: ${stageMap['applied'] ?? 0}  Interviewing: ${stageMap['interviewing'] ?? 0}  Offer: ${stageMap['offer'] ?? 0}`,

    ``,
    tgItalic('max-ev-holdings.com/pipeline'),
  ];

  const message = lines.filter(l => l !== '').join('\n');
  await sendTelegram(message, false);
  console.log('[health] Daily report sent.');
}
