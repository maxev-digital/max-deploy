import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import {
  sendTelegram, sendTelegramButtons, sendTelegramDocument,
  editTelegramMessage, answerCallbackQuery,
  tgBold, tgCode, tgItalic, tgLink, applyButtons, confirmApplyButtons,
} from '@/lib/telegram';
import { buildCoverLetterHtml } from '@/lib/cover-letter';
import { draftFollowUpEmail } from '@/workers/follow-up-scheduler';
import { generateCoverLetterPdf } from '@/lib/generate-pdf';

const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BASE_URL  = process.env.NEXTAUTH_URL ?? 'https://max-ev-holdings.com';

function isAuthorized(chatId: number | string) { return String(chatId) === String(CHAT_ID); }

// ─── Callback actions (button taps) ───────────────────────────────────────────

async function handleApply(oppId: string, callbackQueryId: string, messageId: number) {
  await answerCallbackQuery(callbackQueryId, 'Drafting cover letter…');
  await editTelegramMessage(messageId, '⏳ Drafting cover letter…', []);

  const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
  if (!opp) { await editTelegramMessage(messageId, '❌ Opportunity not found.'); return; }
  if (!opp.jdText) {
    await editTelegramMessage(messageId, `❌ No JD text for ${opp.company} — open inbox to draft manually.\n${BASE_URL}/inbox`);
    return;
  }

  try {
    const isFde = ['FDE','Forward Deployed','Applied AI','Solutions Engineer','AI Platform','Agentic']
      .some(kw => opp.role.toLowerCase().includes(kw.toLowerCase()) || (opp.classification ?? '').includes('FDE'));

    const fdeSuffix = isFde ? '\n\nFor FDE roles weave in Will\'s 7-step framework: Discovery→Scope→Architecture→Agentic Build→Validate→Deploy→Iterate. Bias for shipping, AI as primary teammate, end-to-end accountability.' : '';

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1400,
      messages: [{ role: 'user', content: `Write a targeted cover letter for Will Austin.\n\nCANDIDATE: AI-native FDE engineer. 6 FDE engagements, 14 production AI endpoints, 13 platforms, former GM/GC. Skills: Next.js, TypeScript, Python, Claude API, MCP, BullMQ, Docker, Twilio, HubSpot. Open to remote or DFW hybrid.${ fdeSuffix }\n\nJOB: ${opp.company} — ${opp.role}\n${opp.jdText.slice(0, 3500)}\n\nReturn ONLY valid JSON:\n{"headerTitle":"Role · Company","subjectText":"Role — Company · salary","intro":"2-3 sentence opener referencing specific JD details. HTML <strong> ok.","bullets":["<strong>Label —</strong> specific detail","same","same"],"closingLine":"1 sentence availability/location close."}` }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const cfg = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
    const html = buildCoverLetterHtml({ company: opp.company, role: opp.role, showFdeFramework: isFde, ...cfg });

    // Save HTML first so /api/render/[id] can serve it for Chromium
    const existing = (opp.analysisJson as Record<string, unknown>) ?? {};
    await prisma.opportunity.update({
      where: { id: oppId },
      data: { analysisJson: { ...existing, coverLetterHtml: html, coverLetterConfig: cfg } },
    });

    // Generate PDF via localhost so Google Fonts load correctly
    const pdfPath = await generateCoverLetterPdf(oppId);

    await prisma.opportunity.update({
      where: { id: oppId },
      data: {
        coverLetterUrl: pdfPath ?? `/cover-letter/${oppId}`,
        analysisJson:   { ...existing, coverLetterHtml: html, coverLetterConfig: cfg, coverLetterPdf: pdfPath },
      },
    });

    const salaryStr     = opp.salaryMin ? `$${Math.round(opp.salaryMin/1000)}k${opp.salaryMax ? `–$${Math.round(opp.salaryMax/1000)}k` : '+'}` : 'salary undisclosed';
    const resumeVariant = (opp.classification ?? '').includes('Marketing') ? 'slingshot' : 'fde';
    const resumeLabel   = resumeVariant === 'slingshot' ? 'Slingshot Resume' : 'FDE Resume';

    await editTelegramMessage(messageId, `✅ Docs ready — ${tgBold(opp.company)}`);

    // Send cover letter as a Telegram document — iOS: tap → Share → upload directly to ATS
    if (pdfPath) {
      const { join } = await import('path');
      const localPdf = join(process.cwd(), 'public', pdfPath);
      await sendTelegramDocument(
        localPdf,
        `will-austin-cover-letter-${opp.company.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`,
        `📄 Cover Letter — ${opp.company}\n${tgItalic('Tap → Share → upload to ATS')}`,
      );
    }

    // Send resume as a Telegram document
    const { join } = await import('path');
    const resumePath = join(process.cwd(), 'public', 'resumes', `${resumeVariant}.pdf`);
    await sendTelegramDocument(
      resumePath,
      `will-austin-${resumeVariant}-resume.pdf`,
      `📎 ${resumeLabel}\n${tgItalic('Tap → Share → upload to ATS')}`,
    );

    // Final message with apply URL + confirm buttons
    const lines = [
      `📋 ${tgBold('Application Kit Ready')}`,
      `${tgBold(opp.company)} — ${opp.role}`,
      salaryStr,
      '',
      opp.applyUrl ? tgLink('🔗 Open Application Form', opp.applyUrl) : '',
      '',
      tgItalic('Review docs above, open form, upload both PDFs, then tap Mark Applied.'),
    ].filter(Boolean).join('\n');

    await sendTelegramButtons(lines, confirmApplyButtons(oppId));
  } catch (e) {
    await editTelegramMessage(messageId, `❌ Draft failed: ${(e as Error).message}`);
  }
}

async function handleSkip(oppId: string, callbackQueryId: string, messageId: number) {
  await answerCallbackQuery(callbackQueryId, 'Skipped');
  await prisma.opportunity.update({ where: { id: oppId }, data: { stage: 'rejected', lastActivity: new Date() } });
  const opp = await prisma.opportunity.findUnique({ where: { id: oppId }, select: { company: true, role: true } });
  await editTelegramMessage(messageId, `⏭ Skipped — ${opp?.company ?? ''} · ${opp?.role ?? ''}`);
}

async function handleLater(oppId: string, callbackQueryId: string, messageId: number) {
  await answerCallbackQuery(callbackQueryId, 'Snoozed 48h');
  const snoozeDate = new Date(Date.now() + 48 * 3600000);
  await prisma.opportunity.update({ where: { id: oppId }, data: { followUpDue: snoozeDate } });
  const opp = await prisma.opportunity.findUnique({ where: { id: oppId }, select: { company: true, role: true } });
  await editTelegramMessage(messageId,
    `🕐 Snoozed — ${opp?.company ?? ''} · ${opp?.role ?? ''}\nResurfaces ${snoozeDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`,
  );
}

async function handleConfirmApply(oppId: string, callbackQueryId: string, messageId: number) {
  await answerCallbackQuery(callbackQueryId, '✅ Marked Applied!');
  const now = new Date();

  await prisma.opportunity.update({ where: { id: oppId }, data: { stage: 'applied', appliedAt: now, lastActivity: now } });

  await prisma.outreachLog.create({
    data: { opportunityId: oppId, type: 'email', direction: 'sent', subject: 'Application submitted', sentAt: now, status: 'sent', followUpDue: new Date(now.getTime() + 7 * 86400000) },
  });

  await prisma.task.createMany({
    data: [
      { title: 'Follow-up Day 7',  notes: 'Check in on application status', linkedType: 'opportunity', linkedId: oppId, dueDate: new Date(now.getTime() + 7  * 86400000), priority: 'MEDIUM', status: 'TODO' },
      { title: 'Follow-up Day 14', notes: 'Final follow-up attempt',        linkedType: 'opportunity', linkedId: oppId, dueDate: new Date(now.getTime() + 14 * 86400000), priority: 'MEDIUM', status: 'TODO' },
    ],
  });

  const opp = await prisma.opportunity.findUnique({ where: { id: oppId }, select: { company: true, role: true } });
  await editTelegramMessage(messageId,
    `✅ ${tgBold('Applied!')} — ${opp?.company ?? ''} · ${opp?.role ?? ''}\n\n📅 Follow-ups scheduled: Day 7 + Day 14\n${tgItalic('Good luck!')}`,
  );
}

async function handleRespond(oppId: string, callbackQueryId: string, messageId: number) {
  await answerCallbackQuery(callbackQueryId, 'Drafting reply…');
  await editTelegramMessage(messageId, '⏳ Drafting reply to recruiter…', []);

  const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
  if (!opp) { await editTelegramMessage(messageId, '❌ Opportunity not found.'); return; }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 600,
      messages: [{ role: 'user', content: `Draft a concise, professional reply to this recruiter outreach for Will Austin.

ROLE: ${opp.role ?? 'the role'}
COMPANY: ${opp.company}
JD PREVIEW: ${(opp.jdText ?? '').slice(0, 1000)}

Will Austin is actively interested. Write a 3-4 sentence reply:
- Confirm genuine interest
- Highlight 1-2 relevant strengths (FDE experience, AI platforms, client delivery)
- Ask for next steps or a call

Return ONLY the email body text, no subject line, no JSON.` }],
    });

    const draft = (msg.content[0] as { type: string; text: string }).text.trim();
    await editTelegramMessage(messageId, `✅ Reply drafted — ${tgBold(opp.company)}`);

    await sendTelegram(
      `📧 ${tgBold('Recruiter Reply Draft')}\n${opp.company} — ${opp.role}\n\n${draft}\n\n${tgItalic('Copy this, go to /email, and send from there.')}`
    );
  } catch (e) {
    await editTelegramMessage(messageId, `❌ Draft failed: ${(e as Error).message}`);
  }
}

