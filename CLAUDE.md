# MAX-DEPLOY — Autonomous FDE Agent

---

## THE VISION (align on this before every session)

MAX-DEPLOY is not a job board dashboard. It is an **autonomous FDE agent** that runs Will Austin's entire career operation — job search, recruiter relationships, and freelance pipeline — in parallel, 24/7, with Will as the HITL at specific authorization checkpoints reachable from his phone via Telegram or Slack.

### The Agent Loop

```
DISCOVER → SCORE → NOTIFY → AUTHORIZE → ACT → LOG → MONITOR
```

1. **Discover** — Agents continuously pull from RSS feeds, ATS boards (Greenhouse/Lever/Ashby), email inbox (recruiter inbound), and freelance platforms. New opportunities enter the system automatically.

2. **Score** — Every opportunity is scored by Claude (Haiku, cheap) against Will's profile: fit score 0-100, classification (FDE/AI Engineer/Contract/Skip), recommended action, salary assessment, strengths, gaps.

3. **Notify** — High-score opportunities (80+, apply_now) trigger immediate Telegram/Slack messages with the key details. Will sees it on his phone within minutes of posting.

4. **Authorize** — Telegram inline buttons: **[Apply] [Skip] [Later]**. Will taps one button. That's the HITL checkpoint. No PC required.

5. **Act** — On [Apply]: agent drafts a targeted cover letter (Claude Sonnet, FDE framework for FDE roles), selects the correct resume variant (FDE or Slingshot), submits the application or opens the apply URL with cover letter ready. Logs everything.

6. **Log** — Application recorded in pipeline. Stage = Applied. OutreachLog entry created. Follow-up tasks auto-scheduled (Day 7, Day 14).

7. **Monitor** — IMAP IDLE watches for replies. Interview inquiry detected → immediate Telegram alert. Follow-up scheduler surfaces stale applications daily at 7 AM.

### Three Parallel Streams (all running simultaneously)

| Stream | Source | HITL Checkpoint |
|---|---|---|
| **Full-time FDE/AI roles** | ATS watchlist + RSS + bookmarklet | Tap [Apply] on Telegram |
| **Contract/freelance** | Upwork RSS, Contra, email inbound | Tap [Apply] on Telegram |
| **Recruiter inbound** | IMAP email parser → opportunity record | Tap [Respond] on Telegram |

### HITL Authorization Points (everything else is autonomous)

| Event | Trigger | Action Required | Channel |
|---|---|---|---|
| High-score opportunity found (80+) | Scorer completes | Tap [Apply] / [Skip] / [Later] | Telegram |
| Recruiter email classified as lead | Email parser | Tap [Respond] / [Skip] | Telegram |
| Draft cover letter ready | After [Apply] tapped | Review at `/cover-letter/[id]` → Print PDF | Browser |
| Follow-up due (Day 7/14) | Daily 7 AM scheduler | Tap [Send Follow-up] / [Skip] | Telegram |
| Interview inquiry detected | IMAP IDLE | Read + tap [Confirm] / [Reschedule] | Telegram |

### What is Fully Autonomous (no action ever needed)

- RSS polling every 6h
- ATS watchlist polling daily 3 AM
- Opportunity scoring every 15 min (Haiku)
- IMAP IDLE email monitoring (push, no polling)
- Morning briefing daily 6 AM (Sonnet, 1 call)
- Follow-up task scheduling daily 7 AM
- Telegram/Slack alerts on new high-score finds

---

## CURRENT BUILD STATUS — Last Updated 2026-06-03

### Infrastructure: LIVE
- **URL:** max-ev-holdings.com (Nginx → PM2 id 32, port 3200)
- **Workers:** PM2 id 33 (all background workers)
- **DB:** PostgreSQL `max_deploy` on localhost:5436 (Docker container `maxev-admin-db`)
- **Auth:** NextAuth credentials — `info@max-ev-holdings.com` / admin password in .env
- **Email:** IMAP IDLE live on `info@max-ev-holdings.com` (Hostinger). SMTP sending configured port 465. Pre-filter added: `isJobRelevant()` gates saves to DB — vendor domains, marketing subjects, system noise all dropped before write.
- **AI:** Haiku for scoring/classification (automated), Sonnet for cover letters/briefing/chat (on-demand)
- **Notifications:** Telegram full HITL loop + Slack alerts fully wired

### Data: LIVE (as of 2026-06-03)
- **2,164 opportunities** in DB — 2,144 scored (99%), 305 high-fit (70+), 72 cover letters built
- **198 target companies** in watchlist (Greenhouse ATS = dominant source: 1,859 opps)
- **12 RSS feeds** active (WWR ×2, Remotive ×2, RemoteOK, Indeed ×7 — Indeed feeds 429/404 blocked, rest working)
- **7 contacts, 198 companies, 2 contracts, 0 invoices**
- **Source breakdown:** greenhouse 1,859 · wwr 78 · smart-apply 55 · arbeitnow 47 · remotive 26 · recruiter_inbound 7 · email_job_alert 1 (email fix deployed 2026-06-03)

