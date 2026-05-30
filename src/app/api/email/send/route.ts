import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import nodemailer from 'nodemailer';

interface Attachment { filename: string; content: string; contentType: string; size: number; }

export async function POST(req: NextRequest) {
  await requireAuth();

  const { accountId, to, cc, bcc, subject, body, inReplyTo, attachments, draftId } = await req.json();

  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 });
  }

  // Pick account — use specified or fall back to first active
  const account = accountId
    ? await prisma.emailAccount.findUnique({ where: { id: accountId } })
    : await prisma.emailAccount.findFirst({ where: { isActive: true } });

  if (!account) return NextResponse.json({ error: 'No email account configured' }, { status: 400 });

  const transporter = nodemailer.createTransport({
    host:   account.smtpHost,
    port:   account.smtpPort,
    secure: account.smtpPort === 465,
    auth:   { user: account.smtpUser, pass: account.smtpPass },
  });

  const mailAttachments = (attachments as Attachment[] | undefined)?.map(a => ({
    filename:    a.filename,
    content:     Buffer.from(a.content, 'base64'),
    contentType: a.contentType,
  }));

  const info = await transporter.sendMail({
    from:       `"${account.fromName}" <${account.email}>`,
    to,
    ...(cc  && { cc }),
    ...(bcc && { bcc }),
    subject,
    html:       body,
    text:       body.replace(/<[^>]+>/g, ''),
    inReplyTo:  inReplyTo ?? undefined,
    references: inReplyTo ?? undefined,
    attachments: mailAttachments,
  });

  // Save to sent folder
  await prisma.emailMessage.create({
    data: {
      accountId:    account.id,
      messageId:    info.messageId,
      folder:       'SENT',
      subject,
      fromEmail:    account.email,
      fromName:     account.fromName,
      toRaw:        JSON.stringify([{ address: to }]),
      ccRaw:        cc  ? JSON.stringify([{ address: cc }])  : null,
      bccRaw:       bcc ? JSON.stringify([{ address: bcc }]) : null,
      bodyHtml:     body,
      bodyText:     body.replace(/<[^>]+>/g, ''),
      snippet:      body.replace(/<[^>]+>/g, '').slice(0, 200),
      isRead:       true,
      isSent:       true,
      hasAttachment: (attachments?.length ?? 0) > 0,
      attachments:  attachments ?? null,
      inReplyTo:    inReplyTo ?? null,
      receivedAt:   new Date(),
    },
  });

  // Delete draft if this was a draft send
  if (draftId) {
    await prisma.emailMessage.delete({ where: { id: draftId } }).catch(() => {});
  }

  return NextResponse.json({ messageId: info.messageId });
}
