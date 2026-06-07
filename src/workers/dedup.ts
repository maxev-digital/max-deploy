import { prisma } from '../lib/prisma';
import { sendTelegram, tgBold, tgCode } from '../lib/telegram';

function normalizeRole(role: string): string {
  return role
    .toLowerCase()
    .replace(/\s*[-–—]\s*(remote|hybrid|onsite|on-site|contract|freelance|part[- ]time|full[- ]time)\s*/gi, '')
    .replace(/\s*\((?:remote|hybrid|onsite|on-site|us|usa|united states|nationwide)\)\s*/gi, '')
    .replace(/\b(sr|jr|senior|junior|lead|staff|principal)\b\.?\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function deduplicateOpportunities() {
  // ── Step 1: Auto-archive stale low-score inbox items ─────────────────────
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const staleResult = await prisma.opportunity.updateMany({
    where: {
      fitScore: { lt: 40 },
      stage: 'inbox',
      createdAt: { lt: cutoff48h },
    },
    data: { stage: 'archived' },
  });

  // ── Step 2: Exact-duplicate detection across active pipeline ─────────────
  const active = await prisma.opportunity.findMany({
    where: { stage: { notIn: ['archived', 'rejected', 'dead'] } },
    select: {
      id: true, company: true, role: true,
      fitScore: true, jdText: true, stage: true, createdAt: true,
    },
  });

  const groups = new Map<string, typeof active>();
  for (const opp of active) {
    const key = `${opp.company.toLowerCase().trim()}||${normalizeRole(opp.role)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(opp);
  }

  const dupeIds: string[]  = [];
  let dupeGroupCount = 0;

  for (const [, group] of groups) {
    if (group.length < 2) continue;
    dupeGroupCount++;

    // Keep: highest fitScore → has jdText → oldest (first seen)
    group.sort((a, b) => {
      const scoreDiff = (b.fitScore ?? -1) - (a.fitScore ?? -1);
      if (scoreDiff !== 0) return scoreDiff;
      if (!!b.jdText !== !!a.jdText) return b.jdText ? 1 : -1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    dupeIds.push(...group.slice(1).map(o => o.id));
  }

  if (dupeIds.length > 0) {
    await prisma.opportunity.updateMany({
      where: { id: { in: dupeIds } },
      data: { stage: 'archived' },
    });
  }

  const total = staleResult.count + dupeIds.length;
  console.log(`[dedup] Stale (<40, 48h+): ${staleResult.count} archived | Dupes: ${dupeIds.length} removed across ${dupeGroupCount} groups`);

  if (total > 0) {
    await sendTelegram(
      [
        tgBold('Pipeline Cleanup'),
        `Stale low-score archived: ${tgCode(String(staleResult.count))}`,
        `Duplicate groups resolved: ${tgCode(String(dupeGroupCount))} → ${dupeIds.length} removed`,
      ].join('\n'),
      true
    );
  }
}
