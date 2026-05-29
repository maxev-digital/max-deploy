import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TYPE_PROMPTS: Record<string, string> = {
  cover_letter: 'Write a cover letter (4-5 paragraphs). Open with the strongest AI-native match point. Mention 14 production AI endpoints and 13 production platforms specifically. Close with remote-first availability.',
  recruiter_outreach: 'Write a 3-sentence cold email to a recruiter. Lead with the most relevant match to their open roles. Professional and direct, no fluff.',
  follow_up: 'Write a 2-3 sentence follow-up email referencing the original application. Add one new signal ("I shipped X since applying"). Friendly but professional.',
  gone_dark: 'Write a final 2-sentence check-in for an application that has gone dark. Graceful, no desperation. Leave the door open.',
  thank_you_screening: 'Write a thank-you email after a screening call. 2-3 sentences, personalize to what was discussed, reinforce the top fit point.',
  thank_you_interview: 'Write a thank-you email after an interview. 3-4 sentences, reference something specific from the conversation, reinforce unique value.',
  negotiation: 'Write a negotiation response to a job offer. Professional and confident. Reference market data. Counter with a specific number.',
};

export async function POST(req: NextRequest) {
  await requireAuth();
  const { opportunityId, type } = await req.json();

  const opp = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: { contacts: true, outreachLogs: { orderBy: { sentAt: 'desc' }, take: 3 } },
  });

  if (!opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  const typePrompt = TYPE_PROMPTS[type] ?? TYPE_PROMPTS.follow_up;

  const prompt = `${typePrompt}

Company: ${opp.company}
Role: ${opp.role}
Stage: ${opp.stage}
JD Summary: ${opp.jdText?.slice(0, 1500) ?? 'Not available'}
Notes: ${opp.notes ?? 'None'}

Sender: Will Austin — AI-native engineer, 14 production AI endpoints, Next.js/TypeScript/Python/Claude API, former P&L owner
Email: ${process.env.SMTP_FROM ?? 'will@max-ev-holdings.com'}

Write the email body only (no subject line unless it's a cover letter). Keep it tight.`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const body = msg.content[0].type === 'text' ? msg.content[0].text : '';

  const subject = type === 'cover_letter'
    ? `Application — ${opp.role} at ${opp.company}`
    : type === 'follow_up' || type === 'gone_dark'
    ? `Re: ${opp.role} Application — Will Austin`
    : `${opp.role} at ${opp.company}`;

  const log = await prisma.outreachLog.create({
    data: {
      opportunityId: opp.id,
      type,
      direction: 'sent',
      subject,
      body,
      status: 'draft',
    },
  });

  return NextResponse.json({ log, subject, body });
}
