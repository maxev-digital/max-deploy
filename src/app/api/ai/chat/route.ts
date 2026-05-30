import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

let ctxCache: { data: string; ts: number } | null = null;

async function getContext() {
  if (ctxCache && Date.now() - ctxCache.ts < 60_000) return ctxCache.data;

  const now    = new Date();
  const today  = new Date(now); today.setHours(23, 59, 59, 999);

  const [inbox, active, followUpsDue, tasksDue, contracts, invoices, opportunities] = await Promise.all([
    prisma.opportunity.count({ where: { stage: 'inbox' } }),
    prisma.opportunity.findMany({
      where: { stage: { in: ['target', 'applied', 'screening', 'interview', 'final', 'offer'] } },
      select: { id: true, company: true, role: true, stage: true, fitScore: true, followUpDue: true, lastActivity: true, salaryMin: true, salaryMax: true, applyUrl: true },
      orderBy: { lastActivity: 'desc' }, take: 30,
    }),
    prisma.opportunity.count({ where: { followUpDue: { lte: today }, stage: { notIn: ['inbox', 'dead', 'accepted', 'rejected', 'withdrawn'] } } }),
    prisma.task.findMany({
      where: { status: { not: 'DONE' }, dueDate: { lte: today } },
      select: { id: true, title: true, priority: true, status: true, dueDate: true },
      orderBy: { dueDate: 'asc' }, take: 10,
    }),
    prisma.contract.findMany({ where: { status: 'active' }, select: { id: true, client: true, rate: true, rateType: true, endDate: true }, take: 5 }),
    prisma.invoice.findMany({ where: { status: { in: ['pending', 'sent', 'overdue'] } }, select: { id: true, client: true, total: true, status: true, dueDate: true }, take: 10 }),
    prisma.opportunity.findMany({
      where: { stage: 'inbox', fitScore: { not: null } },
      select: { id: true, company: true, role: true, fitScore: true, recommendedAction: true },
      orderBy: { fitScore: 'desc' }, take: 10,
    }),
  ]);

  const lines = [
    `INBOX: ${inbox} unreviewed opportunities`,
    '',
    `TOP SCORED INBOX (apply_now priority):`,
    ...opportunities.filter(o => o.recommendedAction === 'apply_now').map(o => `  - [ID:${o.id}] ${o.company} — ${o.role} | Score: ${o.fitScore}`),
    '',
    `ACTIVE PIPELINE (${active.length} applications):`,
    ...active.map(o => `  - [ID:${o.id}] ${o.company} — ${o.role} | Stage: ${o.stage} | Score: ${o.fitScore ?? '?'} | FollowUp: ${o.followUpDue ? new Date(o.followUpDue).toLocaleDateString() : 'none'}`),
    '',
    `FOLLOW-UPS DUE: ${followUpsDue}`,
    '',
    `TASKS DUE/OVERDUE (${tasksDue.length}):`,
    ...tasksDue.map(t => `  - [ID:${t.id}] [${t.priority}] ${t.title} | ${t.status} | Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'none'}`),
    '',
    `ACTIVE CONTRACTS (${contracts.length}):`,
    ...contracts.map(c => `  - ${c.client} | $${c.rate}/${c.rateType} | Ends: ${c.endDate ? new Date(c.endDate).toLocaleDateString() : 'ongoing'}`),
    '',
    `OPEN INVOICES (${invoices.length}):`,
    ...invoices.map(i => `  - ${i.client} | $${i.total} | ${i.status} | Due: ${i.dueDate ? new Date(i.dueDate).toLocaleDateString() : 'none'}`),
  ];

  const data = lines.join('\n');
  ctxCache = { data, ts: Date.now() };
  return data;
}

const ROUTES = [
  { path: '/dashboard',    label: 'Dashboard',    description: 'Morning briefing, pipeline health, task list, KPIs' },
  { path: '/inbox',        label: 'Inbox',        description: 'New opportunities queue — sorted by fit score' },
  { path: '/pipeline',     label: 'Pipeline',     description: 'Kanban pipeline of active applications by stage' },
  { path: '/monitor',      label: 'Monitor',      description: 'Application urgency grid — follow-up status by color' },
  { path: '/companies',    label: 'Companies',    description: 'Target company CRM and ATS watchlist' },
  { path: '/contacts',     label: 'Contacts',     description: 'Recruiter and hiring manager relationships' },
  { path: '/intelligence', label: 'Intelligence', description: 'AI hub — health score, JD scorer, pattern analysis' },
  { path: '/outreach',     label: 'Outreach',     description: 'Email drafts, cover letters, follow-up queue' },
  { path: '/email',        label: 'Email',        description: 'Email inbox — read, compose, reply' },
  { path: '/contracts',    label: 'Contracts',    description: 'Active freelance contracts and milestones' },
  { path: '/invoices',     label: 'Invoices',     description: 'Invoice tracking and payment status' },
  { path: '/earnings',     label: 'Earnings',     description: 'MRR, capacity utilization, AR aging, rate optimization' },
  { path: '/tasks',        label: 'Tasks',        description: 'Task board — supports ?status=TODO|IN_PROGRESS|DONE' },
  { path: '/settings',     label: 'Settings',     description: 'RSS feeds, ATS watchlist, email config, profile' },
];

