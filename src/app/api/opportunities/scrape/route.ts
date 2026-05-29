import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  await requireAuth();
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  let html = '';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobParser/1.0)' },
    });
    html = await res.text();
    // Strip scripts, styles, tags — keep text
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
               .replace(/<style[\s\S]*?<\/style>/gi, '')
               .replace(/<[^>]+>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim()
               .slice(0, 6000);
  } catch {
    return NextResponse.json({ error: 'Could not fetch URL' }, { status: 400 });
  }

  const prompt = `Parse this job posting text into structured JSON. Extract as much as possible.

Job posting text:
${html}

Return ONLY a JSON object:
{
  "company": "<company name>",
  "role": "<job title>",
  "salaryMin": <number or null>,
  "salaryMax": <number or null>,
  "jdText": "<cleaned job description text, under 3000 chars>",
  "source": "bookmarklet"
}`;

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  let parsed: Record<string, unknown> = {};
  try {
    const match = text.match(/\{[\s\S]+\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    return NextResponse.json({ error: 'Could not parse job posting' }, { status: 400 });
  }

  const opp = await prisma.opportunity.create({
    data: {
      company:     String(parsed.company ?? 'Unknown'),
      role:        String(parsed.role ?? 'Unknown Role'),
      stage:       'inbox',
      salaryMin:   typeof parsed.salaryMin === 'number' ? parsed.salaryMin : null,
      salaryMax:   typeof parsed.salaryMax === 'number' ? parsed.salaryMax : null,
      applyUrl:    url,
      source:      'bookmarklet',
      jdText:      typeof parsed.jdText === 'string' ? parsed.jdText : null,
      lastActivity: new Date(),
    },
  });

  return NextResponse.json({ opportunity: opp }, { status: 201 });
}
