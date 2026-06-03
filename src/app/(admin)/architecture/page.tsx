'use client';

import { useEffect, useState } from 'react';
import { Cpu, Zap, ArrowRight, GitBranch, Mail, Rss, Building2, FileText, CheckCircle, Bell, Clock, TrendingUp, Shield, DollarSign, Layers } from 'lucide-react';

type LiveStats = {
  total: number;
  bySource: { source: string; count: number }[];
  withCL: number;
  scored: number;
  highFit: number;
};

const dim  = 'var(--gray)';
const card = 'var(--card2)';
const bd   = 'var(--border)';

const SCRIPTED_COLOR = '#2563EB';
const AI_COLOR       = '#7C3AED';
const HAIKU_COLOR    = '#059669';
const SONNET_COLOR   = '#DC2626';
const HITL_COLOR     = '#D97706';

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.1em',
      textTransform: 'uppercase', color,
      background: color + '18', border: `1px solid ${color}30`,
      borderRadius: 4, padding: '2px 7px',
    }}>{label}</span>
  );
}

function StageArrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: dim, paddingBottom: 24 }}>
      <ArrowRight size={16} />
    </div>
  );
}

interface StageProps {
  icon: React.ReactNode;
  title: string;
  type: 'scripted' | 'ai-haiku' | 'ai-sonnet' | 'hitl';
  items: string[];
  note?: string;
}

function Stage({ icon, title, type, items, note }: StageProps) {
  const color = type === 'scripted' ? SCRIPTED_COLOR
              : type === 'ai-haiku' ? HAIKU_COLOR
              : type === 'ai-sonnet' ? SONNET_COLOR
              : HITL_COLOR;

  const typeLabel = type === 'scripted' ? 'Scripted'
                  : type === 'ai-haiku' ? 'AI · Haiku'
                  : type === 'ai-sonnet' ? 'AI · Sonnet'
                  : 'HITL';

  return (
    <div style={{
      background: card, border: `1px solid ${bd}`,
      borderTop: `2px solid ${color}`,
      borderRadius: 10, padding: '14px 16px',
      minWidth: 160, maxWidth: 200, flex: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--white)' }}>{title}</span>
      </div>
      <Tag label={typeLabel} color={color} />
      <ul style={{ marginTop: 10, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: '0.65rem', color: dim, display: 'flex', gap: 5, lineHeight: 1.4 }}>
            <span style={{ color, flexShrink: 0, marginTop: 1 }}>›</span>
            {item}
          </li>
        ))}
      </ul>
      {note && <div style={{ marginTop: 8, fontSize: '0.6rem', color: color, fontStyle: 'italic', borderTop: `1px solid ${bd}`, paddingTop: 6 }}>{note}</div>}
    </div>
  );
}

function RatioBar({ scripted, agentic }: { scripted: number; agentic: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 28 }}>
        <div style={{ width: `${scripted}%`, background: SCRIPTED_COLOR + 'CC', display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--white)', whiteSpace: 'nowrap' }}>{scripted}% Scripted</span>
        </div>
        <div style={{ width: `${agentic}%`, background: AI_COLOR + 'CC', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--white)', whiteSpace: 'nowrap' }}>{agentic}% Agentic</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: '0.62rem', color: dim }}>
        <span>Scripted = zero AI cost, deterministic, always-on</span>
        <span style={{ marginLeft: 'auto' }}>Agentic = judgment + cost, model-matched per task</span>
      </div>
    </div>
  );
}

