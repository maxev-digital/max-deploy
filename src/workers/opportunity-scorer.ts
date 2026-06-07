import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { analyzeDemo } from '../lib/demo-analysis';
import { sendTelegramButtons, tgBold, tgCode, applyButtons } from '../lib/telegram';
import { slackFields } from '../lib/slack';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Pre-filters (no API cost) ────────────────────────────────────────────────

// Companies with hiring bars incompatible with current profile (FAANG-adjacent).
// Jobs from these companies auto-archive before scoring.
const COMPANY_BLOCKLIST = [
  'databricks', 'stripe', 'gitlab', 'figma', 'instacart', 'vercel',
  'amplitude', 'smartsheet', 'upstart', 'lawnstarter', 'scale ai',
  'tiktok', 'snowflake', 'palantir', 'confluent', 'hashicorp',
];

// Title patterns that indicate people-management roles (not IC).
// Jobs matching these auto-archive before scoring.
const TITLE_BLOCKLIST = [
  /\bengineering manager\b/i,
  /\bmanager[,\s].*(engineering|software|platform|ai|ml)\b/i,
  /\bdirector\s+of\b/i,
  /\bdirector,\b/i,
  /\bvp\s+of\b/i,
  /\bvp,\b/i,
  /\bvice president\b/i,
  /\bhead of\b/i,
  /\bchief\s+(technology|product|ai|data|information|revenue)\b/i,
  /\bdata science manager\b/i,
  /\bmanager of solutions\b/i,
  /\bsenior manager\b/i,
];

function isCompanyBlocked(company: string): boolean {
  const c = (company || '').toLowerCase();
  return COMPANY_BLOCKLIST.some(b => c.includes(b));
}

function isTitleBlocked(role: string): boolean {
  return TITLE_BLOCKLIST.some(r => r.test(role || ''));
}

// ─── Candidate profile ────────────────────────────────────────────────────────

const PROFILE = `
Name: Will Austin
Skills: Next.js, TypeScript, Python, PostgreSQL, Prisma, Claude/Anthropic API, MCP protocol,
        multi-model routing, agentic system design, REST API design, Docker, VPS deployment,
        Twilio, ElevenLabs, Stripe Connect, IMAP email clients, BullMQ/Redis, HubSpot CRM,
        digital marketing strategy, client discovery & scoping, proposal & pricing,
        stakeholder management, team leadership (40-80 staff), P&L ownership
Experience: 6 FDE client engagements across 8 industries, production AI platforms shipped,
            4 external client deliveries, 12 years GM/GC operations,
            HubSpot certified (Sales, Marketing, CRM, Inbound), self-taught engineer
Background: Former General Manager + General Contractor, self-taught full-stack, no CS degree.
            Bridges technical execution and business leadership fluently.

CURRENT PRIORITY: Actively seeking income NOW. Contract, freelance, part-time, and short-term
engagements are EQUALLY desirable as full-time. Any role that generates revenue and builds
the portfolio is valuable. Do not penalize contract/1099/freelance roles.

Target roles IN PRIORITY ORDER — score accordingly:

  Tier 1 (score 75-100) — SWEET SPOT, highest hit rate:
    AI Automation Engineer / Agentic AI Engineer
    AI Engineer (any level — junior through staff, at non-FAANG companies)
    Technical Specialist (AI / Claude / Implementation)
    Forward Deployed Engineer (at smaller companies and startups — NOT Databricks/Stripe/FAANG)
    AI Solutions Engineer / Solutions Engineer (technical implementation focus)
    Founding Engineer / Founding AI Engineer / Founding Full Stack Engineer
    Full Stack Engineer at AI-native companies (where AI is the core product)
    AI Platform Engineer / AI Enablement Engineer
    Contract/Freelance AI Engineer / AI Consultant / Fractional CTO

  Tier 2 (score 60-80) — Good secondary targets:
    Senior Software Engineer (at AI-native startup, not FAANG)
    Solutions Consultant / Technical Account Executive
    Customer Success Manager (SaaS/AI, with technical component)
    AI Adoption Manager
    Staff Engineer (at non-FAANG, under 500 employees)
    MLOps Engineer

  Tier 3 (score 45-65) — Apply if strong fit on other dimensions:
    Marketing Director / Digital Marketing (for income while building)
    Any contract/freelance tech role above $35/hr
    Full Stack Developer (non-AI focus, but solid company)

  Auto-skip (classify as Skip):
    Engineering Manager, Director, VP, Head of, Chief roles (people management bar)
    FAANG-adjacent companies (separate blocklist handles these)
    On-site outside DFW metro
    Under $35/hr contract or under $40K salary
    Purely manual non-digital roles
    Entry-level admin or support with no tech component

CRITICAL SCORING RULE: Do NOT score Director/VP/Head of/Engineering Manager roles above 65.
These are people-management roles that require direct reports and team P&L ownership.
The candidate is targeting IC (individual contributor) engineering roles at this stage.
A "Senior" title on an IC role (Senior AI Engineer, Senior Solutions Engineer) is fine — score normally.
A "Director/Manager/Head of" title means team management — cap at 60 and classify as Director.

Geography scoring:
  Remote (fully remote): no adjustment
  DFW hybrid (Dallas/Plano/Frisco/Southlake/Addison area): subtract 5 points max
  On-site DFW: subtract 10 points
  On-site outside DFW: subtract 40+ points (near deal breaker)

Compensation floor: $50/hr contract OR $80,000/yr salary
  Contract: $35-50/hr = apply_with_note. Under $35/hr = skip.
  Salary: $70-80K = apply_with_note if strong fit. Under $70K = skip unless DFW on-site.
Work type: Full-time, part-time, contract, 1099, freelance — ALL acceptable
`.trim();

