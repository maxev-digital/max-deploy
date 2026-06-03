'use client';

import { useState } from 'react';
import { BookOpen, Sparkles, Loader2, Link, FileText, X, ChevronDown, ChevronRight, Wrench } from 'lucide-react';

type PrepQuestion = {
  category: string;
  question: string;
  suggestedAnswer: string;
};

type DeepDiveQuestion = {
  tool: string;
  question: string;
  suggestedAnswer: string;
};

type PrepResult = {
  fitScore: number;
  classification: string;
  salaryAssessment: string;
  recommendedAction: string;
  reasoning: string;
  strengths: string[];
  gaps: string[];
  gapFraming: Record<string, string>;
  keyTalkingPoints: string[];
  coverLetterAngle: string;
  questions: PrepQuestion[];
  deepDiveQuestions: DeepDiveQuestion[];
};

const FIT_COLOR = (score: number) => {
  if (score >= 80) return '#14B8AD';
  if (score >= 65) return '#2563EB';
  if (score >= 50) return '#D08E14';
  return '#E05252';
};

const CAT_COLOR: Record<string, string> = {
  Behavioral:      '#2563EB',
  Technical:       '#14B8AD',
  'System Design': '#8B5CF6',
  Situational:     '#E05252',
  Product:         '#D08E14',
  Culture:         '#14B8AD',
};

