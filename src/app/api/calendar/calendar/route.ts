import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end   = searchParams.get('end');

  const events = await prisma.calendarEvent.findMany({
    where: {
      startAt: {
        gte: start ? new Date(start) : undefined,
        lte: end   ? new Date(end)   : undefined,
      },
    },
    include: {
      opportunity: {
        select: { id: true, company: true, role: true, stage: true },
      },
    },
    orderBy: { startAt: 'asc' },
  });

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, startAt, endAt, allDay, location, description, type, opportunityId } = body;

  if (!title || !startAt) {
    return NextResponse.json({ error: 'title and startAt are required' }, { status: 400 });
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      startAt:       new Date(startAt),
      endAt:         endAt        ? new Date(endAt) : null,
      allDay:        allDay       ?? false,
      location:      location     ?? null,
      description:   description  ?? null,
      type:          type         ?? 'other',
      opportunityId: opportunityId ?? null,
    },
    include: {
      opportunity: {
        select: { id: true, company: true, role: true, stage: true },
      },
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await prisma.calendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
