import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROFILE = `Skills: Next.js, TypeScript, Python, PostgreSQL, Prisma, Claude/Anthropic API, MCP protocol, multi-model routing, agentic system design, Docker, VPS deployment
Experience: Solo full-stack builder, 14 production AI endpoints, 13 production platforms, 4 client engagements
Background: Former GM/GC, self-taught, no CS degree
Preferred roles: FDE, Applied AI Engineer, Solutions Engineer, AI Platform Engineer
Salary floor: $120K FT / $75/hr contract
Geography: Remote preferred, Dallas possible
Deal breakers: On-site 5d/wk, <$100K, no AI component`;

async function autoScore(oppId: string, applyUrl: string, title: string, company: string) {
  let jdText: string | null = null;
  try {
    const res = await fetch(applyUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobParser/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      let html = await res.text();
      html = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 4000);
      if (html.length > 300) jdText = html;
    }
  } catch { /* scraping failed — use title only */ }

  const context = jdText
    ? `Job title: ${title}\nCompany: ${company}\nJob description:\n${jdText}`
    : `Job title: ${title}\nCompany: ${company}\n(Full JD unavailable — score based on title and company only)`;

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Score this job for this engineer:\n${PROFILE}\n\n${context}\n\nReturn ONLY JSON:\n{"fitScore":<0-100>,"classification":"<FDE|AI_Engineer|CSM|Director|Contract|Skip>","recommendedAction":"<apply_now|apply_with_note|save|skip|watch>"}`,
    }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  let analysis: Record<string, unknown> = {};
  try {
    const match = text.match(/\{[\s\S]+\}/);
    if (match) analysis = JSON.parse(match[0]);
  } catch { return; }

  await prisma.opportunity.update({
    where: { id: oppId },
    data: {
      jdText:            jdText ?? undefined,
      fitScore:          typeof analysis.fitScore === 'number' ? analysis.fitScore : undefined,
      classification:    typeof analysis.classification === 'string' ? analysis.classification : undefined,
      recommendedAction: typeof analysis.recommendedAction === 'string' ? analysis.recommendedAction : undefined,
    },
  });
}

export async function POST() {
  await requireAuth();

  const feeds = await prisma.rssFeed.findMany({ where: { active: true } });
  let totalCreated = 0;

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, { headers: { 'User-Agent': 'MAX-DEPLOY/1.0' } });
      if (!res.ok) {
        await prisma.rssFeed.update({
          where: { id: feed.id },
          data: {
            consecutiveFailures: { increment: 1 },
            lastError: `HTTP ${res.status} ${res.statusText}`,
          },
        });
        continue;
      }
      const xml = await res.text();

      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
        const title   = m[1].match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/)?.[1] ?? m[1].match(/<title>(.+?)<\/title>/)?.[1] ?? '';
        const link    = m[1].match(/<link>(.+?)<\/link>/)?.[1] ?? '';
        const company = m[1].match(/<source[^>]*>(.+?)<\/source>/)?.[1] ?? 'Unknown';
        return { title: title.trim(), link: link.trim(), company: company.trim() };
      });

      for (const item of items.slice(0, 5)) {
        if (!item.title || !item.link) continue;
        const exists = await prisma.opportunity.findFirst({ where: { applyUrl: item.link } });
        if (!exists) {
          const opp = await prisma.opportunity.create({
            data: {
              company:     item.company || 'Unknown',
              role:        item.title,
              stage:       'inbox',
              source:      feed.source,
              applyUrl:    item.link,
              lastActivity: new Date(),
            },
          });
          totalCreated++;
          void autoScore(opp.id, item.link, item.title, item.company);
        }
      }

      await prisma.rssFeed.update({
        where: { id: feed.id },
        data: { lastPolled: new Date(), consecutiveFailures: 0, lastError: null },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.rssFeed.update({
        where: { id: feed.id },
        data: {
          consecutiveFailures: { increment: 1 },
          lastError: msg.slice(0, 500),
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ totalCreated, feedsPolled: feeds.length });
}