export default function PrepStudioPage() {
  const [inputMode, setInputMode]   = useState<'paste' | 'url'>('paste');
  const [company, setCompany]       = useState('');
  const [role, setRole]             = useState('');
  const [jdText, setJdText]         = useState('');
  const [jdUrl, setJdUrl]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<PrepResult | null>(null);
  const [panelOpen, setPanelOpen]   = useState(false);
  const [activeTab, setActiveTab]   = useState<'overview' | 'round1' | 'round2'>('overview');
  const [expandedQ, setExpandedQ]   = useState<number | null>(null);
  const [expandedD, setExpandedD]   = useState<number | null>(null);

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';
  const cb  = 'rgba(255,255,255,0.03)';

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;
    if (inputMode === 'paste' && !jdText.trim()) return;
    if (inputMode === 'url' && !jdUrl.trim()) return;

    setLoading(true);
    setResult(null);
    setExpandedQ(null);
    setExpandedD(null);
    setPanelOpen(false);

    const body = inputMode === 'url'
      ? { company, role, jdUrl }
      : { company, role, jdText };

    const res = await fetch('/api/ai/prep-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setActiveTab('overview');
      setPanelOpen(true);
    }
    setLoading(false);
  }

  const tabStyle = (tab: string) => ({
    padding: '7px 14px',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    background: activeTab === tab ? 'rgba(37,99,235,0.15)' : 'transparent',
    color: activeTab === tab ? '#93C5FD' : dim,
    textTransform: 'uppercase' as const,
  });

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1 }}>
          Interview Prep Studio
        </div>
        <p style={{ fontSize: '0.82rem', color: dim, marginTop: 4 }}>
          Paste a JD or drop a URL — get fit score, gap scripts, and two rounds of interview questions.
        </p>
      </div>

      {/* Input card */}
      <div style={{ background: cb, border: `1px solid ${bd}`, borderRadius: 14, padding: '28px', maxWidth: 680 }}>
        <form onSubmit={generate}>
          {/* Company + Role row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="label">Company</label>
              <input
                className="input"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. ISHIR"
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="label">Role</label>
              <input
                className="input"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. Forward Deployed Engineer"
              />
            </div>
          </div>

          {/* Input mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                fontSize: '0.72rem', fontWeight: 700, borderRadius: 6,
                background: inputMode === 'paste' ? 'rgba(37,99,235,0.15)' : 'transparent',
                border: `1px solid ${inputMode === 'paste' ? 'rgba(37,99,235,0.4)' : bd}`,
                color: inputMode === 'paste' ? '#93C5FD' : dim,
                cursor: 'pointer',
              }}
            >
              <FileText size={12} /> Paste JD
            </button>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                fontSize: '0.72rem', fontWeight: 700, borderRadius: 6,
                background: inputMode === 'url' ? 'rgba(37,99,235,0.15)' : 'transparent',
                border: `1px solid ${inputMode === 'url' ? 'rgba(37,99,235,0.4)' : bd}`,
                color: inputMode === 'url' ? '#93C5FD' : dim,
                cursor: 'pointer',
              }}
            >
              <Link size={12} /> Use URL
            </button>
          </div>

          {/* JD input */}
          {inputMode === 'paste' ? (
            <div className="input-group">
              <label className="label">Job Description</label>
              <textarea
                className="input"
                rows={10}
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder="Paste the full job description here..."
                style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
              />
            </div>
          ) : (
            <div className="input-group">
              <label className="label">Job Posting URL</label>
              <input
                className="input"
                type="url"
                value={jdUrl}
                onChange={e => setJdUrl(e.target.value)}
                placeholder="https://company.com/jobs/role"
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !company.trim() || !role.trim() || (inputMode === 'paste' ? !jdText.trim() : !jdUrl.trim())}
            style={{ width: '100%', justifyContent: 'center', gap: 8 }}
          >
            {loading
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating prep pack...</>
              : <><Sparkles size={14} /> Generate Prep Pack</>
            }
          </button>
        </form>
      </div>

      {/* Right slide-out panel */}
      {panelOpen && result && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setPanelOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50 }}
          />

          {/* Panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 620,
            background: '#0F1117', borderLeft: `1px solid ${bd}`,
            zIndex: 51, display: 'flex', flexDirection: 'column',
            boxShadow: '-12px 0 48px rgba(0,0,0,0.5)',
          }}>
            {/* Panel header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${bd}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <BookOpen size={13} style={{ color: '#8B5CF6' }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Prep Studio</span>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>{company}</div>
                  <div style={{ fontSize: '0.8rem', color: dim }}>{role}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Fit score */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: FIT_COLOR(result.fitScore) }}>{result.fitScore}</div>
                    <div style={{ fontSize: '0.6rem', color: dim }}>fit score</div>
                  </div>
                  <button
                    onClick={() => setPanelOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: dim, padding: 4, borderRadius: 6 }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button style={tabStyle('overview')} onClick={() => setActiveTab('overview')}>Overview</button>
                <button style={tabStyle('round1')} onClick={() => setActiveTab('round1')}>Round 1</button>
                <button style={tabStyle('round2')} onClick={() => setActiveTab('round2')}>
                  Round 2 — Technical
                  {result.deepDiveQuestions?.length > 0 && (
                    <span style={{ marginLeft: 6, background: 'rgba(139,92,246,0.2)', color: '#A78BFA', borderRadius: 10, padding: '1px 6px', fontSize: '0.6rem' }}>
                      {result.deepDiveQuestions.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Panel content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'overview' && (
                <div style={{ animation: 'fadeUp 0.3s ease' }}>
                  {/* Classification + action */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {result.classification && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(37,99,235,0.15)', color: '#93C5FD', border: '1px solid rgba(37,99,235,0.3)' }}>
                        {result.classification}
                      </span>
                    )}
                    {result.recommendedAction && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${FIT_COLOR(result.fitScore)}15`, color: FIT_COLOR(result.fitScore), border: `1px solid ${FIT_COLOR(result.fitScore)}30`, textTransform: 'uppercase' }}>
                        {result.recommendedAction.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {result.reasoning && (
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 20, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: `3px solid ${FIT_COLOR(result.fitScore)}` }}>
                      {result.reasoning}
                    </div>
                  )}

                  {result.salaryAssessment && (
                    <div style={{ fontSize: '0.76rem', color: '#14B8AD', marginBottom: 20 }}>{result.salaryAssessment}</div>
                  )}

                  {/* Strengths + Gaps */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Strengths</div>
                      {(result.strengths ?? []).map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6 }}>
                          <span style={{ color: '#14B8AD', flexShrink: 0 }}>+</span>
                          <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Gaps</div>
                      {(result.gaps ?? []).length === 0
                        ? <div style={{ fontSize: '0.76rem', color: '#14B8AD' }}>No material gaps.</div>
                        : (result.gaps ?? []).map((g, i) => (
                          <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6 }}>
                            <span style={{ color: '#D08E14', flexShrink: 0 }}>—</span>
                            <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{g}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Key talking points */}
                  {(result.keyTalkingPoints ?? []).length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Lead With</div>
                      {result.keyTalkingPoints.map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
                          <span style={{ color: '#8B5CF6', flexShrink: 0, marginTop: 2 }}>›</span>
                          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cover letter angle */}
                  {result.coverLetterAngle && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Cover Letter Angle</div>
                      <div style={{ fontSize: '0.78rem', color: '#93C5FD', lineHeight: 1.6, fontStyle: 'italic' }}>{result.coverLetterAngle}</div>
                    </div>
                  )}

                  {/* Gap framing scripts */}
                  {result.gapFraming && Object.keys(result.gapFraming).length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Gap Scripts — How to Answer</div>
                      {Object.entries(result.gapFraming).map(([gap, script], i) => (
                        <div key={i} style={{ marginBottom: 12, padding: '12px 14px', background: 'rgba(208,142,20,0.06)', border: '1px solid rgba(208,142,20,0.15)', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D08E14', marginBottom: 6 }}>{gap}</div>
                          <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{script}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── ROUND 1 TAB ── */}
              {activeTab === 'round1' && (
                <div style={{ animation: 'fadeUp 0.3s ease' }}>
                  <div style={{ fontSize: '0.75rem', color: dim, marginBottom: 18 }}>General interview questions — behavioral, technical, system design, situational.</div>
                  {(result.questions ?? []).map((q, i) => (
                    <div
                      key={i}
                      style={{ marginBottom: 10, border: `1px solid ${expandedQ === i ? 'rgba(37,99,235,0.3)' : bd}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}
                    >
                      <button
                        onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                        style={{ width: '100%', padding: '14px 16px', background: expandedQ === i ? 'rgba(37,99,235,0.06)' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}
                      >
                        <span style={{
                          flexShrink: 0, fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                          background: `${CAT_COLOR[q.category] ?? '#6B7280'}18`,
                          color: CAT_COLOR[q.category] ?? '#C8C8C8',
                          border: `1px solid ${CAT_COLOR[q.category] ?? '#6B7280'}30`,
                          whiteSpace: 'nowrap', marginTop: 1,
                        }}>
                          {q.category}
                        </span>
                        <span style={{ flex: 1, fontSize: '0.84rem', color: '#FFFFFF', fontWeight: 500, lineHeight: 1.45 }}>{q.question}</span>
                        {expandedQ === i
                          ? <ChevronDown size={14} style={{ color: dim, flexShrink: 0, marginTop: 2 }} />
                          : <ChevronRight size={14} style={{ color: dim, flexShrink: 0, marginTop: 2 }} />
                        }
                      </button>
                      {expandedQ === i && (
                        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${bd}` }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, marginTop: 14 }}>Suggested Answer</div>
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{q.suggestedAnswer}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── ROUND 2 TAB ── */}
              {activeTab === 'round2' && (
                <div style={{ animation: 'fadeUp 0.3s ease' }}>
                  <div style={{ fontSize: '0.75rem', color: dim, marginBottom: 18 }}>Tool-specific deep dive — second-round technical probing based on technologies named in the JD.</div>
                  {(result.deepDiveQuestions ?? []).length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: dim, textAlign: 'center', paddingTop: 40 }}>No deep dive questions generated.</div>
                  ) : (result.deepDiveQuestions ?? []).map((q, i) => (
                    <div
                      key={i}
                      style={{ marginBottom: 10, border: `1px solid ${expandedD === i ? 'rgba(139,92,246,0.3)' : bd}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}
                    >
                      <button
                        onClick={() => setExpandedD(expandedD === i ? null : i)}
                        style={{ width: '100%', padding: '14px 16px', background: expandedD === i ? 'rgba(139,92,246,0.06)' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}
                      >
                        <span style={{
                          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                          fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                          background: 'rgba(139,92,246,0.15)', color: '#A78BFA',
                          border: '1px solid rgba(139,92,246,0.3)', whiteSpace: 'nowrap', marginTop: 1,
                        }}>
                          <Wrench size={9} /> {q.tool}
                        </span>
                        <span style={{ flex: 1, fontSize: '0.84rem', color: '#FFFFFF', fontWeight: 500, lineHeight: 1.45 }}>{q.question}</span>
                        {expandedD === i
                          ? <ChevronDown size={14} style={{ color: dim, flexShrink: 0, marginTop: 2 }} />
                          : <ChevronRight size={14} style={{ color: dim, flexShrink: 0, marginTop: 2 }} />
                        }
                      </button>
                      {expandedD === i && (
                        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${bd}` }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C8C8C8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, marginTop: 14 }}>Suggested Answer</div>
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{q.suggestedAnswer}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
