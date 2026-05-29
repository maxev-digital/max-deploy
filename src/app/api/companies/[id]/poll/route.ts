import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const company = await prisma.targetCompany.findUnique({ where: { id } });
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let jobsFound = 0;

  try {
    let url = '';
    if (company.atsType === 'greenhouse') {
      url = `https://boards.greenhouse.io/v1/boards/${company.atsSlug}/jobs`;
    } else if (company.atsType === 'lever') {
      url = `https://api.lever.co/v0/postings/${company.atsSlug}`;
    } else if (company.atsType === 'ashby') {
      url = `https://jobs.ashbyhq.com/api/non-user-facing/job-board/${company.atsSlug}/jobs`;
    }

    if (url) {
      const res = await fetch(url, { headers: { 'User-Agent': 'MAX-DEPLOY/1.0' } });
      if (res.ok) {
        const data = await res.json();
        const jobs = data.jobs ?? data.postings ?? data.data ?? [];

        for (const job of jobs.slice(0, 10)) {
          const title = job.title ?? job.text ?? 'Unknown Role';
          const applyUrl = job.absolute_url ?? job.hostedUrl ?? `https://jobs.ashbyhq.com/${company.atsSlug}`;

          const existing = await prisma.opportunity.findFirst({
            where: { company: company.name, role: title, source: company.atsType ?? 'ats' },
          });

          if (!existing) {
            await prisma.opportunity.create({
              data: {
                company: company.name,
                role: title,
                stage: 'inbox',
                source: company.atsType ?? 'ats',
                sourceCompanySlug: company.atsSlug ?? '',
                applyUrl,
                lastActivity: new Date(),
              },
            });
            jobsFound++;
          }
        }
      }
    }
  } catch { /* network errors expected */ }

  await prisma.targetCompany.update({
    where: { id },
    data: { lastPolled: new Date() },
  });

  return NextResponse.json({ jobsFound });
}
