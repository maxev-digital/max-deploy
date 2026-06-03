'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, X, Loader2, RefreshCw, Check, Info, Rss, User, Mail, Zap, AlertTriangle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

type RssFeed = {
  id: string; name: string; url: string; source: string; active: boolean;
  lastPolled: string | null; lastError: string | null; consecutiveFailures: number;
};
type FeedTemplate = { id: string; name: string; url: string; source: string; category: string; description: string | null; };
type Profile = {
  name: string; email: string; targetTitle: string; targetTitles: string[];
  profileSummary: string; salaryFloor: number; geoPref: string; workType: string;
  dealBreakers: string; skills: string[]; industries: string[];
};

function HelpCard({ icon: Icon, color, title, children }: { icon: React.ElementType; color: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: `${color}08`, border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`,
      borderRadius: 10, padding: '12px 16px', marginBottom: 20,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
      >
        <Icon size={13} style={{ color, flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>{title}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>{open ? '-' : '+'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [feeds, setFeeds]             = useState<RssFeed[]>([]);
  const [templates, setTemplates]     = useState<Record<string, FeedTemplate[]>>({});
  const [libOpen, setLibOpen]         = useState(false);
  const [addingId, setAddingId]       = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [tab, setTab]                 = useState<'streams' | 'profile' | 'email' | 'quickstart'>('quickstart');
  const [newFeed, setNewFeed]         = useState({ name: '', url: '', source: 'indeed' });
  const [addingFeed, setAddFeed]      = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/settings/streams');
    if (res.ok) {
      const data = await res.json();
      setFeeds(data.feeds ?? []);
    }
    setLoading(false);
  }

  async function loadTemplates() {
    const res = await fetch('/api/settings/feed-templates');
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.grouped ?? {});
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (libOpen && Object.keys(templates).length === 0) loadTemplates(); }, [libOpen]);

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

  async function addFromTemplate(t: FeedTemplate) {
    setAddingId(t.id);
    await fetch('/api/settings/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: t.name, url: t.url, source: t.source }),
    });
    setAddingId(null);
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
    { key: 'quickstart', label: 'Quick Start', icon: Zap },
    { key: 'streams',    label: 'Data Streams', icon: Rss },
    { key: 'profile',   label: 'Profile & Goals', icon: User },
    { key: 'email',     label: 'Email Config', icon: Mail },
  ] as const;

  const CATEGORY_COLORS: Record<string, string> = {
    'AI / FDE': '#9333EA',
    'Solutions Engineering': '#2563EB',
    'Full Stack / Backend': '#14B8AD',
    'Leadership': '#D08E14',
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Settings</div>
        <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>Configure data streams, profile, and integrations</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${bd}`, paddingBottom: 12 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* QUICK START TAB */}
      {tab === 'quickstart' && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
            How MAX-DEPLOY Works -- Platform Overview
          </div>

          {[
            {
              step: '01', color: '#2563EB', title: 'Set Your Profile',
              tab: 'profile' as const,
              what: 'Your profile is the foundation of everything. Claude reads your skills, salary floor, preferred roles, geography, and deal breakers before scoring any job.',
              why: 'Without an accurate profile, fit scores will be generic. The more specific your profile, the more accurate the AI scoring and the better the interview prep answers.',
              action: 'Go to Profile & Goals to verify name, salary floor, skills list, and deal breakers are current.',
            },
            {
              step: '02', color: '#9333EA', title: 'Configure Email Sync',
              tab: 'email' as const,
              what: 'Connect your IMAP inbox so the system can read inbound recruiter emails. SMTP lets you send outreach directly from the platform.',
              why: 'Recruiter emails auto-create Contacts and Opportunities when they land. You can then reply, track, and log outreach without leaving the platform.',
              action: 'Go to Email Config to verify IMAP/SMTP credentials are saved. Click sync to pull recent messages.',
            },
            {
              step: '03', color: '#14B8AD', title: 'Add RSS Feeds',
              tab: 'streams' as const,
              what: 'RSS feeds auto-populate your Inbox with job listings from Indeed, We Work Remotely, Remotive, and other job boards on a schedule.',
              why: 'Instead of manually searching for jobs, feeds push relevant listings to you automatically. New jobs are auto-scored by Claude using your profile before you ever see them.',
              action: 'Go to Data Streams and use the Feed Library to add curated feeds in one click, or paste your own Indeed RSS URL.',
            },
            {
              step: '04', color: '#D08E14', title: 'Triage Your Inbox',
              tab: null,
              what: 'The Inbox shows all new jobs that landed from RSS feeds and recruiter emails. Each has a fit score (0-100) already computed. You review and move good ones to Pipeline.',
              why: 'The inbox is a one-way gate -- nothing moves to the active pipeline without your approval. Keeping it clean keeps your pipeline signal-high.',
              action: 'Go to Inbox and for each job, review the fit score and recommended action. Move to Pipeline or archive.',
            },
            {
              step: '05', color: '#059669', title: 'Work Your Pipeline',
              tab: null,
              what: 'The Pipeline is your active kanban: Target to Applied to Screening to Interview to Final to Offer. Move cards as stages progress.',
              why: 'When a card reaches Screening or Interview stage, the Prep for Interview button appears -- Claude generates 6 tailored questions using your actual project history as context.',
              action: 'Go to Pipeline and drag or use the stage dropdown to advance opportunities. Click Prep for Interview when you get a response.',
            },
            {
              step: '06', color: '#E05252', title: 'Use the AI Assistant',
              tab: null,
              what: 'The AI chat panel (bottom-right) has full context: your profile, active pipeline, companies, contacts, and open offers. Ask it anything about your search.',
              why: 'Unlike asking Claude directly, this instance knows your actual data. Ask which companies are ghosting me, draft a follow-up, or what should I prioritize today.',
              action: 'Click the chat icon and ask give me a morning briefing to see the full context in action.',
            },
          ].map(({ step, color, title, tab: targetTab, what, why, action }) => (
            <div key={step} style={{
              background: cb, border: `1px solid ${bd}`, borderLeft: `3px solid ${color}`,
              borderRadius: 10, padding: '18px 20px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color, lineHeight: 1, flexShrink: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>{step}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{what}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: `${color}08`, border: `1px solid ${color}18`, borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Why it matters</div>
                  <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{why}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${bd}`, borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Next action</div>
                  <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{action}</div>
                  {targetTab && (
                    <button
                      onClick={() => setTab(targetTab)}
                      style={{ marginTop: 8, fontSize: '0.65rem', fontWeight: 700, color, background: `${color}12`, border: `1px solid ${color}25`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
                    >
                      Open {targetTab === 'streams' ? 'Data Streams' : targetTab === 'profile' ? 'Profile' : 'Email Config'} &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DATA STREAMS TAB */}
      {tab === 'streams' && (
        <>
          <HelpCard icon={Info} color="#2563EB" title="How Data Streams Work">
            <p style={{ marginBottom: 8 }}>RSS feeds automatically pull job listings into your Inbox on a schedule. Each new job is <strong style={{ color: '#FFFFFF' }}>auto-scored by Claude</strong> against your profile before you see it -- so every inbox item already has a fit score and recommended action.</p>
            <p style={{ marginBottom: 8 }}><strong style={{ color: '#FFFFFF' }}>How to get an Indeed RSS URL:</strong> Go to Indeed, search for your target role, filter to Remote, scroll to the bottom and click Get new jobs by email, then find the RSS link. Pattern: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 3 }}>https://rss.indeed.com/rss?q=forward+deployed+engineer&amp;l=Remote</code></p>
            <p style={{ marginBottom: 8 }}><strong style={{ color: '#FFFFFF' }}>Source field:</strong> Labels where the job came from. Used for pattern analysis -- Claude can tell you which sources produce the best-fit roles for your profile.</p>
            <p><strong style={{ color: '#FFFFFF' }}>Poll All Now:</strong> Manually triggers a fetch from all active feeds right now. Feeds also poll automatically on the worker schedule (every hour). New jobs that already exist are deduplicated -- no doubles.</p>
          </HelpCard>

          {/* Feed Library */}
          <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
            <button
              onClick={() => setLibOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 18px',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <BookOpen size={14} style={{ color: '#9333EA', flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', flex: 1 }}>Feed Library</span>
              <span style={{ fontSize: '0.7rem', color: dim, marginRight: 8 }}>Curated feeds -- one-click add</span>
              {libOpen ? <ChevronUp size={13} style={{ color: dim }} /> : <ChevronDown size={13} style={{ color: dim }} />}
            </button>

            {libOpen && (
              <div style={{ borderTop: `1px solid ${bd}`, padding: '16px 18px' }}>
                {Object.keys(templates).length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: dim, fontSize: '0.8rem' }}>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading feed library...
                  </div>
                ) : (
                  Object.entries(templates).map(([category, items]) => {
                    const color = CATEGORY_COLORS[category] ?? '#C8C8C8';
                    const alreadyAdded = new Set(feeds.map(f => f.url));
                    return (
                      <div key={category} style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                          {category}
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {items.map(t => {
                            const added = alreadyAdded.has(t.url);
                            return (
                              <div key={t.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                background: 'rgba(255,255,255,0.03)', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px',
                              }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF', marginBottom: 2 }}>{t.name}</div>
                                  {t.description && <div style={{ fontSize: '0.68rem', color: dim, lineHeight: 1.4 }}>{t.description}</div>}
                                  <div style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.2)', marginTop: 2, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.url}</div>
                                </div>
                                <span className="badge badge-gray" style={{ flexShrink: 0 }}>{t.source}</span>
                                {added ? (
                                  <span style={{ fontSize: '0.65rem', color: '#14B8AD', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                                    <Check size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />Added
                                  </span>
                                ) : (
                                  <button
                                    className="btn btn-primary btn-sm"
                                    style={{ flexShrink: 0, fontSize: '0.65rem', padding: '3px 10px' }}
                                    disabled={addingId === t.id}
                                    onClick={() => addFromTemplate(t)}
                                  >
                                    {addingId === t.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={11} />}
                                    Add
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              RSS Feeds ({feeds.filter(f => f.active).length} active
              {feeds.filter(f => f.consecutiveFailures > 0).length > 0 && (
                <span style={{ color: '#F59E0B', marginLeft: 6 }}>
                  {' '}<AlertTriangle size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                  {feeds.filter(f => f.consecutiveFailures > 0).length} failing
                </span>
              )}
              )
            </span>
            <button className="btn btn-secondary btn-sm" onClick={pollAll} disabled={saving}>
              {saved ? <Check size={12} style={{ color: '#14B8AD' }} /> : saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
              {saved ? 'Polled!' : saving ? 'Polling...' : 'Poll All Now'}
            </button>
          </div>

          <form onSubmit={addFeed} style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Feed Name</label>
              <input className="input" value={newFeed.name} onChange={e => setNewFeed(f => ({ ...f, name: e.target.value }))} placeholder="Indeed -- FDE Remote" required />
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
                <option value="linkedin">LinkedIn</option>
                <option value="hn">Hacker News</option>
                <option value="google_alert">Google Alert</option>
                <option value="greenhouse">Greenhouse</option>
                <option value="lever">Lever</option>
                <option value="ashby">Ashby</option>
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
                  <tr><th>Name</th><th>Source</th><th>URL</th><th>Last Polled</th><th>Health</th><th>Active</th><th></th></tr>
                </thead>
                <tbody>
                  {feeds.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: dim, fontStyle: 'italic', padding: '20px' }}>No feeds yet -- use the Feed Library above to add curated feeds, or paste your own RSS URL.</td></tr>
                  ) : feeds.map(f => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500, color: '#FFFFFF' }}>{f.name}</td>
                      <td><span className="badge badge-gray">{f.source}</span></td>
                      <td style={{ fontSize: '0.72rem', color: dim, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.url}</td>
                      <td style={{ fontSize: '0.78rem', color: dim }}>{f.lastPolled ? new Date(f.lastPolled).toLocaleString() : 'Never'}</td>
                      <td>
                        {f.consecutiveFailures > 0 ? (
                          <span title={f.lastError ?? ''} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: '0.68rem', color: f.consecutiveFailures >= 3 ? '#EF4444' : '#F59E0B',
                            fontWeight: 600, cursor: 'help',
                          }}>
                            <AlertTriangle size={11} />
                            {f.consecutiveFailures}x fail
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: '#14B8AD', fontWeight: 600 }}>
                            <Check size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />OK
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => toggleFeed(f.id, !f.active)}
                          style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: f.active ? '#14B8AD' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s' }}
                        >
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: f.active ? 19 : 3, transition: 'left 0.2s' }} />
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

      {/* PROFILE TAB */}
      {tab === 'profile' && <ProfileTab bd={bd} dim={dim} cb={cb} />}

      {/* EMAIL TAB */}
      {tab === 'email' && <EmailConfigTab cb={cb} bd={bd} dim={dim} />}
    </>
  );
}

function ProfileTab({ bd, dim, cb }: { bd: string; dim: string; cb: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    fetch('/api/profile').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.profile) setProfile(d.profile);
      setLoading(false);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div style={{ color: dim, fontSize: 13 }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading profile...</div>;
  if (!profile) return <div style={{ color: dim }}>No profile found.</div>;

  return (
    <>
      <div style={{
        background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
        borderLeft: '3px solid #2563EB', borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7,
      }}>
        <strong style={{ color: '#93C5FD' }}>Claude reads this profile before every scoring, briefing, and interview prep call.</strong> Keep it accurate -- your salary floor prevents Claude from recommending roles below your threshold, your skills list drives fit scoring, and your deal breakers are used to flag mismatches. Changes save immediately to the database and take effect on the next AI call.
      </div>

      <form onSubmit={save} style={{ maxWidth: 680 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="label">Full Name</label>
            <input className="input" value={profile.name} onChange={e => setProfile(p => p && ({ ...p, name: e.target.value }))} />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="label">Email</label>
            <input className="input" type="email" value={profile.email} onChange={e => setProfile(p => p && ({ ...p, email: e.target.value }))} />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="label">Primary Target Title</label>
            <input className="input" value={profile.targetTitle} onChange={e => setProfile(p => p && ({ ...p, targetTitle: e.target.value }))} placeholder="Forward Deployed AI Engineer" />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="label">Salary Floor (annual, USD)</label>
            <input className="input" type="number" value={profile.salaryFloor} onChange={e => setProfile(p => p && ({ ...p, salaryFloor: Number(e.target.value) }))} />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="label">Geography Preference</label>
            <input className="input" value={profile.geoPref} onChange={e => setProfile(p => p && ({ ...p, geoPref: e.target.value }))} placeholder="Remote USA" />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="label">Work Type</label>
            <select className="input" value={profile.workType} onChange={e => setProfile(p => p && ({ ...p, workType: e.target.value }))}>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
              <option value="any">Any</option>
            </select>
          </div>
        </div>

        <div className="input-group" style={{ margin: '0 0 14px' }}>
          <label className="label">Profile Summary <span style={{ color: dim, fontWeight: 400 }}>(Claude uses this verbatim in briefings and outreach)</span></label>
          <textarea className="input" rows={4} style={{ resize: 'vertical' }} value={profile.profileSummary} onChange={e => setProfile(p => p && ({ ...p, profileSummary: e.target.value }))} />
        </div>

        <div className="input-group" style={{ margin: '0 0 14px' }}>
          <label className="label">Target Titles <span style={{ color: dim, fontWeight: 400 }}>(comma-separated -- all titles Claude should consider a good match)</span></label>
          <input className="input" value={profile.targetTitles.join(', ')} onChange={e => setProfile(p => p && ({ ...p, targetTitles: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="FDE, Applied AI Engineer, Solutions Engineer" />
        </div>

        <div className="input-group" style={{ margin: '0 0 14px' }}>
          <label className="label">Skills <span style={{ color: dim, fontWeight: 400 }}>(comma-separated)</span></label>
          <input className="input" value={profile.skills.join(', ')} onChange={e => setProfile(p => p && ({ ...p, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Next.js, TypeScript, Claude API..." />
        </div>

        <div className="input-group" style={{ margin: '0 0 14px' }}>
          <label className="label">Industries <span style={{ color: dim, fontWeight: 400 }}>(comma-separated -- sectors where you want to work)</span></label>
          <input className="input" value={profile.industries.join(', ')} onChange={e => setProfile(p => p && ({ ...p, industries: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="SaaS, AI/ML, FinTech..." />
        </div>

        <div className="input-group" style={{ margin: '0 0 20px' }}>
          <label className="label">Deal Breakers <span style={{ color: dim, fontWeight: 400 }}>(Claude flags any role that hits these)</span></label>
          <input className="input" value={profile.dealBreakers} onChange={e => setProfile(p => p && ({ ...p, dealBreakers: e.target.value }))} placeholder="No relocation. No C2C only. No pure sales quota." />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saved ? <><Check size={13} /> Saved</> : saving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={13} /> Save Profile</>}
        </button>
      </form>
    </>
  );
}

function EmailConfigTab({ cb, bd, dim }: { cb: string; bd: string; dim: string }) {
  const [form, setForm] = useState({
    email: '', fromName: '',
    imapHost: 'imap.hostinger.com', imapPort: 993, imapUser: '', imapPass: '',
    smtpHost: 'smtp.hostinger.com', smtpPort: 465, smtpUser: '', smtpPass: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/email/account').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.account) {
        setForm(f => ({
          ...f,
          email:    data.account.email    ?? f.email,
          fromName: data.account.fromName ?? f.fromName,
          imapHost: data.account.imapHost ?? f.imapHost,
          imapPort: data.account.imapPort ?? f.imapPort,
          imapUser: data.account.imapUser ?? f.imapUser,
          smtpHost: data.account.smtpHost ?? f.smtpHost,
          smtpPort: data.account.smtpPort ?? f.smtpPort,
          smtpUser: data.account.smtpUser ?? f.smtpUser,
        }));
      }
      setLoading(false);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/email/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div style={{ color: dim, fontSize: 13 }}>Loading...</div>;

  return (
    <>
      <div style={{
        background: 'rgba(20,184,173,0.08)', border: '1px solid rgba(20,184,173,0.2)',
        borderLeft: '3px solid #14B8AD', borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7,
      }}>
        <strong style={{ color: '#5EEAD4' }}>IMAP</strong> lets the system read your inbox -- recruiter emails auto-create Contacts and Opportunities when they arrive. <strong style={{ color: '#5EEAD4' }}>SMTP</strong> lets you send outreach and replies directly from the platform without opening your email client. Both use your Hostinger credentials. Password fields are write-only -- leave blank to keep the current saved password.
      </div>

      <form onSubmit={save} style={{ maxWidth: 560 }}>
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Identity</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
            <div><label className="label">Email Address</label><input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">From Name</label><input className="input" required value={form.fromName} onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))} /></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>IMAP (Receive)</div>
            {[
              { label: 'Host', key: 'imapHost' as const },
              { label: 'Port', key: 'imapPort' as const, type: 'number' },
              { label: 'Username', key: 'imapUser' as const },
              { label: 'Password', key: 'imapPass' as const, type: 'password', placeholder: 'Leave blank to keep' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label className="label">{f.label}</label>
                <input className="input" type={f.type ?? 'text'} placeholder={f.placeholder} value={String(form[f.key])} onChange={e => setForm(prev => ({ ...prev, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))} />
              </div>
            ))}
          </div>

          <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>SMTP (Send)</div>
            {[
              { label: 'Host', key: 'smtpHost' as const },
              { label: 'Port', key: 'smtpPort' as const, type: 'number' },
              { label: 'Username', key: 'smtpUser' as const },
              { label: 'Password', key: 'smtpPass' as const, type: 'password', placeholder: 'Leave blank to keep' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label className="label">{f.label}</label>
                <input className="input" type={f.type ?? 'text'} placeholder={f.placeholder} value={String(form[f.key])} onChange={e => setForm(prev => ({ ...prev, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saved ? <><Check size={13} /> Saved</> : saving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={13} /> Save Email Config</>}
          </button>
        </div>
      </form>
    </>
  );
}
