/**
 * Seed RSS feeds and target company watchlist for MAX-DEPLOY Discovery system.
 * Run: node scripts/seed-discovery.mjs
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─── RSS Feeds ────────────────────────────────────────────────────────────────

const RSS_FEEDS = [
  // Indeed — public RSS for key searches
  {
    name: 'Indeed: Forward Deployed Engineer',
    url:  'https://www.indeed.com/rss?q=forward+deployed+engineer&sort=date&limit=25',
    source: 'indeed',
  },
  {
    name: 'Indeed: AI Engineer Remote',
    url:  'https://www.indeed.com/rss?q=AI+engineer+remote&sort=date&limit=25',
    source: 'indeed',
  },
  {
    name: 'Indeed: Applied AI Engineer',
    url:  'https://www.indeed.com/rss?q=applied+AI+engineer&sort=date&limit=25',
    source: 'indeed',
  },
  {
    name: 'Indeed: Claude Anthropic Engineer',
    url:  'https://www.indeed.com/rss?q=claude+anthropic+engineer&sort=date&limit=25',
    source: 'indeed',
  },
  {
    name: 'Indeed: FDE AI $150K',
    url:  'https://www.indeed.com/rss?q=forward+deployed+%24150%2C000&sort=date&limit=25',
    source: 'indeed',
  },
  // We Work Remotely
  {
    name: 'WWR: Remote Programming Jobs',
    url:  'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    source: 'wwr',
  },
  {
    name: 'WWR: Remote Full Stack Jobs',
    url:  'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
    source: 'wwr',
  },
  // Remotive
  {
    name: 'Remotive: Software Engineering',
    url:  'https://remotive.com/remote-jobs/feed/software-dev',
    source: 'remotive',
  },
  {
    name: 'Remotive: AI / ML',
    url:  'https://remotive.com/remote-jobs/feed/data',
    source: 'remotive',
  },
];

// ─── Target Companies ─────────────────────────────────────────────────────────

const COMPANIES = [
  // Greenhouse — AI-native / FDE-rich companies
  { name: 'Anthropic',        atsType: 'greenhouse', atsSlug: 'anthropic',       website: 'anthropic.com',       industry: 'AI Research',   size: '500-1000', warmth: 'hot',  notes: 'Claude maker — dream employer' },
  { name: 'OpenAI',           atsType: 'greenhouse', atsSlug: 'openai',           website: 'openai.com',          industry: 'AI Research',   size: '1000+',    warmth: 'hot'  },
  { name: 'Stripe',           atsType: 'greenhouse', atsSlug: 'stripe',           website: 'stripe.com',          industry: 'Fintech',       size: '5000+',    warmth: 'warm' },
  { name: 'Figma',            atsType: 'greenhouse', atsSlug: 'figma',            website: 'figma.com',           industry: 'Design Tools',  size: '1000+',    warmth: 'warm' },
  { name: 'Notion',           atsType: 'greenhouse', atsSlug: 'notion',           website: 'notion.so',           industry: 'Productivity',  size: '500-1000', warmth: 'warm' },
  { name: 'Linear',           atsType: 'greenhouse', atsSlug: 'linear',           website: 'linear.app',          industry: 'Dev Tools',     size: '50-200',   warmth: 'warm' },
  { name: 'Vercel',           atsType: 'greenhouse', atsSlug: 'vercel',           website: 'vercel.com',          industry: 'Dev Tools',     size: '200-500',  warmth: 'warm' },
  { name: 'Retool',           atsType: 'greenhouse', atsSlug: 'retool',           website: 'retool.com',          industry: 'Dev Tools',     size: '500-1000', warmth: 'warm' },
  { name: 'Rippling',         atsType: 'greenhouse', atsSlug: 'rippling',         website: 'rippling.com',        industry: 'HR Tech',       size: '1000+',    warmth: 'cold' },
  { name: 'Databricks',       atsType: 'greenhouse', atsSlug: 'databricks',       website: 'databricks.com',      industry: 'Data/AI',       size: '5000+',    warmth: 'warm' },
  { name: 'Scale AI',         atsType: 'greenhouse', atsSlug: 'scaleai',          website: 'scale.com',           industry: 'AI Data',       size: '500-1000', warmth: 'warm' },
  { name: 'Cohere',           atsType: 'greenhouse', atsSlug: 'cohere',           website: 'cohere.com',          industry: 'AI Research',   size: '200-500',  warmth: 'warm' },
  { name: 'Replit',           atsType: 'greenhouse', atsSlug: 'replit',           website: 'replit.com',          industry: 'Dev Tools',     size: '200-500',  warmth: 'warm' },
  { name: 'Brex',             atsType: 'greenhouse', atsSlug: 'brex',             website: 'brex.com',            industry: 'Fintech',       size: '1000+',    warmth: 'cold' },
  { name: 'Weights & Biases', atsType: 'greenhouse', atsSlug: 'wandb',            website: 'wandb.ai',            industry: 'ML Tools',      size: '200-500',  warmth: 'warm' },
  { name: 'Hugging Face',     atsType: 'greenhouse', atsSlug: 'huggingface',      website: 'huggingface.co',      industry: 'AI Research',   size: '200-500',  warmth: 'warm' },
  { name: 'Cursor',           atsType: 'greenhouse', atsSlug: 'anysphere',        website: 'cursor.sh',           industry: 'Dev Tools',     size: '50-200',   warmth: 'hot',  notes: 'AI-native editor — FDE adjacent' },
  { name: 'Perplexity',       atsType: 'greenhouse', atsSlug: 'perplexity',       website: 'perplexity.ai',       industry: 'AI Search',     size: '50-200',   warmth: 'warm' },
  { name: 'Mistral AI',       atsType: 'greenhouse', atsSlug: 'mistral',          website: 'mistral.ai',          industry: 'AI Research',   size: '50-200',   warmth: 'warm' },
  { name: 'Loom',             atsType: 'greenhouse', atsSlug: 'loom',             website: 'loom.com',            industry: 'Video Comms',   size: '200-500',  warmth: 'cold' },
  { name: 'Amplitude',        atsType: 'greenhouse', atsSlug: 'amplitude',        website: 'amplitude.com',       industry: 'Analytics',     size: '500-1000', warmth: 'cold' },
  { name: 'Sourcegraph',      atsType: 'greenhouse', atsSlug: 'sourcegraph',      website: 'sourcegraph.com',     industry: 'Dev Tools',     size: '200-500',  warmth: 'warm', notes: 'Cody AI — strong FDE culture' },
  { name: 'Runway',           atsType: 'greenhouse', atsSlug: 'runwayml',         website: 'runwayml.com',        industry: 'Creative AI',   size: '50-200',   warmth: 'warm' },
  // Lever companies
  { name: 'Snyk',             atsType: 'lever',      atsSlug: 'snyk',             website: 'snyk.io',             industry: 'Dev Security',  size: '1000+',    warmth: 'cold' },
  { name: 'Lob',              atsType: 'lever',      atsSlug: 'lob',              website: 'lob.com',             industry: 'API Platform',  size: '200-500',  warmth: 'cold' },
  { name: 'Temporal',         atsType: 'lever',      atsSlug: 'temporal',         website: 'temporal.io',         industry: 'Dev Tools',     size: '200-500',  warmth: 'warm', notes: 'Workflow orchestration — matches BullMQ background' },
  { name: 'Descript',         atsType: 'lever',      atsSlug: 'descript',         website: 'descript.com',        industry: 'Creative AI',   size: '200-500',  warmth: 'warm' },
  { name: 'Mem',              atsType: 'lever',      atsSlug: 'mem-labs',         website: 'mem.ai',              industry: 'AI Productivity', size: '10-50',  warmth: 'warm' },
  // Ashby — heavy AI startup usage
  { name: 'Supabase',         atsType: 'ashby',      atsSlug: 'supabase',         website: 'supabase.com',        industry: 'Dev Tools',     size: '200-500',  warmth: 'warm' },
  { name: 'Qdrant',           atsType: 'ashby',      atsSlug: 'qdrant',           website: 'qdrant.tech',         industry: 'Vector DB',     size: '50-200',   warmth: 'warm' },
  { name: 'LangChain',        atsType: 'ashby',      atsSlug: 'langchain',        website: 'langchain.com',       industry: 'AI Tools',      size: '10-50',    warmth: 'hot',  notes: 'LangChain/LangSmith — pure AI tooling, FDE adjacent' },
  { name: 'Roboflow',         atsType: 'ashby',      atsSlug: 'roboflow',         website: 'roboflow.com',        industry: 'Computer Vision', size: '50-200', warmth: 'warm' },
  // Already applied — track in watchlist too
  { name: 'Aimpoint Digital',  atsType: 'none', atsSlug: null, website: 'aimpointdigital.com',  industry: 'Analytics Consulting', size: '200-500', warmth: 'warm', notes: 'Applied — FDE role' },
  { name: 'Haast',             atsType: 'none', atsSlug: null, website: 'haast.com',             industry: 'AI',                  size: '10-50',   warmth: 'warm', notes: 'Applied — FDE role' },
  { name: 'Edisyl',            atsType: 'none', atsSlug: null, website: 'edisyl.com',            industry: 'Tech Consulting',     size: '50-200',  warmth: 'warm', notes: 'Applied x2 — Architect + FDE Data Engineer' },
];

async function main() {
  console.log('Seeding RSS feeds...');
  let feedCount = 0;
  for (const feed of RSS_FEEDS) {
    await prisma.rssFeed.upsert({
      where:  { url: feed.url },
      update: { name: feed.name, source: feed.source, active: true },
      create: { id: `feed_${Math.random().toString(36).slice(2, 14)}`, ...feed, active: true },
    });
    feedCount++;
  }
  console.log(`  ${feedCount} RSS feeds seeded`);

  console.log('Seeding target companies...');
  let compCount = 0;
  for (const co of COMPANIES) {
    const existing = await prisma.targetCompany.findFirst({ where: { name: co.name } });
    if (!existing) {
      await prisma.targetCompany.create({
        data: {
          id: `co_${Math.random().toString(36).slice(2, 14)}`,
          ...co,
          techStack: [],
          watchlist: true,
        },
      });
      compCount++;
    }
  }
  console.log(`  ${compCount} companies seeded (skipped existing)`);

  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
