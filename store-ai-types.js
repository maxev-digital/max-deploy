/**
 * store-ai-types.js — Backfill: extract aiTypes per JD and store in analysisJson.
 * Run once on VPS: node store-ai-types.js
 */
require('dotenv').config({ path: '/var/www/max-deploy/.env' });
const { PrismaClient } = require('@prisma/client');
const Anthropic = require('@anthropic-ai/sdk');

const prisma  = new PrismaClient();
const client  = new Anthropic();

async function extractBatch(batch) {
  const jdBlock = batch.map((o, i) =>
    `--- JD ${i + 1}: ${o.company} | ${o.role.trim()} ---\n${o.jdText.slice(0, 2000)}`
  ).join('\n\n');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Analyze these job descriptions and identify specific AI system types required.

${jdBlock}

For each JD, return a JSON array:
{ "idx": 0, "types": ["RAG pipeline", "LLM API integration"] }

Use normalized labels:
"RAG pipeline", "AI agent / autonomous agent", "LLM fine-tuning", "vector DB / embedding search",
"prompt engineering / system prompts", "AI evaluation framework", "multi-agent orchestration",
"code generation / coding assistant", "LLM API integration", "function calling / tool use",
"chatbot / conversational AI", "AI workflow automation", "computer vision / image AI",
"speech / TTS / STT", "document parsing / data extraction", "classification / NLP",
"recommendation system", "AI observability / monitoring", "model deployment / MLOps",
"customer-facing AI product", "internal AI tooling / AI platform",
"AI safety / red-teaming / evals", "forward deployed / implementation engineering",
"solutions architecture / pre-sales AI", "AI strategy / advisory"

Return ONLY valid JSON array, no explanation. Index is 0-based matching JD order.`
    }]
  });

  const text = msg.content[0].text.trim();
  try {
    const match = text.match(/\[[\s\S]+\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch { return []; }
}

async function main() {
  const opps = await prisma.opportunity.findMany({
    where: { jdText: { not: null }, fitScore: { gte: 70 } },
    select: { id: true, company: true, role: true, jdText: true, analysisJson: true },
    orderBy: { fitScore: 'desc' },
  });

  const valid = opps.filter(o => o.jdText && o.jdText.trim().length > 100);
  console.error(`Storing aiTypes for ${valid.length} JDs in batches of 5...`);

  const BATCH = 5;
  let updated = 0;
  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH);
    console.error(`  Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(valid.length / BATCH)}`);

    let results = [];
    try { results = await extractBatch(batch); } catch (e) { console.error('  ERR:', e.message); }

    for (let j = 0; j < batch.length; j++) {
      const opp   = batch[j];
      const found = results.find(r => r.idx === j);
      if (!found || !found.types.length) continue;

      const existing = (opp.analysisJson && typeof opp.analysisJson === 'object') ? opp.analysisJson : {};
      await prisma.opportunity.update({
        where: { id: opp.id },
        data: { analysisJson: { ...existing, aiTypes: found.types } },
      });
      updated++;
    }

    await new Promise(r => setTimeout(r, 600));
  }

  console.error(`\nDone. Updated ${updated}/${valid.length} opportunities with aiTypes.`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
