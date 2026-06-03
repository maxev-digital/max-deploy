'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Clock, BookOpen, X, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Opportunity = {
  id: string;
  company: string;
  role: string;
  stage: string;
  fitScore: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  classification: string | null;
  lastActivity: string | null;
  followUpDue: string | null;
  appliedAt: string | null;
  source: string | null;
  notes: string | null;
  createdAt: string;
};

type PrepQuestion = {
  category: string;
  question: string;
  suggestedAnswer: string;
};

const STAGES = ['target', 'applied', 'screening', 'interview', 'final', 'offer'];
const PREP_STAGES = new Set(['screening', 'interview', 'final', 'offer']);

const STAGE_COLORS: Record<string, string> = {
  target:    '#2563EB',
  applied:   '#D08E14',
  screening: '#9333EA',
  interview: '#14B8AD',
  final:     '#059669',
  offer:     '#16A34A',
};

const CAT_COLOR: Record<string, string> = {
  Behavioral: '#2563EB', Technical: '#14B8AD', 'System Design': '#8B5CF6',
  Product: '#D08E14', Culture: '#14B8AD', Situational: '#E05252',
};

const FIT_COLOR = (score: number) => {
  if (score >= 80) return '#14B8AD';
  if (score >= 65) return '#2563EB';
  if (score >= 50) return '#D08E14';
  return '#E05252';
};

