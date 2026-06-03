'use client';

import { useState, useMemo } from 'react';
import {
  BookOpen, Server, Database, Globe, Cpu, GitBranch, Zap, Bot, Plug, MessageSquare,
  ChevronDown, ChevronUp, Code2, Shield, Lock, Eye, GitMerge, Rocket, BarChart2,
  Layers, Mail, Phone, Palette, Radio, Network, Terminal, Search, AlertTriangle,
} from 'lucide-react';

type TabId = 'analogies' | 'gaps' | 'acronyms';

interface Analogy {
  id: string;
  group: string;
  icon: React.ReactNode;
  title: string;
  yourStack: string;
  enterprise: string;
  detail: string;
  enterpriseExamples: string[];
  color: string;
}

interface Gap {
  id: string;
  name: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  whatItIs: string;
  whyItMatters: string;
  examples: string[];
  learnAt: string;
}

interface AcronymEntry {
  acronym: string;
  full: string;
  category: string;
  definition: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STACK ANALOGIES DATA
// ─────────────────────────────────────────────────────────────────────────────
const ANALOGIES: Analogy[] = [
  // INFRASTRUCTURE
  {
    id: 'linux', group: 'Infrastructure', icon: <Server size={18} />, color: '#F59E0B',
    title: 'Linux / VPS',
    yourStack: "A 24/7 computer in a data center you access remotely via SSH. Runs Ubuntu. You own the whole thing — OS, processes, files, databases. One IP, 30+ apps.",
    enterprise: "Same OS, massively different scale. Enterprise runs hundreds or thousands of servers managed by DevOps/SRE teams. Auto-provisioned via Terraform — nobody SSHes individual boxes.",
    detail: "Your VPS is a single office building you manage solo. Enterprise has a campus of skyscrapers with a facilities department. The building materials (Linux) are identical.",
    enterpriseExamples: ['AWS EC2', 'GCP Compute Engine', 'Azure VMs', 'DigitalOcean Droplets'],
  },
  {
    id: 'nginx', group: 'Infrastructure', icon: <Globe size={18} />, color: '#10B981',
    title: 'NGINX (Traffic Router)',
    yourStack: "The lobby receptionist — looks at the domain name on every incoming request and routes it to the right app. All domains hit one IP; NGINX sorts them by hostname.",
    enterprise: "Called a Load Balancer at scale. Distributes millions of requests across dozens of server clusters in real time. SSL termination, health checks, and failover are automatic.",
    detail: "Your NGINX is a hotel front desk. AWS Application Load Balancer is an airport control tower routing 10 million flights a day. Same job, radically different throughput.",
    enterpriseExamples: ['AWS ALB / NLB', 'Cloudflare', 'GCP Cloud Load Balancing', 'Azure Front Door'],
  },
  {
    id: 'pm2', group: 'Infrastructure', icon: <Cpu size={18} />, color: '#3B82F6',
    title: 'PM2 (Process Manager)',
    yourStack: "The building manager — keeps every tenant (app) open, restarts them if they crash, and remembers who runs on reboot. Manages 30+ processes on your VPS.",
    enterprise: "Kubernetes (K8s). Does everything PM2 does but across hundreds of servers simultaneously. Auto-scales when traffic spikes. Self-heals when containers fail.",
    detail: "PM2 is a solo property manager for one building. Kubernetes is a commercial real estate corporation managing a city of buildings.",
    enterpriseExamples: ['Kubernetes (K8s)', 'AWS ECS / EKS', 'Google GKE', 'Azure AKS'],
  },
  {
    id: 'docker', group: 'Infrastructure', icon: <Server size={18} />, color: '#06B6D4',
    title: 'Docker (Containers)',
    yourStack: "Individual office suites — each project has its own isolated space. APW pipes burst? Roof Works is dry. Each DB runs in its own container on its own port.",
    enterprise: "Same technology — Docker is actually enterprise-grade. Netflix, Google, Amazon all use it. The difference is orchestration: Kubernetes decides which physical server each container lives on and restarts it anywhere in the cluster if a node dies.",
    detail: "The container is identical whether you run one or one million. The sophistication is entirely in the orchestration layer.",
    enterpriseExamples: ['Docker + Kubernetes', 'AWS Fargate', 'GCP Cloud Run', 'Azure Container Apps'],
  },
  // CODE & LANGUAGE
  {
    id: 'nextjs', group: 'Code & Language', icon: <Terminal size={18} />, color: '#E2E8F0',
    title: 'Next.js (Full-Stack Framework)',
    yourStack: "The scaffolding that holds your entire app together — routing, server-side rendering, API endpoints, and static pages in one structure. Every admin panel and marketing site in the portfolio runs on it.",
    enterprise: "Called a Web Application Framework. Spring Boot (Java), ASP.NET Core (C#), Django (Python), and Rails (Ruby) are the Next.js equivalents used by banks and Fortune 500s. Same concept: opinionated structure with routing, templating, and APIs built in.",
    detail: "You build in Next.js. Goldman Sachs builds internal tools in Spring Boot. The mental model — file-based routing, server functions, client components — translates directly.",
    enterpriseExamples: ['Spring Boot (Java)', 'ASP.NET Core (.NET)', 'Django (Python)', 'Ruby on Rails'],
  },
  {
    id: 'typescript', group: 'Code & Language', icon: <Code2 size={18} />, color: '#3178C6',
    title: 'TypeScript (Strongly Typed JS)',
    yourStack: "JavaScript with a strict building inspector. Every function declares what it expects and returns. Catches entire categories of bugs before the code runs. Your entire stack is TypeScript.",
    enterprise: "What Java and C# have been doing for 25 years. Enterprise chose strongly-typed languages because systems that fail silently at runtime are catastrophic at scale. Go and Kotlin are modern equivalents.",
    detail: "TypeScript is the bridge between scripting-land and enterprise-land. A Java developer reads your TypeScript immediately. A TypeScript developer picks up Java in weeks.",
    enterpriseExamples: ['Java', 'C# / .NET', 'Go', 'Kotlin', 'Scala'],
  },
  {
    id: 'tailwind', group: 'Code & Language', icon: <Palette size={18} />, color: '#38BDF8',
    title: 'Tailwind CSS (Utility-First UI)',
    yourStack: "A box of Legos for building interfaces — pre-defined utility classes you compose directly in markup. Makes consistent, responsive UIs fast to build across every project.",
    enterprise: "Called a Design System. Salesforce Lightning, IBM Carbon, Google Material Design, and Atlassian Design System are the Tailwind equivalents. Every Fortune 500 has one so 200 engineers build UIs that look identical without coordinating.",
    detail: "Your Tailwind knowledge transfers directly to any component library. Spacing scale, color tokens, responsive breakpoints, variant states — these concepts are universal.",
    enterpriseExamples: ['Salesforce Lightning', 'IBM Carbon', 'Google Material', 'Atlassian Design System'],
  },
  {
    id: 'python', group: 'Code & Language', icon: <Code2 size={18} />, color: '#3776AB',
    title: 'Python',
    yourStack: "You write Python for patch scripts, data processing, and VPS automation — the language you reach for when TypeScript is overkill and you need something readable fast. Every .py script you have run over SSH is Python.",
    enterprise: "Python is the #1 language for AI/ML, data science, and automation — there is no close second. NumPy, pandas, PyTorch, TensorFlow, LangChain, FastAPI, Django, Jupyter — the entire AI ecosystem was built in Python. Every AI Engineer job description lists it first, usually before JavaScript.",
    detail: "TypeScript is your application layer. Python is your data and AI layer. The two coexist in every serious AI engineering role — TypeScript for the product, Python for the models and pipelines. You already write both.",
    enterpriseExamples: ['NumPy / pandas', 'FastAPI / Django', 'PyTorch / TensorFlow', 'Jupyter Notebooks', 'LangChain / LlamaIndex'],
  },
  {
    id: 'sql', group: 'Code & Language', icon: <Database size={18} />, color: '#E97316',
    title: 'SQL (Structured Query Language)',
    yourStack: "Prisma abstracts most queries, but you write raw SQL for analysis, migrations, and debugging — SELECT, JOIN, GROUP BY, and aggregations to inspect DB state. Every docker exec psql session is raw SQL.",
    enterprise: "The universal language of data — spoken by every analyst, data engineer, backend developer, and FDE. Snowflake, BigQuery, Redshift, Oracle, and every data tool runs SQL. Knowing it fluently separates candidates who can speak data from those who cannot.",
    detail: "SQL is the one language that crosses every technical discipline. A data analyst, a backend engineer, and an FDE all read the same SELECT statement. It is the shared vocabulary of everyone who works with data — and it has been for 50 years.",
    enterpriseExamples: ['PostgreSQL', 'Snowflake SQL', 'Google BigQuery', 'dbt (SQL transforms)', 'Apache Spark SQL'],
  },
  {
    id: 'bash', group: 'Code & Language', icon: <Terminal size={18} />, color: '#374151',
    title: 'Bash / Shell Scripting',
    yourStack: "The commands you type over SSH — pm2 restart, scp, chmod, mkdir, grep, tail -f logs, pipe chains. Every deploy step, cron job, and VPS management task is Bash. You use it daily without naming it.",
    enterprise: "Used by every DevOps, SRE, and Platform engineer. CI/CD pipelines are Bash scripts triggered by GitHub Actions. Kubernetes init containers run Bash. Terraform provisioners call Bash. The terminal fluency you already have is directly applicable to every infrastructure role.",
    detail: "You are already a Bash user — you just might not call it that. Every time you chain commands with && or pipe output with |, that is Bash programming. Enterprise calls this shell scripting and values it as a core DevOps skill.",
    enterpriseExamples: ['GNU Bash', 'Zsh', 'PowerShell', 'sh scripts in GitHub Actions', 'Makefile'],
  },
  // DATA LAYER
  {
    id: 'prisma', group: 'Data Layer', icon: <Database size={18} />, color: '#8B5CF6',
    title: 'Prisma / ORM (Data Access Layer)',
    yourStack: "The office filing system manager. Define the folder structure (schema.prisma) and Prisma creates, organizes, and retrieves records. Migrations are version-controlled and reproducible.",
    enterprise: "ORMs are everywhere at scale. Salesforce calls theirs the Data Model. Atlassian has one underneath Jira. Same concept — different magnitude. A filing cabinet vs. the Library of Congress.",
    detail: "Same concept, same patterns, different magnitude. A filing cabinet vs. the Library of Congress with 200 librarians.",
    enterpriseExamples: ['Salesforce Data Model', 'Hibernate (Java)', 'ActiveRecord (Rails)', 'Django ORM'],
  },
  {
    id: 'postgres', group: 'Data Layer', icon: <BarChart2 size={18} />, color: '#336791',
    title: 'PostgreSQL (Relational Database)',
    yourStack: "The actual filing cabinet — permanent storage. Source of truth for every app: jobs, leads, opportunities, craps sessions, roofing estimates. All in separate containers.",
    enterprise: "PostgreSQL IS enterprise-grade. AWS RDS Postgres powers Instagram. The enterprise alternatives are Oracle (banks paying $50K+/year per license), SQL Server (government and retail), and Snowflake/BigQuery for analytical workloads.",
    detail: "You use the same database AWS recommends as their default. The enterprise gap is operational — managed replication, automated backups, read replicas. The SQL you write is identical.",
    enterpriseExamples: ['Oracle Database', 'Microsoft SQL Server', 'Snowflake', 'Google BigQuery', 'AWS Aurora'],
  },
  {
    id: 'redis-cache', group: 'Data Layer', icon: <Zap size={18} />, color: '#DC2626',
    title: 'Redis (In-Memory Cache)',
    yourStack: "A whiteboard next to the filing cabinet. Frequently accessed answers (sessions, rate limits, queue state) live on the whiteboard so you grab them in microseconds without opening the cabinet.",
    enterprise: "AWS ElastiCache. Cloudflare KV. CDN edge caching. Every high-traffic system has at least two caching layers. Stripe caches every API key lookup in Redis. GitHub caches repository metadata.",
    detail: "Redis fluency signals to interviewers that you understand latency trade-offs — hot path vs. cold path, TTL vs. cache invalidation. Core backend engineering mental model.",
    enterpriseExamples: ['AWS ElastiCache', 'Cloudflare KV', 'Memcached', 'Upstash', 'Redis Enterprise'],
  },
  // PIPELINES & EVENTS
  {
    id: 'rss-pipeline', group: 'Pipelines & Events', icon: <GitBranch size={18} />, color: '#EC4899',
    title: 'RSS Poller + Job Pipeline (ETL)',
    yourStack: "A mail sorter who checks 12 mailboxes nightly, reads each label, throws away irrelevant items (isInScope filter), and drops qualified leads on your desk with a Telegram notification. Extract, transform, load.",
    enterprise: "This is ETL. Exactly what Monte Carlo, Databricks, and Snowflake are built around at scale. Their customers pay $100K+/year for the same concept applied to financial transactions and healthcare records.",
    detail: "Your pipeline does this for job postings. Enterprise pipelines do it for trillions of business-critical events per day. The architecture — poller, filter, transform, load, notify — is identical.",
    enterpriseExamples: ['Monte Carlo', 'Databricks', 'Snowflake', 'Apache Airflow', 'AWS Glue'],
  },
  {
    id: 'bullmq', group: 'Pipelines & Events', icon: <Layers size={18} />, color: '#F97316',
    title: 'BullMQ / Redis (Job Queue)',
    yourStack: "A ticket system at a deli counter. Someone clicks Draft Cover Letter — a ticket is pulled. The worker processes in order without losing requests. Retry logic, failure handling, prioritization built in.",
    enterprise: "Apache Kafka handles trillions of events per day for Uber, Stripe, and Netflix. AWS SQS powers every AWS-native microservice. Same core concept: decouple request from processing, guarantee delivery, process in order.",
    detail: "Your deli counter handles hundreds of tickets. Kafka handles a whole city simultaneously. The queue model — producer, consumer, retry, DLQ — is universal across every scale.",
    enterpriseExamples: ['Apache Kafka', 'AWS SQS / SNS', 'RabbitMQ', 'Google Pub/Sub', 'Azure Service Bus'],
  },
  {
    id: 'webhooks', group: 'Pipelines & Events', icon: <Radio size={18} />, color: '#A78BFA',
    title: 'Webhooks (Event-Driven Triggers)',
    yourStack: "A tripwire that fires automatically when something happens elsewhere — Stripe payment completes, form submitted. Instead of polling, the other system calls you the moment it fires.",
    enterprise: "Called Event-Driven Architecture. AWS EventBridge, Google Pub/Sub, and Kafka are webhook patterns at planetary scale. Salesforce calls them Platform Events. The entire microservices economy runs on this pattern.",
    detail: "Every enterprise demo that auto-sends an email, triggers a Slack alert, or kicks off an approval workflow uses this exact pattern. If you built a webhook handler, you implemented the core of AWS Lambda.",
    enterpriseExamples: ['AWS EventBridge', 'Salesforce Platform Events', 'Zapier', 'Azure Event Grid'],
  },
  {
    id: 'puppeteer', group: 'Pipelines & Events', icon: <Network size={18} />, color: '#059669',
    title: 'Puppeteer (Data Ingestion)',
    yourStack: "A robot that opens a real browser, reads any page like a human, and extracts structured data — job descriptions, property records, odds. Your apply-agent uses it to fetch JDs from any URL.",
    enterprise: "Called a Data Connector. Fivetran ($150M ARR) and Airbyte exist entirely to solve this — connecting external data sources into a central warehouse. The difference: your Puppeteer is purpose-built; theirs has 300+ connectors.",
    detail: "The concept — extract external data, transform into your schema, load into your DB — is a $5B industry called the Modern Data Stack. You built one with 40 lines of code.",
    enterpriseExamples: ['Fivetran', 'Airbyte', 'Stitch', 'Talend', 'AWS Glue'],
  },
  // AI & INTELLIGENCE
  {
    id: 'multi-model', group: 'AI & Intelligence', icon: <Bot size={18} />, color: '#14B8AD',
    title: 'Claude API / Multi-Model Routing',
    yourStack: "A smart switchboard operator — receives every AI request and decides: fast cheap answer (Haiku), deep reasoning (Sonnet), time-sensitive (stream it). Routes to the right model for cost, quality, and latency.",
    enterprise: "LLM Orchestration — what Atlassian calls Rovo Intelligence, Salesforce calls Einstein AI. The ability to route work to the right model based on cost/quality/latency is a real emerging job title. Most enterprises are still designing this. You have it in production.",
    detail: "FDE roles at Anthropic, Atlassian, and ServiceNow specifically look for people who have operated multi-model systems. You did not read about it — you built and use one daily.",
    enterpriseExamples: ['Atlassian Rovo', 'Salesforce Einstein', 'ServiceNow AI', 'LangChain / LiteLLM', 'AWS Bedrock'],
  },
  {
    id: 'mcp', group: 'AI & Intelligence', icon: <Plug size={18} />, color: '#2563EB',
    title: 'MCP Protocol (AI Integration Layer)',
    yourStack: "A universal adapter plug. Instead of building a custom connector between Claude and every tool (database, file system, calendar), MCP is one standard interface — write once, connect to anything.",
    enterprise: "In enterprise this is an API Gateway or Integration Layer. MuleSoft is a $6.5B company that exists solely to connect enterprise systems using standard interfaces. MCP does this for AI natively.",
    detail: "MCP is cutting-edge. Most enterprise architects do not know what it is yet. You built it in production. In two years it will be on every Forward Deployed Engineer job description.",
    enterpriseExamples: ['Salesforce Connect', 'MuleSoft', 'AWS API Gateway', 'Azure API Management', 'Apigee'],
  },
  {
    id: 'telegram-hitl', group: 'AI & Intelligence', icon: <MessageSquare size={18} />, color: '#EF4444',
    title: 'Telegram Bot (Human-in-the-Loop)',
    yourStack: "A personal assistant who taps you on the shoulder with a job summary and gives you three buttons: Apply, Skip, Snooze. You decide. It executes — drafts the cover letter, deploys to VPS, marks applied.",
    enterprise: "HITL — Human-in-the-Loop — one of the hottest patterns in enterprise AI. Palantir, ServiceNow, and Salesforce Agentforce all sell this: AI surfaces a recommended action, human approves in one click, system executes at scale.",
    detail: "Palantir charges $5M+ to install this for defense contractors. You built the same pattern for yourself in a weekend and use it daily.",
    enterpriseExamples: ['Palantir AIP', 'Salesforce Agentforce', 'ServiceNow Now Assist', 'Glean'],
  },
  // AUTH & SECURITY
  {
    id: 'nextauth', group: 'Auth & Security', icon: <Shield size={18} />, color: '#16A34A',
    title: 'NextAuth.js / JWT (Authentication)',
    yourStack: "The front door lock and keycard system. NextAuth handles login, sessions, and role-based access. JWT is the digital keycard — a signed, expiring credential that proves who you are on every API call.",
    enterprise: "Called IAM. Okta is the dominant enterprise solution ($13B company) — SAML federation, LDAP sync, MFA enforcement, device trust, and compliance audit logs. Same concepts: tokens, sessions, scopes, refresh.",
    detail: "Every enterprise role that mentions SSO or SAML is describing this. If you understand JWT and OAuth flows, you understand 80% of what Okta does. The other 20% is compliance and directory sync.",
    enterpriseExamples: ['Okta', 'Auth0', 'Azure Active Directory', 'AWS Cognito', 'Google Identity Platform'],
  },
  {
    id: 'env-secrets', group: 'Auth & Security', icon: <Lock size={18} />, color: '#6B7280',
    title: '.env Files (Secrets Management)',
    yourStack: "A locked drawer for API keys and credentials. The .env file lives locally and on VPS, never committed to git. Apps read from it at startup so secrets never appear in code.",
    enterprise: "HashiCorp Vault — used by 70% of Fortune 500s. AWS Secrets Manager and Azure Key Vault do everything your .env does plus: automatic rotation every 30 days, audit logging of every secret access, and zero-knowledge storage.",
    detail: "The discipline you already follow — never hardcode secrets, separate dev/prod, keep out of git — is identical to enterprise security policy. Enterprise adds automation and auditability.",
    enterpriseExamples: ['HashiCorp Vault', 'AWS Secrets Manager', 'Azure Key Vault', 'GCP Secret Manager'],
  },
  // DEVOPS
  {
    id: 'github', group: 'DevOps', icon: <GitMerge size={18} />, color: '#4B5563',
    title: 'GitHub (Version Control)',
    yourStack: "A complete time machine and collaboration layer for code. Every change is tracked, every version is recoverable, and branches let you work without breaking production.",
    enterprise: "GitHub IS enterprise — Microsoft acquired it for $7.5B. Enterprise adds: branch protection, required reviews, secret scanning on every commit, SAML SSO, and legal audit trails. GitLab is the self-hosted competitor.",
    detail: "You already use the same tool. Enterprise wraps process and compliance layers around the same git primitives — no-direct-push-to-main, required approvals, automated scans.",
    enterpriseExamples: ['GitHub Enterprise', 'GitLab', 'Bitbucket', 'Azure DevOps', 'AWS CodeCommit'],
  },
  {
    id: 'deploy', group: 'DevOps', icon: <Rocket size={18} />, color: '#9333EA',
    title: 'SCP + Manual Deploy (CI/CD)',
    yourStack: "Copy files to VPS via SCP, rebuild with npm run build, restart PM2. Manual, reliable, fully controlled. You run it. It happens. You understand every step because you wrote every step.",
    enterprise: "CI/CD — Continuous Integration / Continuous Deployment. GitHub Actions automates this entire sequence: code merged to main triggers tests, build compiles, deploy fires to staging, human approves, promotes to production. Teams of 50 ship 200 times per day.",
    detail: "Your manual SCP process is the correct mental model for what CI/CD automates. Understanding each step makes enterprise pipelines instantly readable — you are automating a workflow you already own.",
    enterpriseExamples: ['GitHub Actions', 'Jenkins', 'CircleCI', 'ArgoCD', 'AWS CodePipeline'],
  },
  {
    id: 'observability', group: 'DevOps', icon: <Eye size={18} />, color: '#D97706',
    title: 'PM2 Logs / console.log (Observability)',
    yourStack: "SSH into VPS, run pm2 logs, read the stream. When something breaks, find the last thing that printed and trace back. Works perfectly at current scale.",
    enterprise: "A $5B market — Datadog, Splunk, New Relic, Grafana. They ingest every log, metric, and trace across thousands of servers in real time. Distributed tracing connects a single user request across 12 microservices. Alerting wakes an on-call engineer when error rate spikes.",
    detail: "Your console.log instinct — what happened, when, in what order — is exactly the question Datadog dashboards are built to answer. Enterprise scale requires tooling; the diagnostic thinking is identical.",
    enterpriseExamples: ['Datadog', 'Splunk', 'New Relic', 'Grafana + Prometheus', 'AWS CloudWatch'],
  },
  // COMMUNICATIONS
  {
    id: 'smtp-email', group: 'Communications', icon: <Mail size={18} />, color: '#0EA5E9',
    title: 'Brevo / SMTP (Transactional Email)',
    yourStack: "A postal worker who sends the right email at the right moment — estimate confirmations, reminders, drip sequences. Triggered by events in your app, not manually composed. Templates live in code.",
    enterprise: "Twilio SendGrid sends 100 billion emails per month. Marketo, Salesforce Marketing Cloud, and HubSpot layer CRM data on top — personalization, behavioral triggers, A/B testing, deliverability analytics. Same primitives: SMTP, templates, trigger events.",
    detail: "Every enterprise demo that auto-sends a welcome email when a lead fills a form is built on this exact stack. You have built this infrastructure for multiple real businesses.",
    enterpriseExamples: ['Twilio SendGrid', 'Marketo', 'Salesforce Marketing Cloud', 'HubSpot Email', 'AWS SES'],
  },
  {
    id: 'voice-ivr', group: 'Communications', icon: <Phone size={18} />, color: '#BE185D',
    title: 'Retell AI / IVR (Voice Automation)',
    yourStack: "AI-powered phone agents that answer calls, qualify leads, and route to the right person 24/7 — no human required. Built for Roof Works: storm leads get auto-qualified before a human sees the call.",
    enterprise: "CPaaS — Communications Platform as a Service — $17B market. Genesys Cloud and NICE CXone are the enterprise contact center platforms used by American Airlines and Bank of America. AI voice agents are the fastest-growing segment — Five9, Amazon Connect, Google CCAI all sell this for $50K+ implementations.",
    detail: "You built an AI voice workflow that enterprise vendors charge $50K+ to implement. The business value — 24/7 coverage, no missed leads, immediate response — is the exact pitch. You have the demo.",
    enterpriseExamples: ['Twilio', 'Genesys Cloud', 'NICE CXone', 'Amazon Connect', 'Google CCAI'],
  },
  // AI GOVERNANCE & FINOPS
  {
    id: 'bedrock', group: 'AI & Intelligence', icon: <Layers size={18} />, color: '#F97316',
    title: 'AWS Bedrock (Managed LLM Gateway)',
    yourStack: "You call the Anthropic API directly — one HTTP request, one API key, full control. You choose the model, set max_tokens, parse the response. Everything is explicit.",
    enterprise: "AWS Bedrock is a managed API gateway that wraps Claude, Titan, Llama, Mistral, and others behind one AWS endpoint. Adds AWS IAM permissions, CloudWatch logging, VPC private endpoints, and SOC2/HIPAA compliance by default. Enterprise uses Bedrock so AI calls never leave the AWS network.",
    detail: "Your Anthropic API call and a Bedrock call return the same Claude output. The difference is compliance, audit logging, and IAM — the infrastructure wrapper around the model call. If you can call the Anthropic API, you can call Bedrock — same SDK, different endpoint and auth.",
    enterpriseExamples: ['AWS Bedrock', 'Azure OpenAI Service', 'Google Vertex AI', 'Cloudflare AI Gateway'],
  },
  {
    id: 'ai-governance', group: 'AI & Intelligence', icon: <Shield size={18} />, color: '#DC2626',
    title: 'AI Governance (PII Redaction, Audit Logging)',
    yourStack: "You practice data minimization — the email parser drops vendor and marketing emails before they hit the DB. Every LLM action that moves an opportunity or sends outbound email creates an OutreachLog entry with timestamp and trigger. That is a lightweight audit trail.",
    enterprise: "Enterprise AI governance adds: PII scanning before any text reaches the LLM (regex + NER models strip SSNs, emails, phone numbers), structured audit logs for every model call (who called it, what prompt, what output, what action resulted), model output monitoring for drift and hallucination, and SOC2/HIPAA compliance reporting. Healthcare and finance require all of this by law.",
    detail: "The discipline is identical — data minimization, action logging, output validation. Enterprise adds automated tooling and legal compliance on top of the same principles you already apply manually.",
    enterpriseExamples: ['AWS Macie (PII scanning)', 'Presidio (open-source PII)', 'Weights & Biases', 'Arize AI', 'Truera'],
  },
  {
    id: 'ai-finops', group: 'AI & Intelligence', icon: <BarChart2 size={18} />, color: '#8B5CF6',
    title: 'AI FinOps / Token Budgeting',
    yourStack: "Every LLM call in MAX-DEPLOY logs model ID, input tokens, output tokens, and cost estimate per request. Haiku handles all automated jobs (cheap, fast). Sonnet only on-demand for quality tasks. max_tokens capped explicitly on every call. You can query actual spend by model and workflow.",
    enterprise: "At enterprise scale this becomes a full cost governance practice — per-team token budgets, showback dashboards, cost allocation by product line, automated alerts when a team exceeds their monthly LLM budget. FinOps for AI is a new discipline emerging from cloud FinOps. AWS Cost Explorer now has Bedrock cost breakdowns.",
    detail: "You already do AI FinOps — you just haven't called it that. Per-request logging, model tier routing, and explicit token caps are the same three controls enterprise teams build dashboards around.",
    enterpriseExamples: ['AWS Cost Explorer (Bedrock)', 'Helicone', 'LangSmith', 'Portkey', 'OpenMeter'],
  },
  // ARCHITECTURE & ECOSYSTEM
  {
    id: 'microservices', group: 'Architecture & Ecosystem', icon: <GitBranch size={18} />, color: '#7C3AED',
    title: 'Microservices Architecture',
    yourStack: "Your portfolio is already microservices-adjacent — each app (Roof Works, APW, CasinoComp, MAX Deploy) runs in its own PM2 process, its own Docker container, its own isolated database. They do not share code or databases. Each can be updated or restarted without touching the others.",
    enterprise: "At scale this pattern is called microservices — Netflix runs 700+ independent services, Amazon runs thousands. Each team owns one service, deploys it independently, and communicates over APIs or message queues. Enterprise adds: Kubernetes for orchestration, Istio for the service mesh, Consul for service discovery, and circuit breakers to prevent one failing service from cascading.",
    detail: "You already think in microservices — you just call them apps. Isolation, independent deployment, separate databases — those ARE the microservices principles. Enterprise adds the automation layer and the vocabulary.",
    enterpriseExamples: ['Istio (service mesh)', 'Consul (service discovery)', 'AWS App Mesh', 'Linkerd', 'Netflix Conductor'],
  },
  {
    id: 'edge-computing', group: 'Architecture & Ecosystem', icon: <Globe size={18} />, color: '#0891B2',
    title: 'Edge Computing (Cloudflare Workers)',
    yourStack: "Your apps run on one VPS in one data center. A user in Tokyo gets a response that travels across the Pacific and back — 200-400ms before a line of your code runs. That round trip is the bottleneck.",
    enterprise: "Cloudflare Workers, Vercel Edge Functions, and AWS Lambda@Edge run your code at 200+ CDN nodes worldwide. A Tokyo user gets a Tokyo response. Used for auth middleware, geolocation, A/B testing, personalization, and bot protection — all enforced at the network layer before the request ever reaches your origin server.",
    detail: "Edge is the next evolution of serverless — compute that lives at the CDN, milliseconds from every user. Your Next.js middleware already supports the edge runtime. It is the architecture behind every major platform claiming instant global performance.",
    enterpriseExamples: ['Cloudflare Workers', 'Vercel Edge Functions', 'AWS Lambda@Edge', 'Deno Deploy', 'Fastly Compute'],
  },
  {
    id: 'cloud-native', group: 'Architecture & Ecosystem', icon: <Layers size={18} />, color: '#0369A1',
    title: 'Cloud Native / CNCF Ecosystem',
    yourStack: "You run cloud-native patterns on a single server: Docker for containers, PM2 for process management, NGINX for routing, Redis for caching, PM2 logs for observability. Each piece has a direct CNCF counterpart used at enterprise scale.",
    enterprise: "The Cloud Native Computing Foundation (CNCF) manages Kubernetes, Prometheus, Grafana, Jaeger, Envoy, Helm, and 150+ open-source projects. Every enterprise cloud team uses CNCF tools. The vocabulary — Prometheus for metrics, Grafana for dashboards, Jaeger for traces, Helm for K8s package management — is the lingua franca of platform engineering globally.",
    detail: "Your stack maps 1:1: Docker → containerd, PM2 → Kubernetes, NGINX → Envoy, PM2 logs → Prometheus + Grafana. The concepts are identical. The scale and automation are what enterprise buys on top.",
    enterpriseExamples: ['Prometheus (metrics)', 'Grafana (dashboards)', 'Jaeger (tracing)', 'Envoy (proxy)', 'Helm (K8s packages)'],
  },
  {
    id: 'serverless', group: 'Architecture & Ecosystem', icon: <Zap size={18} />, color: '#B45309',
    title: 'Serverless / FaaS (Function as a Service)',
    yourStack: "Your Next.js API routes are functionally serverless — each /api/endpoint is an isolated function that runs on demand. You already write serverless code. The difference is you host it on a persistent VPS rather than a managed platform that scales to zero.",
    enterprise: "AWS Lambda, Google Cloud Functions, and Azure Functions are the serverless platforms. You deploy a function; the cloud handles scaling, availability, and billing per invocation. No server management. No idle cost. The model: event triggers function, function runs and exits. Used for webhooks, image processing, scheduled jobs, and any event-driven workload.",
    detail: "Your Next.js API routes map 1:1 to AWS Lambda. The invocation model (HTTP trigger → function executes → response) is identical. Lambda auto-scales to zero between requests; your VPS costs money idle. That is the entire trade-off.",
    enterpriseExamples: ['AWS Lambda', 'Vercel Functions', 'Google Cloud Functions', 'Azure Functions', 'Cloudflare Workers'],
  },
  {
    id: 'platform-eng', group: 'Architecture & Ecosystem', icon: <Cpu size={18} />, color: '#065F46',
    title: 'Platform Engineering (Internal Developer Platform)',
    yourStack: "MAX Deploy IS a platform — an internal developer platform you built for yourself. It abstracts the complexity of job applications, cover letters, pipeline management, and recruiter tracking behind a clean admin UI. You do not think of it that way, but that is the textbook definition of an IDP.",
    enterprise: "Platform Engineering is the fastest-growing DevOps discipline — dedicated teams that build internal tools so engineers can deploy, monitor, and operate services without touching infrastructure. Backstage (open-sourced by Spotify) is the dominant IDP framework. The philosophy: encode best practices into self-service workflows called golden paths — no one has to figure out how to deploy correctly, the platform makes the right way the only way.",
    detail: "Palantir's Foundry product is a platform engineering product. You built the same concept for a single operator. The design principles — abstract infrastructure, encode best practices, self-service UI — are identical to what enterprise platform teams build for thousands of engineers.",
    enterpriseExamples: ['Backstage (Spotify)', 'Port', 'Cortex', 'OpsLevel', 'Palantir Foundry'],
  },
];

const GROUPS = Array.from(new Set(ANALOGIES.map(a => a.group)));
const GROUP_COLORS: Record<string, string> = {
  'Infrastructure':     '#F59E0B',
  'Code & Language':    '#3178C6',
  'Data Layer':         '#8B5CF6',
  'Pipelines & Events': '#EC4899',
  'AI & Intelligence':  '#14B8AD',
  'Auth & Security':    '#16A34A',
  'DevOps':             '#9333EA',
  'Communications':            '#0EA5E9',
  'Architecture & Ecosystem':  '#7C3AED',
};

const COMPARISON = [
  { yours: 'VPS + Ubuntu',           enterprise: 'Cloud VM / EC2',                  who: 'AWS / Azure / GCP' },
  { yours: 'NGINX',                  enterprise: 'Load Balancer / CDN',              who: 'Cloudflare, AWS ALB' },
  { yours: 'PM2',                    enterprise: 'Kubernetes',                       who: 'Every major tech company' },
  { yours: 'Docker',                 enterprise: 'Container + Orchestration',        who: 'Netflix, Google, Amazon' },
  { yours: 'Next.js',                enterprise: 'Spring Boot / .NET / Django',      who: 'Goldman Sachs, Atlassian, SAP' },
  { yours: 'TypeScript',             enterprise: 'Java / C# / Go',                  who: 'All enterprise software orgs' },
  { yours: 'Tailwind CSS',           enterprise: 'Design System',                   who: 'Salesforce, IBM, Google, Shopify' },
  { yours: 'Prisma + Postgres',      enterprise: 'ORM + Enterprise DB',             who: 'Salesforce, Atlassian, SAP' },
  { yours: 'PostgreSQL',             enterprise: 'Oracle / SQL Server / Snowflake', who: 'Banks, healthcare, e-commerce' },
  { yours: 'Redis (cache)',          enterprise: 'ElastiCache / CDN Edge Cache',    who: 'Stripe, GitHub, Cloudflare' },
  { yours: 'RSS Poller + Pipeline',  enterprise: 'ETL Pipeline',                    who: 'Monte Carlo, Databricks, Snowflake' },
  { yours: 'BullMQ / Redis Queue',   enterprise: 'Kafka / SQS',                    who: 'Uber, Stripe, Netflix' },
  { yours: 'Webhooks',               enterprise: 'Event-Driven Architecture',       who: 'AWS, Salesforce, Twilio' },
  { yours: 'Puppeteer scraping',     enterprise: 'Fivetran / Airbyte connector',   who: 'Data teams everywhere' },
  { yours: 'Claude API routing',     enterprise: 'LLM Orchestration',              who: 'Atlassian, Salesforce, ServiceNow' },
  { yours: 'MCP Protocol',           enterprise: 'MuleSoft / API Gateway',          who: 'Salesforce, AWS — $6.5B market' },
  { yours: 'Telegram HITL Bot',      enterprise: 'Human-in-the-Loop AI',           who: 'Palantir, ServiceNow, Agentforce' },
  { yours: 'NextAuth.js / JWT',      enterprise: 'Okta / IAM / SSO',               who: 'Every enterprise — $13B market' },
  { yours: '.env Files',             enterprise: 'HashiCorp Vault / Secrets Mgr',  who: '70% of Fortune 500' },
  { yours: 'GitHub',                 enterprise: 'GitHub Enterprise / GitLab',     who: 'Airbus, Volkswagen, all of tech' },
  { yours: 'SCP + Manual Deploy',    enterprise: 'CI/CD Pipeline',                 who: 'GitHub Actions, Jenkins, ArgoCD' },
  { yours: 'PM2 logs / console.log', enterprise: 'Datadog / Splunk',               who: 'Every scaled engineering team' },
  { yours: 'Brevo / SMTP',          enterprise: 'Marketo / Salesforce Marketing',  who: 'Every B2B sales org' },
  { yours: 'Retell AI / IVR',       enterprise: 'Twilio / Genesys CPaaS',         who: 'Airlines, banks, insurance' },
  { yours: 'Python scripts',        enterprise: 'Python + pandas / PyTorch',       who: 'Every AI/ML company, all data teams' },
  { yours: 'SQL (psql / Prisma)',   enterprise: 'Snowflake SQL / dbt / BigQuery',  who: 'Every data team globally' },
  { yours: 'Bash / SSH commands',   enterprise: 'Shell scripting + CI automation', who: 'Every DevOps/SRE team' },
  { yours: 'Multi-app / PM2 isolation', enterprise: 'Microservices + service mesh', who: 'Netflix, Uber, Amazon' },
  { yours: 'Single VPS (central)', enterprise: 'Edge Computing (CDN-native)',       who: 'Cloudflare, Vercel, AWS' },
  { yours: 'Docker + PM2 + NGINX', enterprise: 'Cloud Native / CNCF stack',        who: 'Every enterprise cloud team' },
  { yours: 'Next.js API routes',   enterprise: 'Serverless / AWS Lambda',          who: 'AWS, Google Cloud, Azure' },
  { yours: 'MAX Deploy admin',     enterprise: 'Internal Developer Platform (IDP)', who: 'Spotify Backstage, Palantir' },
];

// ─────────────────────────────────────────────────────────────────────────────
// GAPS DATA
// ─────────────────────────────────────────────────────────────────────────────
const GAP_PRIORITY_COLOR = { high: '#EF4444', medium: '#F59E0B', low: '#6B7280' };

const GAPS: Gap[] = [
  {
    id: 'testing', name: 'Automated Testing (Jest / Playwright)', category: 'Testing', priority: 'high',
    whatItIs: "Unit tests verify individual functions work correctly; integration tests verify systems work together; E2E tests simulate real user flows in a browser. Jest and Vitest handle unit/integration; Playwright and Cypress handle browser automation.",
    whyItMatters: "Every FDE and senior engineering role asks about testing strategy. No tests is the #1 signal that code is not production-grade. Having test coverage signals you ship with confidence. Also directly applicable — your apply pipeline, craps sim, and DB writes all have testable logic.",
    examples: ['Jest', 'Vitest', 'Playwright', 'Cypress', 'Testing Library'],
    learnAt: 'Vitest docs + Playwright quickstart — both have Next.js guides (3-4 hours)',
  },
  {
    id: 'sentry', name: 'Sentry (Error Tracking)', category: 'Observability', priority: 'high',
    whatItIs: "Automatic error capture in production. When any uncaught exception fires anywhere in your app, Sentry catches it, records the full stack trace, the user who hit it, and the exact line of code — then notifies you immediately.",
    whyItMatters: "Currently you find out about errors when you happen to check PM2 logs. Sentry makes errors proactive, not reactive. It is the first real observability tool most teams add and is free for small usage. Next.js integration is a 15-minute setup.",
    examples: ['Sentry', 'Bugsnag', 'Rollbar', 'Datadog APM'],
    learnAt: 'sentry.io — Next.js SDK + free tier covers all current usage',
  },
  {
    id: 's3-storage', name: 'AWS S3 / Cloudflare R2 (Object Storage)', category: 'Storage', priority: 'high',
    whatItIs: "Cloud storage for files, images, PDFs, audio, and binary data. Instead of storing files on your VPS disk (finite and fragile), you upload to a bucket and serve via CDN URL. Infinitely scalable, replicated across regions, cheap.",
    whyItMatters: "Your IVR audio files, cover letter PDFs, and any media are currently on VPS disk — if the server fails, they go with it. Every enterprise app stores files in object storage, never on the application server. Cloudflare R2 is S3-compatible with no egress fees.",
    examples: ['AWS S3', 'Cloudflare R2', 'Backblaze B2', 'GCP Cloud Storage'],
    learnAt: 'Cloudflare R2 — S3-compatible, no egress fees, free tier 10GB',
  },
  {
    id: 'vector-db', name: 'Vector Database / pgvector (RAG)', category: 'AI / Vector', priority: 'high',
    whatItIs: "A database that stores meaning, not just text. Convert documents into embeddings (numerical vectors) and a vector DB finds the most semantically similar content. This powers RAG — AI that can search your own data instead of hallucinating.",
    whyItMatters: "Every AI product role asks about RAG. Every enterprise AI deployment that queries internal docs or customer records uses this. pgvector is a Postgres extension you can add with one migration — zero new infrastructure, works with your existing Prisma setup.",
    examples: ['pgvector (Postgres extension)', 'Pinecone', 'Weaviate', 'Qdrant', 'Chroma'],
    learnAt: 'pgvector + Prisma — one prisma migrate away from your existing stack',
  },
  {
    id: 'github-actions', name: 'GitHub Actions (CI/CD Automation)', category: 'DevOps', priority: 'high',
    whatItIs: "Automated workflows triggered by git events. Push to main: tests run automatically, build compiles, files deploy to VPS, PM2 restarts — all without touching a terminal. Defined in YAML files in your repo.",
    whyItMatters: "Currently every deploy is a manual multi-step process. GitHub Actions replaces your entire SCP + rebuild + restart sequence with one git push. It is the first thing any CTO would add to your workflow. Free for 2,000 min/month on private repos.",
    examples: ['GitHub Actions', 'CircleCI', 'Jenkins', 'GitLab CI', 'Bitbucket Pipelines'],
    learnAt: '.github/workflows/deploy.yml — 30 lines replaces manual deploy entirely',
  },
  {
    id: 'graphql', name: 'GraphQL (Client-Defined Queries)', category: 'APIs', priority: 'medium',
    whatItIs: "An alternative to REST where the client specifies exactly what data it needs in one request. One endpoint, client-defined queries, no over-fetching. The server exposes a typed schema; clients query only the fields they need.",
    whyItMatters: "Used by GitHub, Shopify, Twitter, and most large consumer APIs. You will encounter it in any Atlassian, Salesforce, or modern SaaS ecosystem. Understanding it is common FDE interview territory even if you never write it yourself.",
    examples: ['Apollo Server', 'Apollo Client', 'GraphQL Yoga', 'Hasura', 'Prisma + GraphQL'],
    learnAt: 'graphql.org official tutorial — 3 hours covers 90% of what interviews ask',
  },
  {
    id: 'opentelemetry', name: 'OpenTelemetry (Distributed Tracing)', category: 'Observability', priority: 'medium',
    whatItIs: "An open standard for capturing traces, metrics, and logs across distributed systems. A single user request is traced across every service it touches — you see exactly where latency comes from and where failures happen.",
    whyItMatters: "The enterprise observability standard. Datadog, Grafana, and New Relic all ingest OpenTelemetry data. When you talk to a monitoring company solutions engineer, this is the vocabulary. Knowing it makes you a peer in those conversations.",
    examples: ['OpenTelemetry SDK', 'Jaeger', 'Zipkin', 'Datadog', 'Grafana Tempo'],
    learnAt: 'opentelemetry.io — Next.js instrumentation docs are straightforward',
  },
  {
    id: 'terraform', name: 'Terraform / Pulumi (Infrastructure as Code)', category: 'DevOps', priority: 'medium',
    whatItIs: "Define your entire server infrastructure (VPS, DNS records, firewall rules, databases) in code files. Run one command and it builds everything reproducibly, or tears it down. Pulumi is the TypeScript-native version.",
    whyItMatters: "Your VPS config exists only in SSH history and memory. If the server dies, rebuilding is a multi-hour manual process. Terraform codifies it. Every DevOps and SRE role requires it. Pulumi maps directly to your TypeScript skills.",
    examples: ['Terraform', 'Pulumi', 'AWS CloudFormation', 'Ansible', 'OpenTofu'],
    learnAt: 'Pulumi — TypeScript-native IaC, direct path from your existing skills',
  },
  {
    id: 'posthog', name: 'PostHog / Mixpanel (Product Analytics)', category: 'Analytics', priority: 'medium',
    whatItIs: "Event tracking that tells you how users actually use your product — what pages they visit, where they drop off, what features get clicked. Not just traffic (GA4) but real behavioral data tied to user identity.",
    whyItMatters: "Every product and growth conversation in FDE interviews references analytics. Being able to say you instrumented your own product and used behavioral data to make decisions is a real differentiator. PostHog is open-source and self-hostable.",
    examples: ['PostHog', 'Mixpanel', 'Amplitude', 'Heap', 'Segment'],
    learnAt: 'PostHog — free cloud tier, Next.js integration is 10 minutes',
  },
  {
    id: 'elasticsearch', name: 'Elasticsearch / Algolia (Full-Text Search)', category: 'Search', priority: 'medium',
    whatItIs: "Search engines that go beyond SQL LIKE queries — fuzzy matching, relevance scoring, faceted filtering, typo tolerance, and millisecond response across millions of records. Standard for any product with a real search bar.",
    whyItMatters: "Algolia powers Stripe Docs, Shopify, and Twilio developer docs. Elasticsearch powers LinkedIn and GitHub search. Any FDE role at a company with a search product needs this vocabulary. Typesense is the open-source lightweight start.",
    examples: ['Algolia', 'Elasticsearch', 'Typesense', 'Meilisearch', 'AWS OpenSearch'],
    learnAt: 'Typesense — open-source, Docker-based, easiest self-host to start',
  },
  {
    id: 'langchain', name: 'LangChain / LangGraph (AI Orchestration Frameworks)', category: 'AI / Vector', priority: 'medium',
    whatItIs: "Frameworks for building complex AI pipelines — chaining LLM calls, routing between agents, managing conversation memory, tool use, and multi-step reasoning. LangGraph adds stateful graph-based agent orchestration.",
    whyItMatters: "Appears in nearly every AI engineering job description. You already do LLM orchestration manually (multi-model routing, MCP). LangChain formalizes these patterns. Even if you prefer raw API calls, you must speak this vocabulary in interviews.",
    examples: ['LangChain', 'LangGraph', 'LlamaIndex', 'Haystack', 'AutoGen'],
    learnAt: 'LangChain JS docs — maps directly to your existing TypeScript + Claude setup',
  },
  {
    id: 'snowflake-dw', name: 'Snowflake / BigQuery (Data Warehouse)', category: 'Data', priority: 'low',
    whatItIs: "Databases optimized for analytics, not transactions. Instead of Postgres (fast at row-level reads/writes), a data warehouse aggregates billions of rows in seconds — what powers every enterprise BI dashboard.",
    whyItMatters: "Monte Carlo, Databricks, dbt, and Fivetran all live in the data warehouse ecosystem. Many FDE roles at data companies require understanding this layer. If you apply to any data company, you need to speak Snowflake.",
    examples: ['Snowflake', 'Google BigQuery', 'Amazon Redshift', 'Databricks', 'DuckDB'],
    learnAt: 'Snowflake — 30-day free trial with $400 in credits to explore',
  },
  {
    id: 'metabase', name: 'Metabase / Tableau (BI & Dashboards)', category: 'Analytics', priority: 'low',
    whatItIs: "Business Intelligence tools that let non-technical users query databases and build dashboards without SQL. Metabase connects directly to Postgres and generates charts from a visual query builder.",
    whyItMatters: "Every enterprise has a BI layer. FDE roles often involve helping customers set up analytics on their data. Metabase is open-source, runs in Docker, and connects to your existing Postgres — you could have it running today.",
    examples: ['Metabase', 'Tableau', 'Looker', 'Power BI', 'Grafana'],
    learnAt: 'Metabase — Docker image, 1 docker run command, connects to existing Postgres',
  },
  {
    id: 'feature-flags', name: 'LaunchDarkly / PostHog Flags (Feature Flags)', category: 'Dev Tooling', priority: 'low',
    whatItIs: "Toggle features on/off in production without deploying code. Roll out to 5% of users first, validate it works, ramp to 100%. Instantly kill a bad feature without a hotfix.",
    whyItMatters: "Every FDE at a SaaS company uses feature flags to manage customer rollouts. LaunchDarkly is the industry standard. Understanding percentage rollouts, targeting rules, and flag evaluation is required for any role touching production deployments.",
    examples: ['LaunchDarkly', 'PostHog Feature Flags', 'Unleash', 'Flagsmith', 'AWS AppConfig'],
    learnAt: 'PostHog Flags — free, already integrates with PostHog analytics',
  },
  {
    id: 'react-native', name: 'React Native / Expo (Mobile)', category: 'Mobile', priority: 'low',
    whatItIs: "Build iOS and Android apps using React and TypeScript — the same language and patterns you already know. Expo handles the native build pipeline so you never touch Xcode or Android Studio.",
    whyItMatters: "Your Next.js + TypeScript skills transfer ~70% directly. Adding mobile opens a separate job market. Several target employers (Salesforce, Atlassian, ServiceNow) have mobile apps that FDEs configure and deploy.",
    examples: ['React Native', 'Expo', 'Capacitor', 'Flutter (Dart)', 'Ionic'],
    learnAt: 'Expo Go — a working app runs in 15 minutes using your existing React knowledge',
  },
  {
    id: 'golang', name: 'Go (Golang)', category: 'Languages', priority: 'medium',
    whatItIs: "A statically-typed compiled language from Google. Minimal syntax, extremely fast, built-in concurrency via goroutines and channels. Compiles to a single binary with no runtime — deploy by copying one file to a server.",
    whyItMatters: "Go powers Kubernetes, Docker, Terraform, Prometheus, and most of the cloud-native tooling ecosystem. The infrastructure your VPS runs on was written in Go. Many platform and infrastructure engineering roles expect it. Go servers handle 10-20x more requests than Node at the same hardware cost.",
    examples: ['Go stdlib', 'Gin (web framework)', 'gRPC', 'Cobra (CLI framework)', 'Kubernetes (written in Go)'],
    learnAt: 'go.dev/tour — official interactive tour covers the full language in 4-5 hours',
  },
  {
    id: 'rust', name: 'Rust (Systems Language)', category: 'Languages', priority: 'low',
    whatItIs: "A systems language focused on memory safety and performance. No garbage collector — safety is enforced at compile time by the borrow checker. Increasingly used in AI inference engines, WebAssembly, and anywhere C++ used to dominate.",
    whyItMatters: "Not required for FDE/AI roles today, but growing fast as a differentiator. The Python and JavaScript runtimes are being rewritten in Rust for speed. Knowing it signals serious low-level depth. Deno, Tauri, SWC, and Bun are all Rust — you encounter it more than expected.",
    examples: ['Rust stdlib', 'Axum (web)', 'Tauri (desktop)', 'SWC (TS compiler)', 'Bun (JS runtime)'],
    learnAt: 'rustlings on GitHub — interactive exercises, good after Go is comfortable',
  },
];

const GAP_GROUPS = Array.from(new Set(GAPS.map(g => g.category)));

// ─────────────────────────────────────────────────────────────────────────────
// ACRONYM DATA
// ─────────────────────────────────────────────────────────────────────────────
const ACRONYMS: AcronymEntry[] = [
  // AI & ML
  { acronym: 'LLM',      full: 'Large Language Model',                    category: 'AI & ML',          definition: "A neural network trained on massive text corpora that can generate, summarize, translate, and reason. GPT-4, Claude, and Gemini are all LLMs." },
  { acronym: 'DORA',     full: 'DevOps Research and Assessment',           category: 'AI & ML',          definition: "A framework with 4 key engineering metrics: Deployment Frequency (how often you ship), Lead Time for Changes (commit to production time), Change Failure Rate (% of deployments that cause incidents), and MTTR (Mean Time to Recovery). Elite teams deploy multiple times per day with <1hr lead time. ISHIR listed this explicitly — know all 4 metrics." },
  { acronym: 'SPACE',    full: 'Satisfaction, Performance, Activity, Communication, Efficiency', category: 'AI & ML', definition: "A developer productivity framework from GitHub/Microsoft. Contrasts with DORA: DORA measures delivery pipeline speed; SPACE measures developer experience holistically — how developers feel, what they produce, their activity, how they collaborate, and how efficiently they work. ISHIR listed both — DORA = pipeline metrics, SPACE = human-centered metrics." },
  { acronym: 'RAG',      full: 'Retrieval-Augmented Generation',          category: 'AI & ML',          definition: "Combining an LLM with a search layer over your own data. The model retrieves relevant context before generating — fixes hallucinations and bypasses training cutoffs." },
  { acronym: 'HITL',     full: 'Human-in-the-Loop',                       category: 'AI & ML',          definition: "A system where AI surfaces a recommendation and a human approves before execution. Your Telegram apply bot is a textbook HITL implementation." },
  { acronym: 'MCP',      full: 'Model Context Protocol',                  category: 'AI & ML',          definition: "Anthropic's open standard for connecting LLMs to external tools, databases, and services. The AI equivalent of USB-C — one standard plug, connects to anything." },
  { acronym: 'RLHF',     full: 'Reinforcement Learning from Human Feedback', category: 'AI & ML',      definition: "Training method where humans rate model outputs and the model learns to produce preferred responses. How ChatGPT and Claude were fine-tuned from base models." },
  { acronym: 'CoT',      full: 'Chain of Thought',                        category: 'AI & ML',          definition: "Prompting technique where you instruct the model to reason step by step before answering. Dramatically improves accuracy on math, logic, and multi-step tasks." },
  { acronym: 'FDE',      full: 'Forward Deployed Engineer',               category: 'AI & ML',          definition: "An engineer embedded directly with customers to build, configure, and optimize technical solutions on-site. Half engineer, half solutions consultant. Your primary target role." },
  { acronym: 'FDSE',     full: 'Forward Deployed Software Engineer',      category: 'AI & ML',          definition: "Palantir's term for the FDE role — engineers who live with customers for weeks or months building solutions. Now adopted broadly across AI companies." },
  { acronym: 'MLOps',    full: 'Machine Learning Operations',             category: 'AI & ML',          definition: "The practice of deploying, monitoring, and maintaining ML models in production. The DevOps equivalent for AI — pipelines, versioning, drift detection, retraining." },
  { acronym: 'NLP',      full: 'Natural Language Processing',             category: 'AI & ML',          definition: "The AI field focused on understanding and generating human language. Sentiment analysis, named entity recognition, translation, and summarization are NLP tasks." },
  { acronym: 'GPT',      full: 'Generative Pre-trained Transformer',      category: 'AI & ML',          definition: "The architecture underlying OpenAI models. 'Pre-trained' means trained on internet text; 'Transformer' is the neural network architecture invented at Google in 2017." },
  { acronym: 'AGI',      full: 'Artificial General Intelligence',         category: 'AI & ML',          definition: "Hypothetical AI that can perform any intellectual task a human can. Contrasted with narrow AI (which excels at specific tasks). Debated whether near-term or decades away." },
  { acronym: 'LoRA',     full: 'Low-Rank Adaptation',                     category: 'AI & ML',          definition: "A technique for fine-tuning LLMs efficiently — instead of retraining all parameters, LoRA updates a small adapter layer. Used to customize models cheaply." },
  { acronym: 'SFT',      full: 'Supervised Fine-Tuning',                  category: 'AI & ML',          definition: "Training a pre-trained model on labeled examples to specialize it for a task. Step 1 in the ChatGPT training pipeline — teach the model to follow instructions." },
  { acronym: 'VDB',      full: 'Vector Database',                         category: 'AI & ML',          definition: "A database that stores numerical embeddings (meanings) rather than text. Powers semantic search and RAG — finds similar content by meaning, not exact string match." },
  { acronym: 'AIOps',    full: 'AI for IT Operations',                    category: 'AI & ML',          definition: "Using AI to automate infrastructure monitoring, anomaly detection, and incident response. Datadog, Splunk, and PagerDuty are moving heavily into AIOps." },
  { acronym: 'ICL',      full: 'In-Context Learning',                     category: 'AI & ML',          definition: "Teaching an LLM via examples in the prompt rather than retraining it. Few-shot prompting (give 3 examples then ask) is a form of ICL." },
  { acronym: 'DPO',      full: 'Direct Preference Optimization',          category: 'AI & ML',          definition: "A simpler alternative to RLHF for fine-tuning LLMs on human preferences. Trains the model directly on preferred vs. rejected response pairs without a reward model." },

  // Development
  { acronym: 'API',      full: 'Application Programming Interface',       category: 'Development',       definition: "A defined contract for how two software systems talk to each other. When your app calls Stripe, it uses Stripe's API — a set of URLs that return predictable data." },
  { acronym: 'REST',     full: 'Representational State Transfer',         category: 'Development',       definition: "An architectural style for APIs using standard HTTP verbs (GET, POST, PUT, DELETE) and URLs to represent resources. The dominant web API design pattern." },
  { acronym: 'CRUD',     full: 'Create, Read, Update, Delete',            category: 'Development',       definition: "The four fundamental database operations. Every admin panel, API, and data layer you build is some combination of these four actions." },
  { acronym: 'SDK',      full: 'Software Development Kit',                category: 'Development',       definition: "A library that wraps an API and provides language-native functions. The Stripe SDK means you call stripe.charges.create() instead of building HTTP requests manually." },
  { acronym: 'CLI',      full: 'Command Line Interface',                  category: 'Development',       definition: "A terminal-based program you control by typing commands. npm, git, prisma, pm2 — all CLIs. The alternative to a graphical user interface (GUI)." },
  { acronym: 'ORM',      full: 'Object-Relational Mapping',               category: 'Development',       definition: "A library that lets you interact with a database using code objects rather than raw SQL. Prisma is your ORM — it translates TypeScript calls into SQL automatically." },
  { acronym: 'SSR',      full: 'Server-Side Rendering',                   category: 'Development',       definition: "Generating HTML on the server before sending to the browser. Faster first page load, better SEO. Next.js does SSR by default for server components." },
  { acronym: 'SSG',      full: 'Static Site Generation',                  category: 'Development',       definition: "Pre-building all HTML at build time so no server computation is needed on each request. Fastest possible delivery — files served directly from CDN." },
  { acronym: 'SPA',      full: 'Single Page Application',                 category: 'Development',       definition: "A web app that loads once and navigates without full page reloads. React apps without SSR are SPAs — JavaScript updates the page in place." },
  { acronym: 'CI/CD',    full: 'Continuous Integration / Continuous Deployment', category: 'Development', definition: "Automating the build, test, and deploy sequence. Every code merge triggers automated tests and deployment. GitHub Actions is your path to CI/CD." },
  { acronym: 'TDD',      full: 'Test-Driven Development',                 category: 'Development',       definition: "Writing tests before writing code. Red → Green → Refactor. Forces you to think about interfaces before implementation. Common in senior engineering interviews." },
  { acronym: 'DDD',      full: 'Domain-Driven Design',                    category: 'Development',       definition: "Structuring code around the business domain rather than technical concerns. Entities, value objects, aggregates, and bounded contexts are DDD vocabulary." },
  { acronym: 'CQRS',     full: 'Command Query Responsibility Segregation', category: 'Development',      definition: "Separating the models for reading data (queries) and writing data (commands). Enables separate scaling, caching, and optimization for reads vs. writes." },
  { acronym: 'BFF',      full: 'Backend for Frontend',                    category: 'Development',       definition: "A dedicated backend service tailored to a specific frontend (mobile app, web app). Instead of one API serving everything, each frontend gets its own API optimized for its needs." },
  { acronym: 'PWA',      full: 'Progressive Web App',                     category: 'Development',       definition: "A web app that installs on your home screen and works offline. Uses Service Workers to cache assets. Bridging the gap between web and native mobile." },
  { acronym: 'gRPC',     full: 'Google Remote Procedure Call',            category: 'Development',       definition: "A high-performance alternative to REST using Protocol Buffers. Used internally at Google, Netflix, and for microservice-to-microservice communication where speed matters." },
  { acronym: 'MVC',      full: 'Model-View-Controller',                   category: 'Development',       definition: "Architectural pattern separating data (Model), UI (View), and logic (Controller). Rails, Django, and Spring Boot are all MVC frameworks." },
  { acronym: 'ISR',      full: 'Incremental Static Regeneration',         category: 'Development',       definition: "Next.js feature that rebuilds static pages in the background after a time interval without a full redeploy. Best of SSG speed and SSR freshness." },

  // Infrastructure & Cloud
  { acronym: 'VPS',      full: 'Virtual Private Server',                  category: 'Infrastructure',    definition: "A slice of a physical server running your own OS instance. More control than shared hosting, less expensive than a dedicated server. Your 72.60.43.168 is a VPS." },
  { acronym: 'VM',       full: 'Virtual Machine',                         category: 'Infrastructure',    definition: "Software that emulates a complete computer. Docker runs Linux containers on a Windows VM on a physical server — virtualization stacked on virtualization." },
  { acronym: 'CDN',      full: 'Content Delivery Network',                category: 'Infrastructure',    definition: "A global network of servers that caches your static assets (images, JS, CSS) close to users. Cloudflare is a CDN — it delivers content from the nearest data center, not your VPS." },
  { acronym: 'DNS',      full: 'Domain Name System',                      category: 'Infrastructure',    definition: "The internet's phone book — translates domain names (maxevdigital.com) into IP addresses (72.60.43.168). A records, CNAMEs, MX records are all DNS configuration." },
  { acronym: 'IaC',      full: 'Infrastructure as Code',                  category: 'Infrastructure',    definition: "Defining server infrastructure in code files rather than manual configuration. Terraform and Pulumi let you spin up and tear down entire environments with one command." },
  { acronym: 'GitOps',   full: 'Git as the Source of Truth for Operations', category: 'Infrastructure',  definition: "A deployment model where the desired state of your infrastructure and applications is stored in Git. A tool (ArgoCD, Flux) watches the repo and automatically applies changes to the cluster. If Git says 3 replicas, Kubernetes runs 3. Pull request = change request for production. The enterprise upgrade to your manual SCP deploy." },
  { acronym: 'SRE',      full: 'Site Reliability Engineering',            category: 'Infrastructure',    definition: "Google's approach to operations — applying software engineering to infrastructure problems. SRE teams own uptime, on-call rotations, and reliability metrics (SLOs, SLAs)." },
  { acronym: 'HA',       full: 'High Availability',                       category: 'Infrastructure',    definition: "System design that minimizes downtime. An HA setup has no single point of failure — if one server dies, another takes over automatically. Typically targeting 99.9%+ uptime." },
  { acronym: 'DR',       full: 'Disaster Recovery',                       category: 'Infrastructure',    definition: "The process of restoring systems after a catastrophic failure. DR plans define RPO (how much data loss is acceptable) and RTO (how fast must systems be back online)." },
  { acronym: 'RPO',      full: 'Recovery Point Objective',                category: 'Infrastructure',    definition: "The maximum acceptable amount of data loss in a disaster — measured in time. RPO of 1 hour means your backups run at least hourly. Zero RPO means real-time replication." },
  { acronym: 'RTO',      full: 'Recovery Time Objective',                 category: 'Infrastructure',    definition: "How quickly systems must be restored after a failure. RTO of 4 hours means customers can tolerate 4 hours of downtime. Zero RTO requires instant failover." },
  { acronym: 'APM',      full: 'Application Performance Monitoring',      category: 'Infrastructure',    definition: "Tools that track response times, error rates, and resource usage across your application. Datadog APM, New Relic, and Dynatrace are the main players." },
  { acronym: 'SLA',      full: 'Service Level Agreement',                 category: 'Infrastructure',    definition: "A contractual commitment to a customer about uptime and performance. AWS commits to 99.99% uptime for EC2 — if they miss it, you get credits." },
  { acronym: 'SLO',      full: 'Service Level Objective',                 category: 'Infrastructure',    definition: "An internal target for reliability — the goal your SRE team tries to hit. A 99.9% SLO means you budget for 8.7 hours of downtime per year." },
  { acronym: 'MTTR',     full: 'Mean Time To Recovery',                   category: 'Infrastructure',    definition: "The average time to restore service after an incident. Lower MTTR means your on-call process and runbooks work well. Key SRE metric." },
  { acronym: 'K8s',      full: 'Kubernetes',                              category: 'Infrastructure',    definition: "The abbreviation drops 'ubernete' (8 letters) leaving K and s. The dominant container orchestration platform. The enterprise upgrade to PM2 at massive scale." },
  { acronym: 'TTL',      full: 'Time To Live',                            category: 'Infrastructure',    definition: "How long a cached value is valid before it must be refreshed. DNS TTL of 3600 means records are cached for 1 hour. Redis TTL expires a key automatically." },

  // Security
  { acronym: 'IAM',      full: 'Identity and Access Management',          category: 'Security',          definition: "The system that controls who can access what. Okta is IAM for enterprise employees. AWS IAM controls which services and people can access AWS resources." },
  { acronym: 'SSO',      full: 'Single Sign-On',                          category: 'Security',          definition: "Log in once, access everything. Employees authenticate to Okta once and are automatically authenticated to Slack, GitHub, Salesforce, etc. without re-entering credentials." },
  { acronym: 'MFA',      full: 'Multi-Factor Authentication',             category: 'Security',          definition: "Requiring more than one proof of identity to log in — typically password + phone code (TOTP app or SMS). Dramatically reduces account takeover risk." },
  { acronym: 'JWT',      full: 'JSON Web Token',                          category: 'Security',          definition: "A signed, base64-encoded credential containing identity claims. Your auth system issues JWTs on login; the app verifies the signature on every API call without a DB lookup." },
  { acronym: 'OAuth',    full: 'Open Authorization',                      category: 'Security',          definition: "A standard for delegated access — 'Log in with Google' uses OAuth. The user grants an app permission to act on their behalf without sharing their password." },
  { acronym: 'SAML',     full: 'Security Assertion Markup Language',      category: 'Security',          definition: "An XML-based standard for SSO between enterprise systems. When a company says 'we support SAML,' they mean their Okta/AD can authenticate users for your app." },
  { acronym: 'RBAC',     full: 'Role-Based Access Control',               category: 'Security',          definition: "Assigning permissions to roles (Admin, Editor, Viewer) rather than individual users. Users inherit permissions by being assigned a role. The standard access control model." },
  { acronym: 'LDAP',     full: 'Lightweight Directory Access Protocol',   category: 'Security',          definition: "A protocol for querying directory services like Active Directory. Enterprise user accounts, group memberships, and org structure live in LDAP/AD. Okta syncs from it." },
  { acronym: 'OWASP',    full: 'Open Web Application Security Project',   category: 'Security',          definition: "Non-profit that publishes the OWASP Top 10 — the most critical web application security vulnerabilities. The bible of AppSec. Every security conversation references it." },
  { acronym: 'XSS',      full: 'Cross-Site Scripting',                    category: 'Security',          definition: "An attack where malicious scripts are injected into web pages and executed in other users' browsers. OWASP Top 10 staple. React/JSX escapes output by default to prevent it." },
  { acronym: 'CSRF',     full: 'Cross-Site Request Forgery',              category: 'Security',          definition: "Tricking a logged-in user into unknowingly submitting a request to another site. Prevented with CSRF tokens — a random value the server issues and checks on state-changing requests." },
  { acronym: 'MITM',     full: 'Man-in-the-Middle',                       category: 'Security',          definition: "An attack where a third party intercepts communication between two parties. HTTPS/TLS prevents MITM by encrypting traffic and verifying server identity via certificates." },
  { acronym: 'DDoS',     full: 'Distributed Denial of Service',           category: 'Security',          definition: "Flooding a server with traffic from thousands of machines until it cannot serve legitimate users. Cloudflare's primary value proposition is absorbing DDoS attacks." },
  { acronym: 'WAF',      full: 'Web Application Firewall',                category: 'Security',          definition: "A reverse proxy that filters malicious HTTP traffic before it reaches your app. Blocks SQL injection, XSS, bots, and suspicious patterns. Cloudflare WAF is the most common." },
  { acronym: 'SOC 2',    full: 'Service Organization Control 2',          category: 'Security',          definition: "A security audit standard that certifies a company properly protects customer data. Required by most enterprise customers before signing SaaS contracts. Type II covers 6+ months." },
  { acronym: 'SAST',     full: 'Static Application Security Testing',     category: 'Security',          definition: "Scanning source code for security vulnerabilities without running it. GitHub's CodeQL and Snyk are SAST tools — they flag insecure patterns at the code level." },
  { acronym: 'CVE',      full: 'Common Vulnerabilities and Exposures',    category: 'Security',          definition: "A standardized identifier for publicly known security flaws. CVE-2021-44228 is the Log4Shell vulnerability. Snyk alerts when your dependencies have known CVEs." },
  { acronym: 'TLS',      full: 'Transport Layer Security',                category: 'Security',          definition: "The cryptographic protocol that powers HTTPS. TLS encrypts data in transit and authenticates the server. SSL is the older name — technically you always use TLS now." },
  { acronym: 'PKI',      full: 'Public Key Infrastructure',               category: 'Security',          definition: "The system of certificates, certificate authorities, and key management that underpins HTTPS. When you see the padlock in a browser, PKI is verifying the site's identity." },

  // Databases & Data
  { acronym: 'SQL',      full: 'Structured Query Language',               category: 'Databases & Data',  definition: "The standard language for querying relational databases. SELECT, INSERT, UPDATE, DELETE, JOIN — every relational database (Postgres, MySQL, Oracle) uses SQL." },
  { acronym: 'NoSQL',    full: 'Not Only SQL',                            category: 'Databases & Data',  definition: "Databases that don't use the relational model — MongoDB (documents), Redis (key-value), Cassandra (wide-column), Neo4j (graph). Trades consistency for flexibility or scale." },
  { acronym: 'ACID',     full: 'Atomicity, Consistency, Isolation, Durability', category: 'Databases & Data', definition: "The four properties that guarantee valid database transactions. Postgres is fully ACID. MongoDB sacrificed some ACID properties for horizontal scale. Banks require full ACID." },
  { acronym: 'OLTP',     full: 'Online Transaction Processing',           category: 'Databases & Data',  definition: "Databases optimized for many small reads and writes — your Postgres handling requests in real time. Fast row-level operations. Contrasted with OLAP (analytics)." },
  { acronym: 'OLAP',     full: 'Online Analytical Processing',            category: 'Databases & Data',  definition: "Databases optimized for aggregating large amounts of data for reporting. Snowflake, BigQuery, Redshift. Slow to insert, extremely fast to aggregate millions of rows." },
  { acronym: 'ETL',      full: 'Extract, Transform, Load',               category: 'Databases & Data',  definition: "Moving data from source systems into a data warehouse. Extract from APIs/DBs, transform to match the target schema, load into Snowflake/BigQuery. Your RSS pipeline is ETL." },
  { acronym: 'ELT',      full: 'Extract, Load, Transform',               category: 'Databases & Data',  definition: "Modern variant of ETL — load raw data first, transform inside the warehouse using SQL. Enabled by cheap compute in Snowflake/BigQuery. dbt is the T in ELT." },
  { acronym: 'DWH',      full: 'Data Warehouse',                         category: 'Databases & Data',  definition: "A central repository of integrated data from multiple sources, optimized for analytics. Snowflake, Redshift, and BigQuery are the dominant data warehouses." },
  { acronym: 'CAP',      full: 'Consistency, Availability, Partition tolerance', category: 'Databases & Data', definition: "A theorem stating distributed systems can only guarantee two of three properties simultaneously. Postgres prioritizes Consistency + Availability. DynamoDB prioritizes Availability + Partition tolerance." },
  { acronym: 'IOPS',     full: 'Input/Output Operations Per Second',      category: 'Databases & Data',  definition: "A measure of storage performance. AWS RDS pricing tiers are defined by IOPS — how many reads/writes per second your database volume can handle before it bottlenecks." },

  // APIs & Messaging
  { acronym: 'JSON',     full: 'JavaScript Object Notation',              category: 'APIs & Messaging',  definition: "The universal data format for web APIs. Human-readable key-value pairs. When your app calls any REST API, the response comes back as JSON." },
  { acronym: 'YAML',     full: "YAML Ain't Markup Language",              category: 'APIs & Messaging',  definition: "A human-readable data serialization format used for configuration files. GitHub Actions workflows, Docker Compose, and Kubernetes manifests are all written in YAML." },
  { acronym: 'AMQP',     full: 'Advanced Message Queuing Protocol',       category: 'APIs & Messaging',  definition: "The protocol underlying RabbitMQ. Defines how messages are routed, acknowledged, and stored in a message broker. BullMQ/Redis uses a simpler model; AMQP is more formal." },
  { acronym: 'WebSocket', full: 'WebSocket Protocol',                     category: 'APIs & Messaging',  definition: "A persistent two-way connection between browser and server. Enables real-time features like live chat, collaborative editing, and live dashboards without polling." },
  { acronym: 'SSE',      full: 'Server-Sent Events',                      category: 'APIs & Messaging',  definition: "A one-way streaming connection from server to browser. Claude's streaming API uses SSE — the server pushes tokens as they are generated without the client re-requesting." },
  { acronym: 'MQTT',     full: 'Message Queuing Telemetry Transport',     category: 'APIs & Messaging',  definition: "A lightweight pub/sub protocol designed for IoT devices and constrained networks. Used in smart home devices, industrial sensors, and anything that needs minimal bandwidth." },

  // Business & Revenue
  { acronym: 'ARR',      full: 'Annual Recurring Revenue',                category: 'Business',          definition: "The annualized value of all subscription contracts. The primary metric for SaaS company health. $1M ARR is often cited as a startup milestone." },
  { acronym: 'MRR',      full: 'Monthly Recurring Revenue',               category: 'Business',          definition: "ARR divided by 12. The monthly equivalent of recurring subscription income. Your Career OS dashboard tracks MRR from active client contracts." },
  { acronym: 'LTV',      full: 'Lifetime Value',                          category: 'Business',          definition: "The total revenue a customer generates over their entire relationship. LTV vs. CAC is the fundamental SaaS unit economics test — LTV must be 3x+ CAC to be viable." },
  { acronym: 'CAC',      full: 'Customer Acquisition Cost',               category: 'Business',          definition: "The total cost to acquire one customer — ads, sales time, onboarding. SaaS health check: CAC should be recoverable within 12 months of subscription revenue." },
  { acronym: 'NPS',      full: 'Net Promoter Score',                      category: 'Business',          definition: "A customer loyalty metric. Ask 'How likely are you to recommend us? 0-10.' Promoters (9-10) minus Detractors (0-6) = NPS. Apple NPS is ~72. Anything above 50 is excellent." },
  { acronym: 'NRR',      full: 'Net Revenue Retention',                   category: 'Business',          definition: "Revenue from existing customers at end of period vs. start, including expansions and churn. NRR > 100% means customers grow faster than they churn. The best SaaS companies hit 130%+." },
  { acronym: 'ACV',      full: 'Annual Contract Value',                   category: 'Business',          definition: "The value of a customer contract normalized to one year. A 3-year $300K deal is $100K ACV. Used to compare deals of different lengths apples-to-apples." },
  { acronym: 'CRM',      full: 'Customer Relationship Management',        category: 'Business',          definition: "Software that tracks customer interactions, deals, and relationships. Salesforce is the dominant enterprise CRM. HubSpot is the mid-market leader." },
  { acronym: 'ERP',      full: 'Enterprise Resource Planning',            category: 'Business',          definition: "Software that integrates core business processes — finance, HR, supply chain, manufacturing. SAP and Oracle ERP run the back office of most Fortune 500 companies." },
  { acronym: 'ITSM',     full: 'IT Service Management',                   category: 'Business',          definition: "The framework for managing IT services — ticketing, change management, incident response. ServiceNow is the dominant ITSM platform. Think: internal IT help desk at enterprise scale." },
  { acronym: 'SaaS',     full: 'Software as a Service',                   category: 'Business',          definition: "Software delivered via subscription over the internet. Salesforce, Slack, GitHub — you pay monthly and they handle the infrastructure. Your Career OS is a SaaS product." },
  { acronym: 'PaaS',     full: 'Platform as a Service',                   category: 'Business',          definition: "Cloud platforms that provide the infrastructure layer so developers focus only on code. Heroku, Vercel, and Railway are PaaS — deploy your app without managing servers." },
  { acronym: 'IaaS',     full: 'Infrastructure as a Service',             category: 'Business',          definition: "Raw cloud compute, storage, and networking rented on-demand. AWS EC2, GCP Compute Engine, Azure VMs are IaaS — you manage the OS and above, they manage the hardware." },
  { acronym: 'KPI',      full: 'Key Performance Indicator',               category: 'Business',          definition: "A measurable value that demonstrates how effectively objectives are being achieved. Applied AI Engineer KPIs might be: deployments per quarter, customer time-to-value, adoption rate." },
  { acronym: 'OKR',      full: 'Objectives and Key Results',              category: 'Business',          definition: "Goal-setting framework. Objective: 'Become the leading FDE in DFW.' Key Results: '5 FDE roles applied per week, 3 technical certifications earned, 1 FDE job offer by Q4.'" },
  { acronym: 'TAM',      full: 'Total Addressable Market',                category: 'Business',          definition: "The total revenue opportunity if you captured 100% of a market. Enterprise AI TAM is often cited at $1T+. Investors and BD teams use TAM to size opportunities." },
  { acronym: 'AE',       full: 'Account Executive',                       category: 'Business',          definition: "The salesperson who closes deals. At enterprise companies, AEs and FDEs/SEs work together — AE owns the relationship, FDE/SE owns the technical win." },
  { acronym: 'SE',       full: 'Solutions Engineer / Sales Engineer',     category: 'Business',          definition: "The technical counterpart to the AE — demonstrates the product, builds POCs, answers technical objections, and owns the technical validation. One of your primary target titles." },
  { acronym: 'CSM',      full: 'Customer Success Manager',                category: 'Business',          definition: "The post-sale relationship owner. Ensures customers adopt the product, hit their goals, renew, and expand. Contrasted with Sales (pre-sale) — CSM owns value realization." },
  { acronym: 'POC',      full: 'Proof of Concept',                        category: 'Business',          definition: "A limited implementation built to validate that a solution works before full investment. FDEs build POCs — a working prototype that proves the approach to a customer in days, not months." },
  { acronym: 'RFP',      full: 'Request for Proposal',                    category: 'Business',          definition: "A formal document a company sends to vendors asking them to propose a solution. Government and large enterprise procurement always involves RFPs. SE teams respond to them." },
  { acronym: 'SOW',      full: 'Statement of Work',                       category: 'Business',          definition: "A contract document that defines the scope, deliverables, timeline, and cost of an engagement. Professional services teams (where FDEs often sit) work from SOWs." },
  { acronym: 'TAM',      full: 'Total Addressable Market',                category: 'Business',          definition: "The total revenue opportunity available if you captured 100% of a given market. Investors and BD teams use TAM to size opportunities before investing resources." },
];

// deduplicate acronyms
const ACRONYM_CATS = Array.from(new Set(ACRONYMS.map(a => a.category)));

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const [tab, setTab] = useState<TabId>('analogies');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acronymSearch, setAcronymSearch] = useState('');
  const [acronymCat, setAcronymCat] = useState('All');

  const dim = 'rgba(255,255,255,0.35)';
  const bd = 'rgba(255,255,255,0.07)';

  const filteredAcronyms = useMemo(() => {
    const q = acronymSearch.toLowerCase().trim();
    return ACRONYMS.filter(a => {
      const matchesCat = acronymCat === 'All' || a.category === acronymCat;
      const matchesSearch = !q || a.acronym.toLowerCase().includes(q) || a.full.toLowerCase().includes(q) || a.definition.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [acronymSearch, acronymCat]);

  const TABS: { id: TabId; label: string; count: string }[] = [
    { id: 'analogies', label: 'Stack Analogies', count: String(ANALOGIES.length) },
    { id: 'gaps',      label: "What's Missing",  count: String(GAPS.length) },
    { id: 'acronyms',  label: 'Acronym Guide',   count: String(ACRONYMS.length) },
  ];

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <BookOpen size={22} color="#2563EB" />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFF', lineHeight: 1 }}>Learn</div>
        </div>
        <p style={{ fontSize: '0.78rem', color: dim, maxWidth: 600 }}>
          Stack analogies, gaps to close, and a searchable acronym reference for every technical conversation.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 28, borderBottom: `1px solid ${bd}` }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '9px 18px', fontSize: '0.78rem', fontWeight: 600,
              color: tab === t.id ? '#2563EB' : 'rgba(255,255,255,0.4)',
              borderBottom: tab === t.id ? '2px solid #2563EB' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.label}
            <span style={{ fontSize: '0.6rem', background: tab === t.id ? '#2563EB22' : 'rgba(255,255,255,0.06)', color: tab === t.id ? '#60A5FA' : '#4B5563', padding: '1px 6px', borderRadius: 10 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: ANALOGIES ───────────────────────────────────────────────────── */}
      {tab === 'analogies' && (
        <div>
          <div style={{ marginBottom: 24, padding: '14px 18px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#60A5FA', marginBottom: 6 }}>Key Insight</div>
            <p style={{ fontSize: '0.78rem', color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
              You have not built toy versions of enterprise systems. You have built the{' '}
              <strong style={{ color: '#E2E8F0' }}>same systems at smaller scale using identical concepts</strong>.
              The gap is production experience at Fortune 500 scale — which is exactly what the certifications and FDE engagements close.
            </p>
          </div>

          {GROUPS.map(group => (
            <div key={group} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: GROUP_COLORS[group] ?? '#6B7280', flexShrink: 0 }} />
                <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GROUP_COLORS[group] ?? '#6B7280' }}>{group}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ANALOGIES.filter(a => a.group === group).map(a => {
                  const isOpen = expanded === a.id;
                  return (
                    <div key={a.id} style={{ background: '#111', border: `1px solid ${isOpen ? a.color + '40' : bd}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                      <div style={{ height: 2, background: a.color }} />
                      <button onClick={() => setExpanded(isOpen ? null : a.id)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                        <span style={{ color: a.color, flexShrink: 0 }}>{a.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#E2E8F0', flex: 1 }}>{a.title}</span>
                        <span style={{ color: dim, flexShrink: 0 }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                      </button>
                      {isOpen && (
                        <div style={{ padding: '0 16px 16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div style={{ background: '#0D1624', border: `1px solid ${a.color}20`, borderRadius: 8, padding: '12px 14px' }}>
                              <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: a.color, marginBottom: 6 }}>Your Stack</div>
                              <p style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>{a.yourStack}</p>
                            </div>
                            <div style={{ background: '#0D1624', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                              <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 6 }}>Enterprise Equivalent</div>
                              <p style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>{a.enterprise}</p>
                            </div>
                          </div>
                          <div style={{ background: `${a.color}08`, border: `1px solid ${a.color}20`, borderRadius: 7, padding: '10px 12px', marginBottom: 10 }}>
                            <p style={{ fontSize: '0.75rem', color: '#CBD5E1', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{a.detail}</p>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: dim }}>Enterprise tools:</span>
                            {a.enterpriseExamples.map(ex => (
                              <span key={ex} style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 4, background: '#1E293B', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }}>{ex}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick ref table */}
          <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#60A5FA', marginBottom: 12 }}>Quick Reference</div>
          <div style={{ background: '#111', border: `1px solid ${bd}`, borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${bd}` }}>
                  {['Your Stack', 'Enterprise Name', 'Who Uses It'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: dim, fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.yours} style={{ borderBottom: i < COMPARISON.length - 1 ? `1px solid ${bd}` : 'none' }}>
                    <td style={{ padding: '9px 14px', color: '#E2E8F0', fontWeight: 600 }}>{row.yours}</td>
                    <td style={{ padding: '9px 14px', color: '#60A5FA' }}>{row.enterprise}</td>
                    <td style={{ padding: '9px 14px', color: '#6B7280', fontSize: '0.7rem' }}>{row.who}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: GAPS ────────────────────────────────────────────────────────── */}
      {tab === 'gaps' && (
        <div>
          <div style={{ marginBottom: 24, padding: '14px 18px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F87171', marginBottom: 6 }}>Gap Analysis</div>
            <p style={{ fontSize: '0.78rem', color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
              Common industry stacks you have not yet incorporated. Prioritized by how often they appear in FDE/AI Engineer job descriptions and how fast they close the gap with enterprise candidates.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {(['high', 'medium', 'low'] as const).map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: GAP_PRIORITY_COLOR[p] }} />
                <span style={{ fontSize: '0.68rem', color: dim, textTransform: 'capitalize' }}>{p} priority ({GAPS.filter(g => g.priority === p).length})</span>
              </div>
            ))}
          </div>

          {GAP_GROUPS.map(cat => (
            <div key={cat} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 10 }}>{cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {GAPS.filter(g => g.category === cat).map(gap => {
                  const isOpen = expanded === gap.id;
                  const pc = GAP_PRIORITY_COLOR[gap.priority];
                  return (
                    <div key={gap.id} style={{ background: '#111', border: `1px solid ${isOpen ? pc + '40' : bd}`, borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: 2, background: pc }} />
                      <button onClick={() => setExpanded(isOpen ? null : gap.id)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                        <AlertTriangle size={14} color={pc} style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#E2E8F0', flex: 1 }}>{gap.name}</span>
                        <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: 10, background: pc + '20', color: pc, textTransform: 'capitalize', fontWeight: 700 }}>{gap.priority}</span>
                        <span style={{ color: dim, flexShrink: 0 }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                      </button>
                      {isOpen && (
                        <div style={{ padding: '0 16px 16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div style={{ background: '#0D1624', borderRadius: 8, padding: '12px 14px', border: `1px solid ${pc}20` }}>
                              <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: pc, marginBottom: 6 }}>What it is</div>
                              <p style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>{gap.whatItIs}</p>
                            </div>
                            <div style={{ background: '#0D1624', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 6 }}>Why it matters</div>
                              <p style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>{gap.whyItMatters}</p>
                            </div>
                          </div>
                          <div style={{ background: `${pc}08`, border: `1px solid ${pc}20`, borderRadius: 7, padding: '10px 12px', marginBottom: 10 }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', color: pc, letterSpacing: '0.1em' }}>Start here: </span>
                            <span style={{ fontSize: '0.75rem', color: '#CBD5E1' }}>{gap.learnAt}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: dim }}>Tools:</span>
                            {gap.examples.map(ex => (
                              <span key={ex} style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 4, background: '#1E293B', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }}>{ex}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: ACRONYMS ────────────────────────────────────────────────────── */}
      {tab === 'acronyms' && (
        <div>
          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
              <input
                type="text"
                placeholder="Search acronyms, full names, definitions..."
                value={acronymSearch}
                onChange={e => setAcronymSearch(e.target.value)}
                style={{
                  width: '100%', background: '#111', border: `1px solid ${bd}`, borderRadius: 8,
                  padding: '8px 10px 8px 30px', fontSize: '0.78rem', color: '#E2E8F0', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['All', ...ACRONYM_CATS].map(cat => (
                <button
                  key={cat}
                  onClick={() => setAcronymCat(cat)}
                  style={{
                    background: acronymCat === cat ? '#2563EB' : '#111',
                    border: `1px solid ${acronymCat === cat ? '#2563EB' : bd}`,
                    borderRadius: 6, padding: '5px 10px', fontSize: '0.68rem', fontWeight: 600,
                    color: acronymCat === cat ? '#fff' : '#6B7280', cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '0.68rem', color: dim, marginBottom: 14 }}>
            {filteredAcronyms.length} of {ACRONYMS.length} entries
          </div>

          {filteredAcronyms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#4B5563', fontSize: '0.78rem' }}>No matches for "{acronymSearch}"</div>
          ) : (
            <div style={{ background: '#111', border: `1px solid ${bd}`, borderRadius: 10, overflow: 'hidden' }}>
              {filteredAcronyms.map((entry, i) => (
                <div
                  key={`${entry.acronym}-${i}`}
                  style={{ padding: '12px 16px', borderBottom: i < filteredAcronyms.length - 1 ? `1px solid ${bd}` : 'none', display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, alignItems: 'start' }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#E2E8F0', fontFamily: 'var(--font-mono, monospace)' }}>{entry.acronym}</div>
                    <div style={{ fontSize: '0.58rem', color: '#4B5563', marginTop: 2, padding: '1px 5px', background: '#1E293B', borderRadius: 3, display: 'inline-block' }}>{entry.category}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#60A5FA', marginBottom: 3 }}>{entry.full}</div>
                    <div style={{ fontSize: '0.73rem', color: '#94A3B8', lineHeight: 1.55 }}>{entry.definition}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