### Pages Built (22 live at max-ev-holdings.com):
**Admin:** dashboard · inbox · pipeline · companies · contacts · intelligence · outreach · email · contracts · invoices · earnings · monitor · settings · architecture · ce · learn · template
**Root:** /bookmarklet · /cover-letter/[id] · /onboarding · /login · / (redirect)

### Workers Running (automatic, no action needed):
| Worker | Schedule | Model |
|---|---|---|
| Opportunity scorer | Every 15 min, 25/batch | Haiku |
| Scorer lite (title-only) | Hourly + startup | None (regex) |
| RSS poller | Every 6h | None |
| ATS poller | Daily 3 AM | None |
| Job board sweep | 7 AM + 5 PM Central | None |
| Company sync | Daily 4 AM | None |
| Daily briefing | 6 AM Central | Sonnet (1 call) |
| Follow-up scheduler | 7 AM Central | None |
| IMAP IDLE monitor | Persistent push | None |
| Email parser | Every 30 min | Haiku |

### Scorer Thresholds
- **ALERT_THRESHOLD = 50** → Telegram notification with `[Apply] [Skip] [Later]` inline buttons
- **CL_THRESHOLD = 80** → auto-generate cover letter (Sonnet), send PDF via Telegram
- Score 50-79 → alert fires, cover letter on-demand only (user taps Apply)
- Score < 50 → no alert, visible in inbox with filter

---

## BUILD STATUS BY PHASE

### Phase 1 — Telegram HITL Authorization Loop ✅ COMPLETE
Full inline button loop live. `/api/telegram/webhook` handles:
- `apply:{id}` → Sonnet drafts cover letter → generates Chromium PDF → sends PDF + resume as Telegram documents → `[Mark Applied] [Cancel]`
- `skip:{id}` → stage = rejected
- `later:{id}` → snooze 48h, sets followUpDue
- `confirm_apply:{id}` → stage = applied, OutreachLog entry, Day 7 + Day 14 tasks created
- `respond:{id}` → Sonnet drafts recruiter reply, sends to Telegram
- `followup:{id}` → Sonnet drafts follow-up email
- `skip_followup:{id}` → snooze 7d
- `cancel:{id}` → restore apply buttons

Text commands: `/inbox` `/pipeline` `/tasks` `/followups` `/earnings` `/brief`

Scorer fires Telegram alert at score ≥ 50 with `[Apply] [Skip] [Later]` buttons.
Cover letter auto-generated + sent at score ≥ 80.

---

### Phase 2 — Inbox UI ✅ COMPLETE
Cover letter button, Apply/Skip/Target quick actions, filter bar all live on inbox and pipeline pages.

---

### Phase 3 — Email Parser ✅ COMPLETE (fixed 2026-06-03)
Three bugs fixed:
1. Subdomain matching: `donotreply@match.indeed.com` now correctly identified as Indeed domain via `emailMatchesDomain()`
2. ATS platforms (greenhouse.io, lever.co) removed from hard-skip — now only skip automated confirmations, keep interview signals
3. `shouldSkip()` signature updated to pass subject for context-aware filtering

IMAP pre-filter added (`isJobRelevant()` in email-idle.ts): vendor domains, marketing subjects, system noise dropped before DB write. Telegram alerts only fire on job-relevant emails.

---

### Phase 4 — Discovery Layer ✅ COMPLETE
- `/bookmarklet` page live with drag-to-bookmark JS snippet
- 12 RSS feeds configured (WWR ×2, Remotive ×2, RemoteOK, Indeed ×7)
- **Note:** Indeed RSS feeds all 429/404 blocked by Indeed. Email forwarding is the only working Indeed channel. Gmail filter configured to forward job alert domains to info@max-ev-holdings.com.
- Job board sweep worker live: FwdDeploy · RemoteOK · Remotive · Arbeitnow · Wellfound — runs 7 AM + 5 PM Central
- ATS poller: 198 companies, Greenhouse dominant (1,859 opps)

---

### Phase 5 — Follow-up Automation ✅ COMPLETE
Follow-up scheduler runs 7 AM Central. Sends Telegram `[Draft Follow-up] [Skip]` buttons for all due follow-ups. Draft fires Sonnet on tap. Follow-up tasks auto-created at Day 7 + Day 14 on confirm_apply.

---

### Phase 6 — Freelance / Contract Parallel Stream 🔶 PARTIAL
- Contracts/Invoices/Earnings pages built and live
- 2 contracts in DB (Paloma, Roof Works) — MRR wired
- 0 invoices entered yet
- Upwork RSS + Contra not yet configured

---

### Phase 7 — Interview + Offer Management 🔶 PARTIAL
- ATS email responses detected via INTERVIEW_SUBJECTS pattern matching
- Telegram alert fires on interview-signal emails
- Offer comparison engine spec in place, not yet built
- Calendar integration not started

---

## DEPLOY RULES (read before every session)
- **VPS is source of truth** — another Claude instance may have edited VPS directly. Always SCP from VPS before editing locally.
- **Deploy:** SCP files to VPS → build on VPS → `pm2 restart 34` (app) or `pm2 restart 36` (workers)
- **Git:** This project DOES use git. After VPS changes are pulled locally: `git add -A && git commit && git push origin master`
- **No .env in git** — credentials stay on VPS only
- **Build command:** `cd /var/www/max-deploy && npm run build` (then restart PM2 34)

