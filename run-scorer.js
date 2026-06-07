const { PrismaClient } = require('@prisma/client');
const Anthropic = require('@anthropic-ai/sdk');

const p = new PrismaClient();
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
the portfolio is valuable. Do not penalize contract/1099/freelance roles.

Target roles IN PRIORITY ORDER:
  Tier 1 (score 75-100): FDE / Forward Deployed Engineer / Applied AI Engineer / AI Platform Engineer /
    Agentic AI Engineer / Solutions Engineer / Technical Implementation Engineer / Staff AI Engineer /
    AI Consultant / Fractional CTO / Freelance AI Engineer / Contract Developer (AI focus)
  Tier 2 (score 65-85): Solutions Consultant / Technical Account Exec / CSM (SaaS/AI) /
    Senior Full Stack Engineer (AI-native) / AI Adoption Manager / Engineering Manager /
    Head of Technology / Director of AI / MLOps Engineer / Contract Full Stack / Freelance Engineer
  Tier 3 (score 55-75): Marketing Director / Digital Marketing Manager / Marketing Ops /
    VP Marketing / Social Media Manager (strategic) / Any contract/freelance tech role

Geography: Remote = full score. DFW hybrid = -5. On-site DFW = -10. On-site outside DFW = -40+.
Compensation floor: $50/hr contract OR $50K/yr salary. Under $35/hr or $40K = skip.
`.trim();

async function main() {
  const opps = await p.opportunity.findMany({
    where: { fitScore: null, stage: { notIn: ['dead', 'archived'] } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  console.log(`Scoring ${opps.length} unscored opportunities...\n`);
  console.log('Score | Action         | Company                     | Role');
  console.log('------|----------------|-----------------------------|--------------------------');

  for (const opp of opps) {
    try {
      const salaryLine = opp.salaryMin
        ? `Salary: $${opp.salaryMin.toLocaleString()}${opp.salaryMax ? `–$${opp.salaryMax.toLocaleString()}` : '+'}`
        : opp.notes ? `Location/Salary: ${opp.notes}` : '';

      const descLine = opp.jdText
        ? `Description:\n${opp.jdText.slice(0, 3000)}`
        : 'Note: No full JD — score based on role title and salary only. Be decisive.';

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Score this job opportunity for the candidate profile below.

CANDIDATE PROFILE:
${PROFILE}

JOB:
Company: ${opp.company}
Role: ${opp.role}
${salaryLine}
${descLine}

Return ONLY valid JSON:
{
  "fitScore": <0-100>,
  "classification": "<FDE|AI_Engineer|Solutions|CSM|Director|Marketing|FullStack|Contract|Skip>",
  "salaryAssessment": "<brief note>",
  "matchStrengths": ["<s1>", "<s2>"],
  "gaps": ["<g1>"],
  "recommendedAction": "<apply_now|apply_with_note|save|skip|watch>",
  "reasoning": "<1-2 sentences>"
}`,
        }],
      });

      const raw = msg.content[0].text.trim();
      const matched = raw.match(/\{[\s\S]+\}/);
      if (!matched) throw new Error('No JSON in response');
      const json = JSON.parse(matched[0]);

      await p.opportunity.update({
        where: { id: opp.id },
        data: {
          fitScore:          json.fitScore         ?? null,
          classification:    json.classification   ?? null,
          recommendedAction: json.recommendedAction ?? null,
          analysisJson:      json,
          lastActivity:      new Date(),
        },
      });

      const score  = String(json.fitScore ?? '?').padStart(3);
      const action = (json.recommendedAction ?? '').padEnd(14);
      const co     = (opp.company ?? '').slice(0, 27).padEnd(27);
      const role   = (opp.role ?? '').slice(0, 40);
      console.log(`  ${score} | ${action} | ${co} | ${role}`);
    } catch (e) {
      console.log(`  ERR | ${(opp.company ?? '').slice(0, 27).padEnd(27)} | ${opp.role?.slice(0, 40)} — ${e.message}`);
    }
  }

  await p.$disconnect();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
