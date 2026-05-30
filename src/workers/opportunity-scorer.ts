import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { sendTelegram, tgBold, tgCode } from '../lib/telegram';
import { slackFields } from '../lib/slack';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROFILE = `
Name: Will Austin
Skills: Next.js, TypeScript, Python, PostgreSQL, Prisma, Claude/Anthropic API, MCP protocol,
        multi-model routing, agentic system design, REST API design, Docker, VPS deployment,
        Twilio, ElevenLabs, Stripe Connect, IMAP email clients, BullMQ/Redis, HubSpot CRM,
        digital marketing strategy, client discovery & scoping, proposal & pricing,
        stakeholder management, team leadership (40-80 staff), P&L ownership
Experience: 6 FDE client engagements across 8 industries, 14 production AI endpoints,
            13 production platforms, 4 external client deliveries, 12 years GM/GC operations,
            HubSpot certified (Sales, Marketing, CRM, Inbound), self-taught engineer
Background: Former General Manager + General Contractor, self-taught full-stack, no CS degree.
            Bridges technical execution and business leadership fluently.

Target roles IN PRIORITY ORDER — score accordingly:
  Tier 1 (score 75-100): FDE / Forward Deployed Engineer / Applied AI Engineer / AI Platform Engineer /
    Agentic AI Engineer / Solutions Engineer / Technical Implementation Engineer / Staff AI Engineer
  Tier 2 (score 65-85): Solutions Consultant / Technical Account Executive / Customer Success Manager (SaaS/AI) /
    Senior Full Stack Engineer (AI-native company) / AI Adoption Manager / Engineering Manager /
    Head of Technology / Director of AI / Sr Analyst AI Transformation / MLOps Engineer
  Tier 3 (score 55-75): Marketing Director / Digital Marketing Manager / Marketing Operations /
    VP Marketing / Social Media Manager (strategic) / Director of Communications /
    Senior Paid Media Manager / Content Strategy (brand/AI company)

Salary floor: $50,000/yr minimum (full-time, contract, part-time, or freelance)
Geography: Remote (anywhere USA) preferred. DFW hybrid (Dallas/Plano/Frisco/Southlake/
           Addison/Grapevine/Irving/Allen) fully acceptable. On-site outside DFW = deal breaker.
Work type: Full-time, part-time, contract, or freelance — all acceptable simultaneously
Deal breakers: On-site 5 days/week outside DFW metro, under $50K/yr, purely manual/non-digital role
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

Classify the role using these values:
- FDE = Forward Deployed Engineer / Applied AI Engineer / Agentic AI Engineer
- AI_Engineer = AI/ML/MLOps engineer, Staff AI, platform engineering
- Solutions = Solutions Engineer, Technical Account Exec, Implementation Consultant
- CSM = Customer Success Manager, AI Adoption Manager
- Director = Director/VP/Head of Technology/AI, Engineering Manager
- Marketing = Marketing Director, Digital Marketing, Marketing Ops, Social Media (strategic)
- FullStack = Senior/Staff Software Engineer (not FDE/AI-specific)
- Contract = freelance, short-term, 1099 engagement
- Skip = under $50K, pure on-site outside DFW, non-digital manual role, entry-level admin

Return ONLY valid JSON, no other text:
{
  "fitScore": <0-100>,
  "classification": "<FDE|AI_Engineer|Solutions|CSM|Director|Marketing|FullStack|Contract|Skip>",
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
