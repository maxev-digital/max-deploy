import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST() {
  await requireAuth();

  const feeds = await prisma.rssFeed.findMany({ where: { active: true } });
  let totalCreated = 0;

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, { headers: { 'User-Agent': 'MAX-DEPLOY/1.0' } });
      if (!res.ok) continue;
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
          await prisma.opportunity.create({
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
        }
      }

      await prisma.rssFeed.update({ where: { id: feed.id }, data: { lastPolled: new Date() } });
    } catch { /* skip failed feeds */ }
  }

  return NextResponse.json({ totalCreated, feedsPolled: feeds.length });
}