---

## What This Is

MAX-DEPLOY is an AI-native career operations platform for engineers who treat their career like a business — multiple revenue streams, concurrent engagements, always-on opportunity pipeline, and Claude-powered intelligence running daily in the background.

This is not a job board aggregator. It is not a resume tool. It is not a simple CRM. It is the combination of Pipedrive + Apollo.io + QuickBooks + a job board, connected by Claude, in one dashboard, requiring 30-60 minutes of active attention per day.

**Primary user**: Will Austin — actively running a senior engineering job search while managing concurrent freelance contracts, targeting FDE/AI Engineering roles at $150-220K+, with the goal of holding the best available combination of employment and contract work simultaneously at any given time.

**Secondary market (post-personal use)**: Independent engineers, FDE consultants, senior freelancers, and contractors who need to manage job search pipelines, client relationships, and earnings across multiple simultaneous engagements.

**The daily operating model**: The system runs automatically every morning — ingesting new opportunities, scoring them with Claude, calculating follow-up urgency, generating a briefing. Will spends 30-60 minutes acting on what the system surfaces. He does not hunt for opportunities manually. The system hunts. He decides.

---

## The Five Systems

### System 1 — Discovery (Opportunities In)
### System 2 — Evaluation (Claude Scores Everything)
### System 3 — Outreach and Communication
### System 4 — Pipeline Management
### System 5 — Earnings, Contracts, and Getting Paid

All five run daily. All five are connected. Data flows from Discovery through to Earnings without leaving the platform.

---

## System 1 — Discovery

### RSS Feed Ingestion
Poll on a scheduled job (every 6 hours via BullMQ):

- **Indeed** — 5-6 saved searches generate RSS feeds. Searches: "Forward Deployed Engineer remote", "AI Engineer Texas remote", "Claude AI engineer", "FDE $150K", "Applied AI engineer remote". Each search = one RSS subscription.
- **LinkedIn job alerts** — LinkedIn emails daily alerts to a dedicated inbox. Parsed automatically (see email parsing below).
- **We Work Remotely** — public RSS by category (Engineering, DevOps, etc.)
- **Remotive.io** — public RSS, remote-only tech roles
- **Hacker News Who's Hiring** — scraped on the 1st of each month, parsed by Claude into individual opportunity records

### ATS Direct API Polling
The three largest ATS platforms used by tech companies have fully public job board APIs — no authentication required. Build a company watchlist of 100-150 target companies. Poll their boards daily for new postings.

**Greenhouse**: `GET https://boards.greenhouse.io/v1/boards/{company_slug}/jobs`
Used by: Stripe, Airbnb, Figma, Notion, Anthropic, OpenAI, many others.

**Lever**: `GET https://api.lever.co/v0/postings/{company_slug}`
Used by: many Series B-D startups, some enterprise.

**Ashby**: `GET https://jobs.ashbyhq.com/api/non-user-facing/job-board/{company_slug}/jobs`
Used by: growing fast in AI/ML companies, newer startups.

For each company in the watchlist, store: company name, ATS type (greenhouse/lever/ashby), company slug. The poller checks all three endpoints daily and creates new opportunity records for any posting not already in the DB.

### Freelance Platform Streams
- **Contra** — API + RSS for independent work opportunities. Skew toward product/tech work.
- **Upwork** — RSS feed available for saved searches. Filter for: "AI engineer", "forward deployed", "Claude integration", "LLM engineering". Flag: Upwork quality varies — Claude scores and filters automatically.
- **Gun.io** — engineer-specific freelancing. Email-based alerts, forward to parsing inbox.
- **Arc.dev** — apply once to get matched. Monitor the match notification email.
- **Toptal** — invite-only. If approved, daily match emails forwarded to parsing inbox.

### Email Inbox Parser
A dedicated email address: `opportunities@[domain]` (or any address forwarded to a monitored inbox).

Sources that feed this inbox:
- LinkedIn job alert emails (auto-forward from LinkedIn account)
- Recruiter cold outreach (forward any recruiter email here)
- Upwork match notifications
- Toptal/Gun.io/Arc.dev match emails
- Any platform that sends email notifications

The system checks this inbox every 30 minutes via IMAP. For each new email, Claude:
1. Determines if it's a job opportunity or recruiter outreach
2. Extracts: company, role, salary (if stated), contact name, contact email, source
3. Creates an opportunity record in the Inbox page
4. Tags it with source type: recruiter_inbound / platform_match / job_alert

### One-Click Browser Add (Bookmarklet)
A JavaScript bookmarklet saved in the browser. On any job posting page anywhere:
1. Click the bookmarklet
2. It sends the current URL to `POST /api/opportunities/scrape`
3. System fetches the page content, Claude parses the JD into structured fields
4. Creates an opportunity record with full details populated
5. Shows confirmation with the fit score

This handles all job boards the RSS/API approach misses — company career pages, niche boards, anything.

### Manual URL Paste
On the Inbox page: a text field labeled "Paste a job URL or JD". Submitting fetches and parses automatically. For when the bookmarklet isn't available.

