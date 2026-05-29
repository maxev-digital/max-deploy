'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Loader2, X, Send, Check, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Invoice = {
  id: string;
  invoiceNumber: string;
  client: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  dueDate: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  paidAt: string | null;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
  lineItems: { description: string; qty: number; rate: number; total: number }[];
  createdAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  draft:   '#6B7280',
  sent:    '#2563EB',
  viewed:  '#9333EA',
  paid:    '#14B8AD',
  overdue: '#E05252',
  void:    '#6B7280',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({
    client: '', description: '', qty: '1', rate: '', notes: '', dueInDays: '30',
  });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/invoices');
    if (res.ok) {
      const data = await res.json();
      setInvoices(data.invoices ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const qty = Number(form.qty), rate = Number(form.rate);
    const subtotal = qty * rate;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(form.dueInDays));
    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: form.client,
        lineItems: [{ description: form.description, qty, rate, total: subtotal }],
        subtotal, taxRate: 0, taxAmount: 0, total: subtotal,
        dueDate: dueDate.toISOString(), notes: form.notes,
      }),
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ client: '', description: '', qty: '1', rate: '', notes: '', dueInDays: '30' });
    await load();
  }

  async function markPaid(id: string) {
    await fetch(`/api/invoices/${id}/paid`, { method: 'POST' });
    await load();
  }

  async function sendInvoice(id: string) {
    await fetch(`/api/invoices/${id}/send`, { method: 'POST' });
    await load();
  }

  const outstanding = invoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status));
  const totalAR     = outstanding.reduce((s, i) => s + i.total, 0);
  const overdue     = invoices.filter(i => i.status === 'overdue');

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';
  const cb  = 'rgba(255,255,255,0.03)';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Invoices</div>
          <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>
            ${totalAR.toLocaleString()} outstanding · {overdue.length > 0 ? `${overdue.length} overdue` : 'all current'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}><Plus size={13} /> New Invoice</button>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}><RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /></button>
        </div>
      </div>

      {overdue.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {overdue.map(i => (
            <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 8, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', fontSize: '0.75rem', color: '#E05252' }}>
              <AlertTriangle size={13} />
              Invoice {i.invoiceNumber} — {i.client} — ${i.total.toLocaleString()} — overdue {i.dueDate ? formatDistanceToNow(new Date(i.dueDate), { addSuffix: true }) : ''}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>Create Invoice</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={13} /></button>
          </div>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Client *</label>
                <input className="input" required value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="Acme Corp" />
              </div>
              <div className="input-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                <label className="label">Description *</label>
                <input className="input" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="AI integration consulting — May 2026" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Due In (Days)</label>
                <input className="input" type="number" value={form.dueInDays} onChange={e => setForm(f => ({ ...f, dueInDays: e.target.value }))} />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Qty</label>
                <input className="input" type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} min="1" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Rate ($) *</label>
                <input className="input" type="number" required value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder="125" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Total</label>
                <div className="input" style={{ color: '#14B8AD', fontWeight: 700 }}>
                  ${(Number(form.qty || 0) * Number(form.rate || 0)).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="input-group" style={{ margin: '0 0 12px' }}>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment instructions, PO number..." />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
              {saving ? 'Creating...' : 'Create Invoice'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dim, fontSize: '0.85rem', padding: '30px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due</th>
                <th>Sent</th>
                <th>Paid</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: dim, fontStyle: 'italic', padding: '30px' }}>No invoices yet.</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600, color: '#FFFFFF', fontFamily: 'monospace', fontSize: '0.8rem' }}>{inv.invoiceNumber}</td>
                  <td style={{ fontWeight: 500 }}>{inv.client}</td>
                  <td style={{ fontWeight: 700, color: inv.status === 'paid' ? '#14B8AD' : '#FFFFFF' }}>${inv.total.toLocaleString()}</td>
                  <td>
                    <span className="badge" style={{ background: `${STATUS_COLOR[inv.status] ?? '#6B7280'}18`, color: STATUS_COLOR[inv.status] ?? '#C8C8C8', border: `1px solid ${STATUS_COLOR[inv.status] ?? '#6B7280'}33` }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: inv.status === 'overdue' ? '#E05252' : dim }}>
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: dim }}>{inv.sentAt ? formatDistanceToNow(new Date(inv.sentAt), { addSuffix: true }) : '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: inv.paidAt ? '#14B8AD' : dim }}>
                    {inv.paidAt ? formatDistanceToNow(new Date(inv.paidAt), { addSuffix: true }) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {inv.status === 'draft' && (
                        <button className="btn btn-sm" style={{ background: 'rgba(37,99,235,0.1)', color: '#93C5FD', border: '1px solid rgba(37,99,235,0.2)' }} onClick={() => sendInvoice(inv.id)}>
                          <Send size={11} /> Send
                        </button>
                      )}
                      {['sent', 'viewed', 'overdue'].includes(inv.status) && (
                        <button className="btn btn-sm" style={{ background: 'rgba(20,184,173,0.1)', color: '#14B8AD', border: '1px solid rgba(20,184,173,0.2)' }} onClick={() => markPaid(inv.id)}>
                          <Check size={11} /> Mark Paid
                        </button>
                      )}
                    </div>
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
