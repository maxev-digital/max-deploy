'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Loader2, X, Linkedin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Contact = {
  id: string;
  name: string;
  email: string | null;
  linkedin: string | null;
  role: string | null;
  companyId: string | null;
  opportunityId: string | null;
  lastContact: string | null;
  warmth: string;
  notes: string | null;
  createdAt: string;
};

const WARMTH_COLOR: Record<string, string> = { cold: '#6B7280', warm: '#D08E14', hot: '#14B8AD' };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState('');
  const [form, setForm]         = useState({ name: '', email: '', linkedin: '', role: 'recruiter', notes: '', warmth: 'cold' });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/contacts');
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowAdd(false);
    setForm({ name: '', email: '', linkedin: '', role: 'recruiter', notes: '', warmth: 'cold' });
    await load();
  }

  const filtered = contacts.filter(c =>
    !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || c.email?.toLowerCase().includes(filter.toLowerCase())
  );

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Contacts</div>
          <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>Recruiter and hiring manager relationship tracker — {contacts.length} contacts</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" style={{ width: 220 }} placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={13} /> Add Contact
          </button>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {showAdd && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${bd}`, borderRadius: 12, padding: '20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>Add Contact</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={13} /></button>
          </div>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Name *</label>
                <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">LinkedIn URL</label>
                <input className="input" value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="label">Role Type</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="recruiter">Recruiter</option>
                  <option value="hiring_manager">Hiring Manager</option>
                  <option value="referral">Referral</option>
                  <option value="other">Other</option>
                </select>
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
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Met at, referred by, context..." />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
              {saving ? 'Saving...' : 'Add Contact'}
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
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Warmth</th>
                <th>Last Contact</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: dim, fontStyle: 'italic', padding: '30px' }}>No contacts yet.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: '#FFFFFF' }}>{c.name}</td>
                  <td><span style={{ fontSize: '0.74rem', color: dim, textTransform: 'capitalize' }}>{c.role?.replace(/_/g, ' ') ?? '—'}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>{c.email ?? '—'}</td>
                  <td>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: WARMTH_COLOR[c.warmth] ?? dim, textTransform: 'capitalize' }}>{c.warmth}</span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: dim }}>
                    {c.lastContact ? formatDistanceToNow(new Date(c.lastContact), { addSuffix: true }) : 'Never'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: dim, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.notes ?? '—'}
                  </td>
                  <td>
                    {c.linkedin && (
                      <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="LinkedIn">
                        <Linkedin size={13} />
                      </a>
                    )}
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
