import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id }  = await params;
  const body     = await req.json() as { resumeVariant?: string; contactName?: string; contactEmail?: string };
  const now      = new Date();

  const opp = await prisma.opportunity.findUnique({ where: { id } });
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 1. Mark applied
  await prisma.opportunity.update({
    where: { id },
    data: {
      stage:         'applied',
      appliedAt:     now,
      lastActivity:  now,
      resumeVariant: body.resumeVariant ?? 'fde',
    },
  });

  // 2. Log the application
  await prisma.outreachLog.create({
    data: {
      opportunityId: id,
      type:          'email',
      direction:     'sent',
      subject:       'Application submitted',
      sentAt:        now,
      status:        'sent',
      followUpDue:   new Date(now.getTime() + 7 * 86400000),
    },
  });

  // 3. Quick-add contact if provided
  if (body.contactName || body.contactEmail) {
    await prisma.contact.create({
      data: {
        name:          body.contactName ?? 'Unknown',
        email:         body.contactEmail ?? null,
        role:          'recruiter',
        opportunityId: id,
      },
    });
  }

  // 4. Schedule Day 7 + Day 14 follow-up tasks
  await prisma.task.createMany({
    data: [
      { title: `Follow-up Day 7 — ${opp.company}`,  notes: 'Check in on application status', linkedType: 'opportunity', linkedId: id, dueDate: new Date(now.getTime() + 7  * 86400000), priority: 'MEDIUM', status: 'TODO' },
      { title: `Follow-up Day 14 — ${opp.company}`, notes: 'Final follow-up attempt',        linkedType: 'opportunity', linkedId: id, dueDate: new Date(now.getTime() + 14 * 86400000), priority: 'MEDIUM', status: 'TODO' },
    ],
  });

  return NextResponse.json({ ok: true });
}
