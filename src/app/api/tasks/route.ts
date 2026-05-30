import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  await requireAuth();
  const tasks = await prisma.task.findMany({
    where: { status: { not: 'DONE' } },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    take: 20,
  });
  const done = await prisma.task.count({ where: { status: 'DONE' } });
  return NextResponse.json({ tasks, doneCount: done });
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();
  const task = await prisma.task.create({
    data: {
      title:      body.title,
      priority:   body.priority   ?? 'MEDIUM',
      status:     body.status     ?? 'TODO',
      assignedTo: body.assignedTo ?? null,
      dueDate:    body.dueDate    ? new Date(body.dueDate) : null,
      notes:      body.notes      ?? null,
    },
  });
  return NextResponse.json({ task }, { status: 201 });
}
