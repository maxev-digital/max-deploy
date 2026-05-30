/**
 * Email parser — two modes:
 * 1. Job alert emails (Indeed, LinkedIn, Google Alerts forwarded to inbox)
 *    → extracts each individual job listing, creates one Opportunity per job
 * 2. Recruiter outreach / personal emails
 *    → classifies and creates one Opportunity for the lead
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { sendTelegramButtons, tgBold, tgItalic, tgCode } from '../lib/telegram';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Senders that are never job leads
const SKIP_PATTERNS = [
  'noreply@', 'no-reply@', 'donotreply@',
  'support@', 'help@', 'billing@', 'invoice@',
  'mailer@', '@greenhouse.io', '@lever.co',
];

// Patterns that identify job ALERT emails (batch listings, not recruiter outreach)
const JOB_ALERT_SENDERS = ['@indeed.com', '@linkedin.com', '@ziprecruiter.com', '@simplyhired.com'];
const JOB_ALERT_SUBJECTS = ['job alert', 'new jobs for you', 'jobs you may like', 'recommended jobs', 'new job recommendations', 'jobs matching', 'new forward deployed', 'new ai engineer'];

function isJobAlert(fromEmail: string, subject: string): boolean {
  const em = fromEmail.toLowerCase();
  const su = (subject ?? '').toLowerCase();
  return JOB_ALERT_SENDERS.some(s => em.includes(s)) ||
         JOB_ALERT_SUBJECTS.some(s => su.includes(s));
}

function shouldSkip(fromEmail: string): boolean {
  const em = fromEmail.toLowerCase();
  return SKIP_PATTERNS.some(p => em.includes(p));
}

// ─── Mode 1: Extract jobs from a job alert email ───────────────────────────

interface ExtractedJob {
  company: string;
  role: string;
  location: string | null;
  salary: string | null;
  applyUrl: string | null;
}

async function extractJobsFromAlert(subject: string, body: string): Promise<ExtractedJob[]> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Extract all individual job listings from this job alert email.

SUBJECT: ${subject}
BODY:
${body.slice(0, 3000)}

Return ONLY valid JSON array. For each job include:
{
  "company": "company name",
  "role": "exact job title",
  "location": "city, state or Remote or null",
  "salary": "salary range as string or null",
  "applyUrl": "direct job URL if present in email or null"
}

Return [] if no jobs found. Include ALL jobs listed in the email.`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const parsed = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// ─── Mode 2: Classify a personal/recruiter email ──────────────────────────

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
        content: `Classify this email for Will Austin, an AI/FDE engineer actively job searching.

FROM: ${from}
SUBJECT: ${subject}
BODY: ${body.slice(0, 800)}

Return ONLY valid JSON:
{
  "isJobLead": <true if recruiter outreach, job offer, or interview request>,
  "type": "<recruiter_outreach|job_alert|interview_request|not_relevant>",
  "company": "<company name or null>",
  "role": "<job title or null>",
  "salary": "<salary if mentioned or null>",
  "contactName": "<recruiter name or null>",
  "contactEmail": "<sender email>",
  "summary": "<one sentence summary>"
}`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    return JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
  } catch { return null; }
}

// ─── Main ──────────────────────────────────────────────────────────────────

export async function parseInboundEmails() {
  const since = new Date(Date.now() - 35 * 60 * 1000);

  const messages = await prisma.emailMessage.findMany({
    where: { receivedAt: { gte: since }, isSent: false, isDraft: false },
    orderBy: { receivedAt: 'asc' },
  });

  if (!messages.length) { console.log('[email-parser] No new messages.'); return; }
  console.log(`[email-parser] Processing ${messages.length} messages...`);

  let created = 0;

  for (const msg of messages) {
    if (shouldSkip(msg.fromEmail)) continue;

    const bodyText = msg.bodyText ?? msg.snippet ?? '';
    const subject  = msg.subject ?? '';

    // ── Mode 1: Job alert email — extract individual listings ──
    if (isJobAlert(msg.fromEmail, subject)) {
      const jobs = await extractJobsFromAlert(subject, bodyText);
      console.log(`[email-parser] Job alert from ${msg.fromEmail} — extracted ${jobs.length} jobs`);

      for (const job of jobs) {
        if (!job.role || !job.company) continue;

        // Dedup: check by applyUrl or by company+role combo
        const dupKey = job.applyUrl ?? `${job.company}|${job.role}`;
        const exists = await prisma.opportunity.findFirst({
          where: job.applyUrl
            ? { applyUrl: job.applyUrl }
            : { source: 'email_job_alert', sourceCompanySlug: dupKey },
        });
        if (exists) continue;

        await prisma.opportunity.create({
          data: {
            company:           job.company,
            role:              job.role,
            stage:             'inbox',
            source:            'email_job_alert',
            sourceCompanySlug: job.applyUrl ?? dupKey,
            applyUrl:          job.applyUrl ?? null,
            notes:             [job.location, job.salary].filter(Boolean).join(' · ') || null,
            lastActivity:      new Date(),
          },
        });
        created++;
      }

      // Send one summary Telegram if jobs found
      if (jobs.length > 0) {
        const source = msg.fromEmail.includes('indeed') ? 'Indeed'
                     : msg.fromEmail.includes('linkedin') ? 'LinkedIn'
                     : msg.fromEmail.includes('ziprecruiter') ? 'ZipRecruiter'
                     : 'Job Alert';
        await sendTelegramButtons(
          `📨 ${tgBold(`${source} Alert`)} — ${tgCode(String(jobs.length))} new jobs\n${tgItalic(subject)}\n\nAll added to inbox → max-ev-holdings.com/inbox`,
          [[{ text: '📥 View Inbox', callback_data: 'open_pipeline' }]],
          true // silent
        );
      }
      continue;
    }

    // ── Mode 2: Personal/recruiter email — classify as lead ──
    const exists = await prisma.opportunity.findFirst({
      where: { source: 'recruiter_inbound', sourceCompanySlug: msg.id },
    });
    if (exists) continue;

    const classified = await classifyEmail(
      `${msg.fromName ?? ''} <${msg.fromEmail}>`,
      subject,
      bodyText,
    );
    if (!classified?.isJobLead) continue;

    const opp = await prisma.opportunity.create({
      data: {
        company:           classified.company ?? msg.fromName ?? msg.fromEmail.split('@')[1] ?? 'Unknown',
        role:              classified.role ?? subject ?? 'Recruiter Outreach',
        stage:             'inbox',
        source:            'recruiter_inbound',
        sourceCompanySlug: msg.id,
        jdText:            bodyText.slice(0, 4000),
        notes:             classified.summary,
        lastActivity:      new Date(),
      },
    });

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

    const icon      = classified.type === 'interview_request' ? '📅' : '📨';
    const typeLabel = classified.type === 'interview_request' ? 'Interview Request' : 'Recruiter Inbound';

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
  }

  if (created > 0) console.log(`[email-parser] Created ${created} opportunities.`);
}
