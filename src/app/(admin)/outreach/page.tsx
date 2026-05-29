'use client';

import { useState, useEffect } from 'react';
import { Mail, Send, Loader2, RefreshCw, Plus, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Draft = {
  id: string;
  opportunityId: string;
  type: string;
  subject: string | null;
  body: string | null;
  status: string;
  sentAt: string | null;
  followUpDue: string | null;
  opportunity?: { company: string; role: string; };
};

const TYPE_LABELS: Record<string, string> = {
  cover_letter: 'Cover Letter',
  recruiter_outreach: 'Recruiter Outreach',
  follow_up: 'Follow-Up',
  gone_dark: 'Gone Dark',
  thank_you_screening: 'Thank You — Screening',
  thank_you_interview: 'Thank You — Interview',
  negotiation: 'Negotiation Response',
};

export default function OutreachPage() {
  const [drafts, setDrafts]     = useState<Draft[]>([]);
  const [loading, setLoading]   = useState(true);
  const [generating, setGen]    = useState(false);
  const [selectedId, setSelId]  = useState('');
  const [emailType, setType]    = useState('follow_up');
  const [sending, setSending]   = useState<string | null>(null);
  const [oppFilter, setFilter]  = useState('');
  const [opportunities, setOpps] = useState<{ id: string; company: string; role: string }[]>([]);

  async function load() {
    setLoading(true);
    const [dr, op] = await Promise.all([
      fetch('/api/outreach').then(r => r.ok ? r.json() : { logs: [] }),
      fetch('/api/opportunities?stage=active&minimal=1').then(r => r.ok ? r.json() : { opportunities: [] }),
    ]);
    setDrafts(dr.logs ?? []);
    setOpps(op.opportunities ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function generateDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setGen(true);
    await fetch('/api/ai/draft-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunityId: selectedId, type: emailType }),
    });
    await load();
    setGen(false);
  }

  async function sendDraft(id: string) {
    setSending(id);
    await fetch(`/api/outreach/${id}/send`, { method: 'POST' });
    await load();
    setSending(null);
  }

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';
  const cb  = 'rgba(255,255,255,0.03)';

  const filteredOpps = opportunities.filter(o =>
    !oppFilter || o.company.toLowerCase().includes(oppFilter.toLowerCase())
  );

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Outreach</div>
          <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>Claude-drafted emails — review, edit, send</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        {/* Generate panel */}
        <div>
          <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>Generate Email</div>
            <form onSubmit={generateDraft}>
              <div className="input-group">
                <label className="label">Application</label>
                <input
                  className="input"
                  placeholder="Filter applications..."
                  value={oppFilter}
                  onChange={e => setFilter(e.target.value)}
                  style={{ marginBottom: 6 }}
                />
                <select className="input" value={selectedId} onChange={e => setSelId(e.target.value)} required>
                  <option value="">Select application...</option>
                  {filteredOpps.map(o => (
                    <option key={o.id} value={o.id}>{o.company} — {o.role}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="label">Email Type</label>
                <select className="input" value={emailType} onChange={e => setType(e.target.value)}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={generating || !selectedId}>
                {generating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                {generating ? 'Drafting...' : 'Generate Draft'}
              </button>
            </form>
          </div>
        </div>

        {/* Drafts list */}
        <div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dim, fontSize: '0.85rem', padding: '30px 0' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
            </div>
          ) : drafts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: dim, fontSize: '0.85rem' }}>
              No drafts yet — generate your first email above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {drafts.map(d => (
                <div key={d.id} style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Mail size={13} style={{ color: '#2563EB' }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                          {d.opportunity?.company ?? 'Unknown'} — {d.opportunity?.role ?? ''}
                        </span>
                        <span className="badge badge-blue" style={{ fontSize: '0.6rem' }}>{TYPE_LABELS[d.type] ?? d.type}</span>
                      </div>
                      {d.subject && (
                        <div style={{ fontSize: '0.78rem', color: dim }}>Re: {d.subject}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {d.status === 'draft' && (
                        <button
                          className="btn btn-sm"
                          style={{ background: 'rgba(20,184,173,0.1)', color: '#14B8AD', border: '1px solid rgba(20,184,173,0.2)' }}
                          onClick={() => sendDraft(d.id)}
                          disabled={sending === d.id}
                        >
                          {sending === d.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
                          {sending === d.id ? 'Sending...' : 'Send'}
                        </button>
                      )}
                      {d.status === 'sent' && (
                        <span style={{ fontSize: '0.7rem', color: '#14B8AD', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} /> Sent {d.sentAt ? formatDistanceToNow(new Date(d.sentAt), { addSuffix: true }) : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {d.body && (
                    <div style={{ fontSize: '0.78rem', color: dim, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 6, border: `1px solid ${bd}` }}>
                      {d.body}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
