import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  await requireAuth();
  const templates = await prisma.feedTemplate.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });

  const grouped = templates.reduce<Record<string, typeof templates>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return NextResponse.json({ grouped });
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const { name, url, source, category, description } = await req.json();

  const template = await prisma.feedTemplate.create({
    data: { name, url, source, category, description: description ?? null },
  });

  return NextResponse.json({ template });
}
