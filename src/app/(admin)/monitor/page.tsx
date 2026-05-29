'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Opportunity = {
  id: string;
  company: string;
  role: string;
  stage: string;
  lastActivity: string | null;
  followUpDue: string | null;
  appliedAt: string | null;
  fitScore: number | null;
};

const URGENCY = (opp: Opportunity): 'red' | 'amber' | 'green' => {
  const now = Date.now();
  if (opp.followUpDue && new Date(opp.followUpDue).getTime() < now) return 'red';
  const lastAct = opp.lastActivity ? new Date(opp.lastActivity).getTime() : (opp.appliedAt ? new Date(opp.appliedAt).getTime() : now);
  const days = (now - lastAct) / (1000 * 60 * 60 * 24);
  if (days >= 14) return 'red';
  if (days >= 7)  return 'amber';
  return 'green';
};

const URGENCY_COLOR = { red: '#E05252', amber: '#D08E14', green: '#14B8AD' };

const STAGE_ORDER = ['applied', 'screening', 'interview', 'final', 'offer'];

export default function MonitorPage() {
  const [opps, setOpps]       = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/opportunities?stage=active');
    if (res.ok) {
      const data = await res.json();
      setOpps((data.opportunities ?? []).filter((o: Opportunity) => STAGE_ORDER.includes(o.stage)));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const sorted = [...opps].sort((a, b) => {
    const urgencyOrder = { red: 0, amber: 1, green: 2 };
    return urgencyOrder[URGENCY(a)] - urgencyOrder[URGENCY(b)];
  });

  const redCount   = sorted.filter(o => URGENCY(o) === 'red').length;
  const amberCount = sorted.filter(o => URGENCY(o) === 'amber').length;
  const greenCount = sorted.filter(o => URGENCY(o) === 'green').length;

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Monitor</div>
          <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>Application urgency grid — color-coded by follow-up status</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { count: redCount,   color: '#E05252', icon: AlertTriangle, label: 'Urgent — follow up now' },
          { count: amberCount, color: '#D08E14', icon: Clock,         label: 'Needs attention (7d+)' },
          { count: greenCount, color: '#14B8AD', icon: CheckCircle,   label: 'Active — no action needed' },
        ].map(({ count, color, icon: Icon, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 8, background: `${color}08`, border: `1px solid ${color}22`, flex: 1 }}>
            <Icon size={14} style={{ color }} />
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: '0.68rem', color: dim }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dim, fontSize: '0.85rem', padding: '30px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading pipeline...
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: dim, fontSize: '0.85rem' }}>No active applications to monitor.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {sorted.map(opp => {
            const urgency = URGENCY(opp);
            const color   = URGENCY_COLOR[urgency];
            const lastAct = opp.lastActivity || opp.appliedAt;
            return (
              <div key={opp.id} style={{
                padding: '16px 18px',
                borderRadius: 10,
                background: `${color}06`,
                border: `1px solid ${color}22`,
                borderLeft: `3px solid ${color}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2, marginBottom: 2 }}>{opp.company}</div>
                    <div style={{ fontSize: '0.75rem', color: dim, lineHeight: 1.3 }}>{opp.role}</div>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, marginLeft: 8 }}>
                    {urgency}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: '0.65rem', background: `${color}15`, color, border: `1px solid ${color}30`, borderRadius: 20, padding: '2px 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {opp.stage}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: dim }}>
                    {lastAct ? formatDistanceToNow(new Date(lastAct), { addSuffix: true }) : 'no activity'}
                  </span>
                </div>
                {opp.followUpDue && new Date(opp.followUpDue) <= new Date() && (
                  <div style={{ marginTop: 8, fontSize: '0.68rem', color: '#D08E14', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> Follow-up overdue
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
