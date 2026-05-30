'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Printer, RefreshCw, ArrowLeft } from 'lucide-react';

export default function CoverLetterPage() {
  const { id } = useParams<{ id: string }>();
  const [html,      setHtml]      = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [drafting,  setDrafting]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  async function load() {
    setLoading(true); setError(null);
    const res = await fetch(`/api/opportunities/${id}/cover-letter`);
    if (res.ok) {
      const d = await res.json();
      setHtml(d.html);
    } else {
      setHtml(null);
    }
    setLoading(false);
  }

  async function draft() {
    setDrafting(true); setError(null);
    try {
      const res = await fetch(`/api/opportunities/${id}/cover-letter`, { method: 'POST' });
      const d   = await res.json();
      if (!res.ok) { setError(d.error ?? 'Draft failed'); return; }
      setHtml(d.html);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDrafting(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function printLetter() {
    if (!iframeRef.current) return;
    iframeRef.current.contentWindow?.print();
  }

  const toolbar: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    background: '#0F172A', borderBottom: '1px solid #1E293B',
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
    printColorAdjust: 'exact',
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F172A', color: '#94A3B8' }}>
      Loading…
    </div>
  );

  if (!html) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, background: '#0F172A' }}>
      <div style={{ color: '#94A3B8', fontSize: 14 }}>No cover letter drafted yet for this opportunity.</div>
      {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
      <button
        onClick={draft}
        disabled={drafting}
        style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
      >
        {drafting ? 'Drafting with Claude…' : 'Draft Cover Letter'}
      </button>
    </div>
  );

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div style={toolbar} className="no-print">
        <a href={`/inbox`} style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={14} /> Back
        </a>
        <div style={{ flex: 1 }} />
        <button
          onClick={draft}
          disabled={drafting}
          style={{ background: 'none', border: '1px solid #334155', color: '#94A3B8', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={13} /> {drafting ? 'Re-drafting…' : 'Re-draft'}
        </button>
        <button
          onClick={printLetter}
          style={{ background: '#2563EB', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {/* Cover letter rendered in iframe so print only gets the letter */}
      <div style={{ paddingTop: 52, background: '#E2E8F0', minHeight: '100vh' }}>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          style={{ width: '8.5in', height: '11in', margin: '24px auto', display: 'block', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', background: '#fff' }}
          title="Cover Letter Preview"
        />
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { padding: 0; margin: 0; background: white; }
        }
      `}</style>
    </>
  );
}
