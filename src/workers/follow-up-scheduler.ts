import { prisma } from '../lib/prisma';
import { sendTelegram, tgBold, tgCode } from '../lib/telegram';
import { slackFields } from '../lib/slack';

const FOLLOW_UP_DAYS: Record<string, number> = {
  applied:    7,
  screening:  5,
  interview:  3,
  final:      2,
  offer:      1,
};

export async function scheduleFollowUps() {
  const now = new Date();
  const activeOpps = await prisma.opportunity.findMany({
    where: { stage: { in: Object.keys(FOLLOW_UP_DAYS) }, followUpDue: null },
    select: { id: true, stage: true, lastActivity: true, appliedAt: true },
  });

  let scheduled = 0;
  for (const opp of activeOpps) {
    const days      = FOLLOW_UP_DAYS[opp.stage] ?? 7;
    const baseDate  = opp.lastActivity ?? opp.appliedAt ?? now;
    const followUpDue = new Date(baseDate.getTime() + days * 86400000);
    if (followUpDue > now) {
      await prisma.opportunity.update({ where: { id: opp.id }, data: { followUpDue } });
      scheduled++;
    }
  }

  // Also flag anything overdue — set to today if past due
  const overdue = await prisma.opportunity.findMany({
    where: { stage: { in: Object.keys(FOLLOW_UP_DAYS) }, followUpDue: { lt: now } },
    select: { id: true },
  });
  // Leave overdue as-is so dashboard can surface them

  console.log(`[followup] Scheduled ${scheduled} follow-ups. ${overdue.length} overdue.`);

  // Alert on overdue follow-ups
  if (overdue.length > 0) {
    const overdueOpps = await prisma.opportunity.findMany({
      where: { id: { in: overdue.map(o => o.id) } },
      select: { company: true, role: true, stage: true, followUpDue: true },
      take: 5,
    });

    const lines = [`⏰ ${tgBold(`${overdue.length} follow-up(s) overdue`)}`, ''];
    for (const o of overdueOpps) {
      lines.push(`• ${tgBold(o.company)} — ${o.role}`);
      lines.push(`  ${tgCode(o.stage)} · Due: ${o.followUpDue ? new Date(o.followUpDue).toLocaleDateString() : 'unknown'}`);
    }
    if (overdue.length > 5) lines.push(`\n<i>…and ${overdue.length - 5} more</i>`);
    lines.push('\nmax-ev-holdings.com/pipeline');

    await sendTelegram(lines.join('\n'));
    await slackFields(
      `⏰ ${overdue.length} follow-up(s) overdue`,
      Object.fromEntries(overdueOpps.map(o => [`${o.company}`, `${o.role} · ${o.stage}`])),
      '#D08E14'
    );
  }
}
