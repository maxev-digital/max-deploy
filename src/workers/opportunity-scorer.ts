import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { sendTelegram, tgBold, tgCode } from '../lib/telegram';
import { slackFields } from '../lib/slack';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROFILE = `
Name: Will Austin
Skills: Next.js, TypeScript, Python, PostgreSQL, Prisma, Claude/Anthropic API, MCP protocol,
        multi-model routing, agentic system design, REST API design, Docker, VPS deployment,
        Twilio, ElevenLabs, Stripe Connect, IMAP email clients, BullMQ/Redis
Experience: Solo full-stack builder, technical product owner, 6 FDE engagements across 8 industries,
            14 production AI endpoints, 13 production platforms
Background: Former GM/GC (P&L ownership), self-taught, no CS degree
Preferred roles: FDE, Applied AI Engineer, AI Platform Engineer, Solutions Engineer, Head of AI
Salary floor: $120K full-time / $85/hr contract
Geography: Remote preferred, TX remote acceptable, Dallas area possible
Work type: Full-time, contract, or both simultaneously
Deal breakers: On-site 5 days/week, less than $100K, no AI component
`.trim();

export async function scorePendingOpportunities(limit = 25) {
  const opps = await prisma.opportunity.findMany({
    where: { fitScore: null, jdText: { not: null }, stage: { not: 'dead' } },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  if (!opps.length) { console.log('[scorer] No unscored opportunities.'); return; }
  console.log(`[scorer] Scoring ${opps.length} opportunities...`);

  for (const opp of opps) {
    try {
      const prompt = `Score this job opportunity for the candidate profile below.

CANDIDATE PROFILE:
${PROFILE}

JOB:
Company: ${opp.company}
Role: ${opp.role}
${opp.salaryMin ? `Salary: $${opp.salaryMin.toLocaleString()}${opp.salaryMax ? `–$${opp.salaryMax.toLocaleString()}` : '+'}` : ''}
Description:
${(opp.jdText ?? '').slice(0, 3000)}

Return ONLY valid JSON, no other text:
{
  "fitScore": <0-100>,
  "classification": "<FDE|AI_Engineer|CSM|Director|Contract|Skip>",
  "salaryAssessment": "<brief salary note>",
  "matchStrengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "recommendedAction": "<apply_now|apply_with_note|save|skip|watch>",
  "urgency": "<fresh|normal|stale>",
  "reasoning": "<2 sentence summary>"
}`;

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw  = (msg.content[0] as { type: string; text: string }).text.trim();
      const json = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''));

      await prisma.opportunity.update({
        where: { id: opp.id },
        data: {
          fitScore:          json.fitScore         ?? null,
          classification:    json.classification   ?? null,
          recommendedAction: json.recommendedAction ?? null,
          analysisJson:      json,
          lastActivity:      new Date(),
        },
      });
      console.log(`[scorer] ${opp.company} — ${opp.role}: score=${json.fitScore}, action=${json.recommendedAction}`);

      // Alert on high-score opportunities
      if (json.fitScore >= 80 && json.recommendedAction === 'apply_now') {
        const salaryStr = opp.salaryMin
          ? `$${Math.round(opp.salaryMin / 1000)}k${opp.salaryMax ? `–$${Math.round(opp.salaryMax / 1000)}k` : '+'}`
          : 'undisclosed';
        await sendTelegram(
          `🎯 ${tgBold('High-Score Opportunity')}\n\n${tgBold(opp.company)} — ${opp.role}\nScore: ${tgCode(String(json.fitScore))} · ${salaryStr}\n\n<i>${json.reasoning}</i>\n\nmax-ev-holdings.com/inbox`
        );
        await slackFields(
          `🎯 High-Score Opportunity — ${json.fitScore}`,
          { Company: opp.company, Role: opp.role, Salary: salaryStr, Action: 'apply_now', Reasoning: json.reasoning?.slice(0, 120) ?? '' },
          '#14B8AD'
        );
      }
    } catch (e) {
      console.error(`[scorer] Failed to score ${opp.company} — ${opp.role}:`, (e as Error).message);
    }
  }
}
