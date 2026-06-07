/**
 * ATS Auto-Discovery
 * For each unique company in recent RSS/email opportunities (not yet on the ATS watchlist),
 * probe Greenhouse / Lever / Ashby using normalized slug variants.
 * If a live board is found, add to TargetCompany with watchlist=true for daily polling.
 */

import { prisma } from '../lib/prisma';
import { sendTelegram, tgBold, tgCode } from '../lib/telegram';

const LEGAL_SUFFIXES = /\b(inc\.?|corp\.?|llc\.?|ltd\.?|co\.?|gmbh|ag|bv|pte|plc|sa)\b\.?/gi;
const NON_SLUG_CHARS = /[^a-z0-9-]/g;

function slugVariants(company: string): string[] {
  const base = company
    .toLowerCase()
    .replace(LEGAL_SUFFIXES, '')
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .trim();

  const hyphenated = base.replace(/\s+/g, '-').replace(NON_SLUG_CHARS, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const collapsed  = base.replace(/\s+/g, '').replace(NON_SLUG_CHARS, '');

  const variants = new Set<string>();
  if (hyphenated) variants.add(hyphenated);
  if (collapsed && collapsed !== hyphenated) variants.add(collapsed);

  // Strip common trailing AI/Labs/Technologies/Software words for a shorter slug
  const stripped = hyphenated.replace(/-?(ai|labs?|technologies|software|systems|solutions|digital|cloud|data|tech)$/, '').replace(/-+$/, '');
  if (stripped && stripped !== hyphenated && stripped.length >= 3) variants.add(stripped);

  return [...variants].filter(s => s.length >= 2);
}

async function probeGreenhouse(slug: string): Promise<boolean> {
  try {
    const res = await fetch(`https://boards.greenhouse.io/v1/boards/${slug}/jobs`, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return false;
    const data = await res.json() as { jobs?: unknown[] };
    return Array.isArray(data.jobs) && data.jobs.length > 0;
  } catch { return false; }
}

async function probeLever(slug: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch { return false; }
}

async function probeAshby(slug: string): Promise<boolean> {
  try {
    const res = await fetch(`https://jobs.ashbyhq.com/api/non-user-facing/job-board/${slug}/jobs`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return false;
    const data = await res.json() as { jobs?: unknown[] };
    return Array.isArray(data.jobs ?? data) && (data.jobs ?? data as unknown[]).length > 0;
  } catch { return false; }
}

async function detectAts(company: string): Promise<{ atsType: string; atsSlug: string } | null> {
  const variants = slugVariants(company);
  for (const slug of variants) {
    if (await probeGreenhouse(slug)) return { atsType: 'greenhouse', atsSlug: slug };
    await new Promise(r => setTimeout(r, 200));
    if (await probeLever(slug))      return { atsType: 'lever',      atsSlug: slug };
    await new Promise(r => setTimeout(r, 200));
    if (await probeAshby(slug))      return { atsType: 'ashby',      atsSlug: slug };
    await new Promise(r => setTimeout(r, 200));
  }
  return null;
}

// Only probe companies that look like tech/AI targets
const TECH_SIGNALS = ['engineer', 'ai', 'software', 'platform', 'data', 'tech', 'ml', 'solutions', 'cloud', 'api', 'developer', 'product', 'stack', 'analytics'];

function isTechTarget(role: string, classification: string | null): boolean {
  if (classification && ['FDE', 'AI_Engineer', 'Solutions', 'CSM', 'Director', 'FullStack', 'Contract'].includes(classification)) return true;
  const r = role.toLowerCase();
  return TECH_SIGNALS.some(s => r.includes(s));
}

export async function discoverAtsFromPipeline() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Pull recent opportunities not already from ATS sources
  const recentOpps = await prisma.opportunity.findMany({
    where: {
      createdAt:  { gte: since7d },
      source:     { notIn: ['greenhouse', 'lever', 'ashby', 'ats'] },
      stage:      { notIn: ['archived', 'rejected', 'dead'] },
      fitScore:   { gte: 50 },
    },
    select: { company: true, role: true, classification: true },
    distinct: ['company'],
  });

  if (!recentOpps.length) { console.log('[discovery] No candidates for ATS discovery.'); return; }

  // Filter out companies already on the watchlist
  const existingNames = new Set(
    (await prisma.targetCompany.findMany({ where: { watchlist: true }, select: { name: true } }))
      .map(c => c.name.toLowerCase().trim())
  );

  const candidates = recentOpps.filter(o =>
    !existingNames.has(o.company.toLowerCase().trim()) &&
    isTechTarget(o.role, o.classification)
  );

  console.log(`[discovery] Probing ${candidates.length} companies for ATS boards...`);

  const discovered: { company: string; atsType: string; atsSlug: string }[] = [];

  for (const opp of candidates) {
    const result = await detectAts(opp.company);
    if (!result) continue;

    // Double-check not already in DB by slug
    const exists = await prisma.targetCompany.findFirst({
      where: { atsSlug: result.atsSlug, atsType: result.atsType },
    });
    if (exists) continue;

    await prisma.targetCompany.create({
      data: {
        name:      opp.company,
        atsType:   result.atsType,
        atsSlug:   result.atsSlug,
        watchlist: true,
        techStack: [],
      },
    });

    discovered.push({ company: opp.company, ...result });
    console.log(`[discovery] Found ${result.atsType} board for ${opp.company} (slug: ${result.atsSlug})`);

    // Throttle between companies
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[discovery] Added ${discovered.length} new ATS companies from ${candidates.length} probed.`);

  if (discovered.length > 0) {
    const list = discovered.slice(0, 8).map(d => `• ${d.company} → ${d.atsType}/${d.atsSlug}`).join('\n');
    await sendTelegram(
      [
        tgBold('ATS Discovery'),
        `${tgCode(String(discovered.length))} new companies added to watchlist`,
        '',
        list,
        discovered.length > 8 ? `…and ${discovered.length - 8} more` : '',
      ].filter(Boolean).join('\n'),
      true
    );
  }
}
