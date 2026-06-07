'use client';

import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Loader2, Plus, ExternalLink, FileText, CheckCircle, BookmarkPlus, X, ChevronDown, ChevronUp, Zap } from 'lucide-react';

type Opportunity = {
  id: string; company: string; role: string; stage: string;
  salaryMin: number | null; salaryMax: number | null;
  fitScore: number | null; classification: string | null;
  recommendedAction: string | null; source: string | null;
  applyUrl: string | null; coverLetterUrl: string | null;
  analysisJson: {
    fitScore: number; classification: string; salaryAssessment: string;
    matchStrengths: string[]; gaps: string[]; recommendedAction: string;
    urgency: string; reasoning: string; coverLetterHtml?: string;
  } | null;
  createdAt: string;
};

type Filter = 'all' | 'apply_now' | '70plus' | 'applied_ai' | 'fde' | 'ai_engineer' | 'director' | 'fullstack' | 'solutions' | 'csm' | 'contract' | 'marketing' | 'unscored';

const FILTERS: { key: Filter; label: string; color?: string }[] = [
  { key: 'all',         label: 'All'                            },
  { key: 'apply_now',   label: 'Apply Now',   color: '#14B8AD' },
  { key: '70plus',      label: '70+ Score',   color: '#2563EB' },
  { key: 'applied_ai',  label: 'Applied AI',  color: '#14B8AD' },
  { key: 'fde',         label: 'FDE'                           },
  { key: 'ai_engineer', label: 'AI Engineer'                   },
  { key: 'director',    label: 'Director'                      },
  { key: 'fullstack',   label: 'Full Stack'                    },
  { key: 'solutions',   label: 'Solutions'                     },
  { key: 'csm',         label: 'CSM'                           },
  { key: 'contract',    label: 'Contract'                      },
  { key: 'marketing',   label: 'Marketing'                     },
  { key: 'unscored',    label: 'Unscored'                      },
];

const DEMO_COLOR: Record<string, string> = {
  build: '#14B8AD', marginal: '#D08E14', skip: '#6B7280',
};

const ACTION_COLOR: Record<string, string> = {
  apply_now: '#14B8AD', apply_with_note: '#2563EB',
  save: '#D08E14', skip: '#6B7280', watch: '#9333EA',
};
const FIT_COLOR = (s: number) => s >= 80 ? '#14B8AD' : s >= 65 ? '#2563EB' : s >= 50 ? '#D08E14' : '#E05252';

function filterOpps(opps: Opportunity[], f: Filter): Opportunity[] {
  const cl = (o: Opportunity) => (o.classification ?? '').toLowerCase();
  switch (f) {
    case 'apply_now':   return opps.filter(o => o.recommendedAction === 'apply_now');
    case '70plus':      return opps.filter(o => (o.fitScore ?? 0) >= 70);
    // Applied AI = FDE + AI_Engineer + Contract — mirrors "Applied AI / FDE" sector on public hub
    case 'applied_ai':  return opps.filter(o => ['fde','ai_engineer','contract'].some(k => cl(o).includes(k)));
    case 'fde':         return opps.filter(o => cl(o) === 'fde' || cl(o).includes('fde'));
    case 'ai_engineer': return opps.filter(o => cl(o) === 'ai_engineer' || cl(o).includes('ai_engineer'));
    case 'director':    return opps.filter(o => cl(o) === 'director' || cl(o).includes('director'));
    case 'fullstack':   return opps.filter(o => cl(o) === 'fullstack' || cl(o).includes('fullstack'));
    case 'solutions':   return opps.filter(o => cl(o).includes('solutions'));
    case 'csm':         return opps.filter(o => cl(o).includes('csm'));
    case 'contract':    return opps.filter(o => cl(o) === 'contract' || cl(o).includes('contract'));
    case 'marketing':   return opps.filter(o => cl(o).includes('marketing'));
    case 'unscored':    return opps.filter(o => o.fitScore === null);
    default:            return opps;
  }
}

