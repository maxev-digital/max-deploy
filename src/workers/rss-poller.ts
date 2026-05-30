import Parser from 'rss-parser';
import { prisma } from '../lib/prisma';

const parser = new Parser({ timeout: 10000 });

export async function pollRssFeeds() {
  const feeds = await prisma.rssFeed.findMany({ where: { active: true } });
  if (!feeds.length) { console.log('[rss] No active feeds.'); return; }

  let created = 0;
  for (const feed of feeds) {
    try {
      const result = await parser.parseURL(feed.url);
      for (const item of result.items ?? []) {
        if (!item.title || !item.link) continue;

        // Skip if already in DB by URL
        const exists = await prisma.opportunity.findFirst({ where: { applyUrl: item.link } });
        if (exists) continue;

        // Extract company from feed title or item content
        const company = extractCompany(item, feed.source);
        const role    = item.title.replace(/\s*at\s+.*$/i, '').trim();

        await prisma.opportunity.create({
          data: {
            company:      company || 'Unknown',
            role,
            stage:        'inbox',
            source:       feed.source,
            applyUrl:     item.link,
            jdText:       item.contentSnippet ?? item.content ?? null,
            notes:        null,
            lastActivity: new Date(),
          },
        });
        created++;
      }
      await prisma.rssFeed.update({
        where: { id: feed.id },
        data:  { lastPolled: new Date(), lastItemDate: result.items?.[0]?.pubDate ? new Date(result.items[0].pubDate) : undefined },
      });
    } catch (e) {
      console.error(`[rss] Failed to poll ${feed.name}:`, (e as Error).message);
    }
  }
  console.log(`[rss] Created ${created} new opportunities from ${feeds.length} feeds.`);
}

function extractCompany(item: Parser.Item, source: string): string {
  // Indeed: "Job Title at Company Name"
  const atMatch = item.title?.match(/\s+at\s+(.+)$/i);
  if (atMatch) return atMatch[1].trim();
  // Try feed author or content
  if (item.creator) return item.creator;
  // Source-specific heuristics
  if (source === 'hn') return 'HN Who\'s Hiring';
  return '';
}
