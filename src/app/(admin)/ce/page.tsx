'use client';

import { useState, useMemo } from 'react';
import { ExternalLink, CheckCircle, Clock, DollarSign, Wifi, Search, GraduationCap, Star } from 'lucide-react';

type Status = 'completed' | 'in_progress' | 'planned';
type Category = 'AI & Agentic' | 'Cloud' | 'Enterprise / CRM' | 'APIs & Dev Tools' | 'Analytics & BI' | 'Full Stack';

interface Course {
  id: string;
  name: string;
  provider: string;
  url: string;
  duration: string;
  costDisplay: string;
  free: boolean;
  category: Category;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: Status;
  description: string;
  bestFor?: string[];
  highlight?: boolean;
}

const CAT_COLOR: Record<Category, string> = {
  'AI & Agentic':     '#14B8AD',
  'Cloud':            '#3B82F6',
  'Enterprise / CRM': '#8B5CF6',
  'APIs & Dev Tools': '#EC4899',
  'Analytics & BI':   '#F59E0B',
  'Full Stack':       '#EA580C',
};

const STATUS_COLOR: Record<Status, string> = {
  completed:   '#14B8AD',
  in_progress: '#2563EB',
  planned:     '#4B5563',
};

const COURSES: Course[] = [
  // AI & AGENTIC
  {
    id: 'dl-mcp-anthropic',
    name: 'MCP: Build Rich-Context AI Apps with Anthropic',
    provider: 'DeepLearning.AI × Anthropic',
    url: 'https://learn.deeplearning.ai/courses/mcp-build-rich-context-ai-apps-with-anthropic',
    duration: '~2 hours', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'intermediate', status: 'planned',
    description: 'The Model Context Protocol from Anthropic\'s Head of Technical Education. Build MCP clients and servers, connect LLMs to tools and data sources, deploy remotely. Directly on-stack with current production work.',
    bestFor: ['FDE', 'Applied AI Eng', 'AI Platform Eng'],
    highlight: true,
  },
  {
    id: 'dl-agent-skills',
    name: 'Agent Skills with Anthropic',
    provider: 'DeepLearning.AI × Anthropic',
    url: 'https://learn.deeplearning.ai/courses/agent-skills-with-anthropic',
    duration: '~2 hours', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'beginner', status: 'planned',
    description: 'Build reusable SKILL.md-format skills that extend Claude agents — integrates with MCP servers and sub-agents across Claude API, Claude Code, and the Claude Agent SDK.',
    bestFor: ['FDE', 'Applied AI Eng'],
  },
  {
    id: 'dl-agentic-ai',
    name: 'Agentic AI (Andrew Ng)',
    provider: 'DeepLearning.AI',
    url: 'https://learn.deeplearning.ai/courses/agentic-ai',
    duration: '~3 hours', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'intermediate', status: 'planned',
    description: 'Andrew Ng\'s production-grade agentic workflow guide — design patterns, tool use, evaluation-driven development, reflection loops, and autonomous agent architectures.',
    bestFor: ['FDE', 'Applied AI Eng', 'Solutions Eng'],
    highlight: true,
  },
  {
    id: 'dl-multi-agent-crewai',
    name: 'Multi AI Agent Systems with crewAI',
    provider: 'DeepLearning.AI × crewAI',
    url: 'https://learn.deeplearning.ai/courses/multi-ai-agent-systems-with-crewai',
    duration: '~3 hours', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'beginner', status: 'planned',
    description: 'Taught by crewAI\'s founder — multi-agent pipelines with role-playing, memory, tool use, and guardrails. Real examples: research automation, financial analysis, customer support agents.',
    bestFor: ['FDE', 'Applied AI Eng'],
  },
  {
    id: 'dl-langgraph',
    name: 'AI Agents in LangGraph',
    provider: 'DeepLearning.AI × LangChain × Tavily',
    url: 'https://learn.deeplearning.ai/courses/ai-agents-in-langgraph',
    duration: '~2 hours', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'intermediate', status: 'planned',
    description: 'Stateful agents from scratch using LangGraph — planning, reflection, multi-agent communication, HITL oversight, and persistent memory. Taught by LangChain co-founder Harrison Chase.',
    bestFor: ['FDE', 'Applied AI Eng'],
  },
  {
    id: 'dl-functions-tools',
    name: 'Functions, Tools and Agents with LangChain',
    provider: 'DeepLearning.AI × LangChain',
    url: 'https://learn.deeplearning.ai/courses/functions-tools-agents-langchain',
    duration: '~2 hours', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'intermediate', status: 'planned',
    description: 'Deep dive into function calling, LangChain Expression Language (LCEL), data extraction, and building production agent systems with tool use.',
    bestFor: ['FDE', 'Applied AI Eng'],
  },
  {
    id: 'dl-evaluating-agents',
    name: 'Evaluating AI Agents',
    provider: 'DeepLearning.AI × Arize AI',
    url: 'https://learn.deeplearning.ai/courses/evaluating-ai-agents',
    duration: '~3 hours', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'beginner', status: 'planned',
    description: 'Evaluation-driven development — router evals, skill evals, trajectory evaluation, LLM-as-a-judge scoring, and production monitoring with Arize AI observability tooling.',
    bestFor: ['FDE', 'Applied AI Eng', 'AI Platform Eng'],
  },
  {
    id: 'dl-agentic-rag',
    name: 'Building Agentic RAG with LlamaIndex',
    provider: 'DeepLearning.AI × LlamaIndex',
    url: 'https://learn.deeplearning.ai/courses/building-agentic-rag-with-llamaindex',
    duration: '~1 hour', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'beginner', status: 'planned',
    description: 'Build autonomous research agents using LlamaIndex — router query engines, tool calling, multi-document agents, and reasoning loops beyond standard RAG pipelines.',
    bestFor: ['FDE', 'Applied AI Eng'],
  },
  {
    id: 'dl-building-evaluating-rag',
    name: 'Building and Evaluating Advanced RAG',
    provider: 'DeepLearning.AI × TruEra × LlamaIndex',
    url: 'https://learn.deeplearning.ai/courses/building-evaluating-advanced-rag',
    duration: '~2 hours', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'beginner', status: 'planned',
    description: 'Production RAG using sentence-window and auto-merging retrieval. Covers the RAG triad eval metrics: context relevance, groundedness, and answer relevance.',
    bestFor: ['Applied AI Eng', 'AI Platform Eng'],
  },
  {
    id: 'dl-debugging-genai',
    name: 'Evaluating and Debugging Generative AI',
    provider: 'DeepLearning.AI × Weights & Biases',
    url: 'https://learn.deeplearning.ai/courses/evaluating-debugging-generative-ai',
    duration: '~1 hour', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'intermediate', status: 'planned',
    description: 'Experiment tracking, model debugging, and LLM evaluation using W&B — artifact tracking, prompt management, and model registry. Critical for production AI observability.',
    bestFor: ['Applied AI Eng', 'AI Platform Eng'],
  },
  {
    id: 'dl-function-calling-extraction',
    name: 'Function-Calling and Data Extraction with LLMs',
    provider: 'DeepLearning.AI × Nexusflow',
    url: 'https://learn.deeplearning.ai/courses/function-calling-and-data-extraction-with-llms',
    duration: '~2 hours', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'beginner', status: 'planned',
    description: 'Structured data extraction and function calling patterns — essential for AI integrations with external APIs and enterprise systems.',
    bestFor: ['FDE', 'Applied AI Eng', 'Solutions Eng'],
  },
  {
    id: 'dl-langchain-llm',
    name: 'LangChain for LLM Application Development',
    provider: 'DeepLearning.AI × LangChain',
    url: 'https://learn.deeplearning.ai/courses/langchain',
    duration: '~2 hours', costDisplay: 'Free', free: true,
    category: 'AI & Agentic', difficulty: 'beginner', status: 'planned',
    description: 'Foundation LLM app course — models, prompts, memory, indexes, chains, and agents. Co-created by Harrison Chase and Andrew Ng. Start here if new to LangChain.',
    bestFor: ['FDE', 'Applied AI Eng'],
  },

  // CLOUD & INFRASTRUCTURE
  {
    id: 'aws-practitioner-training',
    name: 'AWS Cloud Practitioner Essentials',
    provider: 'AWS Skill Builder',
    url: 'https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/',
    duration: '~6 hours', costDisplay: 'Free', free: true,
    category: 'Cloud', difficulty: 'beginner', status: 'planned',
    description: 'Official AWS foundational course — core services, security model, architecture, pricing, and support. Direct prep for the CLF-C02 exam. Start here before the cert.',
    bestFor: ['Solutions Eng', 'FDE', 'Applied AI Eng'],
    highlight: true,
  },
  {
    id: 'aws-clf-c02',
    name: 'AWS Certified Cloud Practitioner (CLF-C02)',
    provider: 'Amazon Web Services',
    url: 'https://aws.amazon.com/certification/certified-cloud-practitioner/',
    duration: '90 min exam', costDisplay: '$100 exam', free: false,
    category: 'Cloud', difficulty: 'beginner', status: 'planned',
    description: 'Entry-level AWS certification recognized by virtually every enterprise employer — Shared Responsibility Model, billing, core services, and architectural best practices.',
    bestFor: ['Solutions Eng', 'FDE', 'AI Platform Eng'],
  },
  {
    id: 'gcp-ace',
    name: 'Google Cloud Associate Cloud Engineer',
    provider: 'Google Cloud',
    url: 'https://cloud.google.com/learn/certification/cloud-engineer',
    duration: '2 hour exam', costDisplay: '$200 exam', free: false,
    category: 'Cloud', difficulty: 'intermediate', status: 'planned',
    description: 'GCP certification covering deploying and managing cloud solutions — IAM, monitoring, Compute Engine, GKE, and Cloud Storage. Strong signal for enterprise SE roles.',
    bestFor: ['Solutions Eng', 'AI Platform Eng'],
  },
  {
    id: 'kcna',
    name: 'Kubernetes & Cloud Native Associate (KCNA)',
    provider: 'Linux Foundation / CNCF',
    url: 'https://training.linuxfoundation.org/certification/kubernetes-cloud-native-associate/',
    duration: '90 min exam', costDisplay: '$250 exam', free: false,
    category: 'Cloud', difficulty: 'beginner', status: 'planned',
    description: 'Foundation-level Kubernetes certification — cloud native architecture, CNCF ecosystem, and container orchestration basics. Stepping stone before CKAD.',
    bestFor: ['Applied AI Eng', 'AI Platform Eng'],
  },
  {
    id: 'k8s-edx',
    name: 'Introduction to Kubernetes (LFS158x)',
    provider: 'Linux Foundation via edX',
    url: 'https://www.edx.org/course/introduction-to-kubernetes',
    duration: '~14 hours', costDisplay: 'Free (audit)', free: true,
    category: 'Cloud', difficulty: 'beginner', status: 'planned',
    description: 'Official free Kubernetes course — containers, cluster architecture, deploying applications, RBAC, and multi-tenancy. Best free prep before the KCNA exam.',
    bestFor: ['Applied AI Eng', 'AI Platform Eng'],
  },
  {
    id: 'docker-getting-started',
    name: 'Docker Official Getting Started',
    provider: 'Docker',
    url: 'https://docs.docker.com/get-started/',
    duration: '~4 hours', costDisplay: 'Free', free: true,
    category: 'Cloud', difficulty: 'beginner', status: 'planned',
    description: 'Official Docker tutorial — building images, running containers, volumes and networks, Docker Compose for multi-service apps, and publishing to registries.',
    bestFor: ['FDE', 'Applied AI Eng', 'Full Stack'],
  },

  // ENTERPRISE / CRM
  {
    id: 'sf-admin',
    name: 'Salesforce Certified Platform Administrator',
    provider: 'Salesforce Trailhead',
    url: 'https://trailhead.salesforce.com/en/credentials/administratoroverview',
    duration: 'Self-paced + exam', costDisplay: '$200 exam', free: false,
    category: 'Enterprise / CRM', difficulty: 'intermediate', status: 'planned',
    description: 'Standard Salesforce admin cert — platform config, user management, security, workflow automation, and CRM customization. Required or preferred for most SE/CSM roles at Salesforce-ecosystem companies.',
    bestFor: ['Solutions Eng', 'CSM', 'Implementation'],
  },
  {
    id: 'sf-agentforce',
    name: 'Salesforce Certified Agentforce Specialist',
    provider: 'Salesforce Trailhead',
    url: 'https://trailhead.salesforce.com/en/credentials/agentforcespecialistoverview',
    duration: 'Self-paced + exam', costDisplay: '$200 exam', free: false,
    category: 'Enterprise / CRM', difficulty: 'intermediate', status: 'planned',
    description: 'New 2025 cert covering Salesforce Agentforce management and optimization. Strong differentiator for AI deployment roles at Salesforce-ecosystem companies.',
    bestFor: ['FDE', 'AI Platform Eng', 'Solutions Eng'],
    highlight: true,
  },
  {
    id: 'hubspot-sales-software',
    name: 'HubSpot Sales Hub Software Certification',
    provider: 'HubSpot Academy',
    url: 'https://academy.hubspot.com/courses/hubspot-sales-software',
    duration: '~2 hours', costDisplay: 'Free', free: true,
    category: 'Enterprise / CRM', difficulty: 'beginner', status: 'planned',
    description: 'HubSpot Sales Hub Pro/Enterprise — prospecting workspace, contact and deal management, task automation, pipeline tracking, and sales reporting.',
    bestFor: ['Solutions Eng', 'CSM'],
  },
  {
    id: 'hubspot-inbound-sales',
    name: 'HubSpot Inbound Sales Certification',
    provider: 'HubSpot Academy',
    url: 'https://academy.hubspot.com/courses/inbound-sales',
    duration: '~3 hours', costDisplay: 'Free', free: true,
    category: 'Enterprise / CRM', difficulty: 'beginner', status: 'planned',
    description: 'Inbound sales methodology — identifying buyers, personalized outreach sequences, discovery conversations, and tailored presentations. 200K+ certified professionals.',
    bestFor: ['Solutions Eng', 'CSM', 'FDE'],
  },
  {
    id: 'hubspot-reporting',
    name: 'HubSpot Reporting & Analytics',
    provider: 'HubSpot Academy',
    url: 'https://academy.hubspot.com/public/courses/hubspot-reporting',
    duration: '~3 hours', costDisplay: 'Free', free: true,
    category: 'Enterprise / CRM', difficulty: 'intermediate', status: 'completed',
    description: 'Custom reports and dashboards in HubSpot — attribution reporting, funnel analysis, revenue reporting, and data visualization. Passed 46/60, May 2026.',
    bestFor: ['Solutions Eng', 'CSM'],
  },
  {
    id: 'hubspot-marketing',
    name: 'HubSpot Marketing Software Certification',
    provider: 'HubSpot Academy',
    url: 'https://academy.hubspot.com/courses/hubspot-marketing-software',
    duration: '~3 hours', costDisplay: 'Free', free: true,
    category: 'Enterprise / CRM', difficulty: 'beginner', status: 'planned',
    description: 'HubSpot Marketing Hub fundamentals — email marketing, landing pages, lead nurturing workflows, and analytics. Pairs with Sales Hub cert for full-funnel credibility.',
    bestFor: ['Solutions Eng', 'CSM'],
  },

  // APIS & DEV TOOLS
  {
    id: 'postman-api-expert',
    name: 'Postman API Fundamentals Student Expert',
    provider: 'Postman Academy',
    url: 'https://academy.postman.com/path/postman-api-fundamentals-student-expert',
    duration: '~6 hours', costDisplay: 'Free', free: true,
    category: 'APIs & Dev Tools', difficulty: 'beginner', status: 'planned',
    description: 'Badge-issuing certification — API fundamentals, sending requests, writing tests, building collections, and Postman environments. Visible on Postman public profile.',
    bestFor: ['Solutions Eng', 'FDE', 'Applied AI Eng'],
  },
  {
    id: 'stripe-developer',
    name: 'Stripe Developer Documentation',
    provider: 'Stripe',
    url: 'https://stripe.com/docs/development',
    duration: 'Self-paced', costDisplay: 'Free', free: true,
    category: 'APIs & Dev Tools', difficulty: 'beginner', status: 'planned',
    description: 'Official Stripe developer docs — payment intents, webhooks, Stripe Connect (multi-party payments), subscriptions, and the Stripe CLI. Portfolio signal for fintech SE roles.',
    bestFor: ['Solutions Eng', 'Full Stack'],
  },
  {
    id: 'dl-langchain-chat-data',
    name: 'LangChain: Chat with Your Data',
    provider: 'DeepLearning.AI × LangChain',
    url: 'https://learn.deeplearning.ai/courses/langchain-chat-with-your-data',
    duration: '~1 hour', costDisplay: 'Free', free: true,
    category: 'APIs & Dev Tools', difficulty: 'beginner', status: 'planned',
    description: 'Document-grounded chatbots — document loading, chunking strategies, vector store embeddings, semantic retrieval, and Q&A over proprietary data sources.',
    bestFor: ['FDE', 'Applied AI Eng', 'Solutions Eng'],
  },

  // ANALYTICS & BI
  {
    id: 'google-analytics-ga4',
    name: 'Google Analytics Certification (GA4)',
    provider: 'Google Skillshop',
    url: 'https://skillshop.withgoogle.com',
    duration: '~5 hours', costDisplay: 'Free', free: true,
    category: 'Analytics & BI', difficulty: 'beginner', status: 'completed',
    description: 'Official Google GA4 certification — event-based data model, audience creation, funnel analysis, and attribution. Universally recognized for marketing, SE, and product roles.',
    bestFor: ['Solutions Eng', 'CSM'],
  },
  {
    id: 'google-ads-search',
    name: 'Google Ads Search Certification',
    provider: 'Google Skillshop',
    url: 'https://skillshop.withgoogle.com',
    duration: '~4 hours', costDisplay: 'Free', free: true,
    category: 'Analytics & BI', difficulty: 'beginner', status: 'planned',
    description: 'Google Search campaign fundamentals — bidding strategies, keyword match types, ad extensions, and performance measurement. Required for Google Partner status.',
    bestFor: ['Solutions Eng', 'CSM'],
  },
  {
    id: 'tableau-specialist',
    name: 'Tableau Desktop Specialist',
    provider: 'Tableau / Salesforce',
    url: 'https://www.tableau.com/learn/certification/desktop-specialist',
    duration: '60 min exam', costDisplay: '$250 exam', free: false,
    category: 'Analytics & BI', difficulty: 'beginner', status: 'planned',
    description: 'Entry-level Tableau certification — connecting to data, charts and dashboards, applying calculations, and sharing workbooks. Widely recognized data visualization credential.',
    bestFor: ['Solutions Eng', 'CSM', 'Analytics'],
  },

  // FULL STACK
  {
    id: 'nextjs-official',
    name: 'Next.js Learn — Official Full-Stack Course',
    provider: 'Vercel / Next.js',
    url: 'https://nextjs.org/learn',
    duration: '~10 hours', costDisplay: 'Free', free: true,
    category: 'Full Stack', difficulty: 'intermediate', status: 'planned',
    description: '16-chapter official course — App Router, Server Components, React Server Actions, Postgres data fetching, NextAuth.js, streaming, and SEO. Formalizes skills already in production.',
    bestFor: ['Applied AI Eng', 'Full Stack', 'FDE'],
  },
  {
    id: 'typescript-udemy',
    name: 'Understanding TypeScript',
    provider: 'Udemy (Maximilian Schwarzmüller)',
    url: 'https://www.udemy.com/course/understanding-typescript/',
    duration: '~15 hours', costDisplay: '~$15 on sale', free: false,
    category: 'Full Stack', difficulty: 'beginner', status: 'planned',
    description: 'Most popular TypeScript course on Udemy — types, interfaces, generics, decorators, modules, and React/Node.js integration. 180K+ students. Formalizes skills already in use.',
    bestFor: ['Applied AI Eng', 'Full Stack'],
  },
  {
    id: 'postgresql-tutorial',
    name: 'PostgreSQL Official Tutorial',
    provider: 'PostgreSQL.org',
    url: 'https://www.postgresql.org/docs/current/tutorial.html',
    duration: 'Self-paced', costDisplay: 'Free', free: true,
    category: 'Full Stack', difficulty: 'beginner', status: 'planned',
    description: 'Official PostgreSQL docs — SQL basics, advanced queries, joins, indexing, transactions, and administration. Foundation for any backend role where Postgres is in the stack.',
    bestFor: ['Applied AI Eng', 'Full Stack'],
  },
  {
    id: 'prisma-docs',
    name: 'Prisma: Getting Started & Data Modeling',
    provider: 'Prisma',
    url: 'https://www.prisma.io/docs/getting-started',
    duration: 'Self-paced', costDisplay: 'Free', free: true,
    category: 'Full Stack', difficulty: 'beginner', status: 'planned',
    description: 'Official Prisma docs — schema design, migrations, CRUD, relations, and Prisma Client type safety. Formalizes an already-used tool with a shareable credential path.',
    bestFor: ['Applied AI Eng', 'Full Stack'],
  },
];

