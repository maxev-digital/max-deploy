'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, X, Loader2, RefreshCw, Check } from 'lucide-react';

type RssFeed = { id: string; name: string; url: string; source: string; active: boolean; lastPolled: string | null; };

export default function SettingsPage() {
  const [feeds, setFeeds]       = useState<RssFeed[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [tab, setTab]           = useState<'streams' | 'profile' | 'email'>('streams');
  const [newFeed, setNewFeed]   = useState({ name: '', url: '', source: 'indeed' });
  const [addingFeed, setAddFeed] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/settings/streams');
    if (res.ok) {
      const data = await res.json();
      setFeeds(data.feeds ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addFeed(e: React.FormEvent) {
    e.preventDefault();
    setAddFeed(true);
    await fetch('/api/settings/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFeed),
    });
    setNewFeed({ name: '', url: '', source: 'indeed' });
    setAddFeed(false);
    await load();
  }

  async function toggleFeed(id: string, active: boolean) {
    await fetch(`/api/settings/streams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    await load();
  }

  async function deleteFeed(id: string) {
    await fetch(`/api/settings/streams/${id}`, { method: 'DELETE' });
    await load();
  }

  async function pollAll() {
    setSaving(true);
    await fetch('/api/settings/streams/poll', { method: 'POST' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
    await load();
  }

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';
  const cb  = 'rgba(255,255,255,0.03)';

  const TABS = [
    { key: 'streams', label: 'Data Streams' },
    { key: 'profile', label: 'Profile & Goals' },
    { key: 'email',   label: 'Email Config' },
  ] as const;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Settings</div>
        <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>Configure data streams, profile, and integrations</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${bd}`, paddingBottom: 12 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'streams' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RSS Feeds ({feeds.filter(f => f.active).length} active)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={pollAll} disabled={saving}>
                {saved ? <Check size={12} style={{ color: '#14B8AD' }} /> : saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
                {saved ? 'Polled!' : saving ? 'Polling...' : 'Poll All Now'}
              </button>
            </div>
          </div>

          {/* Add Feed */}
          <form onSubmit={addFeed} style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Feed Name</label>
              <input className="input" value={newFeed.name} onChange={e => setNewFeed(f => ({ ...f, name: e.target.value }))} placeholder="Indeed — FDE Remote" required />
            </div>
            <div style={{ flex: 2 }}>
              <label className="label">RSS URL</label>
              <input className="input" type="url" value={newFeed.url} onChange={e => setNewFeed(f => ({ ...f, url: e.target.value }))} placeholder="https://rss.indeed.com/rss?q=..." required />
            </div>
            <div style={{ width: 140 }}>
              <label className="label">Source</label>
              <select className="input" value={newFeed.source} onChange={e => setNewFeed(f => ({ ...f, source: e.target.value }))}>
                <option value="indeed">Indeed</option>
                <option value="wwr">We Work Remotely</option>
                <option value="remotive">Remotive</option>
                <option value="hn">Hacker News</option>
                <option value="google_alert">Google Alert</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={addingFeed}>
              {addingFeed ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
              Add
            </button>
          </form>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dim, fontSize: '0.85rem' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Source</th>
                    <th>URL</th>
                    <th>Last Polled</th>
                    <th>Active</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {feeds.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: dim, fontStyle: 'italic', padding: '20px' }}>No feeds configured — add your Indeed saved searches above.</td></tr>
                  ) : feeds.map(f => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500, color: '#FFFFFF' }}>{f.name}</td>
                      <td><span className="badge badge-gray">{f.source}</span></td>
                      <td style={{ fontSize: '0.72rem', color: dim, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.url}</td>
                      <td style={{ fontSize: '0.78rem', color: dim }}>{f.lastPolled ? new Date(f.lastPolled).toLocaleString() : 'Never'}</td>
                      <td>
                        <button
                          onClick={() => toggleFeed(f.id, !f.active)}
                          style={{
                            width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: f.active ? '#14B8AD' : 'rgba(255,255,255,0.1)',
                            position: 'relative', transition: 'background 0.2s',
                          }}
                        >
                          <div style={{
                            width: 14, height: 14, borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: 3, left: f.active ? 19 : 3,
                            transition: 'left 0.2s',
                          }} />
                        </button>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteFeed(f.id)}><X size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'profile' && (
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '22px', maxWidth: 640 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 16 }}>Your Profile (used by Claude for all scoring)</div>
          {[
            { label: 'Name', value: 'Will Austin' },
            { label: 'Salary Floor (FT)', value: '$120,000' },
            { label: 'Rate Floor (Contract)', value: '$85/hr' },
            { label: 'Preferred Roles', value: 'FDE, Applied AI Engineer, AI Platform Engineer, Solutions Engineer' },
            { label: 'Geography', value: 'Remote preferred, TX remote, Dallas area possible' },
            { label: 'Work Types', value: 'Full-time, Contract, or Both Simultaneously' },
            { label: 'Deal Breakers', value: 'On-site 5d/wk, <$100K, No AI component' },
            { label: 'Capacity Ceiling', value: '40 hours/week total' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${bd}` }}>
              <span style={{ fontSize: '0.76rem', color: dim }}>{label}</span>
              <span style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: 16, fontSize: '0.72rem', color: dim }}>Profile values are stored in environment variables — edit your <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>.env</code> file to update.</div>
        </div>
      )}

      {tab === 'email' && (
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '22px', maxWidth: 640 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 16 }}>Email Configuration</div>
          <div style={{ fontSize: '0.82rem', color: dim, lineHeight: 1.6, marginBottom: 20 }}>
            Email sending (SMTP) and receiving (IMAP) are configured via environment variables in your <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>.env</code> file.
          </div>
          {[
            'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM',
            'IMAP_HOST', 'IMAP_PORT', 'IMAP_USER', 'IMAP_PASS',
          ].map(key => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${bd}` }}>
              <code style={{ fontSize: '0.76rem', color: '#93C5FD' }}>{key}</code>
              <span style={{ fontSize: '0.74rem', color: dim }}>Set in .env</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
