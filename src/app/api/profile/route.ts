import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  await requireAuth();
  const profile = await prisma.userProfile.findFirst();
  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  await requireAuth();
  const body = await req.json();

  const profile = await prisma.userProfile.upsert({
    where: { userId: '1' },
    update: {
      name:           body.name           ?? undefined,
      email:          body.email          ?? undefined,
      targetTitle:    body.targetTitle    ?? undefined,
      targetTitles:   body.targetTitles   ?? undefined,
      profileSummary: body.profileSummary ?? undefined,
      salaryFloor:    body.salaryFloor !== undefined ? Number(body.salaryFloor) : undefined,
      geoPref:        body.geoPref        ?? undefined,
      workType:       body.workType       ?? undefined,
      dealBreakers:   body.dealBreakers   ?? undefined,
      skills:         body.skills         ?? undefined,
      industries:     body.industries     ?? undefined,
    },
    create: {
      userId:         '1',
      name:           body.name           ?? '',
      email:          body.email          ?? '',
      targetTitle:    body.targetTitle    ?? '',
      targetTitles:   body.targetTitles   ?? [],
      profileSummary: body.profileSummary ?? '',
      salaryFloor:    body.salaryFloor !== undefined ? Number(body.salaryFloor) : 0,
      geoPref:        body.geoPref        ?? 'Remote',
      workType:       body.workType       ?? 'remote',
      dealBreakers:   body.dealBreakers   ?? '',
      skills:         body.skills         ?? [],
      industries:     body.industries     ?? [],
    },
  });

  return NextResponse.json({ profile });
}