### Google Alerts → RSS
Set up Google Alerts for:
- "{target company name} hiring"
- "Forward Deployed Engineer job"
- "AI native engineering role"
Each Google Alert generates an RSS feed. Subscribe and ingest alongside other feeds.

---

## System 2 — Evaluation

Every incoming opportunity — regardless of source — gets Claude-scored automatically on ingest. No manual scoring required unless you want to override.

### User Profile (stored in Settings, referenced by every score)
```
Skills: Next.js, TypeScript, Python, PostgreSQL, Prisma, BullMQ/Redis, 
        Claude/Anthropic API, MCP protocol, multi-model routing, Zod, 
        agentic system design, REST API design, Docker, VPS deployment,
        Twilio, ElevenLabs, Stripe Connect, IMAP email clients
Experience type: Solo full-stack builder, technical product owner, 
                 client delivery (4 external engagements), AI-native engineering
Background: Former GM/GC (P&L ownership), self-taught, no CS degree,
            14 production AI endpoints, 13 production platforms
Preferred roles: FDE, Applied AI Engineer, AI Platform Engineer, 
                 Solutions Engineer, Head of AI/Technology
Salary floor: $120K full-time / $85/hr contract
Geography: Remote preferred, TX remote acceptable, Dallas area possible
Work type: Full-time, contract, or both simultaneously
Deal breakers: On-site 5 days/week, <$100K, no AI component
```

### Auto-Scoring on Ingest
Claude reads the full JD against the stored profile and returns:
```json
{
  "fitScore": 78,
  "classification": "FDE",
  "salaryAssessment": "stated $150-180K, market accurate",
  "matchStrengths": [
    "Claude named explicitly in JD — daily use non-negotiable",
    "Agentic systems match 14 production endpoints",
    "Remote TX — geography match"
  ],
  "gaps": [
    "Kubernetes production experience required — gap",
    "10+ years requirement — 2-3 year shortfall"
  ],
  "recommendedAction": "apply_now",
  "urgency": "fresh",
  "reasoning": "Strong AI-native match, salary in range, gaps are navigable"
}
```

`recommendedAction` values: `apply_now` / `apply_with_note` / `save` / `skip` / `watch`

### The Inbox Page (/inbox)
New concept — not in original plan. Every opportunity starts here before entering the pipeline.

View: cards sorted by fit score descending. Each card shows:
- Company, role, salary, source, fit score badge, recommended action
- One-line reasoning from Claude
- Age (how many hours/days since posted)

Actions per card:
- **Apply Now** → moves to Pipeline at "Applied" stage, drafts cover letter
- **Target** → moves to Pipeline at "Target" stage for future application
- **Save** → stays in inbox, snoozed for 7 days
- **Skip** → dismissed, archived

This is the 10-minute morning review. Claude has done the work. You make the call.

---

## System 3 — Outreach and Communication

### Email Sending
All outbound emails sent through the system via SMTP (Nodemailer). Uses a sending address you control. Every sent email is logged against the relevant opportunity or contact record.

**Tracked metrics per email:**
- Sent timestamp
- Open detection (1x1 tracking pixel hosted on the platform)
- Link click tracking
- Reply detection (IMAP polling on the reply inbox)
- Follow-up scheduled (auto-created when no reply within configured days)

### Claude-Drafted Communications
Claude drafts every outbound communication. You review, edit if needed, approve, send. Categories:

**Application cover letter**: Full cover letter drafted from JD + your profile. Uses the framing established in the job search — AI-native engineer, 13 production platforms, specific match points from the JD.

**Recruiter cold outreach**: Short (3-5 sentence) intro email to a recruiter or hiring manager at a target company. Specific to the role, not generic.

**Application follow-up**: For applications with no response at day 7. References the original application, adds one new signal ("I shipped X since applying").

**Gone-dark follow-up**: For applications with no response at day 14. Final attempt, different tone.

**Post-screening thank-you**: Sent same day as screening call. Personalized to the conversation (you add notes, Claude incorporates them).

**Post-interview thank-you**: More detailed, reinforces the strongest fit points from the conversation.

**Offer negotiation response**: Claude drafts the counter-offer response based on the offer details and your floor/target.

### Follow-up Automation
Per application, the system automatically creates follow-up tasks based on stage:
- Applied with no response → follow-up task at day 7, day 14
- Screening completed → thank-you same day, check-in at day 5 if no next step communicated
- Interview completed → thank-you within 24 hours, follow-up at day 7
- Offer received → expiration countdown, negotiation timeline

Follow-up tasks appear in the daily queue on the dashboard. System drafts the email. You review and send.

### HR Department Monitoring
The system flags:
- Application in current stage longer than company's average (estimated from public data)
- Target company posts more roles after you applied (are they still growing or have they frozen?)
- Contact at target company changes roles (new recruiter, new HM — surfaces in morning briefing)
- Application has no identified human contact (prompt: "Find a contact at this company")
- Company announces layoffs or hiring freeze (via Google Alert integration)

### Recruiter Relationship Tracking
Recruiters move between companies. A recruiter who placed you at Company A becomes a warm contact at Company B a year later. The system maintains recruiter records independent of company — relationship persists even when they change employers.

---

## System 4 — Pipeline Management

