'use client';

import { useState, useEffect } from 'react';

const BASE = 'https://maxevdigital.com/Projects/MAX%20EV%20Digital';

const SHOTS = [
  { src: `${BASE}/maxev_admin_dark.png`,      url: 'maxevdeployed / dashboard',    label: 'Career Dashboard',      dot: '#2563EB' },
  { src: `${BASE}/maxev_lead_dark.png`,        url: 'maxevdeployed / pipeline',     label: 'Application Pipeline',  dot: '#A78BFA' },
  { src: `${BASE}/maxev_analytics_dark.png`,   url: 'maxevdeployed / earnings',     label: 'Earnings & Analytics',  dot: '#EC4899' },
  { src: `${BASE}/maxev_AI_Assistant.png`,     url: 'maxevdeployed / intelligence', label: 'AI Career Intelligence', dot: '#4ADE80' },
  { src: `${BASE}/maxev_admin_light.png`,      url: 'maxevdeployed / dashboard',    label: 'Dashboard Light Mode',  dot: '#F0B429' },
];

export default function HeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(n => (n + 1) % SHOTS.length), 3800);
    return () => clearInterval(t);
  }, []);

  const shot = SHOTS[active];

  return (
    <div style={{
      animation: 'hero-panel-float 7s ease-in-out infinite',
      transformOrigin: 'center center',
      width: '100%',
      maxWidth: 560,
      flexShrink: 0,
    }}>
      <style>{`
        @keyframes hero-panel-float {
          0%, 100% { transform: perspective(1400px) rotateY(-10deg) rotateX(3deg) translateY(0px); }
          50%       { transform: perspective(1400px) rotateY(-10deg) rotateX(3deg) translateY(-10px); }
        }
      `}</style>

      {/* Browser chrome */}
      <div style={{
        background: '#07090e',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '32px 32px 90px rgba(0,0,0,0.75), 0 0 0 1px rgba(37,99,235,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        {/* Chrome bar */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {['#FF5F57','#FFBD2E','#28CA41'].map(c => (
              <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
            ))}
          </div>
          {/* URL bar */}
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', minHeight: 22 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }} />
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {shot.url}
            </span>
          </div>
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {SHOTS.map((s, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{ width: i === active ? 16 : 6, height: 6, borderRadius: 3, background: i === active ? s.dot : 'rgba(255,255,255,0.15)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.3s ease' }}
              />
            ))}
          </div>
        </div>

        {/* Screenshot */}
        <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden', background: '#0a0a0f' }}>
          {SHOTS.map((s, i) => (
            <img
              key={s.src}
              src={s.src}
              alt={s.label}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'top left',
                opacity: i === active ? 1 : 0,
                transition: 'opacity 0.6s ease',
              }}
            />
          ))}
          {/* Label overlay */}
          <div style={{
            position: 'absolute', bottom: 12, left: 12,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
            border: `1px solid ${shot.dot}44`,
            borderRadius: 6, padding: '4px 10px',
            fontSize: '0.62rem', fontWeight: 600, color: shot.dot,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            transition: 'color 0.4s ease, border-color 0.4s ease',
          }}>
            {shot.label}
          </div>
        </div>
      </div>
    </div>
  );
}
