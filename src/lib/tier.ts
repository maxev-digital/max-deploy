/**
 * Derives a display tier (1-7) from classification + role title.
 * Used for inbox color coding, filtering, and priority scoring.
 */

export interface Tier {
  tier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label: string;
  sublabel: string;
  color: string;
}

const TIERS: Record<number, Omit<Tier, 'tier'>> = {
  4: { label: 'FDE / AI Eng',       sublabel: 'Forward Deployed, Applied AI, AI Automation', color: '#DC2626' },
  3: { label: 'Solutions / CSM',    sublabel: 'Solutions Eng, TAM, CSM, Implementation, TPM',  color: '#059669' },
  6: { label: 'DevRel / Growth',    sublabel: 'DevRel, Developer Advocate, Growth Eng',        color: '#EA580C' },
  5: { label: 'Eng On-Ramp',        sublabel: 'Full Stack, Senior Eng, Backend AI',            color: '#D97706' },
  7: { label: 'Domain Vertical',    sublabel: 'Hospitality Tech, Sports / Gaming Tech',        color: '#0F766E' },
  2: { label: 'Marketing',          sublabel: 'Marketing mgr, director, digital, ops',         color: '#0891B2' },
  1: { label: 'Creative',           sublabel: 'Design, social, brand',                         color: '#7C3AED' },
};

export function getTier(classification: string | null, role: string): Tier {
  const cls = (classification ?? '').toLowerCase();
  const r   = role.toLowerCase();

  // Classification-based (authoritative when scorer has run)
  if (cls === 'fde' || cls === 'ai_engineer')      return { tier: 4, ...TIERS[4] };
  if (cls === 'solutions' || cls === 'csm')         return { tier: 3, ...TIERS[3] };
  if (cls === 'director')                           return { tier: 4, ...TIERS[4] };
  if (cls === 'marketing')                          return { tier: 2, ...TIERS[2] };
  if (cls === 'fullstack' || cls === 'contract')    return { tier: 5, ...TIERS[5] };

  // Role keyword fallback (pre-score or unclassified)
  if (/forward.?deploy|fde\b|applied.?ai|agentic|ai.?platform|ai.?engineer|ml.?engineer|mlops/.test(r)) return { tier: 4, ...TIERS[4] };
  if (/solutions.?eng|solutions.?arch|implementation|technical.?account|tam\b|csm\b|customer.?success/.test(r)) return { tier: 3, ...TIERS[3] };
  if (/devrel|developer.?advocate|growth.?eng|developer.?experience/.test(r)) return { tier: 6, ...TIERS[6] };
  if (/full.?stack|backend|frontend|software.?eng|software.?dev/.test(r))     return { tier: 5, ...TIERS[5] };
  if (/hospitality|gaming|sports|betting|wagering/.test(r))                   return { tier: 7, ...TIERS[7] };
  if (/marketing|social.?media|brand|content|paid.?media|seo|sem/.test(r))    return { tier: 2, ...TIERS[2] };
  if (/design|creative|visual|illustrat|motion/.test(r))                      return { tier: 1, ...TIERS[1] };

  // Default: treat unknown as T5 (eng on-ramp)
  return { tier: 5, ...TIERS[5] };
}

export function getAllTiers(): Tier[] {
  return ([4, 3, 6, 5, 7, 2, 1] as const).map(n => ({ tier: n, ...TIERS[n] } as Tier));
}

/** Priority score formula — mirrors the admin system + PDF-ready bonus */
export function calcPriorityScore(opp: {
  fitScore: number | null;
  salaryMin: number | null;
  coverLetterUrl: string | null;
  createdAt: string | Date;
  classification: string | null;
  role: string;
  source?: string | null;
  notes?: string | null;
}): number {
  let score = 0;

  // Role fit (0-35 pts)
  score += ((opp.fitScore ?? 50) / 100) * 35;

  // Remote signal from source or notes (0 or 12 pts)
  const ctx = [opp.source ?? '', opp.notes ?? ''].join(' ').toLowerCase();
  if (/remote|wwr|remotive/.test(ctx)) score += 12;

  // Salary tier (0-15 pts)
  const s = opp.salaryMin ?? 0;
  if (s >= 130000) score += 15;
  else if (s >= 110000) score += 10;
  else if (s >= 90000) score += 5;
  else if (s > 0) score += 2;

  // Tier bonus (0-5 pts)
  const { tier } = getTier(opp.classification, opp.role);
  if (tier === 4) score += 5;
  else if (tier === 6) score += 4;
  else if (tier === 3) score += 3;

  // Recency (0-10 pts)
  const days = (Date.now() - new Date(opp.createdAt).getTime()) / 86400000;
  if (days <= 1) score += 10;
  else if (days <= 3) score += 8;
  else if (days <= 7) score += 5;
  else if (days <= 14) score += 2;

  // PDF ready bonus (0-5 pts) — floats pre-built cover letters to top
  if (opp.coverLetterUrl) score += 5;

  return Math.round(Math.min(score, 100));
}