### Stages
**Inbox → Target → Applied → Screening → Interview → Final Round → Offer → Accepted | Rejected | Withdrawn**

### Application Record (full fields)
```
company           string
role              string
stage             enum
salaryMin         int
salaryMax         int
totalCompMin      int    (base + bonus + equity estimate)
totalCompMax      int
fitScore          int    (Claude-scored, overridable)
classification    string (FDE / AI Engineer / CSM / Director / Contract)
resumeVariant     string (fde / slingshot / custom)
applyUrl          string
coverLetterUrl    string
source            string (greenhouse / rss_indeed / recruiter_inbound / manual / etc)
notes             text
lastActivity      datetime
followUpDue       datetime
daysInStage       int    (calculated)
contactLog        relation → OutreachLog[]
contacts          relation → Contact[]
jdText            text   (full JD stored for reference)
analysisJson      json   (full Claude score object)
offerDetails      relation → Offer?
createdAt         datetime
updatedAt         datetime
```

### Pipeline Views

**Kanban**: Stage columns with application cards. Drag to move stages. Color-coded urgency on cards (green/yellow/red by days since last activity).

**Table**: Sortable by any field. Filterable by stage, classification, salary range, fit score, source. Bulk actions (move stage, mark follow-up done).

**Map view**: Company locations on a map. Visual for geography targeting. (Lower priority — post-MVP.)

### Application Detail Drawer
Click any application to open a full detail panel (not a new page — side drawer). Contains:
- All fields editable inline
- Full contact log timeline
- JD text (collapsible)
- Claude analysis (score breakdown, strengths, gaps)
- Communication history
- Follow-up task queue
- Notes with timestamps

### Concurrent Engagement Monitor
Critical feature for the multi-job model. A separate view showing:
- All **active** engagements (not applications — actual jobs and contracts)
- Weekly committed hours per engagement
- Total weekly commitment (sum)
- Your stated capacity ceiling (set in settings)
- Alert when a new offer would push past ceiling
- Visualized as a weekly capacity bar

This is the feature no other tool has. It's built for the person who holds two jobs and two contracts simultaneously and needs to know if they can take on one more.

### Offer Comparison Engine
When two or more offers are in the "Offer" stage simultaneously, a comparison panel activates:

Side-by-side table:
- Base salary
- Bonus (target %)
- Equity (shares, strike, vesting, estimated value at last round)
- Total first-year comp estimate
- Benefits (health, dental, 401K match)
- Remote flexibility (fully remote / hybrid / required location)
- Company stage (funding, headcount, runway estimate)
- Role fit score
- Growth trajectory

Claude produces a decision brief: a 2-3 paragraph narrative comparing the offers, surfacing the non-obvious tradeoffs (not just total comp — risk, growth, fit, strategic value), and recommending which to accept based on your stated goals.

### Market Intelligence (Pattern Analysis)
Claude analyzes your full application history and surfaces insights in the morning briefing:
- Which role types are converting (response rate by classification)
- Which salary ranges are getting responses vs. silence
- Which company sizes you convert best at
- Which sources produce the best opportunities (greenhouse watchlist vs. RSS vs. recruiter inbound)
- Which resume variant is performing better
- Geography patterns (TX-remote vs. national remote conversion rates)

---

## System 5 — Earnings, Contracts, and Getting Paid

### Offer Tracking
Every offer received is logged:
```
company           string
role              string
offerDate         datetime
expirationDate    datetime
baseSalary        int
signingBonus      int
annualBonus       int (target)
equityShares      int
equityType        string (ISO / NSO / RSU)
strikePrice       float
vestingSchedule   string
cliffMonths       int
estimatedValue    float (calculated at last round valuation)
totalYearOneComp  int (calculated)
benefits          json
status            enum (pending / negotiating / accepted / declined / expired)
notes             text
```

### Contract Management
For freelance and contract work running in parallel with or instead of full-time:
```
client            string
projectName       string
rateType          enum (hourly / weekly / monthly / fixed)
rate              int
currency          string
hoursPerWeek      int (for hourly)
totalValue        int (for fixed)
startDate         datetime
endDate           datetime
autoRenew         boolean
renewalNotice     int (days before end to alert)
milestones        Milestone[]
sow               string (file URL)
status            enum (proposed / active / paused / completed / cancelled)
```

### Invoicing
Create invoices from inside the system. Send via email. Track payment.

Invoice fields:
- Invoice number (auto-generated)
- Client / contract reference
- Line items (description, hours/qty, rate, total)
- Subtotal, tax, total
- Due date (Net 15 / Net 30 / custom)
- Sent date
- Payment status (draft / sent / viewed / paid / overdue)
- Payment received date

Payment options:
- **Stripe payment link** — attach to invoice, client pays online, webhook confirms payment automatically
- **Manual mark paid** — for ACH/wire/check, mark paid manually with date

### Payment Receipt Monitoring
**Stripe**: Invoice payment webhooks update status automatically. No manual tracking.

**Plaid (bank integration)**: Connect checking account. System detects incoming deposits, attempts to match to open invoices by amount. Flags matches for confirmation. Marks matched invoices paid. This closes the loop on ACH/wire payments without manual tracking.

