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

// ─── Calendar event extraction ─────────────────────────────────────────────

async function extractAndSaveCalendarEvent(
  fromEmail: string,
  subject: string,
  body: string,
  opportunityId: string | null,
  emailMessageId: string,
): Promise<void> {
  try {
    // Skip if we already created a calendar event for this email
    const existing = await prisma.calendarEvent.findFirst({
      where: { emailMessageId },
    });
    if (existing) return;

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Does this email contain a scheduled meeting, interview, or call with a specific date and time? If yes, extract the details. Today is ${new Date().toDateString()}.

FROM: ${fromEmail}
SUBJECT: ${subject}
BODY: ${body.slice(0, 1200)}

Return ONLY valid JSON:
{"hasEvent": true, "title": "...", "startAt": "ISO8601 datetime in UTC", "endAt": "ISO8601 or null", "location": "zoom link or address or null", "type": "interview|screening|call|deadline|other"}
or {"hasEvent": false}`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const matched = raw.match(/\{[\s\S]+\}/);
    if (!matched) return;
    const json = JSON.parse(matched[0]);
    if (!json.hasEvent || !json.startAt) return;

    await prisma.calendarEvent.create({
      data: {
        title:          json.title ?? subject,
        startAt:        new Date(json.startAt),
        endAt:          json.endAt ? new Date(json.endAt) : null,
        location:       json.location ?? null,
        type:           json.type ?? 'other',
        source:         'email_parser',
        emailMessageId,
        opportunityId:  opportunityId ?? null,
      },
    });

    console.log(`[email-parser] Calendar event created: "${json.title}" @ ${json.startAt}`);
  } catch (e) {
    console.error('[email-parser] Calendar extraction failed:', (e as Error).message);
  }
}

// Senders that are never job leads (but still checked for rejections first)
const SKIP_PATTERNS = [
  'noreply@', 'no-reply@', 'donotreply@',
  'support@', 'help@', 'billing@', 'invoice@',
  'mailer@',
];

// ─── Mode 3: Rejection / position closure detection ───────────────────────

const REJECTION_PHRASES = [
  'decided to move forward with other candidates',
  'decided not to move forward',
  'we have decided to pursue other candidates',
  'position has been filled',
  'no longer accepting applications',
  'we will not be moving forward',
  'not be moving forward with your application',
  'not selected to move forward',
  'wish you the best in your search',
  'we have filled this position',
  'selected a candidate',
  'position is no longer available',
  'we are no longer considering',
  'after careful consideration',
  'not be proceeding with your application',
  'we have chosen to move forward with another',
  // wave / batch language
  'second wave of applicants',
  'wave of applicants',
  'next wave',
  'first wave',
  'initial wave',
  'did not make it to the next',
  'did not make it to the second',
  'not advance to the next round',
  'not advance to the next stage',
  'not advancing to the next',
  'move forward with a smaller group',
  'narrowed down our candidate pool',
  'decided to narrow',
  'no longer in consideration',
  'your candidacy will not be moving',
  'pursue other applicants',
];

const REJECTION_SUBJECT_SIGNALS = [
  'application status', 'update on your application', 'your application to',
  'regarding your application', 'we appreciate your interest',
  'thank you for applying', 'application decision',
];

function looksLikeRejection(subject: string, body: string): boolean {
  const su = subject.toLowerCase();
  const bo = body.toLowerCase().slice(0, 2000);
  const bodyMatch = REJECTION_PHRASES.some(p => bo.includes(p));
  const subjectSignal = REJECTION_SUBJECT_SIGNALS.some(s => su.includes(s));
  return bodyMatch || (subjectSignal && (bo.includes('unfortunately') || bo.includes('other candidates') || bo.includes('another direction')));
}

async function detectAndHandleRejection(fromEmail: string, subject: string, body: string): Promise<boolean> {
  if (!looksLikeRejection(subject, body)) return false;

  let result: { isRejection: boolean; company: string | null; role: string | null } = { isRejection: false, company: null, role: null };
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `FROM: ${fromEmail}
SUBJECT: ${subject}
BODY: ${body.slice(0, 1000)}

Is this a job application rejection, position closure, or "no longer considering" email? Return ONLY valid JSON:
{"isRejection": true, "company": "company name or null", "role": "job title or null"}
or {"isRejection": false}`,
      }],
    });
    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    result = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
  } catch { return false; }

  if (!result.isRejection) return false;

  // Find best matching open opportunity
  let opp = null;
  if (result.company) {
    opp = await prisma.opportunity.findFirst({
      where: {
        company: { contains: result.company, mode: 'insensitive' },
        stage:   { notIn: ['rejected', 'offer', 'closed', 'withdrawn'] },
      },
      orderBy: { lastActivity: 'desc' },
    });
  }

  if (opp) {
    const rejNote = `[Auto-detected rejection ${new Date().toLocaleDateString()}] Subject: "${subject}"`;
    await prisma.opportunity.update({
      where: { id: opp.id },
      data: {
        stage:        'rejected',
        lastActivity: new Date(),
        notes:        opp.notes ? `${opp.notes}\n${rejNote}` : rejNote,
      },
    });

    console.log(`[email-parser] Rejection → marked ${opp.company} / ${opp.role} as rejected`);

    await sendTelegramButtons(
      [
        `❌ ${tgBold('Rejection Received')}`,
        `${tgBold(opp.company)} — ${tgItalic(opp.role)}`,
        `From: ${fromEmail}`,
        tgItalic(`"${subject}"`),
        '',
        'Application marked as rejected in pipeline.',
      ].join('\n'),
      [[{ text: '📋 View Pipeline', callback_data: 'open_pipeline' }]],
      true,
    );
  } else {
    console.log(`[email-parser] Rejection from ${fromEmail} — no matching open opportunity for "${result.company ?? 'unknown'}"`);
  }
  return true;
}

// Patterns that identify job ALERT emails (batch listings, not recruiter outreach)
// Use domain without @ so subdomains match (jobalert.indeed.com, match.indeed.com, etc.)
const JOB_ALERT_SENDERS = ['indeed.com', 'linkedin.com', 'ziprecruiter.com', 'simplyhired.com', 'wellfound.com', 'lever.co', 'greenhouse.io'];
const JOB_ALERT_SUBJECTS = ['job alert', 'new jobs for you', 'jobs you may like', 'recommended jobs', 'new job recommendations', 'jobs matching', 'new forward deployed', 'new ai engineer', 'is hiring for', 'jobs in'];

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
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `Extract all individual job listings from this job alert email.

SUBJECT: ${subject}
BODY:
${body.slice(0, 8000)}

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
    const bodyText = msg.bodyText ?? msg.snippet ?? '';
    const subject  = msg.subject ?? '';

    // ── Mode 3: Rejection / position closure — check BEFORE shouldSkip so noreply ATS emails aren't dropped ──
    const wasRejection = await detectAndHandleRejection(msg.fromEmail, subject, bodyText);
    if (wasRejection) continue;

    // ── Mode 1: Job alert email — check BEFORE shouldSkip so donotreply@indeed.com isn't dropped ──
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
    if (shouldSkip(msg.fromEmail)) continue;

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

    // For interview requests: try to find and advance an existing pipeline entry first
    let opp = null;
    let advancedExisting = false;

    if (classified.type === 'interview_request' && classified.company) {
      const existing = await prisma.opportunity.findFirst({
        where: {
          company: { contains: classified.company, mode: 'insensitive' },
          stage:   { in: ['applied', 'screening', 'inbox', 'target', 'interview'] },
        },
        orderBy: { lastActivity: 'desc' },
      });

      if (existing) {
        const advanceNote = `[Interview scheduled ${new Date().toLocaleDateString()}] Subject: "${subject}"`;
        opp = await prisma.opportunity.update({
          where: { id: existing.id },
          data: {
            stage:        'interview',
            lastActivity: new Date(),
            notes:        existing.notes ? `${existing.notes}\n${advanceNote}` : advanceNote,
          },
        });
        advancedExisting = true;
        console.log(`[email-parser] Interview detected → advanced ${existing.company} / ${existing.role} to interview`);
      }
    }

    // No existing entry found (or not an interview request) — create new
    if (!opp) {
      opp = await prisma.opportunity.create({
        data: {
          company:           classified.company ?? msg.fromName ?? msg.fromEmail.split('@')[1] ?? 'Unknown',
          role:              classified.role ?? subject ?? 'Recruiter Outreach',
          stage:             classified.type === 'interview_request' ? 'interview' : 'inbox',
          source:            'recruiter_inbound',
          sourceCompanySlug: msg.id,
          jdText:            bodyText.slice(0, 4000),
          notes:             classified.summary,
          lastActivity:      new Date(),
        },
      });
    }

    // Auto-create calendar event for any interview/screening email
    if (classified.type === 'interview_request' || classified.type === 'recruiter_outreach') {
      await extractAndSaveCalendarEvent(msg.fromEmail, subject, bodyText, opp.id, msg.id);
    }

    if (classified.contactName || classified.contactEmail) {
      await prisma.contact.upsert({
        where: { email: classified.contactEmail ?? msg.fromEmail },
        update: { opportunityId: opp.id },
        create: {
          name:          classified.contactName ?? 'Unknown Recruiter',
          email:         classified.contactEmail ?? msg.fromEmail,
          role:          classified.type === 'interview_request' ? 'hiring_manager' : 'recruiter',
          opportunityId: opp.id,
        },
      });
    }

    created++;

    const icon      = classified.type === 'interview_request' ? '📅' : '📨';
    const typeLabel = classified.type === 'interview_request'
      ? (advancedExisting ? 'Interview Scheduled → Pipeline Advanced' : 'Interview Request (New)')
      : 'Recruiter Inbound';

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
