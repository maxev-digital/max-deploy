'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Loader2, Play, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';

interface TemplateContent {
  profile:      string;
  fdeFramework: string;
  rules:        string;
  structure:    string;
}

type Tab = 'profile' | 'fdeFramework' | 'rules' | 'structure';

const TABS: { key: Tab; label: string; desc: string }[] = [
  { key: 'profile',      label: 'Candidate Profile', desc: 'Who you are — methodology, background, stack' },
  { key: 'fdeFramework', label: 'FDE Framework',     desc: 'Extra context injected for client-facing roles' },
  { key: 'rules',        label: 'Generation Rules',  desc: 'Prohibitions, tone, style constraints' },
  { key: 'structure',    label: 'Structure Guide',   desc: 'Intro / bullets / closing instructions' },
];

const DARK_EDITOR: React.CSSProperties = {
  width:       '100%',
  height:      '100%',
  background:  '#0D1117',
  color:       '#E2E8F0',
  border:      '1px solid var(--border)',
  borderRadius: 8,
  padding:     '14px 16px',
  fontFamily:  'ui-monospace,"Cascadia Code","Fira Code",Consolas,monospace',
  fontSize:    '0.8rem',
  lineHeight:  1.7,
  resize:      'none' as const,
  outline:     'none',
  transition:  'border-color 0.15s, box-shadow 0.15s',
};

