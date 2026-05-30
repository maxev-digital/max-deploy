import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import nodemailer from 'nodemailer';
import { sendTelegram, tgBold, tgCode } from '../lib/telegram';
import { slackAlert } from '../lib/slack';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateDailyBriefing() {
  const now   = new Date();
  const week  = new Date(now.getTime() - 7 * 86400000);

  const [inboxCount, activeOpps, contracts, overdueInvoices, followUpsDue] = await Promise.all([
    prisma.opportunity.count({ where: { stage: 'inbox' } }),
    prisma.opportunity.findMany({
      where: { stage: { in: ['applied', 'screening', 'interview', 'final', 'offer'] } },
      select: { company: true, role: true, stage: true, followUpDue: true, lastActivity: true },
    }),
    prisma.contract.findMany({ where: { status: 'active' }, select: { client: true, rate: true, rateType: true, endDate: true } }),
    prisma.invoice.findMany({ where: { status: 'overdue' }, select: { client: true, total: true } }),
    prisma.opportunity.count({ where: { followUpDue: { lte: now }, stage: { notIn: ['inbox', 'dead', 'accepted', 'rejected', 'withdrawn'] } } }),
  ]);

  const hotLeads = activeOpps.filter(o => o.stage === 'offer' || o.stage === 'final').map(o => `${o.company} (${o.stage})`);
  const staleApps = activeOpps.filter(o => o.lastActivity && o.lastActivity < week).map(o => `${o.company} — ${o.role}`);

  const context = `
Active pipeline: ${activeOpps.length} applications (${inboxCount} in inbox)
Stages: ${['applied','screening','interview','final','offer'].map(s => `${s}: ${activeOpps.filter(o => o.stage === s).length}`).join(', ')}
Hot/final-stage: ${hotLeads.join(', ') || 'none'}
Follow-ups due today: ${followUpsDue}
Stale (7d+ no activity): ${staleApps.length > 0 ? staleApps.slice(0, 3).join(', ') : 'none'}
Active contracts: ${contracts.length} (MRR: $${contracts.filter(c => c.rateType === 'monthly').reduce((s, c) => s + c.rate, 0).toLocaleString()})
Overdue invoices: ${overdueInvoices.length} ($${overdueInvoices.reduce((s, i) => s + i.total, 0).toLocaleString()})
`.trim();

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: 'You are a sharp career operations manager. Generate concise morning briefings for an FDE job search. Be direct and action-oriented.',
    messages: [{ role: 'user', content: `Generate a morning briefing based on this data:\n\n${context}\n\nWrite 4-6 bullet points. Lead with urgent items. Each bullet starts with an action verb. Flag anything critical.` }],
  });

  const briefingText = (msg.content[0] as { type: string; text: string }).text;
  console.log('[briefing] Generated:\n', briefingText);

  // Push to Telegram
  const tgMsg = [
    tgBold('📋 MAX-DEPLOY Daily Brief'),
    tgCode(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })),
    '',
    briefingText.replace(/\*\*/g, ''),
  ].join('\n');
  await sendTelegram(tgMsg);

  // Push to Slack
  await slackAlert(
    `📋 Daily Brief — ${now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
    briefingText.replace(/\*\*/g, ''),
    '#2563EB'
  );

  // Email the briefing if SMTP is configured
  try {
    const account = await prisma.emailAccount.findFirst({ where: { isActive: true } });
    if (account?.smtpPass) {
      const transporter = nodemailer.createTransport({
        host: account.smtpHost, port: account.smtpPort,
        secure: account.smtpPort === 465,
        auth: { user: account.smtpUser, pass: account.smtpPass },
      });
      await transporter.sendMail({
        from:    `"MAX-DEPLOY" <${account.email}>`,
        to:      account.email,
        subject: `Daily Briefing — ${now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
        text:    briefingText,
        html:    `<pre style="font-family:system-ui;line-height:1.8;font-size:14px">${briefingText}</pre>`,
      });
      console.log('[briefing] Emailed to', account.email);
    }
  } catch (e) {
    console.error('[briefing] Email failed:', (e as Error).message);
  }
}