async function handleFollowUp(oppId: string, callbackQueryId: string, messageId: number) {
  await answerCallbackQuery(callbackQueryId, 'Drafting follow-up…');
  await editTelegramMessage(messageId, '⏳ Drafting follow-up email…', []);
  const draft = await draftFollowUpEmail(oppId);
  const opp   = await prisma.opportunity.findUnique({ where: { id: oppId }, select: { company: true, role: true } });
  if (!draft) { await editTelegramMessage(messageId, '❌ Draft failed.'); return; }
  await editTelegramMessage(messageId, `✍️ Follow-up drafted — ${tgBold(opp?.company ?? '')}`);
  await sendTelegram(
    `📧 ${tgBold('Follow-up Draft')}\n${opp?.company ?? ''} — ${opp?.role ?? ''}\n\n${draft}\n\n${tgItalic('Copy this and send from max-ev-holdings.com/email')}`
  );
}

async function handleSkipFollowUp(oppId: string, callbackQueryId: string, messageId: number) {
  await answerCallbackQuery(callbackQueryId, 'Snoozed 7d');
  await prisma.opportunity.update({ where: { id: oppId }, data: { followUpDue: new Date(Date.now() + 7 * 86400000) } });
  const opp = await prisma.opportunity.findUnique({ where: { id: oppId }, select: { company: true } });
  await editTelegramMessage(messageId, `⏭ Follow-up skipped — ${opp?.company ?? ''} (snoozed 7d)`);
}

