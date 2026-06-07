'use client';

import { useState } from 'react';

export default function HubSubscribeForm() {
  const [email,  setEmail]  = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    const res = await fetch('/api/public/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    setStatus(res.ok ? 'done' : 'error');
  }

  if (status === 'done') return (
    <div style={{
      padding: '14px 24px',
      background: 'rgba(20,184,173,0.12)',
      border: '1px solid rgba(20,184,173,0.35)',
      borderRadius: 10,
      color: '#14B8AD',
      fontSize: '0.9rem',
      fontWeight: 600,
      textAlign: 'center',
    }}>
      You&apos;re on the list. First digest coming Friday.
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        style={{
          flex: '1 1 260px',
          maxWidth: 320,
          padding: '12px 18px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          color: '#fff',
          fontSize: '0.88rem',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          padding: '12px 28px',
          background: status === 'loading' ? '#1e4bad' : '#2563EB',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: '0.88rem',
          fontWeight: 700,
          cursor: status === 'loading' ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background 0.2s',
        }}
      >
        {status === 'loading' ? 'Subscribing...' : 'Get the Weekly Digest'}
      </button>
      {status === 'error' && (
        <div style={{ width: '100%', textAlign: 'center', color: '#E05252', fontSize: '0.78rem', marginTop: 4 }}>
          Something went wrong — try again.
        </div>
      )}
    </form>
  );
}
