import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegram, tgBold, tgCode } from '@/lib/telegram';

const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function isAuthorized(chatId: number | string): boolean {
  return String(chatId) === String(CHAT_ID);
}

async function handleCommand(cmd: string, args: string): Promise<string> {
  const now    = new Date();
  const stale  = new Date(now.getTime() - 14 * 86400000);

  if (cmd === '/start' || cmd === '/help') {
    return [
      tgBold('MAX-DEPLOY Career OS'),
      '',
      'Available commands:',
      tgCode('/inbox')     + ' — Top scored opportunities waiting for review',
      tgCode('/pipeline')  + ' — Active applications by stage',
      tgCode('/tasks')     + ' — Due and overdue tasks',
      tgCode('/followups') + ' — Applications with follow-ups due',
      tgCode('/brief')     + ' — Generate a fresh daily briefing',
      tgCode('/earnings')  + ' — MRR and active contracts',
      tgCode('/score [url]') + ' — Score a job URL',
    ].join('\n');
  }

  if (cmd === '/inbox') {
    const limit = parseInt(args) || 8;
    const opps = await prisma.opportunity.findMany({
      where: { stage: 'inbox' },
      orderBy: { fitScore: 'desc' },
      take: limit,
    });
    if (!opps.length) return '📭 Inbox is empty.';
    const lines = [`${tgBold(`Inbox — ${opps.length} opportunities`)}`, ''];
    for (const o of opps) {
      const score = o.fitScore ?? '?';
      const action = o.recommendedAction?.replace(/_/g, ' ') ?? '';
      lines.push(`• ${tgBold(o.company)} — ${o.role}`);
      lines.push(`  Score: <code>${score}</code> ${action ? `· ${action}` : ''}`);
    }
    return lines.join('\n');
  }

  if (cmd === '/pipeline') {
    const opps = await prisma.opportunity.findMany({
      where: { stage: { in: ['target', 'applied', 'screening', 'interview', 'final', 'offer'] } },
      orderBy: { stage: 'asc' },
    });
    if (!opps.length) return '📋 No active applications.';
    const byStage: Record<string, typeof opps> = {};
    for (const o of opps) { (byStage[o.stage] ??= []).push(o); }
    const lines = [`${tgBold(`Pipeline — ${opps.length} active`)}\n`];
    for (const [stage, list] of Object.entries(byStage)) {
      lines.push(`${tgBold(stage.toUpperCase())} (${list.length})`);
      for (const o of list) lines.push(`  · ${o.company} — ${o.role}`);
    }
    return lines.join('\n');
  }

  if (cmd === '/tasks') {
    const tasks = await prisma.task.findMany({
      where: { status: { not: 'DONE' }, dueDate: { lte: now } },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      take: 10,
    });
    if (!tasks.length) return '✅ No overdue tasks.';
    const lines = [`${tgBold(`Tasks — ${tasks.length} due/overdue`)}\n`];
    for (const t of tasks) {
      const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'no date';
      lines.push(`• [${t.priority}] ${t.title}`);
      lines.push(`  Due: ${due} · ${t.status}`);
    }
    return lines.join('\n');
  }

  if (cmd === '/followups') {
    const opps = await prisma.opportunity.findMany({
      where: {
        stage: { in: ['applied', 'screening', 'interview', 'final'] },
        followUpDue: { lte: now },
      },
      orderBy: { followUpDue: 'asc' },
      take: 10,
    });
    if (!opps.length) return '✅ No follow-ups due.';
    const lines = [`${tgBold(`Follow-ups due — ${opps.length}`)}\n`];
    for (const o of opps) {
      const due = o.followUpDue ? new Date(o.followUpDue).toLocaleDateString() : '';
      lines.push(`• ${o.company} — ${o.role}`);
      lines.push(`  Stage: ${o.stage} · Due: ${due}`);
    }
    return lines.join('\n');
  }

  if (cmd === '/earnings') {
    const contracts = await prisma.contract.findMany({ where: { status: 'active' } });
    const invoices  = await prisma.invoice.findMany({ where: { status: { in: ['overdue', 'pending'] } } });
    const mrr = contracts.reduce((s, c) => {
      if (c.rateType === 'monthly') return s + c.rate;
      if (c.rateType === 'weekly')  return s + c.rate * 4.33;
      if (c.rateType === 'hourly' && c.hoursPerWeek) return s + c.rate * c.hoursPerWeek * 4.33;
      return s;
    }, 0);
    const ar = invoices.reduce((s, i) => s + i.total, 0);
    return [
      tgBold('Earnings Snapshot'),
      '',
      `MRR: ${tgCode(`$${Math.round(mrr).toLocaleString()}`)}`,
      `Active Contracts: ${tgCode(String(contracts.length))}`,
      `Outstanding AR: ${tgCode(`$${ar.toLocaleString()}`)} (${invoices.length} invoices)`,
    ].join('\n');
  }

  if (cmd === '/brief') {
    // Trigger a fresh briefing generation
    const inboxCount = await prisma.opportunity.count({ where: { stage: 'inbox' } });
    const active     = await prisma.opportunity.count({ where: { stage: { in: ['applied','screening','interview','final','offer'] } } });
    const followUps  = await prisma.opportunity.count({ where: { followUpDue: { lte: now }, stage: { in: ['applied','screening','interview','final'] } } });
    const tasksDue   = await prisma.task.count({ where: { status: { not: 'DONE' }, dueDate: { lte: now } } });
    const staleApps  = await prisma.opportunity.count({ where: { stage: { in: ['applied','screening','interview','final'] }, lastActivity: { lt: stale } } });
    return [
      tgBold('📋 Quick Brief'),
      '',
      `📥 Inbox: ${tgCode(String(inboxCount))} unreviewed`,
      `🎯 Pipeline: ${tgCode(String(active))} active applications`,
      `⏰ Follow-ups due: ${tgCode(String(followUps))}`,
      `✅ Tasks overdue: ${tgCode(String(tasksDue))}`,
      `⚠️ Stale (14d+): ${tgCode(String(staleApps))}`,
      '',
      `<i>Check dashboard for full AI briefing → max-ev-holdings.com</i>`,
    ].join('\n');
  }

  return `Unknown command: ${tgCode(cmd)}\n\nSend ${tgCode('/help')} for available commands.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      message?: {
        chat: { id: number };
        text?: string;
        from?: { first_name?: string };
      };
    };

    const message = body.message;
    if (!message?.text || !isAuthorized(message.chat.id)) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    const [rawCmd, ...argParts] = text.split(' ');
    const cmd  = rawCmd.toLowerCase().split('@')[0]; // strip bot name if present
    const args = argParts.join(' ');

    const reply = await handleCommand(cmd, args);
    await sendTelegram(reply);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[telegram webhook]', err);
    return NextResponse.json({ ok: true }); // always 200 to Telegram
  }
}

// Telegram verifies the webhook with a GET
export async function GET() {
  return NextResponse.json({ ok: true, service: 'MAX-DEPLOY Telegram Webhook' });
}
