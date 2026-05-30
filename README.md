# MAX-DEPLOY — AI-Native Career Operations Platform

> Treat your career like a business. Multiple revenue streams, concurrent engagements, always-on opportunity pipeline, Claude-powered intelligence running daily in the background.

MAX-DEPLOY is the combination of Pipedrive + Apollo.io + QuickBooks + a job board, connected by Claude, in one dashboard. It is not a job board aggregator, a resume tool, or a simple CRM. It requires 30–60 minutes of active attention per day. The system does the rest.

**Live demo / personal use:** [max-ev-holdings.com](https://max-ev-holdings.com)

---

## What It Does

### Five Systems, One Dashboard

| System | Function |
|---|---|
| **Discovery** | Ingests opportunities from 15+ sources — RSS feeds, ATS APIs (Greenhouse, Lever, Ashby), email inbox parsing, bookmarklet scraping, manual paste |
| **Evaluation** | Claude scores every opportunity on ingest against your stored profile — fit score, gaps, recommended action, salary assessment |
| **Outreach** | Drafts cover letters, recruiter emails, follow-ups, thank-yous, and offer negotiations. Tracks opens, clicks, replies |
| **Pipeline** | Kanban + table view across 10 stages. Concurrent engagement monitor. Offer comparison engine |
| **Earnings** | Contract management, invoicing with Stripe/Plaid, outstanding receivables, tax reserve, capacity utilization |

### The Daily Routine (30–60 min)

The system runs automatically at 6 AM — ingesting, scoring, calculating follow-up urgency, generating a briefing. You spend 30–60 minutes acting on what it surfaces. You do not hunt for opportunities manually. The system hunts. You decide.

| Task | Time |
|---|---|
| Inbox review — Claude-ranked new opportunities | 10 min |
| Follow-up queue — system drafts, you review and send | 10 min |
| Pipeline scan — urgency by color on Monitor page | 5 min |
| Intelligence brief — Claude narrative on patterns | 5 min |
| Earnings check — receivables, payments, capacity | 5 min |
| Active work — calls, cover letters, negotiations | 20–25 min |

---

## Pages

```
/                → Dashboard — briefing, alerts, KPIs, daily queue
/inbox           → New opportunities queue — score, approve, skip
/pipeline        → Kanban + table, application detail drawer
/companies       → Target company CRM + ATS watchlist
/contacts        → Recruiter and hiring manager relationship tracker
/intelligence    → AI hub — health score, patterns, JD scorer, outreach optimizer
/monitor         → Application status grid — urgency by color
/outreach        → Email sequences, drafts, send history
/contracts       → Active freelance contracts + milestones
/invoices        → Invoice creation, tracking, payment status
/earnings        → Earnings dashboard, tax reserve, capacity
/settings        → Profile, API keys, data streams, watchlist
```

---

## Tech Stack

- **Framework** — Next.js 15 App Router, TypeScript throughout
- **Database** — PostgreSQL + Prisma ORM (standalone, no shared DB)
- **AI** — Anthropic Claude API (`claude-sonnet-4-6` for scoring/briefing, `claude-haiku-4-5` for fast ops)
- **Background Jobs** — BullMQ + Redis (RSS polling, ATS polling, email parsing, scoring, briefings)
- **Email** — Nodemailer (SMTP outbound) + imapflow (IMAP inbound parsing)
- **Payments** — Stripe (invoice links + webhooks) + Plaid (bank monitoring, optional)
- **Auth** — NextAuth v5 credentials (single user)
- **Styling** — Inline styles, no CSS framework, no external component library
- **Deploy** — SCP/SSH → VPS → PM2 + Nginx, port 3200

---

## Background Jobs

| Queue | Schedule | Function |
|---|---|---|
| `rss-poller` | Every 6 hours | Polls all active RSS feeds |
| `ats-poller` | Every 24 hours | Checks Greenhouse/Lever/Ashby watchlist |
| `email-parser` | Every 30 minutes | Parses opportunities inbox via IMAP |
| `opportunity-scorer` | On ingest | Claude scores every new opportunity |
| `briefing-generator` | Daily 6 AM | Generates morning intelligence briefing |
| `follow-up-scheduler` | Daily 7 AM | Calculates and creates follow-up tasks |
| `payment-monitor` | Every 4 hours | Checks Plaid for incoming payments |

---

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis instance
- Anthropic API key
- SMTP + IMAP email credentials

### Install

```bash
git clone https://github.com/maxev-digital/Max-Deployed.git
cd Max-Deployed
npm install
```

### Environment

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

Key variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/max_deploy"
ANTHROPIC_API_KEY="sk-ant-..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3200"
ADMIN_EMAIL="your@email.com"
ADMIN_PASSWORD_HASH="bcrypt-hash"   # generate with bcryptjs
REDIS_URL="redis://localhost:6379"
SMTP_HOST / SMTP_USER / SMTP_PASS
IMAP_HOST / IMAP_USER / IMAP_PASS
STRIPE_SECRET_KEY                   # optional, for invoicing
PLAID_CLIENT_ID / PLAID_SECRET      # optional, for bank monitoring
```

Generate a bcrypt password hash:
```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('yourpassword', 10))"
```

### Database

```bash
npm run db:generate   # generate Prisma client
npm run db:push       # push schema to database
```

### Run

```bash
npm run dev    # development on port 3200
npm run build
npm start      # production on port 3200
```

---

## Deploy (VPS)

```bash
# Build locally
npm run build

# Push to VPS
scp -r .next/ user@72.60.43.168:/var/www/max-deploy/
scp package.json user@72.60.43.168:/var/www/max-deploy/

# SSH and restart
ssh user@72.60.43.168
cd /var/www/max-deploy && npm install --production
pm2 restart max-deploy
```

First-time setup on VPS:
```bash
pm2 start npm --name "max-deploy" -- start
pm2 save
```

Nginx config:
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

SSL: `certbot --nginx -d max-ev-holdings.com`

---

## The Strategic Value

**For the job search** — You are running your own job search on a platform you built. The system is the proof-of-work.

**For product credibility** — A complete SaaS: data ingestion, AI analysis, email automation, invoicing, payment monitoring — built solo. That is the FDE profile in action.

**As a sellable product** — Senior engineers, FDE consultants, and contractors need exactly this and have no tool built for them. Post-personal validation, this becomes a real product at $29–79/month.

---

## License

Private. Built and operated by [MAX EV Digital](https://maxevdigital.com).
