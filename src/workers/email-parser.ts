/**
 * Email parser — classifies inbound emails as job leads / recruiter outreach.
 * Runs every 30 min. Reads new email_messages, calls Haiku to classify,
 * creates Opportunity + Contact records for job leads.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { sendTelegramButtons, tgBold, tgItalic, tgCode } from '../lib/telegram';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Skip obvious non-lead senders
const SKIP_PATTERNS = [
  'noreply', 'no-reply', 'donotreply', 'notifications@', 'alerts@',
  'support@', 'help@', 'billing@', 'invoice@', 'newsletter@',
  'mailer@', 'updates@', 'info@linkedin', '@greenhouse.io', '@lever.co',
];

function shouldSkip(fromEmail: string, subject: string): boolean {
  const em = fromEmail.toLowerCase();
  const su = (subject ?? '').toLowerCase();
  if (SKIP_PATTERNS.some(p => em.includes(p))) return true;
  // Skip automated job alert emails (not recruiter outreach)
  if (su.startsWith('job alert') || su.startsWith('jobs you may like') || su.startsWith('recommended jobs')) return true;
  return false;
}

interface ParsedEmail {
  isJobLead: boolean;
  type: 'recruiter_outreach' | 'job_alert' | 'interview_request' | 'not_relevant';
  company: string | null;
  role: string | null;
  salary: string | null;
  contactName: string | null;
  contactEmail: string | null;
  summary: string;
}

async function classifyEmail(from: string, subject: string, body: string): Promise<ParsedEmail | null> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Classify this email as a job lead or not. The recipient is Will Austin, an AI/FDE engineer actively job searching.

FROM: ${from}
SUBJECT: ${subject}
BODY PREVIEW: ${body.slice(0, 800)}

Return ONLY valid JSON:
{
  "isJobLead": <true if recruiter outreach, job offer, or interview request — false otherwise>,
  "type": "<recruiter_outreach|job_alert|interview_request|not_relevant>",
  "company": "<company name or null>",
  "role": "<job title mentioned or null>",
  "salary": "<salary if mentioned or null>",
  "contactName": "<recruiter/sender name or null>",
  "contactEmail": "<reply-to email or sender email>",
  "summary": "<one sentence summary>"
}`,
      }],
    });

    const raw  = (msg.content[0] as { type: string; text: string }).text.trim();
    return JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
  } catch { return null; }
}

export async function parseInboundEmails() {
  // Process emails from the last 35 min (slight overlap ensures nothing missed)
  const since = new Date(Date.now() - 35 * 60 * 1000);

  const messages = await prisma.emailMessage.findMany({
    where: { receivedAt: { gte: since }, isSent: false, isDraft: false },
    orderBy: { receivedAt: 'asc' },
  });

  if (!messages.length) { console.log('[email-parser] No new messages.'); return; }
  console.log(`[email-parser] Processing ${messages.length} messages...`);

  let created = 0;
  for (const msg of messages) {
    // Skip if already processed (dedup via sourceCompanySlug storing messageId)
    const exists = await prisma.opportunity.findFirst({
      where: { source: 'recruiter_inbound', sourceCompanySlug: msg.id },
    });
    if (exists) continue;

    if (shouldSkip(msg.fromEmail, msg.subject ?? '')) continue;

    const bodyText = msg.bodyText ?? msg.snippet ?? '';
    const classified = await classifyEmail(
      `${msg.fromName ?? ''} <${msg.fromEmail}>`,
      msg.subject ?? '(no subject)',
      bodyText,
    );

    if (!classified?.isJobLead) continue;

    // Create opportunity record
    const opp = await prisma.opportunity.create({
      data: {
        company:           classified.company ?? msg.fromName ?? msg.fromEmail.split('@')[1] ?? 'Unknown',
        role:              classified.role ?? msg.subject ?? 'Recruiter Outreach',
        stage:             'inbox',
        source:            'recruiter_inbound',
        sourceCompanySlug: msg.id, // dedup key
        jdText:            bodyText.slice(0, 4000),
        notes:             classified.summary,
        lastActivity:      new Date(),
      },
    });

    // Create contact record
    if (classified.contactName || classified.contactEmail) {
      await prisma.contact.create({
        data: {
          name:          classified.contactName ?? 'Unknown Recruiter',
          email:         classified.contactEmail ?? msg.fromEmail,
          role:          classified.type === 'interview_request' ? 'hiring_manager' : 'recruiter',
          opportunityId: opp.id,
        },
      });
    }

    created++;

    // Telegram alert with respond/skip buttons
    const isInterview = classified.type === 'interview_request';
    const icon        = isInterview ? '📅' : '📨';
    const typeLabel   = isInterview ? 'Interview Request' : 'Recruiter Inbound';

    await sendTelegramButtons(
      [
        `${icon} ${tgBold(typeLabel)}`,
        `${tgBold(classified.company ?? 'Unknown')} — ${classified.role ?? 'Role not specified'}`,
        `From: ${msg.fromName ?? msg.fromEmail}`,
        classified.salary ? `Salary: ${tgCode(classified.salary)}` : '',
        '',
        tgItalic(classified.summary),
      ].filter(Boolean).join('\n'),
      [[
        { text: '↩️ Respond', callback_data: `respond:${opp.id}` },
        { text: '⏭ Skip',    callback_data: `skip:${opp.id}`    },
      ]]
    );

    console.log(`[email-parser] Created opportunity: ${opp.company} — ${opp.role} (${classified.type})`);
  }

  if (created > 0) console.log(`[email-parser] Created ${created} opportunities from inbound email.`);
}
