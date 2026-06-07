export interface TemplateContent {
  profile:      string;
  fdeFramework: string;
  rules:        string;
  structure:    string;
}

export const DEFAULT_TEMPLATE: TemplateContent = {
  profile: `Name: Will Austin
Contact: 214-232-0222 | info@max-ev-holdings.com | Little Elm TX | github.com/maxev-digital

Methodology:
I design every system by first mapping the business problem to the right ratio of
deterministic automation vs. agentic intelligence. Fixed-logic automation (scheduled workers,
rule-based routing, queues, webhooks) handles predictable, high-volume, cost-sensitive tasks
where reliability and auditability matter. Agentic capabilities (Claude API, MCP protocol,
multi-model routing, dynamic tool use) are applied selectively only where judgment, ambiguity,
or complex reasoning creates measurable value over fixed logic.

Engagement Process (7 steps, every client):
1. Discovery & Business Alignment: structured session to surface the real problem,
   success criteria, and operational constraints (not just the stated requirements)
2. Rapid Scoping: smallest viable first deployment; bias for shipping over perfection
3. Architecture & Context Setup: decide deterministic vs. agentic per workflow component
4. Agentic Build: Claude API, MCP, Zod-validated output schemas, HITL checkpoints
5. Stakeholder Validation: working software in front of real users, same day or next day
6. Production Deployment: real data, never staging; full observability on AI flows
7. Continuous Iteration: driven by actual usage metrics and defined success criteria

Background:
12 years in general management and P&L ownership across multi-location operations.
Systems leadership in commercial construction: seven-figure project delivery, competitive
proposals, multi-stakeholder coordination. This operational context informs how technical
solutions get scoped, communicated, and measured against business outcomes.

Stack: Python, TypeScript, Next.js, PostgreSQL, Claude/Anthropic API, MCP protocol,
multi-model routing, Docker, VPS, Twilio, REST API design`,

  fdeFramework: `This is a client-facing or forward-deployed role. The hiring manager wants to see that
you understand the client engagement motion end-to-end — not just the technical build.
Show that you have a practiced process for running customer deployments from discovery
to production.`,

  rules: `ABSOLUTE PROHIBITIONS — if any output violates these, rewrite it:
1. NO PAST WORK: Do not describe projects built, systems deployed, or implementations
   completed. Never use "I built," "I developed," "I implemented," "I deployed," or
   "I shipped" as the main verb of a bullet. Every bullet describes what you WOULD DO.
2. NO CREDENTIAL COUNTS: Do not mention any numbers (platforms, endpoints, engagements,
   industries) anywhere except the single closing line.
3. NO SELF-DESCRIPTION in the intro: Do not open with your background, your experience,
   what you've done, or what drew you to the role. The intro is about THEM.
4. FIRST PERSON ONLY: I, my, me. Never "Will," "he," or "his."
5. NO AI GIVEAWAYS: Never use a double dash (two hyphens in a row) or an em dash anywhere
   in the output. Both are AI tells. If a clause needs separation, use a comma or rewrite
   as two sentences. Never use ** markdown bold. The only bold allowed is <strong> HTML
   tags inside bullets. Write like a confident human professional, not a language model.`,

  structure: `STRUCTURE:

intro (3 sentences MAX) — open warm, then their challenge:
  Sentence 1: A single warm, specific opening that connects to this company or role.
  What about this team specifically drew attention. Not generic.
  Genuine, brief, first person. Not "I was excited to see..." — something more specific.
  Sentence 2: The core problem this role exists to solve, in concrete terms from the JD.
  Sentence 3: What success looks like 90 days in — specific and measurable.
  No self-promotion. No listing past work.

bullets (3) — ALL forward-looking, no past work:

  Bullet 1 label: "Discovery & Problem Framing"
  2 sentences MAX. The single most important question you would surface in the first session
  with their team, and why it determines the architecture. Be specific to their context.
  START WITH: "In the first session..." or "Before any architecture is committed..."

  Bullet 2 label: "Architecture Approach"
  2 sentences MAX. State the key deterministic-vs-agentic decision for their specific use
  case: what gets fixed logic (and why) vs. AI reasoning (and why). Name their context.
  START WITH: "For this deployment..." or "The architecture question here is..."

  Bullet 3 label: "Delivery & Validation"
  2 sentences MAX. How the first release gets validated against criteria set in session one,
  and what observability you instrument from day one. Be specific to their environment.
  START WITH: "The first release..." or "Success criteria defined in session one..."

  3 bullets only. No 4th bullet.

closingLine (2-3 sentences — credibility anchor + genuine interest + logistics):
  Sentence 1: Brief credibility anchor. "I have run this full engagement arc across
  enterprise client deployments" — no platform counts, no numbers.
  Sentence 2: One sentence of genuine interest in this specific company or role.
  Something real from the JD or company context, not generic enthusiasm.
  Sentence 3: Availability and location. Direct and short.
  Total: 2-3 sentences, no more.`,
};

export async function loadTemplate(prismaClient: {
  promptTemplate: { findUnique: (a: { where: { id: string } }) => Promise<{ content: unknown } | null> }
}): Promise<TemplateContent> {
  try {
    const row = await prismaClient.promptTemplate.findUnique({ where: { id: 'default' } });
    return row ? (row.content as TemplateContent) : DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}
