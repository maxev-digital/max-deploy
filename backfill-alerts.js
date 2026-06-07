const { PrismaClient } = require('@prisma/client');
const Anthropic = require('@anthropic-ai/sdk');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractJobs(subject, body) {
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
  const raw = msg.content[0].text.trim();
  const parsed = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
  return Array.isArray(parsed) ? parsed : [];
}

async function main() {
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const messages = await prisma.emailMessage.findMany({
    where: {
      receivedAt: { gte: since },
      isSent: false,
      isDraft: false,
      fromEmail: { contains: 'indeed.com' },
    },
    orderBy: { receivedAt: 'asc' },
  });

  console.log(`Found ${messages.length} Indeed emails in last 3 hours`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const msg of messages) {
    const bodyText = msg.bodyText || msg.snippet || '';
    const subject = msg.subject || '';
    console.log(`\nProcessing: ${subject.slice(0, 60)}`);
    console.log(`  Body length: ${bodyText.length}`);

    let jobs = [];
    try {
      jobs = await extractJobs(subject, bodyText);
    } catch (err) {
      console.log(`  ERROR extracting: ${err.message}`);
      continue;
    }
    console.log(`  Extracted ${jobs.length} jobs`);

    for (const job of jobs) {
      if (!job.role || !job.company) continue;
      const dupKey = job.applyUrl || `${job.company}|${job.role}`;
      const exists = await prisma.opportunity.findFirst({
        where: job.applyUrl
          ? { applyUrl: job.applyUrl }
          : { source: 'email_job_alert', sourceCompanySlug: dupKey },
      });
      if (exists) {
        totalSkipped++;
        continue;
      }
      await prisma.opportunity.create({
        data: {
          company: job.company,
          role: job.role,
          stage: 'inbox',
          source: 'email_job_alert',
          sourceCompanySlug: job.applyUrl || dupKey,
          applyUrl: job.applyUrl || null,
          notes: [job.location, job.salary].filter(Boolean).join(' · ') || null,
          lastActivity: new Date(),
        },
      });
      console.log(`  + Created: ${job.company} — ${job.role}`);
      totalCreated++;
    }
  }

  console.log(`\nDone. Created: ${totalCreated}, Skipped (dupes): ${totalSkipped}`);
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
