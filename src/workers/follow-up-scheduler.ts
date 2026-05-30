import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { sendTelegramButtons, tgBold, tgCode, tgItalic } from '../lib/telegram';
import { slackFields } from '../lib/slack';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FOLLOW_UP_DAYS: Record<string, number> = {
  applied:   7,
  screening: 5,
  interview: 3,
  final:     2,
  offer:     1,
};

export async function scheduleFollowUps() {
  const now = new Date();

  // Set followUpDue on any active application that doesn't have one yet
  const activeOpps = await prisma.opportunity.findMany({
    where: { stage: { in: Object.keys(FOLLOW_UP_DAYS) }, followUpDue: null },
    select: { id: true, stage: true, lastActivity: true, appliedAt: true },
  });

  let scheduled = 0;
  for (const opp of activeOpps) {
    const days        = FOLLOW_UP_DAYS[opp.stage] ?? 7;
    const baseDate    = opp.lastActivity ?? opp.appliedAt ?? now;
    const followUpDue = new Date(baseDate.getTime() + days * 86400000);
    if (followUpDue > now) {
      await prisma.opportunity.update({ where: { id: opp.id }, data: { followUpDue } });
      scheduled++;
    }
  }

  // Find overdue follow-ups
  const overdueOpps = await prisma.opportunity.findMany({
    where: { stage: { in: Object.keys(FOLLOW_UP_DAYS) }, followUpDue: { lt: now } },
    orderBy: { followUpDue: 'asc' },
    take: 10,
  });

  console.log(`[followup] Scheduled ${scheduled} follow-ups. ${overdueOpps.length} overdue.`);

  if (!overdueOpps.length) return;

  // Send each overdue as its own Telegram button card (max 5 to avoid spam)
  for (const opp of overdueOpps.slice(0, 5)) {
    const daysOverdue = Math.floor((now.getTime() - (opp.followUpDue?.getTime() ?? now.getTime())) / 86400000);
    const dueStr      = daysOverdue > 0 ? `${daysOverdue}d overdue` : 'due today';

    await sendTelegramButtons(
      [
        `⏰ ${tgBold('Follow-up Due')} — ${tgCode(dueStr)}`,
        `${tgBold(opp.company)} — ${opp.role}`,
        `Stage: ${tgCode(opp.stage)}`,
        tgItalic('Tap to draft a follow-up email with Claude.'),
      ].join('\n'),
      [[
        { text: '✍️ Draft Follow-up', callback_data: `followup:${opp.id}` },
        { text: '⏭ Skip',            callback_data: `skip_followup:${opp.id}` },
      ]]
    );
  }

  if (overdueOpps.length > 5) {
    await sendTelegramButtons(
      `⏰ ${tgBold(`${overdueOpps.length - 5} more`)} follow-ups overdue — check pipeline`,
      [[{ text: '📋 View Pipeline', callback_data: 'open_pipeline' }]]
    );
  }

  // Slack summary
  await slackFields(
    `⏰ ${overdueOpps.length} follow-up(s) overdue`,
    Object.fromEntries(overdueOpps.slice(0, 5).map(o => [`${o.company}`, `${o.role} · ${o.stage}`])),
    '#D08E14'
  );
}

// Called by Telegram webhook when user taps [Draft Follow-up]
export async function draftFollowUpEmail(oppId: string): Promise<string | null> {
  const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
  if (!opp) return null;

  const stage = opp.stage;
  const daysSince = opp.appliedAt
    ? Math.floor((Date.now() - new Date(opp.appliedAt).getTime()) / 86400000)
    : 7;

  const isFirst  = daysSince <= 10;
  const isFinal  = daysSince > 14;
  const tone     = isFinal ? 'final polite check-in' : isFirst ? 'Day 7 check-in' : 'second follow-up';

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 500,
      messages: [{ role: 'user', content: `Write a ${tone} follow-up email for Will Austin.

Company: ${opp.company}
Role: ${opp.role}
Stage: ${stage}
Applied: ~${daysSince} days ago

Instructions:
- 2-3 sentences max
- Professional, not desperate
- Reference the specific role
- Ask if there's an update on their timeline
- ${isFinal ? 'Signal this is the final outreach' : 'Keep the door open for next steps'}
- Sign off as Will Austin

Return ONLY the email body, no subject, no JSON.` }],
    });

    const draft = (msg.content[0] as { type: string; text: string }).text.trim();
    // Mark followUpDue as snoozed +7 days to prevent re-alerting
    await prisma.opportunity.update({
      where: { id: oppId },
      data: { followUpDue: new Date(Date.now() + 7 * 86400000) },
    });
    return draft;
  } catch { return null; }
}
