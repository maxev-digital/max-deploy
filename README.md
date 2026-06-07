![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat&logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white) ![Anthropic](https://img.shields.io/badge/Anthropic_Claude-D97706?style=flat)

# MAX-DEPLOY

MAX-DEPLOY is a production career management system built to run an active job search at scale. It handles opportunity ingestion from RSS feeds, ATS APIs, and email; AI scoring and ranking via Claude; pipeline stage tracking; cover letter generation; and market intelligence reporting. The system runs continuously on a VPS under PM2, processes background jobs via BullMQ, and serves both an authenticated admin interface and a public-facing market intelligence hub.

---

## Architecture

**Framework:** Next.js 15 App Router, TypeScript throughout. All pages under `src/app/`. API routes under `src/app/api/`.

**Database:** PostgreSQL accessed via Prisma ORM. Schema at `prisma/schema.prisma`. Direct TCP connection to a local Postgres instance (port 5436 on the VPS).

**Background workers:** BullMQ queues backed by Redis. Workers live in `src/workers/` and run as a separate PM2 process (`max-deploy-workers`). Workers interact with the main app only through the shared database and Redis — no direct IPC.

| Worker | Schedule | Function |
|---|---|---|
| `rss-poller` | Every 6 hours | Polls active RSS feed sources |
| `ats-poller` | Daily 3 AM | Polls Greenhouse, Lever, Ashby company watchlist |
| `email-parser` | Every 30 minutes | Parses inbound IMAP inbox for opportunities |
| `opportunity-scorer` | On ingest | Scores each new opportunity via Claude against stored profile |
| `briefing-generator` | Daily 6 AM | Generates morning intelligence briefing |
| `follow-up-scheduler` | Daily 7 AM | Calculates follow-up urgency and creates tasks |

**Auth:** Custom session auth using bcryptjs. Single-user — credentials stored in environment variables. No multi-tenant support in the current build.

**Notifications:** Telegram bot for operational alerts and HITL authorization (inline buttons for apply/skip/later per opportunity). Slack webhooks for high-priority alerts.

**PDF generation:** Puppeteer, invoked from `smart-apply.js` outside the main Next.js process. Cover letters are generated per opportunity on demand.

---

## Features

- Opportunity inbox with AI-scored inbound listings — fit score, gap analysis, recommended action, salary assessment — from RSS feeds, ATS APIs, email parsing, and manual entry
- Pipeline with kanban and table views across application stages (inbox, target, applied, screening, interview, final round, offer, closed)
- Cover letter generation per opportunity via Claude, with per-config resume targeting
- Public market intelligence hub (unauthenticated) — sector heat map, salary ranges, build type demand, filterable job index
- Company CRM with ATS watchlist management (Greenhouse, Lever, Ashby)
- Recruiter and hiring manager contact tracking
- AI prep studio — interview coaching scoped to each opportunity's JD
- Calendar for interview scheduling
- Application task tracker
- Earnings dashboard: active contracts, invoicing, Stripe payment links, outstanding receivables, tax reserve estimate
- Daily system health reporting via Telegram

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL instance
- Redis instance (required for BullMQ workers)
- Anthropic API key
- SMTP credentials (outbound email)
- IMAP credentials (inbound email parsing) — optional for local dev

### Install

```bash
git clone https://github.com/maxev-digital/max-deploy.git
cd max-deploy
npm install
```

### Environment

Create a `.env` file in the project root. Required variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/max_deploy"
ANTHROPIC_API_KEY="sk-ant-..."
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="your-plaintext-password"
REDIS_URL="redis://localhost:6379"
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
IMAP_HOST=""
IMAP_USER=""
IMAP_PASS=""
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""
SLACK_WEBHOOK_URL=""
```

Optional (invoicing and bank monitoring):

```env
STRIPE_SECRET_KEY=""
PLAID_CLIENT_ID=""
PLAID_SECRET=""
```

### Database

```bash
npm run db:generate   # generates Prisma client from schema
npm run db:push       # pushes schema to the database
```

### Run

```bash
npm run dev    # starts Next.js on port 3200
```

Workers run as a separate process. In production this is a second PM2 entry (`max-deploy-workers`). Locally you can invoke individual workers directly via scripts in `src/workers/` as needed.

---

## Deployment

No CD pipeline. Deployment is manual via SCP to the VPS followed by a PM2 restart.

```bash
# Build locally
npm run build

# Copy build artifacts to VPS
scp -r .next package.json package-lock.json root@<vps-ip>:/var/www/max-deploy/

# On the VPS
cd /var/www/max-deploy
npm install --omit=dev
pm2 restart max-deploy
pm2 restart max-deploy-workers
```

The VPS runs nginx as a reverse proxy to port 3200. Both PM2 processes (`max-deploy` and `max-deploy-workers`) are persisted via `pm2 save` and start on boot via `pm2 startup`.

---

## License

Private. Built and operated by [MAX EV Digital](https://maxevdigital.com).
