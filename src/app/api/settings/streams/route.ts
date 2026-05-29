import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  await requireAuth();
  const feeds = await prisma.rssFeed.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ feeds });
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();
  const feed = await prisma.rssFeed.create({
    data: { name: body.name, url: body.url, source: body.source, active: true },
  });
  return NextResponse.json({ feed }, { status: 201 });
}
