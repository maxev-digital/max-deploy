import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  await requireAuth();
  const companies = await prisma.targetCompany.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();
  const company = await prisma.targetCompany.create({
    data: {
      name:      body.name,
      website:   body.website || null,
      industry:  body.industry || null,
      size:      body.size || null,
      atsType:   body.atsType || null,
      atsSlug:   body.atsSlug || null,
      warmth:    body.warmth || 'cold',
      notes:     body.notes || null,
      watchlist: body.watchlist ?? true,
      techStack: [],
    },
  });
  return NextResponse.json({ company }, { status: 201 });
}
