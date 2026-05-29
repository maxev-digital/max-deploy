'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { Gauge, Ring, Sparkline } from '@/components/charts';

type EarningsData = {
  mrr: number;
  projectedAnnual: number;
  outstandingAR: number;
  overdueAR: number;
  taxReserve: number;
  capacityUsed: number;
  capacityHours: number;
  ceiling: number;
  contractBreakdown: { client: string; monthly: number; rateType: string; hoursPerWeek: number | null }[];
  arAging: { label: string; amount: number; color: string }[];
  recentPayments: { client: string; amount: number; paidAt: string; invoiceNumber: string }[];
};

const CAPACITY_WARN_PCT = 90;

export default function EarningsPage() {
  const [data, setData]       = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/earnings');
    if (res.ok) {
      const d = await res.json();
      setData(d);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';
  const cb  = 'rgba(255,255,255,0.03)';
  const green = '#14B8AD';

  const mrr = data?.mrr ?? 0;
  const mrrGoal = 10000;
  const mrrPct = mrr / mrrGoal;
  const capPct = data ? data.capacityUsed / data.ceiling : 0;
  const capColor = capPct >= CAPACITY_WARN_PCT / 100 ? '#E05252' : capPct >= 0.7 ? '#D08E14' : green;

  const mrrTrend = [0, 0, 0, 0, 0, mrr];
  const mrrLabels = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Earnings</div>
          <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>Contract MRR, invoices, tax reserve, and capacity</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {data?.overdueAR && data.overdueAR > 0 ? (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 8, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', fontSize: '0.78rem', color: '#E05252' }}>
          <AlertTriangle size={14} /> ${data.overdueAR.toLocaleString()} overdue — collect immediately
        </div>
      ) : null}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 10 }}>MRR Progress</div>
          <Gauge pct={loading ? 0 : mrrPct} color={green} label={`of $${(mrrGoal / 1000).toFixed(0)}k goal`} sub={loading ? '...' : `$${mrr.toLocaleString()}/mo`} />
        </div>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 14px 12px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 8 }}>MRR Trend</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: green, lineHeight: 1, marginBottom: 6 }}>${(mrr / 1000).toFixed(1)}k</div>
          <Sparkline data={mrrTrend} color={green} labels={mrrLabels} />
        </div>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 14px 12px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 10 }}>Capacity</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ring pct={loading ? 0 : capPct} color={capColor} center={loading ? '-' : `${Math.round(capPct * 100)}%`} sub="of ceiling" />
            <div>
              <div style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.72)', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: capColor }}>{data?.capacityUsed ?? 0}h</span> used
              </div>
              <div style={{ fontSize: '0.73rem', color: dim }}>Ceiling: {data?.ceiling ?? 0}h/wk</div>
              {capPct >= CAPACITY_WARN_PCT / 100 && (
                <div style={{ fontSize: '0.65rem', color: '#E05252', marginTop: 4, fontWeight: 600 }}>At capacity limit</div>
              )}
            </div>
          </div>
        </div>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 12 }}>Quick Stats</div>
          {[
            { label: 'Projected Annual',  value: data ? `$${Math.round(data.projectedAnnual).toLocaleString()}` : '—', color: green },
            { label: 'Outstanding AR',    value: data ? `$${data.outstandingAR.toLocaleString()}` : '—', color: '#2563EB' },
            { label: 'Tax Reserve (28%)', value: data ? `$${Math.round(data.taxReserve).toLocaleString()}` : '—', color: '#D08E14' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${bd}` }}>
              <span style={{ fontSize: '0.73rem', color: dim }}>{label}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color }}>{loading ? '—' : value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Contract Breakdown */}
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <DollarSign size={14} style={{ color: green }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C8C8C8', textTransform: 'uppercase' }}>Revenue by Engagement</span>
          </div>
          {!data?.contractBreakdown?.length ? (
            <div style={{ fontSize: '0.78rem', color: dim, fontStyle: 'italic' }}>No active contracts yet.</div>
          ) : data.contractBreakdown.map((c, i) => {
            const pct = mrr > 0 ? (c.monthly / mrr) * 100 : 0;
            const colors = ['#14B8AD', '#2563EB', '#D08E14', '#9333EA', '#E05252'];
            const color = colors[i % colors.length];
            return (
              <div key={c.client} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 500 }}>{c.client}</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: dim }}>{pct.toFixed(0)}%</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>${Math.round(c.monthly).toLocaleString()}/mo</span>
                  </div>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: `1px solid ${bd}`, paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: dim }}>Total MRR</span>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: green }}>${mrr.toLocaleString()}/mo</span>
          </div>
        </div>

        {/* AR Aging + Recent Payments */}
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 14 }}>AR Aging</div>
          {!data?.arAging?.length ? (
            <div style={{ fontSize: '0.78rem', color: green, fontWeight: 600, marginBottom: 16 }}>All invoices current — no outstanding AR.</div>
          ) : (
            <>
              {data.arAging.map(({ label, amount, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.72)' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>${amount.toLocaleString()}</span>
                </div>
              ))}
            </>
          )}

          <div style={{ borderTop: `1px solid ${bd}`, paddingTop: 14, marginTop: 6 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 10 }}>Recent Payments</div>
            {!data?.recentPayments?.length ? (
              <div style={{ fontSize: '0.78rem', color: dim, fontStyle: 'italic' }}>No payments received yet.</div>
            ) : data.recentPayments.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${bd}` }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF' }}>{p.client}</div>
                  <div style={{ fontSize: '0.65rem', color: dim }}>{p.invoiceNumber} · {new Date(p.paidAt).toLocaleDateString()}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <TrendingUp size={11} style={{ color: green }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: green }}>${p.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rate Optimization */}
      <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 14 }}>Rate & Capacity Intelligence</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Rate Floor', value: '$85/hr', detail: 'Minimum for new contract work', color: green },
            { label: 'Uncommitted Capacity', value: data ? `${Math.max(0, (data.ceiling ?? 40) - (data.capacityUsed ?? 0))}h/wk` : '—', detail: 'Available for a new engagement', color: '#2563EB' },
            { label: 'Annual Run Rate', value: data ? `$${Math.round(data.projectedAnnual).toLocaleString()}` : '—', detail: 'Contract MRR × 12', color: '#D08E14' },
          ].map(({ label, value, detail, color }) => (
            <div key={label} style={{ padding: '14px 16px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}20` }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>{loading ? '—' : value}</div>
              <div style={{ fontSize: '0.7rem', color: dim }}>{detail}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
