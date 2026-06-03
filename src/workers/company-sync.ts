import { prisma } from '../lib/prisma';

function detectAts(applyUrl: string | null, source: string | null): { atsType: string | null; atsSlug: string | null } {
  // Try URL-based detection first (most reliable)
  if (applyUrl) {
    try {
      const url = new URL(applyUrl);
      const host = url.hostname;
      const parts = url.pathname.split('/').filter(Boolean);

      if (host.includes('greenhouse.io')) {
        // boards.greenhouse.io/companyslug/jobs/123
        const slug = parts[0] !== 'embed' ? parts[0] : parts[1];
        return { atsType: 'greenhouse', atsSlug: slug ?? null };
      }
      if (host.includes('lever.co')) {
        // jobs.lever.co/companyslug/jobid
        return { atsType: 'lever', atsSlug: parts[0] ?? null };
      }
      if (host.includes('ashbyhq.com')) {
        // jobs.ashbyhq.com/companyslug or jobs.ashbyhq.com/companyslug/job/jobid
        return { atsType: 'ashby', atsSlug: parts[0] ?? null };
      }
      if (host.includes('workday.com') || host.includes('myworkdayjobs.com')) {
        return { atsType: 'workday', atsSlug: null };
      }
      if (host.includes('smartrecruiters.com')) {
        return { atsType: 'smartrecruiters', atsSlug: parts[0] ?? null };
      }
      if (host.includes('icims.com')) {
        return { atsType: 'icims', atsSlug: null };
      }
      if (host.includes('taleo.net')) {
        return { atsType: 'taleo', atsSlug: null };
      }
      if (host.includes('jobvite.com')) {
        return { atsType: 'jobvite', atsSlug: null };
      }
    } catch { /* invalid URL, fall through */ }
  }

  // Fall back to source field (set by RSS feed configuration)
  const knownSources = ['greenhouse', 'lever', 'ashby', 'workday', 'smartrecruiters'];
  if (source && knownSources.includes(source.toLowerCase())) {
    return { atsType: source.toLowerCase(), atsSlug: null };
  }

  return { atsType: null, atsSlug: null };
}

export async function syncCompanies() {
  const rows = await prisma.opportunity.findMany({
    where: { company: { not: '' }, stage: { not: 'dead' } },
    select: { company: true, applyUrl: true, source: true },
    distinct: ['company'],
  });

  let created = 0;
  let updated = 0;

  for (const { company, applyUrl, source } of rows) {
    const name = company.trim();
    if (!name || name.toLowerCase() === 'unknown') continue;

    const { atsType, atsSlug } = detectAts(applyUrl, source);

    const existing = await prisma.targetCompany.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (!existing) {
      await prisma.targetCompany.create({
        data: { name, watchlist: false, warmth: 'cold', techStack: [], atsType, atsSlug },
      });
      created++;
    } else if (!existing.atsType && atsType) {
      // Backfill ATS info on existing records that are missing it
      await prisma.targetCompany.update({
        where: { id: existing.id },
        data: { atsType, ...(atsSlug ? { atsSlug } : {}) },
      });
      updated++;
    }
  }

  if (created > 0 || updated > 0) {
    console.log(`[companies] Synced ${created} new, backfilled ATS on ${updated} existing companies.`);
  }
}
