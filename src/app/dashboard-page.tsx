'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Sparkles, Zap, AlertTriangle, ArrowRight, TrendingUp, Clock, CheckCircle, Square, CheckSquare, Plus } from 'lucide-react';
import Link from 'next/link';
import { Gauge, Ring, Sparkline, StageBar, healthColor, healthGrade } from '@/components/charts';

type Vitals = {
  inboxCount: number;
  appliedCount: number;
  activeContracts: number;
  mrr: number;
  followUpsDue: number;
  offersActive: number;
  staleApplications: number;
  weeklyApplications: number;
};

type BriefingData = {
  briefing: string;
  urgentActions: string[];
  patterns: string[];
  vitals: Vitals;
};

const MRR_TREND  = [0, 0, 0, 0, 0, 0];
const MRR_LABELS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'May'];

const STAGE_COLORS: Record<string, string> = {
  inbox:     '#6B7280',
  target:    '#2563EB',
  applied:   '#D08E14',
  screening: '#9333EA',
  interview: '#14B8AD',
  final:     '#059669',
  offer:     '#16A34A',
};

export default function DashboardPage() {
  const [briefing, setBriefing]   = useState<BriefingData | null>(null);
  const [health, setHealth]       = useState<{ overall: number; grade: string; summary: string; dimensions: { label: string; score: number; trend: string; detail: string }[] } | null>(null);
  const [pipeline, setPipeline]   = useState<{ stage: string; count: number; color: string }[]>([]);
  const [loading, setLoading]     = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tasks, setTasks]         = useState<{ id: string; title: string; priority: string; status: string; notes: string | null }[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [newTask, setNewTask]     = useState('');
  const [addingTask, setAddingTask] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const [b, h, p, t] = await Promise.all([
        fetch('/api/ai/briefing').then(r => r.ok ? r.json() : null),
        fetch('/api/ai/health-score').then(r => r.ok ? r.json() : null),
        fetch('/api/opportunities/pipeline-summary').then(r => r.ok ? r.json() : null),
        fetch('/api/tasks').then(r => r.ok ? r.json() : null),
      ]);
      if (b) setBriefing(b);
      if (h) setHealth(h);
      if (p?.stages) setPipeline(p.stages);
      if (t) { setTasks(t.tasks ?? []); setDoneCount(t.doneCount ?? 0); }
      setUpdatedAt(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchAll();
    // Also load tasks independently so they appear fast
    fetch('/api/tasks').then(r => r.ok ? r.json() : null).then(t => {
      if (t) { setTasks(t.tasks ?? []); setDoneCount(t.doneCount ?? 0); }
    });
  }, []);

  const v = briefing?.vitals;
  const gradeColor   = healthColor(health?.overall ?? 0);
  const mrrPct       = v ? Math.min(v.mrr / 10000, 1) : 0;
  const pipelineMax  = pipeline.length > 0 ? Math.max(...pipeline.map(s => s.count), 1) : 1;

  // Funnel metrics derived from pipeline summary
  const fGet = (stage: string) => pipeline.find(s => s.stage === stage)?.count ?? 0;
  const fApplied   = fGet('applied');
  const fScreening = fGet('screening');
  const fInterview = fGet('interview');
  const fFinal     = fGet('final');
  const fOffer     = fGet('offer');
  const fRejected  = fGet('rejected');
  const fActive    = fScreening + fInterview + fFinal + fOffer;
  const fInterviewRate = fApplied > 0 ? Math.round((fActive / fApplied) * 100) : 0;
  const fOfferRate     = fApplied > 0 ? Math.round((fOffer / fApplied) * 100) : 0;
  const cb = 'rgba(255,255,255,0.03)';
  const bd = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';
  const green = '#14B8AD';

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: loading ? dim : green,
              boxShadow: loading ? 'none' : `0 0 10px ${green}`,
              animation: loading ? 'pulse 1.2s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.16em', color: '#C8C8C8', textTransform: 'uppercase' }}>
              {loading ? 'Analyzing pipeline...' : updatedAt ? `Live · ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'MAX-DEPLOY'}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', letterSpacing: '0.04em', color: '#2563EB', lineHeight: 1 }}>MAX-DEPLOY</div>
          <p style={{ margin: '5px 0 0', fontSize: '0.82rem', color: dim, fontStyle: 'italic' }}>Career Operations Platform — your search runs while you sleep.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Alerts */}
      {v && (v.followUpsDue > 0 || v.staleApplications > 0 || v.offersActive > 0) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {v.followUpsDue > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 7, background: 'rgba(208,142,20,0.08)', border: '1px solid rgba(208,142,20,0.25)', fontSize: '0.72rem', color: '#D08E14', fontWeight: 500 }}>
              <Clock size={11} /> {v.followUpsDue} follow-up{v.followUpsDue !== 1 ? 's' : ''} due today
            </div>
          )}
          {v.offersActive > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 7, background: 'rgba(20,184,173,0.08)', border: '1px solid rgba(20,184,173,0.25)', fontSize: '0.72rem', color: green, fontWeight: 500 }}>
              <CheckCircle size={11} /> {v.offersActive} active offer{v.offersActive !== 1 ? 's' : ''} — compare now
            </div>
          )}
          {v.staleApplications > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.72rem', color: '#E05252', fontWeight: 500 }}>
              <AlertTriangle size={11} /> {v.staleApplications} stale application{v.staleApplications !== 1 ? 's' : ''} — check in
            </div>
          )}
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 10 }}>Inbox Queue</div>
          <Gauge pct={loading ? 0 : Math.min((v?.inboxCount ?? 0) / 20, 1)} color="#2563EB" label="new opportunities" sub={loading ? '...' : `${v?.inboxCount ?? 0} unreviewed`} />
        </div>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 14px 12px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 8 }}>Contract MRR</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', letterSpacing: '0.04em', lineHeight: 1, marginBottom: 8, background: 'linear-gradient(135deg, #059669 0%, #34D399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>${((v?.mrr ?? 0) / 1000).toFixed(1)}k</div>
          <Sparkline data={MRR_TREND.map((_, i) => i === MRR_TREND.length - 1 ? (v?.mrr ?? 0) : 0)} color={green} labels={MRR_LABELS} />
          <div style={{ fontSize: '0.62rem', color: dim, marginTop: 5 }}>Target: $10k/mo</div>
        </div>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 14px 12px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 10 }}>Active Pipeline</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ring pct={loading ? 0 : Math.min((v?.appliedCount ?? 0) / 30, 1)} color="#2563EB" center={loading ? '-' : String(v?.appliedCount ?? 0)} sub="applied" />
            <div>
              <div style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.72)', marginBottom: 4 }}><span style={{ fontWeight: 700, color: '#2563EB' }}>{v?.appliedCount ?? 0}</span> applications</div>
              <div style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.72)', marginBottom: 4 }}><span style={{ fontWeight: 700, color: green }}>{v?.activeContracts ?? 0}</span> contracts</div>
              <div style={{ fontSize: '0.73rem', color: dim }}>{v?.weeklyApplications ?? 0} this week</div>
            </div>
          </div>
        </div>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 14px 12px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 10 }}>MRR Goal</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ring pct={mrrPct} color={green} center={`${Math.round(mrrPct * 100)}%`} sub="of $10k" />
            <div>
              <div style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.72)', marginBottom: 4 }}><span style={{ fontWeight: 700, color: green }}>${((v?.mrr ?? 0) / 1000).toFixed(1)}k</span> MRR</div>
              <div style={{ fontSize: '0.73rem', color: dim, marginBottom: 4 }}>${((10000 - (v?.mrr ?? 0)) / 1000).toFixed(1)}k to goal</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid: briefing + pipeline + health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, marginBottom: 20 }}>
        {/* Left: briefing + pipeline */}
        <div>
          {/* Morning Brief */}
          <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Sparkles size={12} style={{ color: '#2563EB' }} />
              <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase' }}>Morning Intelligence Brief</span>
              <div style={{ flex: 1, height: 1, background: bd }} />
              <span style={{ fontSize: '0.58rem', color: dim }}>Claude Sonnet</span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dim, fontSize: '0.83rem', padding: '10px 0' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating briefing...
              </div>
            ) : briefing?.briefing ? (
              <div style={{ fontSize: '0.87rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.9, whiteSpace: 'pre-wrap', animation: 'fadeUp 0.4s ease' }}>
                {briefing.briefing.replace(/\*\*/g, '')}
              </div>
            ) : (
              <div style={{ fontSize: '0.83rem', color: dim, fontStyle: 'italic' }}>Click Refresh to generate your morning brief from live data.</div>
            )}
            {briefing?.urgentActions && briefing.urgentActions.length > 0 && (
              <div style={{ marginTop: 18, borderTop: `1px solid ${bd}`, paddingTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Zap size={11} style={{ color: '#D08E14' }} />
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C8C8C8', textTransform: 'uppercase' }}>Urgent Actions</span>
                </div>
                {briefing.urgentActions.map((action, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#2563EB', fontStyle: 'italic', flexShrink: 0 }}>{['i.', 'ii.', 'iii.'][i]}</span>
                    <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>{action}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline Funnel */}
          {pipeline.length > 0 && (
            <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase' }}>Pipeline Funnel</span>
                <span style={{ fontSize: '0.68rem', color: dim }}>
                  Interview rate: <span style={{ color: '#14B8AD', fontWeight: 700 }}>{fInterviewRate}%</span>
                  {fOffer > 0 && <> · Offer rate: <span style={{ color: '#16A34A', fontWeight: 700 }}>{fOfferRate}%</span></>}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
                {([
                  { label: 'Applied',   count: fApplied,   color: '#D08E14' },
                  { label: 'Screening', count: fScreening, color: '#9333EA' },
                  { label: 'Interview', count: fInterview, color: '#14B8AD' },
                  { label: 'Final Rd',  count: fFinal,     color: '#059669' },
                  { label: 'Offers',    count: fOffer,     color: '#16A34A' },
                ] as { label: string; count: number; color: string }[]).map((step, i, arr) => (
                  <div key={step.label} style={{ position: 'relative' }}>
                    <div style={{ textAlign: 'center', padding: '10px 4px', background: `${step.color}10`, border: `1px solid ${step.color}28`, borderRadius: 8 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: step.count > 0 ? step.color : dim, lineHeight: 1 }}>{step.count}</div>
                      <div style={{ fontSize: '0.58rem', color: dim, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{step.label}</div>
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.15)', fontSize: '0.55rem', zIndex: 1 }}>▶</div>
                    )}
                  </div>
                ))}
              </div>
              {fRejected > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(224,82,82,0.06)', border: '1px solid rgba(224,82,82,0.15)', borderRadius: 6 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#E05252', lineHeight: 1 }}>{fRejected}</span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(224,82,82,0.7)' }}>rejection{fRejected !== 1 ? 's' : ''} logged — auto-detected from email</span>
                </div>
              )}
            </div>
          )}

          {/* Pipeline Stage Breakdown */}
          <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase' }}>All Stages</span>
              <div style={{ display: 'flex', gap: 12 }}>
                <Link href="/pipeline" style={{ fontSize: '0.68rem', color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Full Pipeline <ArrowRight size={10} />
                </Link>
              </div>
            </div>
            {pipeline.length > 0 ? pipeline.map(s => (
              <StageBar key={s.stage} label={s.stage.charAt(0).toUpperCase() + s.stage.slice(1)} count={s.count} max={pipelineMax} color={STAGE_COLORS[s.stage] ?? '#6B7280'} />
            )) : (
              <div style={{ fontSize: '0.78rem', color: dim, fontStyle: 'italic' }}>No pipeline data yet — add opportunities in /inbox.</div>
            )}
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <Link href="/inbox" className="btn btn-primary btn-sm">Add Opportunity</Link>
              <Link href="/intelligence" className="btn btn-secondary btn-sm">Score a JD</Link>
            </div>
          </div>
        </div>

        {/* Right: health score + vitals */}
        <div>
          {/* Health Score */}
          <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 12 }}>Pipeline Health</div>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', letterSpacing: '0.04em', lineHeight: 1, color: gradeColor }}>{loading ? '...' : health?.grade ?? '—'}</div>
              <div style={{ fontSize: '0.75rem', color: dim, marginTop: 4 }}>{health?.overall ?? 0} / 100</div>
              {health?.summary && <div style={{ fontSize: '0.65rem', color: dim, marginTop: 6, lineHeight: 1.4 }}>{health.summary}</div>}
            </div>
            {health?.dimensions && health.dimensions.map(({ label, score, trend, detail }) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: '0.7rem', color: dim }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: '0.6rem', color: dim }}>{detail}</span>
                    <span style={{ fontSize: '0.65rem', color: trend === 'up' ? green : trend === 'down' ? '#E05252' : dim }}>
                      {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: healthColor(score) }}>{score}</span>
                  </div>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: healthColor(score), borderRadius: 2, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Live Vitals */}
          <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 16px' }}>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 12 }}>Live Vitals</div>
            {[
              { label: 'Inbox Queue',         value: v ? String(v.inboxCount) : '-',          alert: false },
              { label: 'Applied',             value: v ? String(v.appliedCount) : '-',         alert: false },
              { label: 'Follow-Ups Due',      value: v ? String(v.followUpsDue) : '-',         alert: (v?.followUpsDue ?? 0) > 0 },
              { label: 'Active Contracts',    value: v ? String(v.activeContracts) : '-',      alert: false },
              { label: 'Contract MRR',        value: v ? `$${v.mrr.toLocaleString()}` : '-',   alert: false },
              { label: 'Active Offers',       value: v ? String(v.offersActive) : '-',         alert: (v?.offersActive ?? 0) > 0 },
              { label: 'Stale Apps (14d+)',   value: v ? String(v.staleApplications) : '-',   alert: (v?.staleApplications ?? 0) > 0 },
            ].map(({ label, value, alert }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${bd}` }}>
                <span style={{ fontSize: '0.74rem', color: dim }}>{label}</span>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: loading ? '#C8C8C8' : alert ? '#E05252' : '#FFFFFF' }}>{loading ? '-' : value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase' }}>Task List</span>
            <span style={{ fontSize: '0.6rem', color: dim }}>{tasks.length} open · {doneCount} done</span>
          </div>
          <Link href="/tasks" style={{ fontSize: '0.68rem', color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            Board view <ArrowRight size={10} />
          </Link>
        </div>

        {/* Add task inline */}
        <form onSubmit={async e => {
          e.preventDefault();
          if (!newTask.trim()) return;
          setAddingTask(true);
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTask.trim(), priority: 'MEDIUM' }),
          });
          setNewTask('');
          const t = await fetch('/api/tasks').then(r => r.json());
          setTasks(t.tasks ?? []); setDoneCount(t.doneCount ?? 0);
          setAddingTask(false);
        }} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            placeholder="Add a task..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${bd}`, borderRadius: 7, padding: '7px 12px', fontSize: '0.8rem', color: '#fff', outline: 'none' }}
          />
          <button type="submit" disabled={addingTask || !newTask.trim()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#2563EB', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>
            <Plus size={12} /> Add
          </button>
        </form>

        {/* Task rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tasks.length === 0 && (
            <div style={{ fontSize: '0.78rem', color: dim, fontStyle: 'italic', padding: '8px 0' }}>All caught up — no open tasks.</div>
          )}
          {tasks.map(task => {
            const priColor = task.priority === 'HIGH' ? '#E05252' : task.priority === 'MEDIUM' ? '#D08E14' : dim;
            const done = task.status === 'DONE';
            return (
              <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'}
              >
                <button
                  onClick={async () => {
                    const nextStatus = done ? 'TODO' : task.status === 'TODO' ? 'IN_PROGRESS' : 'DONE';
                    await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) });
                    const t = await fetch('/api/tasks').then(r => r.json());
                    setTasks(t.tasks ?? []); setDoneCount(t.doneCount ?? 0);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: done ? '#14B8AD' : task.status === 'IN_PROGRESS' ? '#2563EB' : dim, padding: 0, marginTop: 1, flexShrink: 0 }}
                  title={done ? 'Mark todo' : task.status === 'TODO' ? 'Mark in progress' : 'Mark done'}
                >
                  {done ? <CheckSquare size={15} /> : task.status === 'IN_PROGRESS' ? <CheckSquare size={15} style={{ opacity: 0.5 }} /> : <Square size={15} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: done ? dim : '#FFFFFF', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.4 }}>{task.title}</div>
                  {task.notes && !done && <div style={{ fontSize: '0.7rem', color: dim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.notes}</div>}
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: priColor, flexShrink: 0, marginTop: 2 }}>{task.priority}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Nav */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {[
          { href: '/inbox',        label: 'Review Inbox',      sub: 'Score new opportunities',     color: '#2563EB' },
          { href: '/outreach',     label: 'Send Follow-Ups',   sub: 'Draft queue ready',            color: '#D08E14' },
          { href: '/intelligence', label: 'Score a JD',        sub: 'Paste any job description',   color: '#9333EA' },
          { href: '/earnings',     label: 'Earnings Dash',     sub: 'MRR, invoices, capacity',     color: green },
          { href: '/settings',     label: 'Configure Streams', sub: 'RSS, ATS watchlist, email',   color: '#6B7280' },
        ].map(({ href, label, sub, color }) => (
          <Link key={href} href={href} style={{
            display: 'block', padding: '14px 16px', borderRadius: 10,
            background: cb, border: `1px solid ${bd}`,
            transition: 'border-color 0.15s',
            textDecoration: 'none',
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '0.69rem', color: dim, lineHeight: 1.4 }}>{sub}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