const CATS: Category[] = ['AI & Agentic', 'Cloud', 'Enterprise / CRM', 'APIs & Dev Tools', 'Analytics & BI', 'Full Stack'];

export default function CEPage() {
  const [catFilter, setCatFilter] = useState<Category | 'All'>('All');
  const [search, setSearch]       = useState('');
  const [statuses, setStatuses]   = useState<Record<string, Status>>(
    () => Object.fromEntries(COURSES.map(c => [c.id, c.status]))
  );

  const filtered = useMemo(() => COURSES.filter(c => {
    if (catFilter !== 'All' && c.category !== catFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.provider.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    }
    return true;
  }), [catFilter, search]);

  const grouped = useMemo(() => {
    const cats = catFilter === 'All' ? CATS : [catFilter];
    return cats
      .map(cat => ({ cat, courses: filtered.filter(c => c.category === cat) }))
      .filter(g => g.courses.length > 0);
  }, [filtered, catFilter]);

  const totalDone    = Object.values(statuses).filter(s => s === 'completed').length;
  const totalWip     = Object.values(statuses).filter(s => s === 'in_progress').length;
  const totalPlanned = COURSES.length - totalDone - totalWip;
  const catCounts    = Object.fromEntries(CATS.map(c => [c, COURSES.filter(x => x.category === c).length]));

  function toggle(id: string) {
    setStatuses(prev => {
      const cur  = prev[id];
      const next: Status = cur === 'planned' ? 'in_progress' : cur === 'in_progress' ? 'completed' : 'planned';
      return { ...prev, [id]: next };
    });
  }

  const dim = 'var(--gray)';
  const bd  = 'var(--border)';

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <GraduationCap size={22} color="#2563EB" />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: 'var(--white)', lineHeight: 1 }}>CE / Skill Roadmap</div>
        </div>
        <p style={{ fontSize: '0.78rem', color: dim }}>Certifications and courses mapped to FDE, Applied AI, and Solutions Engineer target roles.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Completed',   val: totalDone,    color: '#14B8AD' },
          { label: 'In Progress', val: totalWip,     color: '#2563EB' },
          { label: 'Planned',     val: totalPlanned, color: '#6B7280' },
          { label: 'Total',       val: COURSES.length, color: '#E2E8F0' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111', border: `1px solid ${bd}`, borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>{s.val}</span>
            <span style={{ fontSize: '0.68rem', color: dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Start Here callout */}
      <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10 }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#60A5FA', marginBottom: 8 }}>Start Here — Highest ROI for Target Roles</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {COURSES.filter(c => c.highlight).map(c => (
            <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--card)', border: `1px solid ${CAT_COLOR[c.category]}30`,
              borderLeft: `3px solid ${CAT_COLOR[c.category]}`,
              borderRadius: 6, padding: '6px 10px', fontSize: '0.72rem', color: '#E2E8F0',
              textDecoration: 'none',
            }}>
              <span style={{ color: CAT_COLOR[c.category], fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>{c.category}</span>
              <span style={{ color: dim }}>·</span>
              <span>{c.name}</span>
              <ExternalLink size={10} style={{ color: dim, flexShrink: 0 }} />
            </a>
          ))}
        </div>
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(['All', ...CATS] as const).map(cat => {
            const active = catFilter === cat;
            const count  = cat === 'All' ? COURSES.length : (catCounts[cat] ?? 0);
            const color  = cat === 'All' ? '#2563EB' : CAT_COLOR[cat];
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                border: active ? `1px solid ${color}` : `1px solid ${bd}`,
                background: active ? `${color}18` : 'var(--card2)',
                color: active ? color : dim,
              }}>
                {cat} <span style={{ opacity: 0.6 }}>({count})</span>
              </button>
            );
          })}
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: dim, pointerEvents: 'none' }} />
          <input className="input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search courses..." style={{ paddingLeft: 30, width: 220, fontSize: '0.75rem' }} />
        </div>
      </div>

      {/* Course groups */}
      {grouped.map(({ cat, courses }) => (
        <div key={cat} style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${bd}` }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: CAT_COLOR[cat], flexShrink: 0 }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#E2E8F0' }}>{cat}</div>
            <div style={{ fontSize: '0.7rem', color: dim }}>{courses.length} courses</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {courses.map(c => {
              const st = statuses[c.id] ?? c.status;
              const borderColor = st === 'completed' ? '#14B8AD30' : st === 'in_progress' ? '#2563EB30' : bd;
              const accentColor = st === 'completed' ? '#14B8AD' : st === 'in_progress' ? '#2563EB' : CAT_COLOR[cat];
              return (
                <div key={c.id} style={{ background: '#111', border: `1px solid ${borderColor}`, borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Category accent bar */}
                  <div style={{ height: 2, background: accentColor }} />

                  <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {/* Name + difficulty */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0', lineHeight: 1.35 }}>{c.name}</div>
                      <span style={{ fontSize: '0.55rem', padding: '2px 5px', borderRadius: 3, background: '#1E293B', color: dim, textTransform: 'capitalize', flexShrink: 0, marginTop: 2 }}>{c.difficulty}</span>
                    </div>
                    {/* Provider */}
                    <div style={{ fontSize: '0.68rem', color: dim, marginBottom: 8 }}>{c.provider}</div>

                    {/* Metadata pills */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 9 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.62rem', padding: '2px 7px', borderRadius: 4, background: '#1E293B', color: '#94A3B8' }}>
                        <Clock size={9} /> {c.duration}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.62rem', padding: '2px 7px', borderRadius: 4,
                        background: c.free ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: c.free ? '#10B981' : '#F59E0B' }}>
                        <DollarSign size={9} /> {c.costDisplay}
                      </span>
                      {c.free && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.62rem', padding: '2px 7px', borderRadius: 4, background: 'rgba(16,185,129,0.08)', color: '#10B981' }}>
                          <Wifi size={9} /> Online
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', lineHeight: 1.55, flex: 1 }}>{c.description}</div>

                    {/* Best For */}
                    {c.bestFor && c.bestFor.length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.6rem', color: dim }}>Best for:</span>
                        {c.bestFor.map(r => (
                          <span key={r} style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 10, border: `1px solid ${bd}`, background: '#0D1624', color: '#6B7280' }}>{r}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '7px 0', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                      color: CAT_COLOR[cat], border: `1px solid ${CAT_COLOR[cat]}40`, background: `${CAT_COLOR[cat]}10`,
                      textDecoration: 'none',
                    }}>
                      Open Course <ExternalLink size={11} />
                    </a>
                    <button onClick={() => toggle(c.id)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '5px 0', borderRadius: 6, fontSize: '0.63rem',
                      color: STATUS_COLOR[st], border: `1px solid ${STATUS_COLOR[st]}30`, background: `${STATUS_COLOR[st]}08`,
                      cursor: 'pointer',
                    }}>
                      {st === 'completed' && <CheckCircle size={10} />}
                      {st === 'in_progress' && <Star size={10} />}
                      {st === 'planned' && <span style={{ width: 10, height: 10, borderRadius: '50%', border: `1px solid ${dim}`, display: 'inline-block' }} />}
                      {st === 'completed' ? 'Completed' : st === 'in_progress' ? 'In Progress — click to complete' : 'Mark In Progress'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: dim, fontSize: '0.8rem' }}>No courses match your search.</div>
      )}
    </div>
  );
}
