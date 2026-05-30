import { prisma } from '../lib/prisma';

interface AtsJob { id: string; title: string; absolute_url?: string; content?: string; }

// Keywords that indicate non-engineering roles — skip to avoid scoring noise
const NON_ENG_KEYWORDS = [
  'recruiter', 'sourcer', 'talent acquisition', 'marketing', 'designer', ' ux ',
  'finance', 'accountant', 'legal', 'compliance', 'account executive',
  'business development', ' sdr', 'executive assistant', 'copywriter',
  'customer support', 'people ops', 'people partner', ' hr ', 'human resources',
  'brand manager', 'graphic', 'illustrat', 'office manager', 'content writer',
];

function isEngineering(title: string): boolean {
  const t = ` ${title.toLowerCase()} `;
  return !NON_ENG_KEYWORDS.some(kw => t.includes(kw));
}

async function fetchGreenhouseJD(slug: string, jobId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://boards.greenhouse.io/v1/boards/${slug}/jobs/${jobId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { content?: string };
    if (!data.content) return null;
    return data.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);
  } catch { return null; }
}

async function fetchLeverJD(slug: string, jobId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}/${jobId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { descriptionPlain?: string; lists?: { content: string }[] };
    const parts = [data.descriptionPlain ?? ''];
    for (const list of data.lists ?? []) parts.push(list.content ?? '');
    return parts.join('\n').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000) || null;
  } catch { return null; }
}

async function fetchGreenhouse(slug: string): Promise<AtsJob[]> {
  const res = await fetch(`https://boards.greenhouse.io/v1/boards/${slug}/jobs`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.jobs ?? []).map((j: AtsJob) => ({ id: String(j.id), title: j.title, absolute_url: j.absolute_url }));
}

async function fetchLever(slug: string): Promise<AtsJob[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${slug}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = await res.json();
  return (data ?? []).map((j: { id: string; text: string; hostedUrl: string }) => ({ id: j.id, title: j.text, absolute_url: j.hostedUrl }));
}

async function fetchAshby(slug: string): Promise<AtsJob[]> {
  const res = await fetch(`https://jobs.ashbyhq.com/api/non-user-facing/job-board/${slug}/jobs`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.jobs ?? data ?? []).map((j: { id: string; title: string; applicationLink?: string }) => ({ id: j.id, title: j.title, absolute_url: j.applicationLink }));
}

export async function pollAtsWatchlist() {
  const companies = await prisma.targetCompany.findMany({
    where: { watchlist: true, atsType: { not: null }, atsSlug: { not: null } },
  });
  if (!companies.length) { console.log('[ats] No watchlist companies.'); return; }

  let created = 0, skipped = 0;
  for (const co of companies) {
    if (!co.atsSlug || !co.atsType) continue;
    try {
      let jobs: AtsJob[] = [];
      if (co.atsType === 'greenhouse') jobs = await fetchGreenhouse(co.atsSlug);
      else if (co.atsType === 'lever')  jobs = await fetchLever(co.atsSlug);
      else if (co.atsType === 'ashby')  jobs = await fetchAshby(co.atsSlug);

      for (const job of jobs) {
        if (!job.title || !job.absolute_url) continue;
        if (!isEngineering(job.title)) { skipped++; continue; }

        const exists = await prisma.opportunity.findFirst({ where: { applyUrl: job.absolute_url } });
        if (exists) continue;

        // Fetch JD text on ingest
        let jdText: string | null = null;
        const idMatch = job.absolute_url.match(/\/jobs\/([^/?]+)/);
        const jobId   = idMatch?.[1];
        if (jobId) {
          if (co.atsType === 'greenhouse') jdText = await fetchGreenhouseJD(co.atsSlug, jobId);
          else if (co.atsType === 'lever') jdText = await fetchLeverJD(co.atsSlug, jobId);
        }

        await prisma.opportunity.create({
          data: {
            company:           co.name,
            role:              job.title,
            stage:             'inbox',
            source:            co.atsType ?? 'ats',
            sourceCompanySlug: co.atsSlug,
            applyUrl:          job.absolute_url,
            jdText,
            lastActivity:      new Date(),
          },
        });
        created++;
      }
      await prisma.targetCompany.update({ where: { id: co.id }, data: { lastPolled: new Date() } });
    } catch (e) {
      console.error(`[ats] Failed to poll ${co.name}:`, (e as Error).message);
    }
  }
  console.log(`[ats] Created ${created} new opportunities, skipped ${skipped} non-engineering from ${companies.length} companies.`);
}