export default function InboxPage() {
  const [opps, setOpps]         = useState<Opportunity[]>([]);
  const [loading, setLoading]   = useState(true);
  const [scoring, setScoring]   = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter]     = useState<Filter>('all');
  const [pasteUrl, setPasteUrl] = useState('');
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteError, setPasteError]     = useState('');
  const [clLoading, setClLoading]       = useState<string | null>(null);
  const [clError, setClError]           = useState<string | null>(null);
  const [demoLoading, setDemoLoading]   = useState<string | null>(null);
  const [sweepLoading, setSweepLoading] = useState(false);

  const [applyModal, setApplyModal]     = useState<Opportunity | null>(null);
  const [resumeVariant, setResumeVariant] = useState<'fde' | 'slingshot'>('fde');
  const [contactName, setContactName]   = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [applying, setApplying]         = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/opportunities?stage=inbox&limit=500');
    if (res.ok) { const d = await res.json(); setOpps(d.opportunities ?? []); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const visible = useMemo(() =>
    filterOpps(opps, filter).sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0)),
    [opps, filter]
  );

  async function scoreOpp(id: string) {
    setScoring(id);
    await fetch(`/api/opportunities/${id}/score`, { method: 'POST' });
    await load(); setScoring(null);
  }

  async function moveStage(id: string, stage: string) {
    await fetch(`/api/opportunities/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    setOpps(prev => prev.filter(o => o.id !== id));
  }

  async function draftCoverLetter(opp: Opportunity) {
    const hasCL = !!opp.coverLetterUrl || !!(opp.analysisJson as Record<string,unknown>)?.coverLetterHtml;
    if (hasCL) { window.open(`/cover-letter/${opp.id}`, '_blank'); return; }
    setClLoading(opp.id); setClError(null);
    const res = await fetch(`/api/opportunities/${opp.id}/cover-letter`, { method: 'POST' });
    setClLoading(null);
    if (res.ok) {
      await load();
      window.open(`/cover-letter/${opp.id}`, '_blank');
    } else {
      const body = await res.json().catch(() => ({}));
      setClError(body.error ?? 'Cover letter generation failed — try again.');
    }
  }

  function openApplyModal(opp: Opportunity) {
    const isMkt = (opp.classification ?? '').toLowerCase().includes('marketing');
    setResumeVariant(isMkt ? 'slingshot' : 'fde');
    setContactName(''); setContactEmail('');
    setApplyModal(opp);
  }

  async function confirmApply() {
    if (!applyModal) return;
    setApplying(true);
    await fetch(`/api/opportunities/${applyModal.id}/apply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeVariant, contactName: contactName || undefined, contactEmail: contactEmail || undefined }),
    });
    setOpps(prev => prev.filter(o => o.id !== applyModal.id));
    setApplyModal(null); setApplying(false);
  }

  async function analyzeDemoOpp(id: string) {
    setDemoLoading(id);
    await fetch('/api/ai/demo-opportunity', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oppId: id }),
    });
    await load(); setDemoLoading(null);
  }

  async function sweepDemo() {
    setSweepLoading(true);
    await fetch('/api/ai/demo-opportunity', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: true }),
    });
    await load(); setSweepLoading(false);
  }

  async function handlePaste(e: React.FormEvent) {
    e.preventDefault();
    if (!pasteUrl.trim()) return;
    setPasteLoading(true); setPasteError('');
    const res = await fetch('/api/opportunities/scrape', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: pasteUrl }),
    });
    if (res.ok) { setPasteUrl(''); await load(); }
    else { const d = await res.json(); setPasteError(d.error ?? 'Failed to parse URL'); }
    setPasteLoading(false);
  }

  const bd = 'rgba(255,255,255,0.07)', dim = 'rgba(255,255,255,0.35)';

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>Inbox</div>
          <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>
            {visible.length} of {opps.length} — sorted by fit score
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={sweepDemo} disabled={sweepLoading} style={{ color: '#C084FC' }}>
            {sweepLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
            {sweepLoading ? 'Sweeping...' : 'Sweep Demo'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {FILTERS.map(f => {
          const count  = f.key === 'all' ? opps.length : filterOpps(opps, f.key).length;
          const active = filter === f.key;
          const accent = f.color ?? '#2563EB';
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
              border: active ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.1)',
              background: active ? `${accent}22` : 'rgba(255,255,255,0.04)',
              color: active ? (f.color ? '#fff' : '#93C5FD') : count > 0 ? dim : 'rgba(255,255,255,0.18)',
              transition: 'all 0.15s',
              opacity: count === 0 && f.key !== 'all' ? 0.45 : 1,
            }}>
              {f.label} <span style={{ opacity: 0.65 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Paste URL */}
      <form onSubmit={handlePaste} style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <input className="input" type="url" value={pasteUrl} onChange={e => setPasteUrl(e.target.value)} placeholder="Paste a job URL to parse and score automatically..." />
          {pasteError && <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#E05252' }}>{pasteError}</div>}
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pasteLoading || !pasteUrl.trim()}>
          {pasteLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
          {pasteLoading ? 'Parsing...' : 'Add'}
        </button>
      </form>

      {/* Opportunity cards */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: dim, fontSize: '0.85rem', padding: '30px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: dim }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📭</div>
          {filter === 'all' ? 'Inbox is empty.' : `No ${filter.replace('_',' ')} opportunities.`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {visible.map(opp => {
            const score  = opp.fitScore;
            const action = opp.recommendedAction;
            const anal   = opp.analysisJson;
            const isExp  = expanded === opp.id;
            const hasCL  = !!opp.coverLetterUrl || !!(anal as Record<string,unknown>)?.coverLetterHtml;

            return (
              <div key={opp.id} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 10, overflow: 'hidden',
                border: `1px solid ${bd}`,
                borderLeft: score !== null ? `3px solid ${FIT_COLOR(score)}` : `3px solid ${bd}`,
              }}>
                <div style={{ padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 11 }}>
                  {/* Score pill */}
                  <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 42 }}>
                    {score !== null ? (
                      <>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: FIT_COLOR(score), lineHeight: 1 }}>{score}</div>
                        <div style={{ fontSize: '0.52rem', color: dim }}>fit</div>
                      </>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => scoreOpp(opp.id)} disabled={scoring === opp.id} style={{ fontSize: '0.62rem', padding: '3px 5px' }}>
                        {scoring === opp.id ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : 'Score'}
                      </button>
                    )}
                  </div>

                  {/* Demo verdict pill */}
                  {(() => {
                    const demo = (opp.analysisJson as Record<string,unknown>)?.demoAnalysis as Record<string,unknown> | undefined;
                    if (!demo?.verdict) return <div style={{ flexShrink: 0, minWidth: 38 }} />;
                    const v = demo.verdict as string;
                    const c = DEMO_COLOR[v] ?? '#6B7280';
                    return (
                      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 38, cursor: 'pointer' }} onClick={() => setExpanded(isExp ? null : opp.id)} title={demo.name as string ?? ''}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: c, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{v}</div>
                        <div style={{ fontSize: '0.52rem', color: dim }}>demo</div>
                      </div>
                    );
                  })()}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>{opp.company}</span>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>—</span>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.68)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>{opp.role}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {opp.salaryMin && <span style={{ fontSize: '0.68rem', color: '#14B8AD', fontWeight: 600 }}>${Math.round(opp.salaryMin/1000)}k{opp.salaryMax?`–$${Math.round(opp.salaryMax/1000)}k`:''}</span>}
                      {opp.classification && <span className="badge badge-blue" style={{ fontSize: '0.57rem' }}>{opp.classification}</span>}
                      {action && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: ACTION_COLOR[action] ?? '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{action.replace(/_/g,' ')}</span>}
                      {opp.source && <span style={{ fontSize: '0.6rem', color: dim }}>{opp.source}</span>}
                    </div>
                    {anal?.reasoning && !isExp && (
                      <div style={{ fontSize: '0.7rem', color: dim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '88%' }}>{anal.reasoning}</div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(isExp ? null : opp.id)}>
                      {isExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {opp.applyUrl && (
                      <a href={opp.applyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Open JD"><ExternalLink size={12} /></a>
                    )}
                    <button
                      className="btn btn-sm"
                      style={{ background: hasCL ? 'rgba(147,51,234,0.15)' : 'rgba(255,255,255,0.05)', color: hasCL ? '#C084FC' : dim, border: `1px solid ${hasCL ? 'rgba(147,51,234,0.3)' : 'rgba(255,255,255,0.08)'}`, gap: 3, padding: '4px 8px' }}
                      onClick={() => draftCoverLetter(opp)} disabled={clLoading === opp.id} title="Cover Letter"
                    >
                      {clLoading === opp.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={11} />} CL
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(147,51,234,0.08)', color: '#C084FC', border: '1px solid rgba(147,51,234,0.15)', gap: 3, padding: '4px 8px' }}
                      onClick={() => analyzeDemoOpp(opp.id)} disabled={demoLoading === opp.id} title="Analyze Demo Opportunity"
                    >
                      {demoLoading === opp.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={11} />} Demo
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(20,184,173,0.1)', color: '#14B8AD', border: '1px solid rgba(20,184,173,0.2)', gap: 3, padding: '4px 8px' }}
                      onClick={() => openApplyModal(opp)}
                    >
                      <CheckCircle size={11} /> Apply
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(37,99,235,0.08)', color: '#93C5FD', border: '1px solid rgba(37,99,235,0.12)', padding: '4px 7px' }}
                      onClick={() => moveStage(opp.id, 'target')} title="Target"
                    >
                      <BookmarkPlus size={11} />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 7px' }} onClick={() => moveStage(opp.id, 'rejected')} title="Skip">
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* Expanded */}
                {isExp && (
                  <div style={{ padding: '0 15px 13px', borderTop: `1px solid ${bd}` }}>
                    {anal && (
                      <>
                        <div style={{ paddingTop: 11, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <div>
                            <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 6 }}>Strengths</div>
                            {(anal.matchStrengths ?? []).length === 0 ? (
                              <div style={{ fontSize: '0.7rem', color: '#475569', fontStyle: 'italic' }}>No JD on file — rescore to generate</div>
                            ) : (anal.matchStrengths ?? []).map((s, i) => (
                              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                                <span style={{ color: '#14B8AD', fontSize: '0.68rem', flexShrink: 0 }}>+</span>
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{s}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', color: '#C8C8C8', textTransform: 'uppercase', marginBottom: 6 }}>Gaps</div>
                            {(anal.gaps ?? []).length === 0 ? (
                              <div style={{ fontSize: '0.7rem', color: '#475569', fontStyle: 'italic' }}>No JD on file — rescore to generate</div>
                            ) : (anal.gaps ?? []).map((g, i) => (
                              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                                <span style={{ color: '#D08E14', fontSize: '0.68rem', flexShrink: 0 }}>—</span>
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{g}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {anal.salaryAssessment && <div style={{ marginTop: 7, fontSize: '0.7rem', color: dim }}><strong style={{ color: '#C8C8C8' }}>Salary: </strong>{anal.salaryAssessment}</div>}
                        {anal.reasoning && <div style={{ marginTop: 5, fontSize: '0.7rem', color: dim, lineHeight: 1.5 }}><strong style={{ color: '#C8C8C8' }}>Reasoning: </strong>{anal.reasoning}</div>}
                        <div style={{ marginTop: 9, display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                          {opp.applyUrl && <a href={opp.applyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem' }}><ExternalLink size={11} /> Open Application</a>}
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.68rem' }} onClick={() => draftCoverLetter(opp)} disabled={clLoading === opp.id}>
                            {clLoading === opp.id
                              ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                              : <><FileText size={11} /> {hasCL ? 'View Cover Letter' : 'Draft Cover Letter'}</>}
                          </button>
                          {clError && clLoading === null && (
                            <span style={{ fontSize: '0.65rem', color: '#E05252' }}>{clError}</span>
                          )}
                        </div>
                      </>
                    )}

                    {/* Demo analysis panel */}
                    {(() => {
                      const demo = (opp.analysisJson as Record<string,unknown>)?.demoAnalysis as Record<string,unknown> | undefined;
                      if (!demo) return (
                        <div style={{ marginTop: anal ? 10 : 11, paddingTop: anal ? 10 : 0, borderTop: anal ? `1px solid ${bd}` : 'none' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.68rem', color: '#C084FC' }}
                            onClick={() => analyzeDemoOpp(opp.id)} disabled={demoLoading === opp.id}
                          >
                            {demoLoading === opp.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={11} />}
                            {demoLoading === opp.id ? 'Analyzing...' : 'Analyze Demo Opportunity'}
                          </button>
                        </div>
                      );
                      const v = demo.verdict as string;
                      return (
                        <div style={{ marginTop: anal ? 10 : 11, padding: '10px 12px', background: 'rgba(147,51,234,0.06)', border: '1px solid rgba(147,51,234,0.15)', borderRadius: 7 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', color: '#C084FC', textTransform: 'uppercase' }}>Demo</span>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: DEMO_COLOR[v] ?? '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{v}</span>
                            {demo.daysToBuild && <span style={{ fontSize: '0.6rem', color: dim }}>{demo.daysToBuild as number}d build</span>}
                            {demo.businessPotential && <span style={{ fontSize: '0.6rem', color: dim }}>· {demo.businessPotential as string} biz potential</span>}
                            {demo.novelty && <span style={{ fontSize: '0.6rem', color: dim }}>· {demo.novelty as string}</span>}
                          </div>
                          {demo.name && <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFF', marginBottom: 3 }}>{demo.name as string}</div>}
                          {demo.elevator && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', marginBottom: 5, lineHeight: 1.4 }}>{demo.elevator as string}</div>}
                          {demo.whatTheyreBuilding && <div style={{ fontSize: '0.7rem', color: dim, marginBottom: 4, lineHeight: 1.4 }}><strong style={{ color: '#C8C8C8' }}>They&rsquo;re building: </strong>{demo.whatTheyreBuilding as string}</div>}
                          {demo.verdictReason && <div style={{ fontSize: '0.7rem', color: dim, marginBottom: 4 }}><strong style={{ color: '#C8C8C8' }}>Verdict: </strong>{demo.verdictReason as string}</div>}
                          {demo.businessCase && <div style={{ fontSize: '0.7rem', color: dim, lineHeight: 1.4 }}><strong style={{ color: '#C8C8C8' }}>Biz case: </strong>{demo.businessCase as string}</div>}
                          {(demo.coreFeatures as string[] | undefined)?.length ? (
                            <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {(demo.coreFeatures as string[]).map((f, i) => (
                                <span key={i} style={{ fontSize: '0.6rem', background: 'rgba(147,51,234,0.12)', color: '#C084FC', borderRadius: 4, padding: '2px 6px' }}>{f}</span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Apply Modal */}
      {applyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setApplyModal(null)}>
          <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 28, width: 480, maxWidth: '92vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#FFF', marginBottom: 3 }}>Mark Applied</div>
            <div style={{ fontSize: '0.78rem', color: dim, marginBottom: 20 }}>{applyModal.company} — {applyModal.role}</div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8C8C8', marginBottom: 7 }}>Resume Variant</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['fde','slingshot'] as const).map(v => (
                  <button key={v} onClick={() => setResumeVariant(v)} style={{
                    flex: 1, padding: '9px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    border: resumeVariant === v ? '1px solid #2563EB' : '1px solid rgba(255,255,255,0.1)',
                    background: resumeVariant === v ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.04)',
                    color: resumeVariant === v ? '#93C5FD' : dim,
                  }}>{v === 'fde' ? 'FDE Resume (default)' : 'Slingshot Resume'}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8C8C8', marginBottom: 7 }}>Contact (optional)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" style={{ flex: 1 }} placeholder="Recruiter name" value={contactName} onChange={e => setContactName(e.target.value)} />
                <input className="input" style={{ flex: 1 }} placeholder="Email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 7, marginBottom: 20, flexWrap: 'wrap' }}>
              <a href={`/resumes/${resumeVariant}.pdf`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem' }}><FileText size={11} /> Download Resume</a>
              {applyModal.coverLetterUrl && <a href={applyModal.coverLetterUrl.endsWith('.pdf') ? applyModal.coverLetterUrl : `/cover-letter/${applyModal.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem' }}><FileText size={11} /> Cover Letter</a>}
              {applyModal.applyUrl && <a href={applyModal.applyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem' }}><ExternalLink size={11} /> Open Form</a>}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setApplyModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmApply} disabled={applying} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {applying ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                {applying ? 'Saving...' : 'Mark Applied'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