async function handleCancel(oppId: string, callbackQueryId: string, messageId: number) {
  await answerCallbackQuery(callbackQueryId, 'Cancelled');
  const opp = await prisma.opportunity.findUnique({ where: { id: oppId }, select: { company: true, role: true } });
  await editTelegramMessage(
    messageId,
    `↩️ Cancelled — ${opp?.company ?? ''} · ${opp?.role ?? ''}\nReturned to inbox.`,
    applyButtons(oppId)
  );
}

// ─── Text commands ─────────────────────────────────────────────────────────────

async function handleCommand(cmd: string, args: string): Promise<string> {
  const now   = new Date();
  const stale = new Date(now.getTime() - 14 * 86400000);

  if (cmd === '/start' || cmd === '/help') {
    return [
      tgBold('MAX-DEPLOY — Autonomous FDE Agent'),
      '',
      'Commands:',
      `${tgCode('/inbox')}     — Top opportunities with Apply buttons`,
      `${tgCode('/pipeline')}  — Active applications by stage`,
      `${tgCode('/tasks')}     — Overdue tasks`,
      `${tgCode('/followups')} — Follow-ups due`,
      `${tgCode('/brief')}     — Quick pipeline snapshot`,
      `${tgCode('/earnings')}  — MRR + contracts`,
    ].join('\n');
  }

  if (cmd === '/inbox') {
    const limit = Math.min(parseInt(args) || 5, 10);
    const opps = await prisma.opportunity.findMany({
      where: { stage: 'inbox', fitScore: { gte: 70 } },
      orderBy: { fitScore: 'desc' },
      take: limit,
    });
    if (!opps.length) return '📭 No 70+ opportunities in inbox right now.';
    for (const o of opps) {
      const sal = o.salaryMin ? `$${Math.round(o.salaryMin/1000)}k+` : 'N/A';
      await sendTelegramButtons(
        `🎯 ${tgBold(o.company)} — ${o.role}\n${tgCode(String(o.fitScore ?? '?'))} · ${o.classification ?? ''} · ${sal}`,
        applyButtons(o.id), true
      );
    }
    return `Sent ${opps.length} top opportunities ↑`;
  }

  if (cmd === '/pipeline') {
    const opps = await prisma.opportunity.findMany({
      where: { stage: { in: ['target','applied','screening','interview','final','offer'] } },
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
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }], take: 10,
    });
    if (!tasks.length) return '✅ No overdue tasks.';
    return [`${tgBold(`Tasks — ${tasks.length} due`)}\n`, ...tasks.map(t => `• [${t.priority}] ${t.title} · ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '?'}`)].join('\n');
  }

  if (cmd === '/followups') {
    const opps = await prisma.opportunity.findMany({
      where: { stage: { in: ['applied','screening','interview','final'] }, followUpDue: { lte: now } },
      orderBy: { followUpDue: 'asc' }, take: 10,
    });
    if (!opps.length) return '✅ No follow-ups due.';
    return [`${tgBold(`Follow-ups — ${opps.length}`)}\n`, ...opps.map(o => `• ${o.company} — ${o.role}\n  ${o.stage} · due ${o.followUpDue ? new Date(o.followUpDue).toLocaleDateString() : '?'}`)].join('\n');
  }

  if (cmd === '/earnings') {
    const contracts = await prisma.contract.findMany({ where: { status: 'active' } });
    const invoices  = await prisma.invoice.findMany({ where: { status: { in: ['overdue','sent'] } } });
    const mrr = contracts.reduce((s, c) => {
      if (c.rateType === 'monthly') return s + c.rate;
      if (c.rateType === 'weekly')  return s + c.rate * 4.33;
      if (c.rateType === 'hourly' && c.hoursPerWeek) return s + c.rate * c.hoursPerWeek * 4.33;
      return s;
    }, 0);
    const ar = invoices.reduce((s, i) => s + i.total, 0);
    return [`${tgBold('Earnings')}`, `MRR: ${tgCode(`$${Math.round(mrr).toLocaleString()}`)}`, `Contracts: ${tgCode(String(contracts.length))}`, `AR: ${tgCode(`$${ar.toLocaleString()}`)} (${invoices.length} invoices)`].join('\n');
  }

  if (cmd === '/brief') {
    const inboxCount = await prisma.opportunity.count({ where: { stage: 'inbox' } });
    const active     = await prisma.opportunity.count({ where: { stage: { in: ['applied','screening','interview','final','offer'] } } });
    const followUps  = await prisma.opportunity.count({ where: { followUpDue: { lte: now }, stage: { in: ['applied','screening','interview','final'] } } });
    const tasksDue   = await prisma.task.count({ where: { status: { not: 'DONE' }, dueDate: { lte: now } } });
    const staleApps  = await prisma.opportunity.count({ where: { stage: { in: ['applied','screening','interview','final'] }, lastActivity: { lt: stale } } });
    return [`${tgBold('📋 Brief')}`, `📥 Inbox: ${tgCode(String(inboxCount))}`, `🎯 Pipeline: ${tgCode(String(active))}`, `⏰ Follow-ups: ${tgCode(String(followUps))}`, `✅ Tasks due: ${tgCode(String(tasksDue))}`, `⚠️ Stale: ${tgCode(String(staleApps))}`, `\n${tgItalic(BASE_URL)}`].join('\n');
  }

  return `Unknown command: ${tgCode(cmd)}  —  ${tgCode('/help')}`;
}