const BASE_SYSTEM = `You are an AI career operations assistant embedded in MAX-DEPLOY — a career ops platform for an FDE/AI engineer running a concurrent job search and freelance business. You run in a right-side panel.

The user is Will Austin — targeting FDE and Applied AI Engineering roles at $120K+ / $85/hr contract. Currently managing multiple concurrent engagements and an active job search pipeline.

You have full access to live career data shown below. Use it to give specific, accurate answers.

PAGES YOU CAN NAVIGATE TO:
${ROUTES.map(r => `- ${r.label} (${r.path}): ${r.description}`).join('\n')}

CAPABILITIES:
1. NAVIGATE — Go to any page. Use filter params when relevant.
2. ANSWER WITH DATA — Use live data. Be specific: company names, scores, dates, amounts.
3. CREATE OPPORTUNITY — Add a new job to the inbox with details.
4. CREATE TASK — Add a follow-up task.
5. UPDATE RECORD — Move opportunity stage, mark task done, clear follow-up.

RESPONSE FORMAT — always return valid JSON:
{
  "message": "your response — direct and specific",
  "action": { ... }
}

ACTION TYPES:

Navigate:
{ "type": "navigate", "path": "/path", "description": "label" }

Navigate with filter:
{ "type": "filter", "path": "/pipeline", "params": {"stage": "applied"}, "description": "Applied applications" }

Add opportunity to inbox:
{ "type": "draft", "docType": "opportunity", "description": "Add X to inbox", "data": { "company": "", "role": "", "source": "manual", "applyUrl": "", "salaryMin": 0, "salaryMax": 0, "jdText": "" } }

Create task:
{ "type": "draft", "docType": "task", "description": "New task", "data": { "title": "", "priority": "HIGH|MEDIUM|LOW", "dueDate": "YYYY-MM-DD", "notes": "" } }

Move opportunity stage:
{ "type": "confirm", "operation": "move_stage", "description": "Move X to applied", "payload": { "id": "opp-id-from-context", "stage": "applied" } }

Update task status:
{ "type": "confirm", "operation": "update_task_status", "description": "Mark task done", "payload": { "id": "task-id", "status": "DONE" } }

Clear follow-up:
{ "type": "confirm", "operation": "mark_followup_done", "description": "Clear follow-up for X", "payload": { "id": "opp-id" } }

RULES:
- Be specific. Use real company names and scores from the data. Never invent data.
- Keep messages 2-4 sentences. Direct. No filler.
- When navigating: narrate first ("Pulling up your pipeline — you have 5 active applications.")
- Stage values: inbox | target | applied | screening | interview | final | offer | accepted | rejected | withdrawn | dead`;

export async function POST(req: NextRequest) {
  await requireAuth();
  const { message, history, currentPath } = await req.json();

  const context = await getContext();

  const systemPrompt = `${BASE_SYSTEM}

CURRENT PAGE: ${currentPath}

LIVE DATA:
${context}`;

  // Use Haiku for fast responses, Sonnet for complex analysis
  const isComplex = /analyz|pattern|health|briefing|compare|strategy|optimize/i.test(message);
  const model     = isComplex ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  const msgs = [
    ...(history ?? []).map((h: { role: string; content: string }) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: message },
  ];

  const completion = await anthropic.messages.create({
    model,
    max_tokens: 600,
    system: systemPrompt,
    messages: msgs,
  });

  const raw = (completion.content[0] as { type: string; text: string }).text.trim();

  let parsed: { message: string; action?: unknown };
  try {
    parsed = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
  } catch {
    parsed = { message: raw };
  }

  return NextResponse.json({
    message: parsed.message,
    action:  parsed.action ?? null,
    model:   isComplex ? 'sonnet' : 'haiku',
  });
}
