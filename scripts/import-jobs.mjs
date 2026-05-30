/**
 * import-jobs.mjs
 * One-time import of all resume/configs/*.json into the fde-os opportunities table.
 * Run from /var/www/max-deploy: node scripts/import-jobs.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS_DIR = path.join(__dirname, '../configs');
const STATUS_FILE = path.join(__dirname, '../dashboard-status.json');

const prisma   = new PrismaClient();
const status   = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
const skipSet  = new Set(status.skip    || []);
const appliedSet = new Set(status.applied || []);

function parseSalary(str) {
  if (!str) return { salaryMin: null, salaryMax: null };
  const nums = [];
  for (const m of (str + '').matchAll(/\$?([\d.]+)\s*[Kk]/g))
    nums.push(Math.round(parseFloat(m[1]) * 1000));
  if (nums.length >= 2) return { salaryMin: nums[0], salaryMax: nums[1] };
  if (nums.length === 1) return { salaryMin: nums[0], salaryMax: nums[0] };
  return { salaryMin: null, salaryMax: null };
}

function mapClassification(cfg) {
  const t = String(cfg.jobType || '').toLowerCase();
  const r = String(cfg.role || '').toLowerCase();
  if (t === 'fde' || /forward.deploy|fde|agentic|applied.ai/i.test(r)) return 'FDE';
  if (t === 'solutions' || /solution.engineer|solutions.arch|implementation/i.test(r)) return 'CSM';
  if (/director|head.of|vp /i.test(r)) return 'Director';
  if (/contract|freelance/i.test(t)) return 'Contract';
  return 'AI_Engineer';
}

function buildJdText(cfg) {
  const parts = [];
  if (cfg.intro)    parts.push(cfg.intro.replace(/<[^>]+>/g, ''));
  if (cfg.bullets)  parts.push(...cfg.bullets.map(b => '• ' + b.replace(/<[^>]+>/g, '')));
  if (cfg.matchNotes) parts.push('\nNotes: ' + cfg.matchNotes);
  return parts.join('\n');
}

async function main() {
  const files = fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json')).sort();
  let added = 0, skipped = 0, existing = 0;

  for (const f of files) {
    let cfg;
    try { cfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, f), 'utf8')); }
    catch { console.warn(`SKIP bad JSON: ${f}`); continue; }

    const slug = cfg.slug || f.replace('-config.json', '').replace('.json', '');
    if (skipSet.has(slug)) { skipped++; continue; }

    // Skip if already in DB
    const exists = await prisma.opportunity.findFirst({
      where: {
        company: { equals: cfg.company, mode: 'insensitive' },
        role:    { equals: cfg.role,    mode: 'insensitive' },
      },
    });
    if (exists) { existing++; continue; }

    const { salaryMin, salaryMax } = parseSalary(cfg.salaryRange || '');
    const isApplied = appliedSet.has(slug);

    await prisma.opportunity.create({
      data: {
        company:          cfg.company,
        role:             cfg.role,
        stage:            isApplied ? 'applied' : 'inbox',
        salaryMin,
        salaryMax,
        fitScore:         cfg.matchScore   || null,
        classification:   mapClassification(cfg),
        recommendedAction: cfg.matchScore >= 75 ? 'apply_now' : cfg.matchScore >= 55 ? 'apply_with_note' : 'save',
        applyUrl:         cfg.applyUrl     || null,
        source:           'smart-apply',
        jdText:           buildJdText(cfg),
        notes:            cfg.matchNotes   || null,
        appliedAt:        isApplied ? new Date() : null,
        lastActivity:     new Date(),
      },
    });

    console.log(`  ADD  [${isApplied ? 'applied' : 'inbox  '}] ${cfg.company} — ${cfg.role} (score=${cfg.matchScore || '?'})`);
    added++;
  }

  console.log(`\nDone: ${added} added, ${existing} already existed, ${skipped} skipped`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
