import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { sendTelegramButtons, tgBold, tgCode, applyButtons } from '../lib/telegram';
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

CURRENT PRIORITY: Actively seeking income NOW. Contract, freelance, part-time, and short-term
engagements are EQUALLY desirable as full-time. Any role that generates revenue and builds
the portfolio is valuable. Do not penalize contract/1099/freelance roles — score them the same
as equivalent full-time roles.

Target roles IN PRIORITY ORDER — score accordingly:
  Tier 1 (score 75-100): FDE / Forward Deployed Engineer / Applied AI Engineer / AI Platform Engineer /
    Agentic AI Engineer / Solutions Engineer / Technical Implementation Engineer / Staff AI Engineer /
    AI Consultant (contract) / Fractional CTO / Freelance AI Engineer / Contract Developer (AI focus)
  Tier 2 (score 65-85): Solutions Consultant / Technical Account Executive / Customer Success Manager (SaaS/AI) /
    Senior Full Stack Engineer (AI-native company) / AI Adoption Manager / Engineering Manager /
    Head of Technology / Director of AI / Sr Analyst AI Transformation / MLOps Engineer /
    Contract Full Stack Developer / Freelance Software Engineer / Part-time AI Engineer
  Tier 3 (score 55-75): Marketing Director / Digital Marketing Manager / Marketing Operations /
    VP Marketing / Social Media Manager (strategic) / Director of Communications /
    Senior Paid Media Manager / Content Strategy / Any contract/freelance tech role

Geography scoring (apply these adjustments to base role score):
  Remote (fully remote, work from anywhere): no adjustment — full score
  DFW hybrid (Dallas/Plano/Frisco/Southlake/Addison/Grapevine/Irving/Allen area): subtract 5 points max
  On-site DFW (required in office, DFW metro): subtract 10 points
  On-site outside DFW (required in office, NOT in DFW metro): subtract 40+ points — near deal breaker

Compensation floor: $50/hr contract OR $50,000/yr salary — apply_now for anything above.
  For contract roles: $35-50/hr = apply_with_note (low but buildable). Under $35/hr = skip.
  For salary roles: $40-50K = apply_with_note if strong fit. Under $40K = skip.
Work type: Full-time, part-time, contract, 1099, freelance — ALL acceptable, none penalized
Deal breakers: On-site 5 days outside DFW, under $35/hr contract, under $40K salary, purely manual non-digital
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

      // Alert threshold: 70+ for any role, 65+ for contract/freelance
      const isContract = ['contract','freelance','1099','part-time','part time','fractional']
        .some(kw => (opp.role + (opp.source ?? '')).toLowerCase().includes(kw));
      const alertThreshold = isContract ? 65 : 70;

      if (json.fitScore >= alertThreshold && json.recommendedAction !== 'skip') {
        const salaryStr = opp.salaryMin
          ? `$${Math.round(opp.salaryMin / 1000)}k${opp.salaryMax ? `–$${Math.round(opp.salaryMax / 1000)}k` : '+'}`
          : 'salary undisclosed';
        const classTag = json.classification ? ` · ${json.classification}` : '';
        const contractTag = isContract ? ' 📋 CONTRACT' : '';
        const text = [
          `🎯 ${tgBold(opp.company)} — ${opp.role}${contractTag}`,
          `Score: ${tgCode(String(json.fitScore))}${classTag} · ${salaryStr}`,
          '',
          `<i>${json.reasoning ?? ''}</i>`,
          '',
          json.matchStrengths?.slice(0, 2).map((s: string) => `• ${s}`).join('\n') ?? '',
        ].filter(Boolean).join('\n');

        await sendTelegramButtons(text, applyButtons(opp.id));
        await slackFields(
          `🎯 ${json.fitScore} — ${opp.company} · ${opp.role}`,
          { Salary: salaryStr, Class: json.classification ?? '?', Action: json.recommendedAction ?? '?', Reasoning: json.reasoning?.slice(0, 120) ?? '' },
          '#14B8AD'
        );
      }
    } catch (e) {
      console.error(`[scorer] Failed to score ${opp.company} — ${opp.role}:`, (e as Error).message);
    }
  }
}