// ─── Scorer ───────────────────────────────────────────────────────────────────

export async function scorePendingOpportunities(limit = 25) {
  const opps = await prisma.opportunity.findMany({
    where: { fitScore: null, stage: { notIn: ['dead', 'archived'] } },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  if (!opps.length) { console.log('[scorer] No unscored opportunities.'); return; }
  console.log(`[scorer] Scoring ${opps.length} opportunities...`);

  for (const opp of opps) {
    try {

      // ── Pre-filter: company blocklist ──────────────────────────────────────
      if (isCompanyBlocked(opp.company)) {
        await prisma.opportunity.update({
          where: { id: opp.id },
          data: {
            stage: 'archived',
            fitScore: 20,
            classification: 'Skip',
            analysisJson: { blockedReason: 'company_blocklist', reasoning: `${opp.company} is on the FAANG-adjacent company blocklist — hiring bar incompatible with current profile.` },
            lastActivity: new Date(),
          },
        });
        console.log(`[scorer] BLOCKED (company): ${opp.company} — ${opp.role}`);
        continue;
      }

      // ── Pre-filter: title blocklist ────────────────────────────────────────
      if (isTitleBlocked(opp.role)) {
        await prisma.opportunity.update({
          where: { id: opp.id },
          data: {
            stage: 'archived',
            fitScore: 25,
            classification: 'Director',
            analysisJson: { blockedReason: 'title_blocklist', reasoning: `Role title "${opp.role}" indicates a people-management position. Not targeting management roles at this stage.` },
            lastActivity: new Date(),
          },
        });
        console.log(`[scorer] BLOCKED (title): ${opp.company} — ${opp.role}`);
        continue;
      }

      // ── Score via Claude ───────────────────────────────────────────────────
      const prompt = `Score this job opportunity for the candidate profile below.

CANDIDATE PROFILE:
${PROFILE}

JOB:
Company: ${opp.company}
Role: ${opp.role}
${opp.salaryMin
  ? `Salary: $${opp.salaryMin.toLocaleString()}${opp.salaryMax ? `–$${opp.salaryMax.toLocaleString()}` : '+'}`
  : opp.notes ? `Location/Salary: ${opp.notes}` : ''}
${opp.jdText
  ? `Description:\n${opp.jdText.slice(0, 3000)}`
  : 'Note: No full job description available — score based on role title and salary only. Be decisive.'}

Classify the role using these values:
- FDE = Forward Deployed Engineer / Applied AI Engineer / Agentic AI Engineer / Technical Specialist
- AI_Engineer = AI Automation Engineer / AI Engineer / AI Platform Engineer / AI Enablement Engineer
- Solutions = Solutions Engineer, Technical Account Exec, Implementation Consultant
- CSM = Customer Success Manager, AI Adoption Manager
- Director = Director/VP/Head of/Engineering Manager (people management) — cap score at 60
- Marketing = Marketing Director, Digital Marketing, Marketing Ops
- FullStack = Full Stack Engineer (non-AI-specific), Senior Software Engineer
- Contract = freelance, short-term, 1099 engagement
- Skip = under $70K salary, under $35/hr contract, pure on-site outside DFW, non-digital, entry admin

Return ONLY valid JSON, no other text:
{
  "fitScore": <0-100>,
  "classification": "<FDE|AI_Engineer|Solutions|CSM|Director|Marketing|FullStack|Contract|Skip>",
  "salaryAssessment": "<brief salary note>",
  "matchStrengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "gaps": ["<gap or weaker area 1>", "<gap or weaker area 2>"],
  "recommendedAction": "<apply_now|apply_with_note|save|skip|watch>",
  "urgency": "<fresh|normal|stale>",
  "reasoning": "<2 sentence summary>"
}

RULE: matchStrengths must have at least 2 items. gaps must have at least 1 item. Never return empty arrays.`;

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw     = (msg.content[0] as { type: string; text: string }).text.trim();
      const matched = raw.match(/\{[\s\S]+\}/);
      if (!matched) throw new Error('No JSON object in response');
      const json = JSON.parse(matched[0]);

      // ── Auto-archive Skip or low-score results ─────────────────────────────
      const autoArchive = json.classification === 'Skip' || json.fitScore < 55;
      const newStage = autoArchive ? 'archived' : undefined;

      await prisma.opportunity.update({
        where: { id: opp.id },
        data: {
          fitScore:          json.fitScore         ?? null,
          classification:    json.classification   ?? null,
          recommendedAction: json.recommendedAction ?? null,
          analysisJson:      json,
          lastActivity:      new Date(),
          ...(newStage ? { stage: newStage } : {}),
        },
      });

      if (autoArchive) {
        console.log(`[scorer] AUTO-ARCHIVED: ${opp.company} — ${opp.role} (score=${json.fitScore}, class=${json.classification})`);
        continue;
      }

      console.log(`[scorer] ${opp.company} — ${opp.role}: score=${json.fitScore}, action=${json.recommendedAction}`);

      // ── Alert for qualifying scores ────────────────────────────────────────
      const isContract = ['contract','freelance','1099','part-time','part time','fractional']
        .some(kw => (opp.role + (opp.source ?? '')).toLowerCase().includes(kw));
      const alertThreshold = isContract ? 65 : 70;

      if (json.fitScore >= alertThreshold && json.recommendedAction !== 'skip') {
        const salaryStr = opp.salaryMin
          ? `$${Math.round(opp.salaryMin / 1000)}k${opp.salaryMax ? `–$${Math.round(opp.salaryMax / 1000)}k` : '+'}`
          : 'salary undisclosed';
        const classTag = json.classification ? ` · ${json.classification}` : '';
        const contractTag = isContract ? ' CONTRACT' : '';
        const text = [
          `${tgBold(opp.company)} — ${opp.role}${contractTag}`,
          `Score: ${tgCode(String(json.fitScore))}${classTag} · ${salaryStr}`,
          '',
          `<i>${json.reasoning ?? ''}</i>`,
          '',
          json.matchStrengths?.slice(0, 2).map((s: string) => `• ${s}`).join('\n') ?? '',
        ].filter(Boolean).join('\n');

        await sendTelegramButtons(text, applyButtons(opp.id));
        await slackFields(
          `${json.fitScore} — ${opp.company} · ${opp.role}`,
          { Salary: salaryStr, Class: json.classification ?? '?', Action: json.recommendedAction ?? '?', Reasoning: json.reasoning?.slice(0, 120) ?? '' },
          '#14B8AD'
        );

        if (opp.jdText) {
          try {
            const prevAj = (json ?? {}) as Record<string, unknown>;
            if (!prevAj.demoAnalysis) {
              const demo = await analyzeDemo({ id: opp.id, company: opp.company, role: opp.role, jdText: opp.jdText });
              if (demo) console.log(`[scorer] Demo analysis: ${opp.company} — verdict=${demo.verdict}`);
            }
          } catch (de) {
            console.error(`[scorer] Demo analysis failed for ${opp.company}:`, (de as Error).message);
          }
        }
      }
    } catch (e) {
      console.error(`[scorer] Failed to score ${opp.company} — ${opp.role}:`, (e as Error).message);
    }
  }
}