export default function TemplatePage() {
  const [tab,    setTab]    = useState<Tab>('profile');
  const [tmpl,   setTmpl]   = useState<TemplateContent | null>(null);
  const [orig,   setOrig]   = useState<TemplateContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [savErr, setSavErr] = useState('');

  // Dry-run
  const [jdText,    setJdText]    = useState('');
  const [company,   setCompany]   = useState('');
  const [role,      setRole]      = useState('');
  const [isFde,     setIsFde]     = useState(false);
  const [running,   setRunning]   = useState(false);
  const [runErr,    setRunErr]    = useState('');
  const [resultHtml, setResultHtml] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetch('/api/template')
      .then(r => r.json())
      .then(d => { setTmpl(d.content); setOrig(d.content); })
      .catch(() => {});
  }, []);

  const isDirty = tmpl && orig && JSON.stringify(tmpl) !== JSON.stringify(orig);

  function update(key: Tab, value: string) {
    setTmpl(prev => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
    setSavErr('');
  }

  async function handleSave() {
    if (!tmpl) return;
    setSaving(true); setSavErr('');
    try {
      const res = await fetch('/api/template', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: tmpl }),
      });
      if (!res.ok) throw new Error('Save failed');
      setOrig(tmpl);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSavErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!orig) return;
    setTmpl(orig);
    setSaved(false);
  }

  async function handleDryRun() {
    if (!tmpl || !jdText.trim()) return;
    setRunning(true); setRunErr(''); setResultHtml('');
    try {
      const res = await fetch('/api/template/dry-run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jdText, company, role, template: tmpl, isFde }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error || 'Generation failed');
      setResultHtml(d.html);
    } catch (e) {
      setRunErr((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const NAVY   = '#0F172A';
  const NAVY2  = '#1E293B';
  const ACCENT = '#2563EB';
  const TEAL   = '#14B8AD';
  const DIM    = 'var(--gray)';
  const BRIGHT = 'var(--white)';
  const BD     = 'var(--border)';

  if (!tmpl) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: DIM }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 10 }} /> Loading template...
      </div>
    );
  }

  const currentContent = tmpl[tab];
  const currentTab = TABS.find(t => t.key === tab)!;

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{
        padding: '12px 24px', borderBottom: `1px solid ${BD}`,
        background: NAVY2, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: BRIGHT, lineHeight: 1 }}>Prompt Studio</div>
          <div style={{ fontSize: '0.68rem', color: DIM, marginTop: 3 }}>
            Edit the template Claude uses to generate cover letters. Changes apply to all future generations.
          </div>
        </div>

        {isDirty && (
          <button onClick={handleReset} style={{
            background: 'none', border: `1px solid var(--border)`, borderRadius: 6,
            color: DIM, padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <RotateCcw size={12} /> Discard
          </button>
        )}

        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: TEAL, fontSize: '0.72rem', fontWeight: 700 }}>
            <CheckCircle size={14} /> Saved
          </div>
        )}

        {savErr && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#EF4444', fontSize: '0.7rem' }}>
            <AlertCircle size={13} /> {savErr}
          </div>
        )}

        <button onClick={handleSave} disabled={saving || !isDirty} style={{
          background: isDirty ? ACCENT : 'var(--card2)',
          color: isDirty ? '#FFF' : DIM,
          border: 'none', borderRadius: 6,
          padding: '7px 18px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: isDirty ? 'pointer' : 'not-allowed', transition: 'background 0.15s',
        }}>
          {saving
            ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
            : <><Save size={12} /> Save Template</>}
        </button>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: Editor ── */}
        <div style={{
          width: '55%', display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${BD}`, overflow: 'hidden',
        }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${BD}`, background: NAVY2, flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '9px 16px', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t.key ? ACCENT : 'transparent'}`,
                color: tab === t.key ? BRIGHT : DIM,
                fontSize: '0.7rem', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
                whiteSpace: 'nowrap',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Section desc */}
          <div style={{
            padding: '8px 16px', background: 'rgba(37,99,235,0.05)',
            borderBottom: `1px solid rgba(37,99,235,0.1)`,
            fontSize: '0.65rem', color: 'rgba(147,197,253,0.7)', flexShrink: 0,
          }}>
            {currentTab.desc}
          </div>

          {/* Editor */}
          <div style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
            <textarea
              value={currentContent}
              onChange={e => update(tab, e.target.value)}
              style={DARK_EDITOR}
              spellCheck={false}
              onFocus={e => {
                e.target.style.borderColor = ACCENT;
                e.target.style.boxShadow   = `0 0 0 2px rgba(37,99,235,0.15)`;
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.boxShadow   = 'none';
              }}
            />
          </div>
        </div>

        {/* ── Right: Dry Run ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Dry-run inputs */}
          <div style={{
            padding: '14px 16px', borderBottom: `1px solid ${BD}`,
            background: NAVY2, flexShrink: 0,
          }}>
            <div style={{
              fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: TEAL, marginBottom: 10,
            }}>
              Dry Run — Test Current Template
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Company name"
                style={{
                  background: '#0D1117', color: '#E2E8F0', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '7px 10px', fontSize: '0.75rem',
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
              <input
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="Role title"
                style={{
                  background: '#0D1117', color: '#E2E8F0', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '7px 10px', fontSize: '0.75rem',
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>

            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste job description here..."
              rows={4}
              style={{
                width: '100%',
                background: '#0D1117', color: '#E2E8F0', border: '1px solid var(--border)',
                borderRadius: 6, padding: '8px 10px', fontSize: '0.73rem',
                fontFamily: 'ui-monospace,Consolas,monospace', lineHeight: 1.6,
                resize: 'none', outline: 'none', marginBottom: 10,
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', color: DIM, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isFde}
                  onChange={e => setIsFde(e.target.checked)}
                  style={{ accentColor: ACCENT }}
                />
                FDE role (inject FDE Framework)
              </label>

              <button onClick={handleDryRun} disabled={running || !jdText.trim()} style={{
                marginLeft: 'auto',
                background: jdText.trim() ? 'rgba(20,184,173,0.12)' : 'var(--card2)',
                color: jdText.trim() ? TEAL : DIM,
                border: `1px solid ${jdText.trim() ? 'rgba(20,184,173,0.25)' : 'var(--border)'}`,
                borderRadius: 6, padding: '7px 16px', fontSize: '0.72rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: jdText.trim() ? 'pointer' : 'not-allowed',
              }}>
                {running
                  ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                  : <><Play size={12} /> Generate</>}
              </button>
            </div>

            {runErr && (
              <div style={{ marginTop: 8, fontSize: '0.68rem', color: '#EF4444', display: 'flex', gap: 5 }}>
                <AlertCircle size={13} /> {runErr}
              </div>
            )}
          </div>

          {/* Result */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {resultHtml ? (
              <iframe
                ref={iframeRef}
                srcDoc={resultHtml}
                style={{ width: '100%', height: '100%', border: 'none', background: '#FFF' }}
                title="Generated Cover Letter"
              />
            ) : (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <Play size={28} style={{ color: 'var(--gray)' }} />
                <div style={{ fontSize: '0.72rem', color: 'var(--gray)', textAlign: 'center', lineHeight: 1.6 }}>
                  Paste a JD and click Generate<br />to preview how the template renders
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
