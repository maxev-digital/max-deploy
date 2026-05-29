'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Building2, ExternalLink, Loader2, X } from 'lucide-react';

type Company = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  atsType: string | null;
  atsSlug: string | null;
  warmth: string;
  notes: string | null;
  watchlist: boolean;
  lastPolled: string | null;
  createdAt: string;
};

const WARMTH_COLOR: Record<string, string> = { cold: '#6B7280', warm: '#D08E14', hot: '#E05252' };
const ATS_LABELS: Record<string, string> = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', workday: 'Workday', none: 'No ATS' };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [filter, setFilter]       = useState('');
  const [form, setForm]           = useState({
    name: '', website: '', industry: '', size: '', atsType: 'greenhouse', atsSlug: '', warmth: 'cold', notes: '',
  });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/companies');
    if (res.ok) {
      const data = await res.json();
      setCompanies(data.companies ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, watchlist: true }),
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ name: '', website: '', industry: '', size: '', atsType: 'greenhouse', atsSlug: '', warmth: 'cold', notes: '' });
    await load();
  }

  async function pollCompany(id: string) {
    await fetch(`/api/companies/${id}/poll`, { method: 'POST' });
    await load();
  }

  const filtered = companies.filter(c => !filter || c.name.toLowerCase().includes(filter.toLowerCase()));
  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Companies</div>
          <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>Target company CRM — {companies.filter(c => c.watchlist).length} on watchlist</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" style={{ width: 220 }} placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={13} /> Add Company
          </button>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {showAdd && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${bd}`, borderRadius: 12, padding: '20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>Add Target Company</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={13} /></button>
          </div>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Company Name *</label>
                <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Anthropic" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Website</label>
                <input className="input" type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Industry</label>
                <input className="input" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="AI / ML" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">ATS Type</label>
                <select className="input" value={form.atsType} onChange={e => setForm(f => ({ ...f, atsType: e.target.value }))}>
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                  <option value="ashby">Ashby</option>
                  <option value="workday">Workday</option>
                  <option value="none">None / Other</option>
                </select>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">ATS Slug</label>
                <input className="input" value={form.atsSlug} onChange={e => setForm(f => ({ ...f, atsSlug: e.target.value }))} placeholder="anthropic" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Warmth</label>
                <select className="input" value={form.warmth} onChange={e => setForm(f => ({ ...f, warmth: e.target.value }))}>
                  <option value="cold">Cold</option>
                  <option value="warm">Warm</option>
                  <option value="hot">Hot</option>
                </select>
              </div>
            </div>
            <div className="input-group" style={{ margin: '0 0 12px' }}>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Connection at company, referral, context..." />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
              {saving ? 'Saving...' : 'Add to Watchlist'}
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
                <th>Company</th>
                <th>Industry</th>
                <th>ATS</th>
                <th>Warmth</th>
                <th>Last Polled</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: dim, fontStyle: 'italic', padding: '30px' }}>No companies yet — add your target list above.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={14} style={{ color: dim, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{c.name}</div>
                        {c.website && (
                          <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: '#2563EB', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <ExternalLink size={10} /> {c.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{c.industry ?? '—'}</td>
                  <td>
                    {c.atsType ? (
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{ATS_LABELS[c.atsType] ?? c.atsType}</div>
                        {c.atsSlug && <div style={{ fontSize: '0.68rem', color: dim }}>{c.atsSlug}</div>}
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: WARMTH_COLOR[c.warmth] ?? dim, textTransform: 'capitalize' }}>
                      {c.warmth}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: dim }}>
                    {c.lastPolled ? new Date(c.lastPolled).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: dim, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.notes ?? '—'}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => pollCompany(c.id)} title="Poll ATS now">
                      <RefreshCw size={12} />
                    </button>
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