### Earnings Dashboard
- **Current MRR**: sum of all active monthly contract revenue
- **Projected annual**: MRR × 12 + accepted full-time salary
- **Income by source**: bar chart breakdown (employer / client A / client B / etc.)
- **Outstanding receivables**: total unpaid invoices with aging (current / 1-30 / 31-60 / 60+)
- **Tax reserve estimate**: 28% of all 1099 income flagged (shown as "set aside" figure)
- **Rate card**: effective hourly rate per engagement (total paid / hours logged)
- **Capacity utilization**: committed hours / ceiling × 100%

### Rate Optimization Alerts
Claude monitors effective rates across engagements and flags:
- "Paloma contract effective rate is $78/hr. Your floor is $85/hr. Negotiate at renewal or replace."
- "You have 12 uncommitted hours per week at your current ceiling. Capacity exists for a new engagement."
- "Contract with Client X ends in 23 days. No replacement in pipeline. Begin sourcing now."

---

## Daily Operations (The 30-60 Minute Routine)

**Pre-session (automated, runs 6 AM daily):**
- All RSS feeds polled, new opportunities ingested
- Greenhouse/Lever/Ashby watchlist polled, new postings created
- Email inbox parsed, recruiter messages processed
- Claude scores all new opportunities
- Follow-up urgency recalculated for all active applications
- Morning briefing generated

**Session breakdown:**

| Task | Time | What the system does | What you do |
|---|---|---|---|
| Inbox review | 10 min | Claude scored and ranked all new opportunities | Approve / skip each card |
| Follow-up queue | 10 min | System shows who needs contact today, drafts email | Review draft, edit if needed, send |
| Pipeline scan | 5 min | Monitor page shows urgency by color | Identify anything needing immediate attention |
| Intelligence brief | 5 min | Claude narrative on pipeline state and patterns | Read, absorb, adjust strategy |
| Earnings check | 5 min | Outstanding invoices, incoming payments, capacity | Confirm payments, flag issues |
| Active work | 20-25 min | — | Prep for calls, revise cover letters, negotiate offers |

---

## Page Structure

```
/                   → Dashboard (command center, briefing, alerts, KPIs)
/inbox              → New opportunities queue (score, approve, skip)
/pipeline           → Job application Kanban + table
/companies          → Target company CRM + watchlist management
/contacts           → Recruiter and HM relationship tracker
/intelligence       → AI analysis hub (health score, patterns, JD scorer, outreach optimizer)
/monitor            → Application status grid (urgency by color)
/outreach           → Email sequences, drafts, send history
/contracts          → Active freelance contracts + milestones
/invoices           → Invoice creation, tracking, payment status
/earnings           → Full earnings dashboard, tax reserve, capacity
/settings           → Profile, API keys, data stream configuration, watchlist
```

---

## Tech Stack

- **Framework**: Next.js 15 App Router
- **Language**: TypeScript throughout
- **Styling**: Inline styles (consistent with MAX EV admin pattern — no Tailwind, no CSS modules, no external component library)
- **Database**: PostgreSQL + Prisma ORM — standalone DB, no connection to any other project
- **AI**: Anthropic Claude API — `claude-sonnet-4-6` for analysis/briefing/scoring, `claude-haiku-4-5` for fast operations (recommendations, classification)
- **Job Queue**: BullMQ + Redis — RSS polling, ATS polling, email parsing, AI job processing, follow-up scheduling
- **Email sending**: Nodemailer via SMTP
- **Email receiving**: IMAP (node-imap or imapflow) — dedicated opportunities inbox
- **Payments**: Stripe (invoice payment links + webhooks) + Plaid (bank monitoring, optional)
- **Auth**: NextAuth with credentials — single user to start
- **Deploy**: SCP/SSH to VPS at 72.60.43.168, PM2 process, Nginx config for domain
- **Domain**: max-ev-holdings.com → points to VPS at 72.60.43.168 via DNS A record
- **GitHub**: github.com/maxev-digital/Max-Deployed (repo already created, other instance has access)

---

## Visual Components

Copy verbatim from `D:\maxev-admin\src\app\(admin)\ai-insights\page.tsx` into `src/components/charts.tsx`:

- `Gauge` — application velocity gauge, capacity utilization
- `Sparkline` — applications sent per week trend, response rate trend
- `Ring` — fit score rings, response rate rings
- `StageBar` — pipeline stage volume bars, earnings by source bars
- `tileColor()` — color coding helper
- `healthColor()` — score color helper
- `healthGrade()` — A+ to D letter grade
- `PortfolioTile` — company targeting map tiles, source performance tiles

These are self-contained SVG components with zero external dependencies.

---

## Database Schema

