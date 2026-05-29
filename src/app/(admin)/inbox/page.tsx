'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Plus, ExternalLink, CheckCircle, BookmarkPlus, X, ChevronDown, ChevronUp } from 'lucide-react';

type Opportunity = {
  id: string;
  company: string;
  role: string;
  stage: string;
  salaryMin: number | null;
  salaryMax: number | null;
  fitScore: number | null;
  classification: string | null;
  recommendedAction: string | null;
  source: string | null;
  applyUrl: string | null;
  analysisJson: {
    fitScore: number;
    classification: string;
    salaryAssessment: string;
    matchStrengths: string[];
    gaps: string[];
    recommendedAction: string;
    urgency: string;
    reasoning: string;
  } | null;
  createdAt: string;
};

const ACTION_COLOR: Record<string, string> = {
  apply_now:        '#14B8AD',
  apply_with_note:  '#2563EB',
  save:             '#D08E14',
  skip:             '#6B7280',
  watch:            '#9333EA',
};

const FIT_COLOR = (score: number) => {
  if (score >= 80) return '#14B8AD';
  if (score >= 65) return '#2563EB';
  if (score >= 50) return '#D08E14';
  return '#E05252';
};

export default function InboxPage() {
  const [opps, setOpps]           = useState<Opportunity[]>([]);
  const [loading, setLoading]     = useState(true);
  const [scoring, setScoring]     = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [pasteUrl, setPasteUrl]   = useState('');
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteError, setPasteError]     = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/opportunities?stage=inbox');
    if (res.ok) {
      const data = await res.json();
      setOpps(data.opportunities ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function scoreOpp(id: string) {
    setScoring(id);
    await fetch(`/api/opportunities/${id}/score`, { method: 'POST' });
    await load();
    setScoring(null);
  }

  async function moveStage(id: string, stage: string) {
    await fetch(`/api/opportunities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    setOpps(prev => prev.filter(o => o.id !== id));
  }

  async function handlePaste(e: React.FormEvent) {
    e.preventDefault();
    if (!pasteUrl.trim()) return;
    setPasteLoading(true);
    setPasteError('');
    const res = await fetch('/api/opportunities/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: pasteUrl }),
    });
    if (res.ok) {
      setPasteUrl('');
      await load();
    } else {
      const d = await res.json();
      setPasteError(d.error ?? 'Failed to parse URL');
    }
    setPasteLoading(false);
  }

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Inbox</div>
          <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>
            {opps.length} opportunit{opps.length !== 1 ? 'ies' : 'y'} awaiting review — Claude-scored, sorted by fit
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Paste URL */}
      <form onSubmit={handlePaste} style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <input
            className="input"
            type="url"
            value={pasteUrl}
            onChange={e => setPasteUrl(e.target.value)}
            placeholder="Paste a job URL to parse and score automatically..."
          />
          {pasteError && <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#E05252' }}>{pasteError}</div>}
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pasteLoading || !pasteUrl.trim()}>
          {pasteLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
          {pasteLoading ? 'Parsing...' : 'Add'}
        </button>
      </form>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dim, fontSize: '0.85rem', padding: '30px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading inbox...
        </div>
      ) : opps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: dim, fontSize: '0.85rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📭</div>
          Inbox is empty — RSS feeds and ATS polling will populate it automatically.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opps.sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0)).map(opp => {
            const score    = opp.fitScore ?? opp.analysisJson?.fitScore ?? null;
            const action   = opp.recommendedAction ?? opp.analysisJson?.recommendedAction ?? null;
            const analysis = opp.analysisJson;
            const isExpanded = expanded === opp.id;
            const actionColor = action ? (ACTION_COLOR[action] ?? '#6B7280') : '#6B7280';

            return (
              <div key={opp.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${bd}`,
                borderLeft: score !== null ? `3px solid ${FIT_COLOR(score)}` : `3px solid ${bd}`,
                borderRadius: 10,
                overflow: 'hidden',
              }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Fit Score */}
                  <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 48 }}>
                    {score !== null ? (
                      <>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: FIT_COLOR(score), lineHeight: 1 }}>{score}</div>
                        <div style={{ fontSize: '0.58rem', color: dim }}>fit</div>
                      </>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => scoreOpp(opp.id)} disabled={scoring === opp.id} style={{ fontSize: '0.68rem' }}>
                        {scoring === opp.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : 'Score'}
                      </button>
                    )}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: '0.94rem', fontWeight: 700, color: '#FFFFFF' }}>{opp.company}</span>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>—</span>
                      <span style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.72)' }}>{opp.role}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {opp.salaryMin && opp.salaryMax && (
                        <span style={{ fontSize: '0.72rem', color: '#14B8AD', fontWeight: 600 }}>
                          ${(opp.salaryMin / 1000).toFixed(0)}k–${(opp.salaryMax / 1000).toFixed(0)}k
                        </span>
                      )}
                      {opp.classification && (
                        <span className="badge badge-blue" style={{ fontSize: '0.6rem' }}>{opp.classification}</span>
                      )}
                      {opp.source && (
                        <span style={{ fontSize: '0.65rem', color: dim }}>{opp.source}</span>
                      )}
                      {action && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: actionColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {action.replace(/_/g, ' ')}
                        </span>
                      )}
                      {analysis?.urgency && (
                        <span style={{ fontSize: '0.65rem', color: analysis.urgency === 'fresh' ? '#14B8AD' : '#D08E14' }}>
                          {analysis.urgency}
                        </span>
                      )}
                    </div>
                    {analysis?.reasoning && !isExpanded && (
                      <div style={{ fontSize: '0.74rem', color: dim, marginTop: 4, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                        {analysis.reasoning}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <button
                      title="Expand"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setExpanded(isExpanded ? null : opp.id)}
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    {opp.applyUrl && (
                      <a href={opp.applyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Open JD">
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(20,184,173,0.1)', color: '#14B8AD', border: '1px solid rgba(20,184,173,0.2)' }}
                      onClick={() => moveStage(opp.id, 'applied')}
                      title="Apply Now"
                    >
                      <CheckCircle size={12} /> Apply
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(37,99,235,0.1)', color: '#93C5FD', border: '1px solid rgba(37,99,235,0.2)' }}
                      onClick={() => moveStage(opp.id, 'target')}
                      title="Target"
                    >
                      <BookmarkPlus size={12} /> Target
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => moveStage(opp.id, 'rejected')}
                      title="Skip"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded analysis */}
                {isExpanded && analysis && (
                  <div style={{ padding: '0 18px 16px', borderTop: `1px solid ${bd}` }}>
                    <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 8 }}>Match Strengths</div>
                        {analysis.matchStrengths.map((s, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                            <span style={{ color: '#14B8AD', fontSize: '0.7rem', flexShrink: 0, marginTop: 2 }}>+</span>
                            <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{s}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 8 }}>Gaps</div>
                        {analysis.gaps.length === 0 ? (
                          <div style={{ fontSize: '0.74rem', color: '#14B8AD' }}>No material gaps identified.</div>
                        ) : analysis.gaps.map((g, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                            <span style={{ color: '#D08E14', fontSize: '0.7rem', flexShrink: 0, marginTop: 2 }}>—</span>
                            <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{g}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {analysis.salaryAssessment && (
                      <div style={{ marginTop: 10, fontSize: '0.74rem', color: dim }}>
                        <strong style={{ color: '#C8C8C8' }}>Salary: </strong>{analysis.salaryAssessment}
                      </div>
                    )}
                    {analysis.reasoning && (
                      <div style={{ marginTop: 8, fontSize: '0.74rem', color: dim, lineHeight: 1.5 }}>
                        <strong style={{ color: '#C8C8C8' }}>Reasoning: </strong>{analysis.reasoning}
                      </div>
                    )}
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
