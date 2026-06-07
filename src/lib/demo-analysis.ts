import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './prisma';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXISTING_PORTFOLIO = `
Already built and shipped — do NOT suggest these as novel:
- MAX EV Admin: white-label business OS (CRM, proposals, invoicing, helpdesk, AI endpoints, email client)
- MAX-DEPLOY: AI-native career/job application OS with IMAP scoring, BullMQ, headless autofill
- Roof Works of Texas: field services ops platform (scheduling, dispatch, IVR, SMS campaigns, TCAD pipeline)
- Advantage Player Workshop: EdTech SaaS with real-time simulation engine, AI coaching, ElevenLabs TTS, Stripe
- MAX Media Studio: content studio platform (Docker)
- DFW Daily: Dallas business/media news aggregator
- CasinoComp: casino/resort industry careers and news platform
- MAX EV Sports: sports analytics platform with Python data pipelines
- 10K Advertising / OOH Ada: outdoor advertising marketplace (map-based inventory, Stripe Connect, partner portal, AI competitor analysis)
- FinCoach: generative AI RAG prototype over financial documents (FastAPI, pgvector, prompt eval, guardrails)
- Paloma Home Services: home services marketing site and estimate workflow
- Cardiff Lending: AI-native lending/fintech demo
`;

const FEASIBILITY_CRITERIA = `
Evaluate against these specific criteria:
1. SHIPPABLE: Can a solo full-stack developer ship a working v1 in 3-5 days using Claude Code + the existing tech stack (Next.js, Python, FastAPI, PostgreSQL, Anthropic API)?
2. NOVEL: Is this genuinely different from the existing portfolio above? Extensions of existing products are marginal. Exact duplicates are skip.
3. BUSINESS POTENTIAL: If we never get hired or interviewed for this role, could this demo become a real standalone product someone would pay for? Think: clear buyer, recurring pain, real market.
`;

export async function analyzeDemo(opp: {
  id: string;
  company: string;
  role: string;
  jdText: string | null;
}): Promise<Record<string, unknown> | null> {
  if (!opp.jdText?.trim()) return null;

  const prompt = `You are evaluating whether to build a demo product based on a job description, as a way to demonstrate technical fit AND potentially create a real business product.

${EXISTING_PORTFOLIO}

${FEASIBILITY_CRITERIA}

Company: ${opp.company}
Role: ${opp.role}
Job Description:
${opp.jdText.slice(0, 4500)}

Infer what this company is most likely hiring to build. Then design a demo product that demonstrates that capability.

Return ONLY a JSON object:
{
  "name": "<short product name>",
  "elevator": "<one sentence — what it does and who it's for>",
  "whatTheyreBuilding": "<1-2 sentences — your inference of what this company is hiring to build>",
  "coreFeatures": ["<feature 1>", "<feature 2>", "<feature 3>"],
  "techStack": ["<tech 1>", "<tech 2>"],
  "daysToBuild": <integer 1-7>,
  "feasible": <true|false>,
  "feasibilityNote": "<why feasible or not in one sentence>",
  "novelty": "<new|extension|duplicate>",
  "noveltyNote": "<what makes it new or why it overlaps>",
  "businessPotential": "<high|medium|low>",
  "businessCase": "<if not hired, who would pay for this and why — be specific>",
  "verdict": "<build|marginal|skip>",
  "verdictReason": "<one sentence — the deciding factor>"
}`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  let result: Record<string, unknown> = {};
  try {
    const match = text.match(/\{[\s\S]+\}/);
    if (match) result = JSON.parse(match[0]);
  } catch { /* keep empty */ }

  if (!result.verdict) return null;

  const existing = await prisma.opportunity.findUnique({ where: { id: opp.id }, select: { analysisJson: true } });
  const prev = (existing?.analysisJson ?? {}) as Record<string, unknown>;
  await prisma.opportunity.update({
    where: { id: opp.id },
    data: { analysisJson: { ...prev, demoAnalysis: result } },
  });

  return result;
}
