import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  await requireAuth();

  const now   = new Date();
  const week  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const two   = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [inboxCount, appliedOpps, contracts, invoices, followUpsDue] = await Promise.all([
    prisma.opportunity.count({ where: { stage: 'inbox' } }),
    prisma.opportunity.findMany({
      where: { stage: { in: ['applied', 'screening', 'interview', 'final', 'offer'] } },
      select: { company: true, role: true, stage: true, lastActivity: true, followUpDue: true, appliedAt: true },
    }),
    prisma.contract.findMany({ where: { status: 'active' } }),
    prisma.invoice.findMany({ where: { status: { in: ['sent', 'viewed', 'overdue'] } } }),
    prisma.opportunity.count({ where: { followUpDue: { lte: now }, stage: { notIn: ['inbox', 'rejected', 'withdrawn', 'accepted'] } } }),
  ]);

  const mrr = contracts.reduce((sum, c) => {
    if (c.rateType === 'hourly') return sum + (c.rate * (c.hoursPerWeek ?? 0) * 52) / 12;
    if (c.rateType === 'monthly') return sum + c.rate;
    if (c.rateType === 'weekly') return sum + c.rate * 4.33;
    return sum;
  }, 0);

  const weeklyApplications = await prisma.opportunity.count({ where: { appliedAt: { gte: week } } });
  const staleApplications  = appliedOpps.filter(o => {
    const lastAct = o.lastActivity || o.appliedAt;
    if (!lastAct) return false;
    return new Date(lastAct).getTime() < two.getTime();
  }).length;

  const offersActive = await prisma.opportunity.count({ where: { stage: 'offer' } });

  const vitals = {
    inboxCount, appliedCount: appliedOpps.length,
    activeContracts: contracts.length, mrr: Math.round(mrr),
    followUpsDue, offersActive, staleApplications, weeklyApplications,
  };

  const prompt = `You are an AI career operations advisor. Write a concise morning intelligence brief (3-4 paragraphs) for Will Austin, an FDE/AI engineer running an active job search while managing freelance contracts.

Current pipeline snapshot:
- Inbox: ${inboxCount} new opportunities awaiting review
- Active applications: ${appliedOpps.length} (${weeklyApplications} applied this week)
- Follow-ups due today: ${followUpsDue}
- Stale applications (14d+ no activity): ${staleApplications}
- Active offers: ${offersActive}
- Active contracts: ${contracts.length}, Contract MRR: $${Math.round(mrr).toLocaleString()}/mo
- Outstanding invoices: ${invoices.length}

Focus on: what needs immediate attention today, any patterns worth noting, and one strategic insight. Be direct and specific. No pleasantries.`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const briefing = msg.content[0].type === 'text' ? msg.content[0].text : '';

  const actionsPrompt = `Based on this career ops snapshot, list exactly 3 urgent actions for today. Be specific — name companies or role types where possible.

Inbox: ${inboxCount} unreviewed | Follow-ups due: ${followUpsDue} | Stale apps: ${staleApplications} | Active offers: ${offersActive}

Return only a numbered list, 1 sentence each.`;

  const actMsg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: actionsPrompt }],
  });

  const actionsText = actMsg.content[0].type === 'text' ? actMsg.content[0].text : '';
  const urgentActions = actionsText
    .split(/\n/)
    .filter(l => l.match(/^\d+[.)]/))
    .map(l => l.replace(/^\d+[.)\s]+/, '').trim())
    .slice(0, 3);

  return NextResponse.json({ briefing, urgentActions, patterns: [], vitals });
}