export default function PipelinePage() {
  const [opps, setOpps]         = useState<Opportunity[]>([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<'kanban' | 'table'>('kanban');
  const [filter, setFilter]     = useState('');

  // Interview prep panel state
  const [prepOpp, setPrepOpp]         = useState<Opportunity | null>(null);
  const [prepQuestions, setPrepQuestions] = useState<PrepQuestion[]>([]);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepCached, setPrepCached]   = useState(false);
  const [expandedQ, setExpandedQ]     = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/opportunities?stage=active');
    if (res.ok) {
      const data = await res.json();
      setOpps(data.opportunities ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function moveStage(id: string, stage: string) {
    await fetch(`/api/opportunities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    await load();
  }

  async function openPrep(opp: Opportunity) {
    setPrepOpp(opp);
    setPrepQuestions([]);
    setExpandedQ(null);
    setPrepLoading(true);
    const res = await fetch('/api/ai/interview-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oppId: opp.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setPrepQuestions(data.questions ?? []);
      setPrepCached(data.cached ?? false);
    }
    setPrepLoading(false);
  }

  async function refreshPrep() {
    if (!prepOpp) return;
    // Clear cache then regenerate
    await fetch('/api/ai/interview-prep', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oppId: prepOpp.id }),
    });
    setPrepQuestions([]);
    setExpandedQ(null);
    setPrepLoading(true);
    const res = await fetch('/api/ai/interview-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oppId: prepOpp.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setPrepQuestions(data.questions ?? []);
      setPrepCached(false);
    }
    setPrepLoading(false);
  }

  const filtered = opps.filter(o =>
    !filter || o.company.toLowerCase().includes(filter.toLowerCase()) || o.role.toLowerCase().includes(filter.toLowerCase())
  );

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';

  const daysAgo = (date: string | null) => {
    if (!date) return null;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  };

  const urgencyColor = (opp: Opportunity): string => {
    const d = daysAgo(opp.lastActivity ?? opp.appliedAt);
    if (d === null) return 'rgba(255,255,255,0.15)';
    if (d < 7)  return '#14B8AD';
    if (d < 14) return '#D08E14';
    return '#E05252';
  };

  const isStale = (lastActivity: string | null) => {
    if (!lastActivity) return false;
    return new Date().getTime() - new Date(lastActivity).getTime() > 14 * 24 * 60 * 60 * 1000;
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Pipeline</div>
          <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>{filtered.length} active applications</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="input" style={{ width: 220 }} placeholder="Filter by company or role..." value={filter} onChange={e => setFilter(e.target.value)} />
          <button className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('kanban')}>Kanban</button>
          <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('table')}>Table</button>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dim, fontSize: '0.85rem', padding: '30px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading pipeline...
        </div>
      ) : view === 'kanban' ? (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {STAGES.map(stage => {
            const stageOpps = filtered.filter(o => o.stage === stage);
            const color = STAGE_COLORS[stage] ?? '#6B7280';
            const showPrep = PREP_STAGES.has(stage);
            return (
              <div key={stage} style={{ minWidth: 240, flex: '0 0 240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stage}</span>
                  <span style={{ fontSize: '0.68rem', color: dim }}>{stageOpps.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stageOpps.length === 0 ? (
                    <div style={{ padding: '20px 12px', borderRadius: 8, border: `1px dashed ${bd}`, fontSize: '0.73rem', color: dim, textAlign: 'center' }}>Empty</div>
                  ) : stageOpps.map(opp => {
                    const urg  = urgencyColor(opp);
                    const days = daysAgo(opp.lastActivity ?? opp.appliedAt);
                    const followUpOverdue = opp.followUpDue && new Date(opp.followUpDue) <= new Date();
                    return (
                      <div key={opp.id} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${bd}`,
                        borderLeft: `3px solid ${urg}`,
                        borderRadius: 8,
                        padding: '11px',
                      }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 2, lineHeight: 1.3 }}>{opp.company}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.52)', marginBottom: 7, lineHeight: 1.3 }}>{opp.role}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            {opp.fitScore !== null && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: FIT_COLOR(opp.fitScore) }}>{opp.fitScore}</span>
                            )}
                            {opp.salaryMin && (
                              <span style={{ fontSize: '0.68rem', color: dim }}>${(opp.salaryMin / 1000).toFixed(0)}k+</span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.62rem', color: urg, fontWeight: 600 }}>
                            {days !== null ? `${days}d` : ''}
                          </span>
                        </div>
                        {followUpOverdue && (
                          <div style={{ fontSize: '0.62rem', color: '#D08E14', fontWeight: 600, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={9} /> Follow-up due
                          </div>
                        )}
                        <select
                          style={{ marginTop: 8, width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${bd}`, borderRadius: 5, color: '#C8C8C8', fontSize: '0.7rem', padding: '4px 6px', cursor: 'pointer' }}
                          value={opp.stage}
                          onChange={e => moveStage(opp.id, e.target.value)}
                        >
                          {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          <option value="accepted">Accepted</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        {showPrep && (
                          <button
                            onClick={() => openPrep(opp)}
                            style={{
                              marginTop: 7, width: '100%', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', gap: 5, padding: '5px 0',
                              background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.25)',
                              borderRadius: 5, color: '#A78BFA', fontSize: '0.68rem', fontWeight: 700,
                              cursor: 'pointer', letterSpacing: '0.06em',
                            }}
                          >
                            <BookOpen size={10} /> Prep for Interview
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th><th>Role</th><th>Stage</th><th>Fit</th>
                <th>Salary</th><th>Source</th><th>Last Activity</th><th>Follow-Up</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: dim, fontStyle: 'italic', padding: '30px' }}>No applications in pipeline.</td></tr>
              ) : filtered.map(opp => (
                <tr key={opp.id}>
                  <td style={{ fontWeight: 600, color: '#FFFFFF' }}>{opp.company}</td>
                  <td>{opp.role}</td>
                  <td>
                    <span className="badge" style={{ background: `${STAGE_COLORS[opp.stage] ?? '#6B7280'}18`, color: STAGE_COLORS[opp.stage] ?? '#C8C8C8', border: `1px solid ${STAGE_COLORS[opp.stage] ?? '#6B7280'}33` }}>
                      {opp.stage}
                    </span>
                  </td>
                  <td>{opp.fitScore !== null ? <span style={{ fontWeight: 700, color: FIT_COLOR(opp.fitScore) }}>{opp.fitScore}</span> : '—'}</td>
                  <td>{opp.salaryMin && opp.salaryMax ? `$${(opp.salaryMin/1000).toFixed(0)}k–$${(opp.salaryMax/1000).toFixed(0)}k` : '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: dim }}>{opp.source ?? '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: isStale(opp.lastActivity) ? '#E05252' : dim }}>
                    {opp.lastActivity ? formatDistanceToNow(new Date(opp.lastActivity), { addSuffix: true }) : '—'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: opp.followUpDue && new Date(opp.followUpDue) <= new Date() ? '#D08E14' : dim }}>
                    {opp.followUpDue ? formatDistanceToNow(new Date(opp.followUpDue), { addSuffix: true }) : '—'}
                  </td>
                  <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${bd}`, borderRadius: 5, color: '#C8C8C8', fontSize: '0.72rem', padding: '4px 6px', cursor: 'pointer' }}
                      value={opp.stage}
                      onChange={e => moveStage(opp.id, e.target.value)}
                    >
                      {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                    {PREP_STAGES.has(opp.stage) && (
                      <button
                        onClick={() => openPrep(opp)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 5, color: '#A78BFA', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <BookOpen size={10} /> Prep
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Interview Prep slide-out panel */}
      {prepOpp && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setPrepOpp(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }}
          />
          {/* Panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 560,
            background: '#0F1117', borderLeft: '1px solid rgba(255,255,255,0.1)',
            zIndex: 51, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <BookOpen size={14} style={{ color: '#8B5CF6' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Interview Prep</span>
                  {prepCached && !prepLoading && (
                    <span style={{ fontSize: '0.6rem', color: '#14B8AD', background: 'rgba(20,184,173,0.1)', border: '1px solid rgba(20,184,173,0.2)', borderRadius: 10, padding: '1px 7px' }}>cached</span>
                  )}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>{prepOpp.company}</div>
                <div style={{ fontSize: '0.78rem', color: dim }}>{prepOpp.role}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!prepLoading && prepQuestions.length > 0 && (
                  <button
                    onClick={refreshPrep}
                    title="Regenerate questions"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: dim, padding: 4, borderRadius: 6 }}
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
                <button
                  onClick={() => setPrepOpp(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: dim, padding: 4, borderRadius: 6 }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {prepLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: dim }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#8B5CF6' }} />
                  <div style={{ fontSize: '0.84rem' }}>Claude is generating tailored questions...</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)' }}>Using your profile, project history, and prior fit analysis</div>
                </div>
              ) : prepQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', color: dim, padding: '40px 0', fontSize: '0.84rem' }}>
                  No questions generated. Try refreshing.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {prepQuestions.map((q, i) => {
                    const color = CAT_COLOR[q.category] ?? '#C8C8C8';
                    const open = expandedQ === i;
                    return (
                      <div key={i} style={{
                        borderRadius: 10, border: `1px solid ${color}22`,
                        borderLeft: `3px solid ${color}`,
                        background: `${color}06`, overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => setExpandedQ(open ? null : i)}
                          style={{
                            width: '100%', padding: '13px 16px', display: 'flex',
                            alignItems: 'flex-start', gap: 10, background: 'transparent',
                            border: 'none', cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0, marginTop: 3, minWidth: 72 }}>{q.category}</span>
                          <span style={{ fontSize: '0.84rem', color: '#FFFFFF', fontWeight: 600, lineHeight: 1.35, flex: 1 }}>{q.question}</span>
                          <span style={{ color: dim, fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{open ? '−' : '+'}</span>
                        </button>
                        {open && (
                          <div style={{ padding: '0 16px 16px 98px', borderTop: `1px solid ${color}15` }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, paddingTop: 12 }}>Suggested Answer</div>
                            <div style={{ fontSize: '0.80rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.75 }}>{q.suggestedAnswer}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {!prepLoading && prepQuestions.length > 0 && (
              <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                {prepCached ? 'Cached — click refresh to regenerate with updated profile' : 'Generated and cached — click + on each question to expand'}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
