'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Loader2, X, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Contract = {
  id: string;
  client: string;
  projectName: string;
  rateType: string;
  rate: number;
  hoursPerWeek: number | null;
  totalValue: number | null;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean;
  renewalNoticeDays: number | null;
  status: string;
  sowUrl: string | null;
  notes: string | null;
  milestones: { id: string; name: string; dueDate: string | null; value: number | null; status: string }[];
  createdAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  proposed:  '#6B7280',
  active:    '#14B8AD',
  paused:    '#D08E14',
  completed: '#2563EB',
  cancelled: '#E05252',
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    client: '', projectName: '', rateType: 'hourly', rate: '', hoursPerWeek: '', totalValue: '', notes: '', status: 'active',
  });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/contracts');
    if (res.ok) {
      const data = await res.json();
      setContracts(data.contracts ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        rate: Number(form.rate),
        hoursPerWeek: form.hoursPerWeek ? Number(form.hoursPerWeek) : null,
        totalValue: form.totalValue ? Number(form.totalValue) : null,
      }),
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ client: '', projectName: '', rateType: 'hourly', rate: '', hoursPerWeek: '', totalValue: '', notes: '', status: 'active' });
    await load();
  }

  const active   = contracts.filter(c => c.status === 'active');
  const mrr      = active.reduce((sum, c) => {
    if (c.rateType === 'hourly') return sum + (c.rate * (c.hoursPerWeek ?? 0) * 52) / 12;
    if (c.rateType === 'monthly') return sum + c.rate;
    if (c.rateType === 'weekly') return sum + c.rate * 4.33;
    return sum;
  }, 0);

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';
  const cb  = 'rgba(255,255,255,0.03)';

  const endingSoon = active.filter(c => {
    if (!c.endDate || !c.renewalNoticeDays) return false;
    const daysUntil = (new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil <= c.renewalNoticeDays;
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Contracts</div>
          <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>{active.length} active — ${Math.round(mrr).toLocaleString()}/mo contract MRR</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}><Plus size={13} /> Add Contract</button>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}><RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /></button>
        </div>
      </div>

      {endingSoon.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {endingSoon.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 8, background: 'rgba(208,142,20,0.08)', border: '1px solid rgba(208,142,20,0.25)', fontSize: '0.75rem', color: '#D08E14' }}>
              <AlertTriangle size={13} />
              {c.client} — {c.projectName} ends {c.endDate ? formatDistanceToNow(new Date(c.endDate), { addSuffix: true }) : ''} — renewal notice needed
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>Add Contract</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={13} /></button>
          </div>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Client *</label>
                <input className="input" required value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="Acme Corp" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Project Name *</label>
                <input className="input" required value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} placeholder="AI Integration Platform" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Rate Type</label>
                <select className="input" value={form.rateType} onChange={e => setForm(f => ({ ...f, rateType: e.target.value }))}>
                  <option value="hourly">Hourly</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Rate ($) *</label>
                <input className="input" type="number" required value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder="125" />
              </div>
              {form.rateType === 'hourly' && (
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="label">Hours/Week</label>
                  <input className="input" type="number" value={form.hoursPerWeek} onChange={e => setForm(f => ({ ...f, hoursPerWeek: e.target.value }))} placeholder="20" />
                </div>
              )}
              {form.rateType === 'fixed' && (
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="label">Total Value ($)</label>
                  <input className="input" type="number" value={form.totalValue} onChange={e => setForm(f => ({ ...f, totalValue: e.target.value }))} placeholder="15000" />
                </div>
              )}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="proposed">Proposed</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
            <div className="input-group" style={{ margin: '0 0 12px' }}>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="SOW details, renewal terms, contact..." />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
              {saving ? 'Saving...' : 'Add Contract'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dim, fontSize: '0.85rem', padding: '30px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
        </div>
      ) : contracts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: dim, fontSize: '0.85rem' }}>No contracts yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {contracts.map(c => {
            const monthlyValue = c.rateType === 'hourly' ? (c.rate * (c.hoursPerWeek ?? 0) * 52) / 12
              : c.rateType === 'monthly' ? c.rate
              : c.rateType === 'weekly' ? c.rate * 4.33 : null;
            return (
              <div key={c.id} style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>{c.client}</span>
                      <span style={{ fontSize: '0.78rem', color: dim }}>— {c.projectName}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: STATUS_COLOR[c.status] ?? dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: dim }}>
                        ${c.rate.toLocaleString()}/{c.rateType === 'hourly' ? 'hr' : c.rateType === 'monthly' ? 'mo' : c.rateType === 'weekly' ? 'wk' : 'fixed'}
                        {c.rateType === 'hourly' && c.hoursPerWeek ? ` · ${c.hoursPerWeek}h/wk` : ''}
                      </span>
                      {monthlyValue !== null && (
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14B8AD' }}>${Math.round(monthlyValue).toLocaleString()}/mo</span>
                      )}
                      {c.endDate && (
                        <span style={{ fontSize: '0.78rem', color: dim }}>ends {new Date(c.endDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  {c.notes && (
                    <div style={{ fontSize: '0.74rem', color: dim, maxWidth: 300, textAlign: 'right', lineHeight: 1.4 }}>{c.notes}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