export default function ArchitecturePage() {
  const [stats, setStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    fetch('/api/opportunities?stage=inbox&minimal=false&limit=1')
      .then(r => r.ok ? r.json() : null)
      .then(async () => {
        // Fetch pipeline summary for live counts
        const [summRes] = await Promise.all([
          fetch('/api/opportunities/pipeline-summary'),
        ]);
        const summ = summRes.ok ? await summRes.json() : null;
        if (summ) {
          setStats({
            total:    summ.total ?? 0,
            bySource: summ.bySource ?? [],
            withCL:   summ.withCoverLetter ?? 0,
            scored:   summ.scored ?? 0,
            highFit:  summ.highFit ?? 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding: '0 0 60px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Layers size={22} color={SCRIPTED_COLOR} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: 'var(--white)', lineHeight: 1 }}>
            System Architecture
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: dim, marginBottom: 16 }}>
          MAX-DEPLOY Career OS &mdash; engineered for speed, cost efficiency, and reliability
        </p>
        <RatioBar scripted={90} agentic={10} />
      </div>

      {/* ── Live Stats ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Total Opportunities', value: stats.total.toLocaleString(), color: SCRIPTED_COLOR, icon: <GitBranch size={14} /> },
            { label: 'Scored by AI', value: stats.scored.toLocaleString(), color: HAIKU_COLOR, icon: <Zap size={14} /> },
            { label: 'High Fit (70+)', value: stats.highFit.toLocaleString(), color: SONNET_COLOR, icon: <TrendingUp size={14} /> },
            { label: 'Cover Letters Built', value: stats.withCL.toLocaleString(), color: '#22C55E', icon: <FileText size={14} /> },
          ].map(s => (
            <div key={s.label} style={{ background: card, border: `1px solid ${bd}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.color, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--white)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', color: dim, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pipeline Flow ── */}
      <div style={{ background: card, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: dim, marginBottom: 16 }}>
          End-to-End Pipeline Flow
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 4 }}>

          <Stage
            icon={<Rss size={15} />}
            title="Discover"
            type="scripted"
            items={['RSS feeds (6hr)', 'ATS watchlist (3 AM)', 'IMAP IDLE (push)', 'Board sweep (7 AM + 5 PM)', 'URL scrape / bookmarklet']}
            note="Zero AI — pure data fetch"
          />
          <StageArrow />
          <Stage
            icon={<Shield size={15} />}
            title="Dedup"
            type="scripted"
            items={['URL normalization', 'ATS fingerprint (gh:: lv:: ash::)', 'Company + role match', 'Stage not dead']}
            note="3-layer, in-memory store"
          />
          <StageArrow />
          <Stage
            icon={<Zap size={15} />}
            title="Score"
            type="ai-haiku"
            items={['Full: Haiku on JD text', 'Lite: title-only regex (free)', 'fitScore + classification', 'Alert ≥ 50 · CL auto ≥ 80']}
            note="Haiku: ~$0.0003 · Lite: $0"
          />
          <StageArrow />
          <Stage
            icon={<TrendingUp size={15} />}
            title="Triage"
            type="scripted"
            items={['Priority formula', 'Tier mapping (T1-T7)', 'Score floor 50', 'Filter + sort (client)']}
            note="Zero AI post-score"
          />
          <StageArrow />
          <Stage
            icon={<FileText size={15} />}
            title="Cover Letter"
            type="ai-sonnet"
            items={['Auto: score >= 70', 'On-demand: 50-69', 'HTML + Chromium PDF', 'Stored in DB']}
            note="Sonnet: ~$0.003/letter"
          />
          <StageArrow />
          <Stage
            icon={<CheckCircle size={15} />}
            title="Apply"
            type="hitl"
            items={['User confirms intent', 'Resume variant select', 'AI agent form-fill', 'Stage → applied']}
            note="HITL confirm + AI execute"
          />
          <StageArrow />
          <Stage
            icon={<Bell size={15} />}
            title="Follow-Up"
            type="scripted"
            items={['Day 7 + Day 14 tasks', 'Overdue alert (8 AM)', 'Draft via Sonnet (demand)', 'Telegram HITL']}
            note="Scheduled, AI on tap"
          />

        </div>
      </div>

      {/* ── Two-column layer breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Scripted */}
        <div style={{ background: card, border: `1px solid ${SCRIPTED_COLOR}30`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Cpu size={16} color={SCRIPTED_COLOR} />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)' }}>Scripted Layer</span>
            <Tag label="Zero AI Cost" color={SCRIPTED_COLOR} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'RSS Poller',           detail: 'node-cron every 6hrs — fetch, parse, create',                      when: 'Every 6 hrs' },
              { name: 'ATS Poller',           detail: 'Greenhouse / Lever / Ashby, 32 companies, isInScope() allow-list',  when: '3 AM nightly' },
              { name: 'Job Board Sweep',      detail: 'FwdDeploy · RemoteOK · Remotive · Arbeitnow · Wellfound',           when: '7 AM + 5 PM' },
              { name: 'IMAP IDLE',            detail: 'Persistent push connection, zero polling',                          when: 'Always-on' },
              { name: '3-Layer Dedup',        detail: 'URL normalize → ATS fingerprint (gh:: lv:: ash::) → company+role',  when: 'Every ingest' },
              { name: 'Lite Scorer',          detail: 'Title-only keyword regex (7 rules) — no AI, for no-JD jobs',        when: 'Hourly' },
              { name: 'Work Type Detect',     detail: 'Keyword scan on role + JD text',                                    when: 'Every ingest' },
              { name: 'Priority Score',       detail: 'Formula: fitScore + salary + remote + recency + PDF',               when: 'Client-side' },
              { name: 'Tier Mapping',         detail: 'Classification + role keywords → T1-T7',                            when: 'Client-side' },
              { name: 'Follow-up Schedule',   detail: 'Date math on applied opps, sets followUpDue',                      when: '8 AM daily' },
              { name: 'Email Pre-filter',     detail: 'isJobRelevant() in IMAP worker — vendor domains, marketing subjects, system noise dropped before DB write', when: 'Every email' },
              { name: 'Cover Letter HTML',    detail: 'Static template, Bebas Neue + Inter, print CSS',                   when: 'After AI draft' },
              { name: 'PDF Render',           detail: 'Chromium headless print-to-PDF at localhost',                      when: 'After HTML' },
            ].map(r => (
              <div key={r.name} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: SCRIPTED_COLOR + '08', borderRadius: 7 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: '0.62rem', color: dim, lineHeight: 1.4 }}>{r.detail}</div>
                </div>
                <div style={{ flexShrink: 0, fontSize: '0.58rem', color: SCRIPTED_COLOR, fontWeight: 600, whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 2 }}>{r.when}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Agentic */}
        <div style={{ background: card, border: `1px solid ${AI_COLOR}30`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap size={16} color={AI_COLOR} />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)' }}>Agentic Layer</span>
            <Tag label="AI · Cost-Gated" color={AI_COLOR} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'Opportunity Scorer',    model: 'Haiku',  trigger: 'Every 15 min · jobs with JD text',  cost: '~$0.0003',  note: 'fitScore · classification · workType · action' },
              { name: 'Email Job Extractor',   model: 'Haiku',  trigger: 'Per job alert email received',      cost: '~$0.0005',  note: 'Extracts all listings from Indeed/LinkedIn alerts' },
              { name: 'Email Classifier',      model: 'Haiku',  trigger: 'Per inbound personal email',        cost: '~$0.0003',  note: 'Recruiter outreach vs not relevant' },
              { name: 'URL Scrape Parser',     model: 'Haiku',  trigger: 'Manual job URL paste',              cost: '~$0.0003',  note: 'Company · role · salary · JD extraction' },
              { name: 'Cover Letter (auto)',   model: 'Sonnet', trigger: 'Score >= 80 · has JD text',         cost: '~$0.003',   note: '7-step framework · quiet confidence tone · PDF via Chromium' },
              { name: 'Cover Letter (demand)', model: 'Sonnet', trigger: 'User taps Apply (score 50–79)',     cost: '~$0.003',   note: 'Only fires when user has intent to apply' },
              { name: 'Apply Agent',           model: 'Sonnet', trigger: 'User clicks Apply in Pipeline',     cost: '~$0.005',   note: 'Playwright form-fill · answer-bank · resume attach · ATS submit' },
              { name: 'Daily Briefing',        model: 'Sonnet', trigger: '6 AM Central, once per day',        cost: '~$0.010',   note: 'Pipeline health · priorities · action items' },
              { name: 'Follow-up Draft',       model: 'Sonnet', trigger: 'Telegram button tap (demand)',      cost: '~$0.003',   note: '3-4 sentence reply, tone varies by days since applied' },
            ].map(r => (
              <div key={r.name} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: AI_COLOR + '08', borderRadius: 7 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--white)' }}>{r.name}</span>
                    <span style={{
                      fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.06em',
                      color: r.model === 'Haiku' ? HAIKU_COLOR : SONNET_COLOR,
                      background: (r.model === 'Haiku' ? HAIKU_COLOR : SONNET_COLOR) + '18',
                      borderRadius: 3, padding: '1px 5px',
                    }}>{r.model}</span>
                  </div>
                  <div style={{ fontSize: '0.6rem', color: dim, lineHeight: 1.4 }}>{r.note}</div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right', alignSelf: 'flex-start', marginTop: 2 }}>
                  <div style={{ fontSize: '0.58rem', color: r.model === 'Haiku' ? HAIKU_COLOR : SONNET_COLOR, fontWeight: 700 }}>{r.cost}</div>
                  <div style={{ fontSize: '0.54rem', color: dim, whiteSpace: 'nowrap', marginTop: 2 }}>{r.trigger.length > 22 ? r.trigger.slice(0, 22) + '...' : r.trigger}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Model selection rationale ── */}
      <div style={{ background: card, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: dim, marginBottom: 14 }}>
          Model Selection Rationale
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ padding: '14px 16px', background: HAIKU_COLOR + '0C', border: `1px solid ${HAIKU_COLOR}25`, borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Zap size={14} color={HAIKU_COLOR} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--white)' }}>Claude Haiku</span>
              <span style={{ fontSize: '0.62rem', color: HAIKU_COLOR, fontWeight: 600 }}>~$0.0003/call</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: dim, lineHeight: 1.6 }}>
              Used for <strong style={{ color: 'var(--white)' }}>high-volume classification</strong> tasks where speed and cost matter more than prose quality. Scoring 30 jobs/day costs less than a penny. Extracts structured JSON reliably — fitScore, classification, workType — without needing Sonnet-level reasoning.
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Opportunity scoring', 'Email extraction', 'URL parsing', 'Email classification'].map(t => (
                <span key={t} style={{ fontSize: '0.58rem', color: HAIKU_COLOR, background: HAIKU_COLOR + '15', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ padding: '14px 16px', background: SONNET_COLOR + '0C', border: `1px solid ${SONNET_COLOR}25`, borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FileText size={14} color={SONNET_COLOR} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--white)' }}>Claude Sonnet</span>
              <span style={{ fontSize: '0.62rem', color: SONNET_COLOR, fontWeight: 600 }}>~$0.003/call</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: dim, lineHeight: 1.6 }}>
              Used for <strong style={{ color: 'var(--white)' }}>human-facing output</strong> only — cover letters, briefings, recruiter replies. Sonnet produces the nuance and tone quality that goes in front of a hiring manager. 10x the cost of Haiku, justified only when a human reads the output.
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Cover letter draft', 'Apply agent', 'Daily briefing', 'Follow-up email'].map(t => (
                <span key={t} style={{ fontSize: '0.58rem', color: SONNET_COLOR, background: SONNET_COLOR + '15', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Optimization decisions ── */}
      <div style={{ background: card, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: dim, marginBottom: 14 }}>
          Optimization Decisions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              decision: 'Tiered CL threshold (70 auto / 50-69 on-demand)',
              impact: '~3x reduction in Sonnet spend',
              why: 'Jobs scoring 50-69 are marginal fits. Generating a cover letter before the user decides to apply wastes Sonnet on documents nobody uses. At 70+, the scorer itself called it apply_now — high confidence the user will act.',
              color: SONNET_COLOR,
            },
            {
              decision: 'Haiku for scoring, not Sonnet',
              impact: '10x cheaper per scored job',
              why: 'Scoring requires structured JSON extraction with consistent scoring logic — a pattern Haiku handles reliably. Sonnet would produce better reasoning text but the output is stored in DB, not shown to humans at apply time.',
              color: HAIKU_COLOR,
            },
            {
              decision: 'Score floor 50 + Top Picks (70+) + Clear Junk UX',
              impact: 'Actionable inbox from 2,000+ raw jobs',
              why: 'The ATS poller and board sweep ingest thousands of roles including marginal fits. Score floor 50 hides noise by default. Top Picks filter (70+) surfaces the best 10%. Clear Junk bulk-stages below-50 rows to dead — keeping the DB clean without manual deletion.',
              color: SCRIPTED_COLOR,
            },
            {
              decision: 'IMAP IDLE over polling for email',
              impact: 'Zero wasted fetch cycles',
              why: 'Polling every N minutes fires whether or not mail arrived. IMAP IDLE is a persistent server-push connection — the mail server notifies the client on new mail, typically within 1-2 seconds. Zero unnecessary network calls.',
              color: SCRIPTED_COLOR,
            },
            {
              decision: '3-layer dedup: URL normalize → ATS fingerprint → company+role',
              impact: 'Zero duplicate opps across 6 ingestion sources',
              why: 'The same job appears on Greenhouse, Remotive, RemoteOK, and email alert — four different URLs. URL-only dedup misses three. ATS fingerprint (extracting gh::ID, lv::UUID, ash::UUID from any URL) catches the same ATS job regardless of referring site. Company+role match handles the rest. All three run in-memory against the full DB at sweep start.',
              color: SCRIPTED_COLOR,
            },
            {
              decision: 'ATS poller uses isInScope() allow-list, not deny-list',
              impact: 'Eliminated 90%+ off-target ATS ingestion noise',
              why: 'A deny-list approach blocks known bad roles (iOS dev, QA) but passes everything else — including DACH sales, account executives, and hundreds of irrelevant ops roles from 32 watched companies. Switching to a 27-phrase allow-list (FDE, AI, Solutions, CSM, Director, Full Stack, Marketing) inverts the default: only matching roles enter the pipeline.',
              color: SCRIPTED_COLOR,
            },
            {
              decision: 'Cover letter HTML → Chromium PDF (self-hosted)',
              impact: 'Zero per-PDF cost vs. third-party PDF APIs',
              why: 'PDF generation APIs charge $0.01-0.05 per document. Chromium headless on the VPS renders the same 1-page letter in ~8 seconds at zero marginal cost. The VPS is already paid for.',
              color: '#22C55E',
            },
          ].map(d => (
            <div key={d.decision} style={{ display: 'flex', gap: 14, padding: '12px 14px', background: d.color + '08', border: `1px solid ${d.color}20`, borderRadius: 9 }}>
              <div style={{ flexShrink: 0, width: 3, background: d.color, borderRadius: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--white)' }}>{d.decision}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: d.color }}>{d.impact}</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: dim, lineHeight: 1.55 }}>{d.why}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Daily cost estimate ── */}
      <div style={{ background: card, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <DollarSign size={16} color='#22C55E' />
          <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: dim }}>
            Steady-State Cost Estimate
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: '~30 new jobs/day scored', cost: '$0.009', model: 'Haiku', color: HAIKU_COLOR },
            { label: '~5 auto cover letters (70+)', cost: '$0.015', model: 'Sonnet', color: SONNET_COLOR },
            { label: '1 daily briefing', cost: '$0.010', model: 'Sonnet', color: SONNET_COLOR },
            { label: 'On-demand (apply + followup)', cost: '~$0.015', model: 'Sonnet', color: SONNET_COLOR },
          ].map(r => (
            <div key={r.label} style={{ padding: '12px 14px', background: r.color + '0A', border: `1px solid ${r.color}20`, borderRadius: 9, textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#22C55E', marginBottom: 4 }}>{r.cost}</div>
              <div style={{ fontSize: '0.58rem', color: r.color, fontWeight: 700, marginBottom: 4 }}>{r.model}</div>
              <div style={{ fontSize: '0.6rem', color: dim, lineHeight: 1.4 }}>{r.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#22C55E0A', border: '1px solid #22C55E20', borderRadius: 9 }}>
          <Clock size={14} color='#22C55E' />
          <div style={{ fontSize: '0.72rem', color: dim }}>
            <strong style={{ color: '#22C55E' }}>~$0.05/day · ~$1.50/month</strong>
            {' '}in AI API costs under normal operation. The VPS ($20/mo) dominates. Anthropic API is not the cost driver — it is the value driver.
          </div>
        </div>
      </div>
    </div>
  );
}