// ─── Router ────────────────────────────────────────────────────────────────────

type TelegramUpdate = {
  message?: { chat: { id: number }; message_id: number; text?: string };
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { message_id: number; chat: { id: number } };
    data?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as TelegramUpdate;

    if (body.callback_query) {
      const cq        = body.callback_query;
      const chatId    = cq.message?.chat.id ?? cq.from.id;
      const messageId = cq.message?.message_id;

      if (!isAuthorized(chatId)) {
        await answerCallbackQuery(cq.id, '🚫 Unauthorized');
        return NextResponse.json({ ok: true });
      }

      const [action, oppId] = (cq.data ?? '').split(':');
      if (!oppId || !messageId) { await answerCallbackQuery(cq.id, '⚠️ Invalid'); return NextResponse.json({ ok: true }); }

      if      (action === 'apply')         await handleApply(oppId, cq.id, messageId);
      else if (action === 'skip')          await handleSkip(oppId, cq.id, messageId);
      else if (action === 'later')         await handleLater(oppId, cq.id, messageId);
      else if (action === 'confirm_apply') await handleConfirmApply(oppId, cq.id, messageId);
      else if (action === 'cancel')        await handleCancel(oppId, cq.id, messageId);
      else if (action === 'respond')        await handleRespond(oppId, cq.id, messageId);
      else if (action === 'followup')       await handleFollowUp(oppId, cq.id, messageId);
      else if (action === 'skip_followup')  await handleSkipFollowUp(oppId, cq.id, messageId);
      else if (action === 'open_pipeline')  { await answerCallbackQuery(cq.id); await sendTelegram(`Pipeline → ${BASE_URL}/pipeline`); }
      else                                  await answerCallbackQuery(cq.id, 'Unknown action');

      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    if (!message?.text || !isAuthorized(message.chat.id)) return NextResponse.json({ ok: true });

    const [rawCmd, ...argParts] = message.text.trim().split(' ');
    const reply = await handleCommand(rawCmd.toLowerCase().split('@')[0], argParts.join(' '));
    await sendTelegram(reply);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[telegram webhook]', err);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'MAX-DEPLOY Telegram Webhook' });
}