```prisma
model Opportunity {
  id                String   @id @default(cuid())
  company           String
  role              String
  stage             String   @default("inbox")
  // inbox | target | applied | screening | interview | final | offer | accepted | rejected | withdrawn
  salaryMin         Int?
  salaryMax         Int?
  totalCompMin      Int?
  totalCompMax      Int?
  fitScore          Int?
  fitScoreOverride  Int?
  classification    String?  // FDE | AI_Engineer | CSM | Director | Contract | Skip
  recommendedAction String?  // apply_now | apply_with_note | save | skip | watch
  resumeVariant     String?
  applyUrl          String?
  coverLetterUrl    String?
  source            String?  // greenhouse | lever | ashby | rss_indeed | rss_wwr | email_parse | manual | bookmarklet
  sourceCompanySlug String?
  jdText            String?
  analysisJson      Json?
  notes             String?
  lastActivity      DateTime?
  followUpDue       DateTime?
  appliedAt         DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  contacts          Contact[]
  outreachLogs      OutreachLog[]
  offer             Offer?
}

model TargetCompany {
  id            String   @id @default(cuid())
  name          String
  website       String?
  industry      String?
  size          String?
  techStack     String[]
  atsType       String?  // greenhouse | lever | ashby | workday | none
  atsSlug       String?
  warmth        String   @default("cold")  // cold | warm | hot
  notes         String?
  watchlist     Boolean  @default(true)
  lastPolled    DateTime?
  createdAt     DateTime @default(now())
  contacts      Contact[]
}

model Contact {
  id              String      @id @default(cuid())
  name            String
  email           String?
  linkedin        String?
  role            String?     // recruiter | hiring_manager | referral | other
  company         TargetCompany? @relation(fields: [companyId], references: [id])
  companyId       String?
  opportunity     Opportunity?   @relation(fields: [opportunityId], references: [id])
  opportunityId   String?
  lastContact     DateTime?
  warmth          String      @default("cold")
  notes           String?
  createdAt       DateTime    @default(now())
}

model OutreachLog {
  id              String      @id @default(cuid())
  opportunity     Opportunity @relation(fields: [opportunityId], references: [id])
  opportunityId   String
  type            String      // email | linkedin | phone | in_person
  direction       String      // sent | received
  subject         String?
  body            String?
  sentAt          DateTime?
  openedAt        DateTime?
  clickedAt       DateTime?
  repliedAt       DateTime?
  followUpDue     DateTime?
  status          String      @default("draft")  // draft | sent | opened | replied | bounced
}

model RssFeed {
  id            String   @id @default(cuid())
  name          String
  url           String   @unique
  source        String   // indeed | wwr | remotive | hn | google_alert | custom
  active        Boolean  @default(true)
  lastPolled    DateTime?
  lastItemDate  DateTime?
  createdAt     DateTime @default(now())
}

model Offer {
  id                String      @id @default(cuid())
  opportunity       Opportunity @relation(fields: [opportunityId], references: [id])
  opportunityId     String      @unique
  offerDate         DateTime?
  expirationDate    DateTime?
  baseSalary        Int?
  signingBonus      Int?
  annualBonus       Int?
  equityShares      Int?
  equityType        String?
  strikePrice       Float?
  vestingSchedule   String?
  cliffMonths       Int?
  estimatedEquityValue Float?
  totalYearOneComp  Int?
  benefitsJson      Json?
  status            String      @default("pending")
  // pending | negotiating | accepted | declined | expired
  notes             String?
  createdAt         DateTime    @default(now())
}

model Contract {
  id              String    @id @default(cuid())
  client          String
  projectName     String
  rateType        String    // hourly | weekly | monthly | fixed
  rate            Int
  hoursPerWeek    Int?
  totalValue      Int?
  startDate       DateTime?
  endDate         DateTime?
  autoRenew       Boolean   @default(false)
  renewalNoticeDays Int?
  status          String    @default("proposed")
  // proposed | active | paused | completed | cancelled
  sowUrl          String?
  notes           String?
  createdAt       DateTime  @default(now())
  milestones      Milestone[]
  invoices        Invoice[]
}

model Milestone {
  id          String    @id @default(cuid())
  contract    Contract  @relation(fields: [contractId], references: [id])
  contractId  String
  name        String
  dueDate     DateTime?
  value       Int?
  status      String    @default("pending")  // pending | complete | invoiced
}

model Invoice {
  id              String    @id @default(cuid())
  invoiceNumber   String    @unique
  contract        Contract? @relation(fields: [contractId], references: [id])
  contractId      String?
  client          String
  lineItems       Json
  subtotal        Int
  taxRate         Float     @default(0)
  taxAmount       Int       @default(0)
  total           Int
  dueDate         DateTime?
  sentAt          DateTime?
  viewedAt        DateTime?
  paidAt          DateTime?
  paymentMethod   String?   // stripe | ach | wire | check
  stripePaymentId String?
  status          String    @default("draft")
  // draft | sent | viewed | paid | overdue | void
  notes           String?
  createdAt       DateTime  @default(now())
}

model TimeLog {
  id          String    @id @default(cuid())
  contractId  String
  date        DateTime
  hours       Float
  description String?
  createdAt   DateTime  @default(now())
}
```

---

## AI Endpoints

**POST /api/ai/briefing**
Input: full opportunity vitals + follow-up queue + pattern data
Output: `{ briefing: string, urgentActions: string[], patterns: string[] }`
Model: claude-sonnet-4-6
Runs: daily at 6 AM via cron job

**POST /api/ai/score-opportunity**
Input: JD text + user profile
Output: `{ fitScore, classification, salaryAssessment, matchStrengths, gaps, recommendedAction, urgency, reasoning }`
Model: claude-sonnet-4-6
Runs: on every new opportunity ingest

