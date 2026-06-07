'use client';

import { useState } from 'react';
import { X, Save, Loader2, Eye, Code } from 'lucide-react';

interface ClConfig {
  headerTitle: string;
  subjectText: string;
  intro:       string;
  bullets:     string[];
  closingLine: string;
}

interface Props {
  opportunityId:    string;
  company:          string;
  role:             string;
  initialClConfig:  ClConfig | null;
  initialResumeHtml: string | null;
  onClose:          () => void;
  onSaved:          () => void;
}

const DARK_EDITOR: React.CSSProperties = {
  width:       '100%',
  background:  '#0D1117',
  color:       '#E2E8F0',
  border:      '1px solid var(--border)',
  borderRadius: 6,
  padding:     '10px 12px',
  fontFamily:  'ui-monospace,"Cascadia Code","Fira Code",Consolas,monospace',
  fontSize:    '0.78rem',
  lineHeight:  1.6,
  resize:      'vertical' as const,
  outline:     'none',
  transition:  'border-color 0.15s, box-shadow 0.15s',
};

const LABEL: React.CSSProperties = {
  display:       'block',
  fontSize:      '0.58rem',
  fontWeight:    700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color:         'var(--gray)',
  marginBottom:  5,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function focusOn(e: React.FocusEvent<HTMLTextAreaElement>, color: string) {
  e.target.style.borderColor = color;
  e.target.style.boxShadow   = `0 0 0 2px ${color}33`;
}
function focusOff(e: React.FocusEvent<HTMLTextAreaElement>, color = 'var(--border)') {
  e.target.style.borderColor = color;
  e.target.style.boxShadow   = 'none';
}

export function DocumentEditorDrawer({
  opportunityId, company, role,
  initialClConfig, initialResumeHtml,
  onClose, onSaved,
}: Props) {
  const [tab,    setTab]    = useState<'cl' | 'resume'>('cl');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [preview, setPreview] = useState(false);

  // CL fields
  const [headerTitle,  setHeaderTitle]  = useState(initialClConfig?.headerTitle  ?? '');
  const [subjectText,  setSubjectText]  = useState(initialClConfig?.subjectText  ?? '');
  const [intro,        setIntro]        = useState(initialClConfig?.intro        ?? '');
  const [bullet1,      setBullet1]      = useState(initialClConfig?.bullets?.[0] ?? '');
  const [bullet2,      setBullet2]      = useState(initialClConfig?.bullets?.[1] ?? '');
  const [bullet3,      setBullet3]      = useState(initialClConfig?.bullets?.[2] ?? '');
  const [closingLine,  setClosingLine]  = useState(initialClConfig?.closingLine  ?? '');

  // Resume field
  const [resumeHtml, setResumeHtml] = useState(initialResumeHtml ?? '');

  const ACCENT  = '#2563EB';
  const ORANGE  = '#EA580C';
  const TEAL    = '#14B8AD';
  const NAVY    = '#0F172A';
  const NAVY2   = '#1E293B';
  const BRIGHT  = 'var(--white)';
  const DIM     = 'var(--gray)';

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        clConfig: {
          headerTitle,
          subjectText,
          intro,
          bullets:     [bullet1, bullet2, bullet3].filter(Boolean),
          closingLine,
        },
      };
      if (resumeHtml) body.resumeHtml = resumeHtml;

      const res = await fetch(`/api/opportunities/${opportunityId}/documents`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex' }}>
      {/* Backdrop */}
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.65)' }} onClick={onClose} />

      {/* Drawer */}
      <div style={{
        width: 740, maxWidth: '90vw', height: '100vh',
        background: NAVY,
        borderLeft: 'var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: 'var(--border)',
          background: NAVY2,
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: BRIGHT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company}</div>
            <div style={{ fontSize: '0.68rem', color: DIM, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role}</div>
          </div>

          {saved && (
            <div style={{ fontSize: '0.65rem', color: TEAL, fontWeight: 700, marginRight: 4 }}>PDF rebuilt</div>
          )}

          <button onClick={handleSave} disabled={saving} style={{
            background: ACCENT, color: 'var(--white)', border: 'none', borderRadius: 6,
            padding: '7px 16px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', gap: 6, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, flexShrink: 0,
          }}>
            {saving
              ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              : <><Save size={12} /> Save &amp; Rebuild PDF</>}
          </button>

          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: DIM, cursor: 'pointer', padding: 4, flexShrink: 0,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: NAVY2,
          borderBottom: 'var(--border)',
          flexShrink: 0,
        }}>
          {(['cl', 'resume'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '9px 22px',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t ? ACCENT : 'transparent'}`,
              color: tab === t ? BRIGHT : DIM,
              fontSize: '0.7rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
            }}>
              {t === 'cl' ? 'Cover Letter' : 'Resume'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

          {/* ── Cover Letter tab ── */}
          {tab === 'cl' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <Field label="Header Title">
                  <textarea value={headerTitle} onChange={e => setHeaderTitle(e.target.value)}
                    rows={2} style={DARK_EDITOR} placeholder="Role Title — Company"
                    onFocus={e => focusOn(e, ACCENT)} onBlur={e => focusOff(e)} />
                </Field>
                <Field label="Subject Line">
                  <textarea value={subjectText} onChange={e => setSubjectText(e.target.value)}
                    rows={2} style={DARK_EDITOR} placeholder="Role — Company · $Range"
                    onFocus={e => focusOn(e, ACCENT)} onBlur={e => focusOff(e)} />
                </Field>
              </div>

              <Field label="Intro Paragraph">
                <textarea value={intro} onChange={e => setIntro(e.target.value)}
                  rows={5} style={DARK_EDITOR}
                  placeholder="Opening — their challenge, not your credentials..."
                  onFocus={e => focusOn(e, ACCENT)} onBlur={e => focusOff(e)} />
              </Field>

              {/* Bullets */}
              <div style={{
                background: 'rgba(234,88,12,0.05)',
                border: '1px solid rgba(234,88,12,0.15)',
                borderRadius: 8, padding: '14px 16px', marginBottom: 14,
              }}>
                <div style={{
                  fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: ORANGE, marginBottom: 12,
                }}>
                  Direct Alignment Bullets
                </div>

                {[
                  { v: bullet1, s: setBullet1, label: 'Bullet 1 — Discovery & Problem Framing' },
                  { v: bullet2, s: setBullet2, label: 'Bullet 2 — Architecture Approach' },
                  { v: bullet3, s: setBullet3, label: 'Bullet 3 — Delivery & Validation' },
                ].map(({ v, s, label }, i) => (
                  <div key={i} style={{ marginBottom: i < 2 ? 12 : 0 }}>
                    <label style={{ ...LABEL, color: 'rgba(234,88,12,0.65)' }}>{label}</label>
                    <textarea value={v} onChange={e => s(e.target.value)}
                      rows={3}
                      style={{ ...DARK_EDITOR, borderColor: 'rgba(234,88,12,0.18)' }}
                      placeholder={`<strong>Label:</strong> Bullet ${i + 1} content...`}
                      onFocus={e => focusOn(e, ORANGE)}
                      onBlur={e => focusOff(e, 'rgba(234,88,12,0.18)')} />
                  </div>
                ))}
              </div>

              <Field label="Closing Paragraph">
                <textarea value={closingLine} onChange={e => setClosingLine(e.target.value)}
                  rows={4} style={DARK_EDITOR}
                  placeholder="Credibility anchor + genuine interest + availability/location..."
                  onFocus={e => focusOn(e, ACCENT)} onBlur={e => focusOff(e)} />
              </Field>

              <div style={{
                background: 'rgba(20,184,173,0.05)',
                border: '1px solid rgba(20,184,173,0.12)',
                borderRadius: 6, padding: '8px 12px',
                fontSize: '0.65rem', color: TEAL, lineHeight: 1.5,
              }}>
                Save & Rebuild PDF regenerates via Chromium. Updated PDF available at /cover-letter/{opportunityId} immediately after save.
              </div>
            </div>
          )}

          {/* ── Resume tab ── */}
          {tab === 'resume' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: '0.65rem', color: DIM, lineHeight: 1.5 }}>
                  Freeform HTML editor. Saved to this opportunity record only.
                </div>
                <button onClick={() => setPreview(!preview)} style={{
                  background: preview ? 'rgba(37,99,235,0.14)' : 'var(--card2)',
                  color: preview ? '#93C5FD' : DIM,
                  border: `1px solid ${preview ? 'rgba(37,99,235,0.25)' : 'var(--card2)'}`,
                  borderRadius: 5, padding: '5px 11px',
                  fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {preview ? <Code size={11} /> : <Eye size={11} />}
                  {preview ? 'Edit HTML' : 'Preview'}
                </button>
              </div>

              {preview ? (
                <iframe srcDoc={resumeHtml} style={{
                  flex: 1, width: '100%', minHeight: 500,
                  border: '1px solid var(--border)',
                  borderRadius: 6, background: '#FFF',
                }} />
              ) : (
                <textarea
                  value={resumeHtml}
                  onChange={e => setResumeHtml(e.target.value)}
                  style={{
                    ...DARK_EDITOR,
                    flex: 1, minHeight: 500, resize: 'none',
                  }}
                  placeholder="Paste or write HTML for a role-specific resume version..."
                  onFocus={e => focusOn(e, ACCENT)}
                  onBlur={e => focusOff(e)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
