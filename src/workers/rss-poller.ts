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

        // Extract company and clean role per source format
        const { company, role } = extractCompanyAndRole(item, feed.source);

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

function extractCompanyAndRole(item: Parser.Item, source: string): { company: string; role: string } {
  const title = item.title ?? '';

  // WWR / Remotive: "Company: Job Title (location extras)"
  const colonIdx = title.indexOf(':');
  if ((source === 'wwr' || source === 'remotive') && colonIdx > 0) {
    const company = title.slice(0, colonIdx).trim();
    const role    = title.slice(colonIdx + 1).replace(/\s*\(.*?\)\s*$/, '').trim();
    return { company, role };
  }

  // Indeed / generic: "Job Title at Company Name"
  const atMatch = title.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) return { company: atMatch[2].trim(), role: atMatch[1].trim() };

  // dc:creator field (Remotive, some HN)
  if (item.creator) return { company: item.creator.trim(), role: title };

  if (source === 'hn') return { company: 'HN Who\'s Hiring', role: title };

  return { company: '', role: title };
}
