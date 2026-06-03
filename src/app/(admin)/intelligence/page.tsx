'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react';

type FitResult = {
  score: number;
  strengths: string[];
  gaps: string[];
  positioning: string;
  coverLetterAngle: string;
  classification: string;
  salaryAssessment: string;
  recommendedAction: string;
  reasoning: string;
};

type Pattern = {
  insight: string;
  signal: 'positive' | 'negative' | 'neutral';
  metric: string;
  detail: string;
};

type PrepQuestion = {
  category: string;
  question: string;
  suggestedAnswer: string;
};

type MarketInsight = {
  title: string;
  color: string;
  body: string;
};

const FIT_COLOR = (score: number) => {
  if (score >= 80) return '#14B8AD';
  if (score >= 65) return '#2563EB';
  if (score >= 50) return '#D08E14';
  return '#E05252';
};

const CAT_COLOR: Record<string, string> = {
  Behavioral: '#2563EB', Technical: '#14B8AD', 'System Design': '#8B5CF6',
  Product: '#D08E14', Culture: '#14B8AD', Situational: '#E05252',
};

export default function IntelligencePage() {
  const [jdText, setJdText]         = useState('');
  const [fitResult, setFitResult]   = useState<FitResult | null>(null);
  const [fitLoading, setFitLoading] = useState(false);

  const [patterns, setPatterns]       = useState<Pattern[]>([]);
  const [pattLoading, setPattLoading] = useState(false);

  const [prepCompany, setPrepCompany]       = useState('');
  const [prepRole, setPrepRole]             = useState('');
  const [prepJd, setPrepJd]                 = useState('');
  const [prepQuestions, setPrepQuestions]   = useState<PrepQuestion[]>([]);
  const [prepLoading, setPrepLoading]       = useState(false);
  const [expandedQ, setExpandedQ]           = useState<number | null>(null);

  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>([]);

  useEffect(() => {
    fetch('/api/ai/market-intel')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.insights) setMarketInsights(d.insights); })
      .catch(() => {});
  }, []);

  async function scoreJD(e: React.FormEvent) {
    e.preventDefault();
    if (!jdText.trim()) return;
    setFitLoading(true);
    setFitResult(null);
    const res = await fetch('/api/ai/fit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jdText }),
    });
    if (res.ok) setFitResult(await res.json());
    setFitLoading(false);
  }

  async function loadPatterns() {
    setPattLoading(true);
    const res = await fetch('/api/ai/patterns');
    if (res.ok) {
      const data = await res.json();
      setPatterns(data.patterns ?? []);
    }
    setPattLoading(false);
  }

  async function runInterviewPrep(e: React.FormEvent) {
    e.preventDefault();
    if (!prepCompany.trim() || !prepRole.trim()) return;
    setPrepLoading(true);
    setPrepQuestions([]);
    setExpandedQ(null);
    const res = await fetch('/api/ai/interview-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: prepCompany, role: prepRole, jdText: prepJd || undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      setPrepQuestions(data.questions ?? []);
    }
    setPrepLoading(false);
  }

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';
  const cb  = 'rgba(255,255,255,0.03)';

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>AI Intelligence Hub</div>
        <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>JD fit scorer, pattern analysis, interview prep, and market intelligence</p>
      </div>

      {/* Row 1: JD Fit Scorer + Pattern Analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* JD Fit Scorer */}
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Sparkles size={14} style={{ color: '#2563EB' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C8C8C8', textTransform: 'uppercase' }}>JD Fit Scorer</span>
          </div>
          <form onSubmit={scoreJD}>
            <div className="input-group">
              <label className="label">Paste Job Description</label>
              <textarea
                className="input"
                rows={8}
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder="Paste the full job description here — Claude will score it against your profile instantly..."
                style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={fitLoading || !jdText.trim()}>
              {fitLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
              {fitLoading ? 'Scoring...' : 'Score This JD'}
            </button>
          </form>

          {fitResult && (
            <div style={{ marginTop: 20, borderTop: `1px solid ${bd}`, paddingTop: 18, animation: 'fadeUp 0.4s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, color: FIT_COLOR(fitResult.score) }}>{fitResult.score}</div>
                  <div style={{ fontSize: '0.65rem', color: dim }}>fit score</div>
                </div>
                <div>
                  {fitResult.classification && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>{fitResult.classification}</div>}
                  {fitResult.salaryAssessment && <div style={{ fontSize: '0.74rem', color: '#14B8AD', marginBottom: 4 }}>{fitResult.salaryAssessment}</div>}
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: `${FIT_COLOR(fitResult.score)}18`,
                    color: FIT_COLOR(fitResult.score),
                    border: `1px solid ${FIT_COLOR(fitResult.score)}30`,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {fitResult.recommendedAction?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Strengths</div>
                  {fitResult.strengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                      <span style={{ color: '#14B8AD', flexShrink: 0, marginTop: 1 }}>+</span>
                      <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Gaps</div>
                  {fitResult.gaps.length === 0 ? (
                    <div style={{ fontSize: '0.74rem', color: '#14B8AD' }}>No material gaps.</div>
                  ) : fitResult.gaps.map((g, i) => (
                    <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                      <span style={{ color: '#D08E14', flexShrink: 0, marginTop: 1 }}>—</span>
                      <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{g}</span>
                    </div>
                  ))}
                </div>
              </div>

              {fitResult.positioning && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Positioning</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{fitResult.positioning}</div>
                </div>
              )}
              {fitResult.coverLetterAngle && (
                <div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Cover Letter Angle</div>
                  <div style={{ fontSize: '0.78rem', color: '#93C5FD', lineHeight: 1.6, fontStyle: 'italic' }}>{fitResult.coverLetterAngle}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pattern Analysis */}
        <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingUp size={14} style={{ color: '#14B8AD' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C8C8C8', textTransform: 'uppercase' }}>Pipeline Pattern Analysis</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={loadPatterns} disabled={pattLoading}>
              {pattLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
              {pattLoading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: dim, marginBottom: 16, lineHeight: 1.5 }}>
            Claude analyzes your full application history and surfaces what&apos;s working: which role types convert, which sources produce the best opportunities, which resume variant performs better.
          </div>

          {patterns.length === 0 && !pattLoading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: dim, fontSize: '0.82rem' }}>
              Click &ldquo;Run Analysis&rdquo; to surface patterns from your pipeline data.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {patterns.map((p, i) => {
                const signalColor = p.signal === 'positive' ? '#14B8AD' : p.signal === 'negative' ? '#E05252' : '#2563EB';
                return (
                  <div key={i} style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: `${signalColor}08`, border: `1px solid ${signalColor}22`,
                    borderTop: `2px solid ${signalColor}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3 }}>{p.insight}</div>
                      {p.metric && <span style={{ fontSize: '0.78rem', fontWeight: 800, color: signalColor, flexShrink: 0, marginLeft: 10 }}>{p.metric}</span>}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: dim, lineHeight: 1.5 }}>{p.detail}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Interview Prep — full width */}
      <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <BookOpen size={14} style={{ color: '#8B5CF6' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', color: '#C8C8C8', textTransform: 'uppercase' }}>Interview Prep Generator</span>
        </div>

        <form onSubmit={runInterviewPrep} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="label">Company</label>
            <input className="input" value={prepCompany} onChange={e => setPrepCompany(e.target.value)} placeholder="e.g. Anthropic" />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="label">Role</label>
            <input className="input" value={prepRole} onChange={e => setPrepRole(e.target.value)} placeholder="e.g. Forward Deployed AI Engineer" />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="label">JD Snippet (optional)</label>
            <input className="input" value={prepJd} onChange={e => setPrepJd(e.target.value)} placeholder="Paste key requirements for more targeted questions..." />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={prepLoading || !prepCompany.trim() || !prepRole.trim()} style={{ whiteSpace: 'nowrap' }}>
            {prepLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <BookOpen size={13} />}
            {prepLoading ? 'Generating...' : 'Generate Questions'}
          </button>
        </form>

        {prepQuestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeUp 0.4s ease' }}>
            {prepQuestions.map((q, i) => {
              const color = CAT_COLOR[q.category] ?? '#C8C8C8';
              const open = expandedQ === i;
              return (
                <div key={i} style={{
                  borderRadius: 10, border: `1px solid ${color}22`,
                  borderLeft: `3px solid ${color}`, overflow: 'hidden',
                  background: `${color}06`,
                }}>
                  <button
                    onClick={() => setExpandedQ(open ? null : i)}
                    style={{
                      width: '100%', padding: '14px 16px', display: 'flex',
                      alignItems: 'center', gap: 12, background: 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '0.64rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0, minWidth: 80 }}>{q.category}</span>
                    <span style={{ fontSize: '0.84rem', color: '#FFFFFF', fontWeight: 600, lineHeight: 1.3, flex: 1 }}>{q.question}</span>
                    <span style={{ color: dim, fontSize: '0.8rem', flexShrink: 0 }}>{open ? '−' : '+'}</span>
                  </button>
                  {open && (
                    <div style={{ padding: '0 16px 16px 112px', borderTop: `1px solid ${color}15` }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, paddingTop: 12 }}>Suggested Answer</div>
                      <div style={{ fontSize: '0.80rem', color: 'rgba(255,255,255,0.70)', lineHeight: 1.7 }}>{q.suggestedAnswer}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {prepLoading && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: dim, fontSize: '0.82rem' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
            <div>Claude is generating tailored interview questions...</div>
          </div>
        )}

        {prepQuestions.length === 0 && !prepLoading && (
          <div style={{ padding: '12px 0', textAlign: 'center', color: dim, fontSize: '0.82rem' }}>
            Enter a company and role to generate 6 high-probability interview questions with suggested answers.
          </div>
        )}
      </div>

      {/* Row 3: Market Intelligence Cards — dynamic */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {marketInsights.length > 0 ? marketInsights.map(({ title, color, body }, idx) => {
          const icons = [Sparkles, TrendingUp, AlertTriangle];
          const Icon = icons[idx % icons.length];
          return (
            <div key={title} style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Icon size={13} style={{ color }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: dim, lineHeight: 1.6 }}>{body}</div>
            </div>
          );
        }) : [1,2,3].map(i => (
          <div key={i} style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={14} style={{ color: dim, animation: 'spin 1s linear infinite' }} />
          </div>
        ))}
      </div>
    </>
  );
}
