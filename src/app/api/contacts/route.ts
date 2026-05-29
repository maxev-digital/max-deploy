import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  await requireAuth();
  const contacts = await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();
  const contact = await prisma.contact.create({
    data: {
      name:     body.name,
      email:    body.email || null,
      linkedin: body.linkedin || null,
      role:     body.role || null,
      warmth:   body.warmth || 'cold',
      notes:    body.notes || null,
    },
  });
  return NextResponse.json({ contact }, { status: 201 });
}