**POST /api/ai/health-score**
Input: pipeline metrics computed from DB
Output: `{ overall, grade, dimensions, summary }`
Model: claude-sonnet-4-6
Runs: daily or on demand

**POST /api/ai/recommendations**
Input: vitals + stale applications + capacity data
Output: `{ recommendations: [{ priority, title, detail, action }] }`
Model: claude-haiku-4-5 (fast, runs frequently)
Runs: daily + on demand

**POST /api/ai/patterns**
Input: full application history with outcomes
Output: `{ patterns: [{ insight, signal, metric, detail }] }`
Model: claude-sonnet-4-6
Runs: weekly or on demand

**POST /api/ai/draft-email**
Input: email type + opportunity context + contact + prior communication history
Output: `{ subject: string, body: string }`
Model: claude-sonnet-4-6
Runs: on demand

**POST /api/ai/fit-score**
Input: raw JD text paste
Output: `{ score, strengths, gaps, positioning, coverLetterAngle }`
Model: claude-sonnet-4-6
Runs: on demand (Intelligence page)

**POST /api/ai/offer-comparison**
Input: array of offer objects
Output: `{ recommendation, reasoning, tradeoffs, suggestedNegotiationPoints }`
Model: claude-sonnet-4-6
Runs: when 2+ offers are in "Offer" stage

---

## Data Stream Configuration (Settings Page)

The /settings/streams page lets you configure all data sources:

**RSS Feeds tab**: add/remove/toggle RSS URLs, see last poll time, item count
**Company Watchlist tab**: add companies, select their ATS type, enter their slug, toggle active
**Email Inbox tab**: IMAP credentials for the opportunities inbox, test connection
**Freelance Platforms tab**: Upwork RSS URL, Contra API key (if applicable)
**Google Alerts tab**: paste RSS URLs from Google Alerts

---

## Background Jobs (BullMQ Queues)

```
rss-poller          → runs every 6 hours, polls all active RSS feeds
ats-poller          → runs every 24 hours, checks company watchlist boards
email-parser        → runs every 30 minutes, checks opportunities inbox
opportunity-scorer  → triggered on new opportunity creation, runs Claude scoring
briefing-generator  → runs daily at 6 AM, generates morning briefing
follow-up-scheduler → runs daily at 7 AM, calculates and creates follow-up tasks
payment-monitor     → runs every 4 hours, checks Plaid for incoming payments
```

---

## Deploy Instructions

SCP/SSH to VPS — same deploy method as all other projects. Never git push to deploy.

```bash
# Build
npm run build

# SCP
scp -r .next/ user@72.60.43.168:/var/www/max-deploy/
scp package.json user@72.60.43.168:/var/www/max-deploy/

# SSH and restart
ssh user@72.60.43.168
cd /var/www/max-deploy
pm2 restart max-deploy
```

**Nginx config** (on VPS):
```nginx
server {
    listen 80;
    server_name max-ev-holdings.com;

    location / {
        proxy_pass http://localhost:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**SSL**: `certbot --nginx -d max-ev-holdings.com` after DNS propagates.

**Domain setup**: max-ev-holdings.com A record → 72.60.43.168. DNS already managed wherever the domain is registered. Propagation 5-30 min. Then run certbot for HTTPS.

**PM2 process**:
```bash
pm2 start npm --name "max-deploy" -- start
pm2 save
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# NextAuth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://max-ev-holdings.com"
ADMIN_EMAIL="..."
ADMIN_PASSWORD_HASH="..."   # bcrypt hash

# Email sending (SMTP)
SMTP_HOST="..."
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."
SMTP_FROM="opportunities@max-ev-holdings.com"

# Email receiving (IMAP)
IMAP_HOST="..."
IMAP_PORT="993"
IMAP_USER="..."
IMAP_PASS="..."

# Redis
REDIS_URL="redis://localhost:6379"

# Stripe (invoicing)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Plaid (bank monitoring - optional)
PLAID_CLIENT_ID="..."
PLAID_SECRET="..."
PLAID_ENV="production"

# GitHub (for bookmarklet auth)
BOOKMARKLET_SECRET="..."
```

---

## What This Proves (Strategic Value)

**For the job search**: You are running your own job search on a platform you built. The system that surfaces, scores, and tracks every application is itself the proof-of-work. "I built an AI-native career ops platform to run my own job search — it ingests from 15+ sources, scores every opportunity with Claude, tracks follow-up sequences, and monitors earnings across concurrent engagements. I'm the first customer and I use it daily."

**For product credibility**: A complete SaaS product — data ingestion, AI analysis, email automation, invoicing, payment monitoring — built solo in a weekend. That is the FDE profile in action.

**For the multi-tenant roadmap**: The same platform adaptation pattern proven again. MAX EV admin → business OS. MAX-DEPLOY → career OS. Same architecture, different domain, fourth vertical.

**As a sellable product**: Other senior engineers and FDE-type consultants need exactly this and have no tool built for them. Post-personal validation, this becomes a real SaaS at $29-79/month.
# CI/CD active Wed, Jun  3, 2026  4:03:19 PM
