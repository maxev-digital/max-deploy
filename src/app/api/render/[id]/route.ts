import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Headless Chromium fetches this to render the cover letter with correct fonts.
// Returns raw HTML — Google Fonts load normally over HTTP (not blocked like file://).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const opp = await prisma.opportunity.findUnique({ where: { id } });
  const analysis = (opp?.analysisJson as Record<string, unknown>) ?? {};
  const html = analysis.coverLetterHtml as string | undefined;

  if (!html) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
