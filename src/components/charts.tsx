'use client';

// Self-contained SVG chart components — zero external dependencies
// Copied from maxev-admin ai-insights pattern

export function tileColor(delta: string, isDark = true): { bg: string; text: string; border: string } {
  const n = parseFloat(delta);
  if (isDark) {
    if (n >= 15) return { bg: 'rgba(16,185,129,0.55)', text: '#34D399', border: 'rgba(16,185,129,0.65)' };
    if (n >=  5) return { bg: 'rgba(16,185,129,0.35)', text: '#6EE7B7', border: 'rgba(16,185,129,0.4)'  };
    if (n >   0) return { bg: 'rgba(16,185,129,0.18)', text: '#A7F3D0', border: 'rgba(16,185,129,0.25)' };
    if (n === 0) return { bg: 'rgba(107,114,128,0.22)', text: '#9CA3AF', border: 'rgba(107,114,128,0.3)' };
    if (n >= -5) return { bg: 'rgba(239,68,68,0.18)', text: '#FCA5A5', border: 'rgba(239,68,68,0.25)'  };
    if (n >= -15)return { bg: 'rgba(239,68,68,0.35)', text: '#FCA5A5', border: 'rgba(239,68,68,0.4)'   };
    return             { bg: 'rgba(239,68,68,0.55)', text: '#FEE2E2', border: 'rgba(239,68,68,0.65)'  };
  } else {
    if (n >= 15) return { bg: '#047857', text: '#FFFFFF', border: '#059669' };
    if (n >=  5) return { bg: '#059669', text: '#FFFFFF', border: '#14B8AD' };
    if (n >   0) return { bg: '#14B8AD', text: '#FFFFFF', border: '#34D399' };
    if (n === 0) return { bg: '#374151', text: '#FFFFFF', border: '#4B5563' };
    if (n >= -5) return { bg: '#DC2626', text: '#FFFFFF', border: '#E05252' };
    if (n >= -15)return { bg: '#B91C1C', text: '#FFFFFF', border: '#DC2626' };
    return             { bg: '#991B1B', text: '#FFFFFF', border: '#B91C1C' };
  }
}

export function healthColor(score: number): string {
  if (score >= 80) return '#14B8AD';
  if (score >= 65) return '#2563EB';
  if (score >= 50) return '#D08E14';
  return '#E05252';
}

export function healthGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  return 'D';
}

export function Gauge({ pct, color, label, sub, isDark = true }: {
  pct: number; color: string; label: string; sub: string; isDark?: boolean;
}) {
  const cx = 80, cy = 76, r = 58;
  const circ = 2 * Math.PI * r;
  const arc  = circ * 0.75;
  const fill = arc * Math.min(Math.max(pct, 0), 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const ang = ((135 + t * 270) * Math.PI) / 180;
    return { x1: cx + (r - 8) * Math.cos(ang), y1: cy + (r - 8) * Math.sin(ang), x2: cx + (r + 2) * Math.cos(ang), y2: cy + (r + 2) * Math.sin(ang) };
  });
  const txt    = isDark ? '#FFFFFF' : '#334155';
  const txtSub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(51,65,85,0.65)';
  const txtLbl = isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(51,65,85,0.45)';
  const track  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const tickC  = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  return (
    <svg viewBox="0 0 160 100" style={{ width: '100%', maxWidth: 180, display: 'block', margin: '0 auto' }}>
      <defs>
        <linearGradient id="gfill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={9}
        strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#gfill)" strokeWidth={9}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      {ticks.map((tk, i) => <line key={i} x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke={tickC} strokeWidth={1.5} strokeLinecap="round" />)}
      <circle cx={cx} cy={cy} r={14} fill={color} fillOpacity="0.08" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={txt} fontSize={18} fontWeight={900} fontFamily="Space Grotesk, sans-serif">{Math.round(pct * 100)}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={txtSub} fontSize={7.5} fontFamily="Space Grotesk, sans-serif">{sub}</text>
      <text x={cx} y={96} textAnchor="middle" fill={txtLbl} fontSize={7} fontFamily="Space Grotesk, sans-serif" fontWeight={700} letterSpacing="0.12em">{label.toUpperCase()}</text>
    </svg>
  );
}

export function Sparkline({ data, color, labels, isDark = true }: {
  data: number[]; color: string; labels: string[]; isDark?: boolean;
}) {
  const W = 200, H = 60;
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * (W - 8) + 4, y: H - 10 - ((v - min) / rng) * (H - 20) }));
  const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x},${H} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${H} Z`;
  const gid = `sl${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  const dotFill = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
  const lblFill = isDark ? 'rgba(255,255,255,0.2)'  : 'rgba(51,65,85,0.45)';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3.5 : 2}
          fill={i === pts.length - 1 ? color : dotFill}
          stroke={i === pts.length - 1 ? '#000' : 'none'} strokeWidth={1} />
      ))}
      {labels.map((l, i) => (
        <text key={i} x={pts[i].x} y={H + 1} textAnchor="middle" fill={lblFill} fontSize={6.5} fontFamily="Space Grotesk, sans-serif">{l}</text>
      ))}
    </svg>
  );
}

export function Ring({ pct, color, center, sub, isDark = true }: {
  pct: number; color: string; center: string; sub: string; isDark?: boolean;
}) {
  const cx = 44, cy = 44, r = 34;
  const circ = 2 * Math.PI * r;
  const fill = circ * Math.min(Math.max(pct, 0), 1);
  const gid   = `rg${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  const track = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const txt   = isDark ? '#FFFFFF' : '#334155';
  const txtS  = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(51,65,85,0.5)';
  return (
    <svg viewBox="0 0 88 88" style={{ width: 88, height: 88, flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={8} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={8}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <circle cx={cx} cy={cy} r={20} fill={color} fillOpacity="0.07" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={txt} fontSize={14} fontWeight={900} fontFamily="Space Grotesk, sans-serif">{center}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={txtS} fontSize={7} fontFamily="Space Grotesk, sans-serif">{sub}</text>
    </svg>
  );
}

export function StageBar({ label, count, max, color, value, maxVal, isDark = true }: {
  label: string; count: number; max: number; color: string; value?: number; maxVal?: number; isDark?: boolean;
}) {
  const barPct   = value !== undefined && maxVal ? (value / maxVal) * 100 : (count / max) * 100;
  const lblClr   = isDark ? 'rgba(255,255,255,0.5)'  : '#334155';
  const cntClr   = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(51,65,85,0.45)';
  const trackClr = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: '0.71rem', color: lblClr, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: '0.6rem', color: cntClr }}>{count}</span>
        </div>
        <span style={{ fontSize: '0.78rem', color, fontWeight: 700 }}>
          {value !== undefined ? `$${(value / 1000).toFixed(1)}k` : count}
        </span>
      </div>
      <div style={{ height: 5, background: trackClr, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease', boxShadow: `0 0 6px ${color}66` }} />
      </div>
    </div>
  );
}
