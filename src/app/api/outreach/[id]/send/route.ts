import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import nodemailer from 'nodemailer';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const log = await prisma.outreachLog.findUnique({
    where: { id },
    include: { opportunity: { include: { contacts: true } } },
  });

  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const toEmail = log.opportunity.contacts.find(c => c.email)?.email;
  if (!toEmail) {
    await prisma.outreachLog.update({ where: { id }, data: { status: 'sent', sentAt: new Date() } });
    return NextResponse.json({ ok: true, note: 'No contact email — marked sent manually' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: log.subject ?? `Re: ${log.opportunity.role} at ${log.opportunity.company}`,
    text: log.body ?? '',
  });

  await prisma.outreachLog.update({
    where: { id },
    data: { status: 'sent', sentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
