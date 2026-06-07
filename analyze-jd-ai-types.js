/**
 * analyze-jd-ai-types.js — Extract AI build types from all scored JDs,
 * aggregate frequency, write a sorted markdown report.
 * Batches 5 JDs per Sonnet call for speed.
 */
require('dotenv').config({ path: '/var/www/max-deploy/.env' });
const { PrismaClient } = require('@prisma/client');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

const prisma  = new PrismaClient();
const client  = new Anthropic();
const OUT     = '/var/www/max-deploy/ai-build-types-report.md';
const MIN_FIT = 70;

async function extractBatch(batch) {
  const jdBlock = batch.map((o, i) =>
    `--- JD ${i + 1}: ${o.company} | ${o.role.trim()} ---\n${o.jdText.slice(0, 2500)}`
  ).join('\n\n');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `You are analyzing job descriptions to identify specific AI system types required or mentioned.

${jdBlock}

For each JD above, return a JSON array of objects with this shape:
{ "idx": 0, "types": ["RAG pipeline", "LLM API integration"] }

Use normalized, consistent labels. Good label examples:
"RAG pipeline", "AI agent / autonomous agent", "LLM fine-tuning", "vector DB / embedding search",
"prompt engineering / system prompts", "AI evaluation framework", "multi-agent orchestration",
"code generation / coding assistant", "LLM API integration", "function calling / tool use",
"chatbot / conversational AI", "AI workflow automation", "computer vision / image AI",
"speech / TTS / STT", "document parsing / data extraction", "classification / NLP",
"recommendation system", "AI observability / monitoring", "model deployment / MLOps",
"customer-facing AI product", "internal AI tooling / AI platform",
"AI safety / red-teaming / evals", "sandbox / eval environment",
"forward deployed / implementation engineering", "solutions architecture / pre-sales AI",
"AI strategy / advisory"

Return ONLY a valid JSON array, no explanation. Index matches JD order (0-based).`
    }]
  });

  const text = msg.content[0].text.trim();
  try {
    const match = text.match(/\[[\s\S]+\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return [];
  }
}

async function main() {
  const opps = await prisma.opportunity.findMany({
    where: {
      jdText: { not: null },
      fitScore: { gte: MIN_FIT },
    },
    select: { id: true, company: true, role: true, fitScore: true, stage: true, jdText: true },
    orderBy: { fitScore: 'desc' },
  });

  const valid = opps.filter(o => o.jdText && o.jdText.trim().length > 100);
  console.error(`Analyzing ${valid.length} JDs (fitScore>=${MIN_FIT}) in batches of 5...\n`);

  const freq   = {};
  const jobMap = {};
  const jobTypes = [];

  const BATCH = 5;
  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH);
    console.error(`  Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(valid.length / BATCH)}: ${batch.map(o => o.company).join(', ')}`);

    let results;
    try {
      results = await extractBatch(batch);
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      results = [];
    }

    for (let j = 0; j < batch.length; j++) {
      const opp   = batch[j];
      const found = results.find(r => r.idx === j);
      const types = found ? found.types : [];

      jobTypes.push({ company: opp.company, role: opp.role.trim(), fitScore: opp.fitScore, stage: opp.stage, types });

      for (const t of types) {
        freq[t] = (freq[t] || 0) + 1;
        if (!jobMap[t]) jobMap[t] = [];
        jobMap[t].push({ company: opp.company, role: opp.role.trim(), fitScore: opp.fitScore });
      }
    }

    await new Promise(r => setTimeout(r, 600));
  }

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const total  = valid.length;

  const lines = [];
  lines.push('# AI Build Types Across Job Descriptions');
  lines.push('');
  lines.push(`**JDs analyzed:** ${total}  |  **Min fit score:** ${MIN_FIT}  |  **Distinct AI build types:** ${sorted.length}  |  **Generated:** ${new Date().toISOString().slice(0,10)}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Frequency Table (Highest → Lowest Demand)');
  lines.push('');
  lines.push('| Rank | AI Build Type | # Jobs | % of JDs |');
  lines.push('|------|---------------|--------|----------|');
  sorted.forEach(([label, count], idx) => {
    const pct = ((count / total) * 100).toFixed(0);
    lines.push(`| ${idx + 1} | ${label} | ${count} | ${pct}% |`);
  });

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Detail by Build Type');
  lines.push('');
  for (const [label, count] of sorted) {
    lines.push(`### ${label}  *(${count} jobs)*`);
    const jobs = jobMap[label].sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
    for (const j of jobs.slice(0, 20)) {
      lines.push(`- **${j.company}** — ${j.role} *(${j.fitScore || '?'})*`);
    }
    if (jobs.length > 20) lines.push(`- *...and ${jobs.length - 20} more*`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Per-Job Breakdown');
  lines.push('');
  for (const j of jobTypes) {
    lines.push(`### ${j.company} — ${j.role}  *(fit: ${j.fitScore || '?'}) [${j.stage}]*`);
    if (j.types.length) {
      j.types.forEach(t => lines.push(`- ${t}`));
    } else {
      lines.push('- *(no types extracted)*');
    }
    lines.push('');
  }

  const md = lines.join('\n');
  fs.writeFileSync(OUT, md);
  console.error(`\nDone. ${sorted.length} distinct AI build types across ${total} JDs.`);
  console.error(`Report: ${OUT}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
