'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
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
  source: string | null;
  notes: string | null;
  createdAt: string;
};

const STAGES = ['target', 'applied', 'screening', 'interview', 'final', 'offer'];

const STAGE_COLORS: Record<string, string> = {
  target:    '#2563EB',
  applied:   '#D08E14',
  screening: '#9333EA',
  interview: '#14B8AD',
  final:     '#059669',
  offer:     '#16A34A',
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

  const filtered = opps.filter(o =>
    !filter || o.company.toLowerCase().includes(filter.toLowerCase()) || o.role.toLowerCase().includes(filter.toLowerCase())
  );

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';

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
          <button
            className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView('kanban')}
          >Kanban</button>
          <button
            className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView('table')}
          >Table</button>
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
            return (
              <div key={stage} style={{ minWidth: 240, flex: '0 0 240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stage}</span>
                  <span style={{ fontSize: '0.68rem', color: dim }}>{stageOpps.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stageOpps.length === 0 ? (
                    <div style={{ padding: '20px 12px', borderRadius: 8, border: `1px dashed ${bd}`, fontSize: '0.73rem', color: dim, textAlign: 'center' }}>Empty</div>
                  ) : stageOpps.map(opp => (
                    <div key={opp.id} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${bd}`,
                      borderTop: `2px solid ${color}`,
                      borderRadius: 8,
                      padding: '12px',
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 3, lineHeight: 1.3 }}>{opp.company}</div>
                      <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.55)', marginBottom: 8, lineHeight: 1.3 }}>{opp.role}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {opp.fitScore !== null && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: FIT_COLOR(opp.fitScore) }}>{opp.fitScore}</span>
                          )}
                          {opp.salaryMin && (
                            <span style={{ fontSize: '0.7rem', color: dim }}>${(opp.salaryMin / 1000).toFixed(0)}k+</span>
                          )}
                        </div>
                        {isStale(opp.lastActivity) && (
                          <span title="No activity in 14+ days" style={{ fontSize: '0.65rem', color: '#E05252', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={10} /> stale
                          </span>
                        )}
                      </div>
                      {opp.followUpDue && new Date(opp.followUpDue) <= new Date() && (
                        <div style={{ marginTop: 6, fontSize: '0.65rem', color: '#D08E14', fontWeight: 600 }}>
                          Follow-up due
                        </div>
                      )}
                      <select
                        style={{ marginTop: 8, width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${bd}`, borderRadius: 5, color: '#C8C8C8', fontSize: '0.7rem', padding: '4px 6px', cursor: 'pointer' }}
                        value={opp.stage}
                        onChange={e => moveStage(opp.id, e.target.value)}
                      >
                        {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                  ))}
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
                <th>Company</th>
                <th>Role</th>
                <th>Stage</th>
                <th>Fit</th>
                <th>Salary</th>
                <th>Source</th>
                <th>Last Activity</th>
                <th>Follow-Up</th>
                <th></th>
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
                  <td>
                    {opp.fitScore !== null ? (
                      <span style={{ fontWeight: 700, color: FIT_COLOR(opp.fitScore) }}>{opp.fitScore}</span>
                    ) : '—'}
                  </td>
                  <td>
                    {opp.salaryMin && opp.salaryMax
                      ? `$${(opp.salaryMin / 1000).toFixed(0)}k–$${(opp.salaryMax / 1000).toFixed(0)}k`
                      : '—'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: dim }}>{opp.source ?? '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: isStale(opp.lastActivity) ? '#E05252' : dim }}>
                    {opp.lastActivity ? formatDistanceToNow(new Date(opp.lastActivity), { addSuffix: true }) : '—'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: opp.followUpDue && new Date(opp.followUpDue) <= new Date() ? '#D08E14' : dim }}>
                    {opp.followUpDue ? formatDistanceToNow(new Date(opp.followUpDue), { addSuffix: true }) : '—'}
                  </td>
                  <td>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
