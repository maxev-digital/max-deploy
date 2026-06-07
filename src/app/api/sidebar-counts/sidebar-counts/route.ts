import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  await requireAuth();

  const now      = new Date();
  const stale14  = new Date(now.getTime() - 14 * 86400000);
  const days30   = new Date(now.getTime() + 30 * 86400000);

  const [
    inboxUnscored,
    followUpsDue,
    staleApps,
    unreadEmails,
    draftOutreach,
    overdueInvoices,
    expiringContracts,
    tasksDue,
  ] = await Promise.all([
    // Inbox: opportunities in inbox with no fit score yet
    prisma.opportunity.count({
      where: { stage: 'inbox', fitScore: null },
    }),

    // Pipeline: active applications with follow-up due
    prisma.opportunity.count({
      where: {
        stage: { in: ['target', 'applied', 'screening', 'interview', 'final', 'offer'] },
        followUpDue: { lte: now },
      },
    }),

    // Monitor: active applications with no activity in 14+ days
    prisma.opportunity.count({
      where: {
        stage: { in: ['applied', 'screening', 'interview', 'final'] },
        lastActivity: { lt: stale14 },
      },
    }),

    // Email: unread messages in INBOX
    prisma.emailMessage.count({
      where: { folder: 'INBOX', isRead: false },
    }).catch(() => 0),

    // Outreach: unsent drafts
    prisma.outreachLog.count({
      where: { status: 'draft' },
    }),

    // Invoices: overdue or pending invoices
    prisma.invoice.count({
      where: { status: { in: ['overdue', 'pending'] } },
    }),

    // Contracts: active contracts expiring within 30 days
    prisma.contract.count({
      where: {
        status: 'active',
        endDate: { lte: days30, gte: now },
      },
    }),

    // Tasks: incomplete tasks that are due or overdue
    prisma.task.count({
      where: {
        status: { not: 'DONE' },
        dueDate: { lte: now },
      },
    }),
  ]);

  return NextResponse.json({
    inbox:     inboxUnscored,
    pipeline:  followUpsDue,
    monitor:   staleApps,
    email:     unreadEmails,
    outreach:  draftOutreach,
    invoices:  overdueInvoices,
    contracts: expiringContracts,
    tasks:     tasksDue,
  });
}
