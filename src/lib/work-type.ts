/**
 * Detects work type from role title, JD text, and source.
 * Returns: "full_time" | "part_time" | "contract" | "freelance"
 */

const CONTRACT_SIGNALS = [
  'contract', '1099', 'c2c', 'corp-to-corp', 'corp to corp',
  'temp ', 'temporary', 'interim', 'consultant', 'consulting',
  'short-term', 'short term', 'fixed-term', 'fixed term',
];

const FREELANCE_SIGNALS = [
  'freelance', 'free-lance', 'gig ', 'project-based', 'project based',
  'independent contractor', 'self-employed', 'fractional',
];

const PART_TIME_SIGNALS = [
  'part-time', 'part time', 'parttime', '20 hrs', '20hrs',
  '20 hours', 'hourly', 'per hour', '/hr', '/hour',
];

export function detectWorkType(
  role: string,
  jdText: string | null,
  source?: string,
): 'full_time' | 'part_time' | 'contract' | 'freelance' {
  const haystack = [role, jdText ?? '', source ?? ''].join(' ').toLowerCase();

  if (FREELANCE_SIGNALS.some(s => haystack.includes(s))) return 'freelance';
  if (CONTRACT_SIGNALS.some(s => haystack.includes(s)))  return 'contract';
  if (PART_TIME_SIGNALS.some(s => haystack.includes(s))) return 'part_time';

  return 'full_time';
}
