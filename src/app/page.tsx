import { auth }            from '@/lib/auth';
import Link                from 'next/link';
import { prisma }          from '@/lib/prisma';
import { unstable_cache }  from 'next/cache';
import { StageBar, Sparkline } from '@/components/charts';
import HubSubscribeForm    from '@/components/HubSubscribeForm';

export const metadata = {
  title: 'MAX EV Deployed — AI Engineering Job Market Intelligence',
  description: 'Live intelligence across 1,200+ indexed AI engineering roles. Sector heat, salary bands, hiring velocity, and industry news for AI, FDE, LLM, and Data Engineering professionals.',
};

// ── Classification → public sector label ─────────────────────────────────────
const CL_TO_SECTOR: Record<string, string> = {
  'FDE':         'Applied AI / FDE',
  'AI_Engineer': 'AI Engineering',
  'Director':    'AI Leadership',
  'Solutions':   'Solutions Architecture',
  'FullStack':   'Full Stack AI',
  'CSM':         'Customer Success',
  'Contract':    'Applied AI / FDE',
  'Marketing':   'AI Strategy',
};
const SECTOR_COLORS: Record<string, string> = {
  'Applied AI / FDE':       '#14B8AD',
  'AI Engineering':         '#2563EB',
  'AI Leadership':          '#9333EA',
  'Solutions Architecture': '#D08E14',
  'Full Stack AI':          '#4ADE80',
  'Customer Success':       '#EC4899',
  'AI Strategy':            '#6B7280',
  'Other':                  '#374151',
};

// ── Build type demand — from our June 2026 JD analysis (317 JDs, fitScore≥70) ─
const BUILD_TYPES = [
  { label: 'LLM API integration',              pct: 60, count: 190 },
  { label: 'Customer-facing AI product',        pct: 54, count: 172 },
  { label: 'AI agent / autonomous agent',       pct: 54, count: 170 },
  { label: 'Internal AI platform / tooling',    pct: 51, count: 163 },
  { label: 'AI workflow automation',            pct: 35, count: 110 },
  { label: 'Forward deployed / implementation', pct: 34, count: 108 },
  { label: 'AI evaluation framework',           pct: 31, count:  97 },
  { label: 'Model deployment / MLOps',          pct: 27, count:  86 },
  { label: 'Prompt engineering',                pct: 26, count:  83 },
  { label: 'Multi-agent orchestration',         pct: 22, count:  69 },
];

// ── RSS/Atom news feed (fetch, cached hourly via Next.js) ─────────────────────
type NewsItem = { title: string; link: string; source: string; pubDate: string };

async function fetchFeed(url: string, source: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      next:    { revalidate: 3600 },
      signal:  AbortSignal.timeout(7000),
      headers: { 'User-Agent': 'MaxEVDeployed/1.0 RSS Reader' },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: NewsItem[] = [];

    const isAtom  = xml.includes('<feed') && xml.includes('<entry');
    const blockRe = isAtom
      ? /<entry>([\s\S]*?)<\/entry>/g
      : /<item>([\s\S]*?)<\/item>/g;

    for (const m of xml.matchAll(blockRe)) {
      const c = m[1];
      const t = (
        c.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s)?.[1] ||
        c.match(/<title[^>]*>(.*?)<\/title>/s)?.[1] || ''
      ).replace(/&amp;/g, '&').replace(/&#8217;/g, "'").replace(/<!\[CDATA\[|\]\]>/g, '').trim();

      const l = isAtom
        ? (
            c.match(/<link[^>]+href=["'](https?[^"']+)["'][^>]*\/?>/)?.[1] ||
            c.match(/<link[^>]+href=["'](https?[^"']+)["']/)?.[1] || ''
          ).trim()
        : (
            c.match(/<link>(https?[^<]+)<\/link>/)?.[1] ||
            c.match(/<guid[^>]*>(https?[^<]+)<\/guid>/)?.[1] || ''
          ).trim();

      const d = isAtom
        ? (
            c.match(/<published>(.*?)<\/published>/s)?.[1] ||
            c.match(/<updated>(.*?)<\/updated>/s)?.[1] || ''
          ).trim()
        : (c.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1] || '').trim();

      if (t && l) items.push({ title: t, link: l, source, pubDate: d });
      if (items.length >= 4) break;
    }
    return items;
  } catch { return []; }
}

const getNews = unstable_cache(async (): Promise<NewsItem[]> => {
  const feeds = await Promise.allSettled([
    fetchFeed('https://techcrunch.com/category/artificial-intelligence/feed/', 'TechCrunch'),
    fetchFeed('https://venturebeat.com/ai/feed/', 'VentureBeat'),
    fetchFeed('https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', 'The Verge'),
    fetchFeed('https://thenewstack.io/feed/', 'The New Stack'),
    fetchFeed('https://www.theregister.com/machine-learning/headlines.atom', 'The Register'),
    fetchFeed('https://www.technologyreview.com/feed/', 'MIT Tech Review'),
    fetchFeed('https://hnrss.org/newest?q=AI+LLM+hiring+engineering&count=8', 'Hacker News'),
  ]);
  const all = feeds.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return all.slice(0, 10);
}, ['hub-news'], { revalidate: 3600 });

// ── Market data — direct Prisma (cached hourly) ───────────────────────────────
type SectorStat = {
  name: string; count: number; avgSalary: number;
  salaryMin: number; salaryMax: number; topCompanies: string[];
  weeklyDelta: number; color: string;
};

const getMarketData = unstable_cache(async () => {
  const opps = await prisma.opportunity.findMany({
    where: { fitScore: { gte: 70 }, stage: { notIn: ['archived', 'dead'] } },
    select: {
      company: true, classification: true,
      salaryMin: true, salaryMax: true,
      createdAt: true, source: true,
    },
    orderBy: { fitScore: 'desc' },
  });

  const now   = new Date();
  const week1 = new Date(now.getTime() - 7  * 86400_000);
  const week2 = new Date(now.getTime() - 14 * 86400_000);

  const sMap: Record<string, { count: number; salaries: number[]; companies: Set<string>; recent: number; prior: number }> = {};
  for (const o of opps) {
    const sector = CL_TO_SECTOR[o.classification ?? ''] ?? null;
    if (!sector || sector === 'Other') continue;
    if (!sMap[sector]) sMap[sector] = { count: 0, salaries: [], companies: new Set(), recent: 0, prior: 0 };
    sMap[sector].count++;
    sMap[sector].companies.add(o.company);
    if (o.salaryMin && o.salaryMax) sMap[sector].salaries.push((o.salaryMin + o.salaryMax) / 2);
    const t = new Date(o.createdAt).getTime();
    if (t >= week1.getTime()) sMap[sector].recent++;
    else if (t >= week2.getTime()) sMap[sector].prior++;
  }

  const sectors: SectorStat[] = Object.entries(sMap)
    .map(([name, s]) => ({
      name,
      count:        s.count,
      avgSalary:    s.salaries.length ? Math.round(s.salaries.reduce((a, b) => a + b, 0) / s.salaries.length) : 0,
      salaryMin:    s.salaries.length ? Math.min(...s.salaries) * 0.85 : 0,
      salaryMax:    s.salaries.length ? Math.max(...s.salaries) * 1.15 : 0,
      topCompanies: [...s.companies].slice(0, 3),
      weeklyDelta:  s.prior > 0 ? Math.round(((s.recent - s.prior) / s.prior) * 100) : 0,
      color:        SECTOR_COLORS[name] ?? '#6B7280',
    }))
    .sort((a, b) => b.count - a.count);

  const velocity: { label: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now.getTime() - (i + 1) * 7 * 86400_000);
    const end   = new Date(now.getTime() - i * 7 * 86400_000);
    const count = opps.filter(o => {
      const t = new Date(o.createdAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    velocity.push({ label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count });
  }

  const coCount: Record<string, number> = {};
  for (const o of opps) coCount[o.company] = (coCount[o.company] ?? 0) + 1;
  const topCompanies = Object.entries(coCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const allSalaries = opps.flatMap(o => (o.salaryMin && o.salaryMax) ? [(o.salaryMin + o.salaryMax) / 2] : []);
  const avgSalary   = allSalaries.length ? Math.round(allSalaries.reduce((a, b) => a + b, 0) / allSalaries.length) : 0;

  return { sectors, velocity, topCompanies, total: opps.length, avgSalary };
}, ['hub-market'], { revalidate: 3600 });

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const ms   = Date.now() - new Date(dateStr).getTime();
  const hrs  = Math.floor(ms / 3_600_000);
  const days = Math.floor(hrs / 24);
  if (hrs < 1)  return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

const SOURCE_COLORS: Record<string, string> = {
  'TechCrunch':    '#FF6028',
  'VentureBeat':   '#2563EB',
  'The Verge':     '#E5383B',
  'Hacker News':   '#F97316',
  'The New Stack': '#0EA5E9',
  'MIT Tech Review': '#A21CAF',
  'The Register':  '#E2231A',
};

function fmtSalary(n: number): string {
  if (!n) return '';
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
}

// ── Dashboard Mockup (pure HTML/CSS, rendered server-side) ───────────────────
function DashboardMockup({ sectors, avgSalary }: { sectors: SectorStat[]; avgSalary: number }) {
  const miniSectors = sectors.slice(0, 6);
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* Glow halo */}
      <div style={{
        position: 'absolute', inset: '-10%',
        background: 'radial-gradient(ellipse at 60% 40%, rgba(37,99,235,0.3) 0%, rgba(20,184,173,0.15) 40%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none', borderRadius: '50%',
      }} />

      {/* Browser chrome frame */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 500,
        background: 'rgba(8,8,20,0.97)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), 0 0 80px rgba(37,99,235,0.15)',
        transform: 'perspective(1100px) rotateY(-12deg) rotateX(4deg)',
        transformOrigin: 'center center',
      }}>
        {/* Browser toolbar */}
        <div style={{
          background: 'rgba(255,255,255,0.035)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFBD2E' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28C840' }} />
          <div style={{
            flex: 1, margin: '0 10px',
            background: 'rgba(255,255,255,0.06)', borderRadius: 4,
            padding: '3px 10px',
            fontSize: '0.55rem', color: 'rgba(255,255,255,0.28)',
            fontFamily: 'monospace', letterSpacing: '0.02em',
          }}>max-ev-deployed.com</div>
        </div>

        {/* Dashboard content */}
        <div style={{ padding: '14px 14px 18px' }}>

          {/* Mini nav tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {['Intelligence', 'Sectors', 'Salaries'].map((tab, i) => (
              <div key={tab} style={{
                padding: '3px 10px', borderRadius: 5, fontSize: '0.48rem', fontWeight: 700,
                background: i === 0 ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.04)',
                color: i === 0 ? '#60A5FA' : 'rgba(255,255,255,0.25)',
                border: i === 0 ? '1px solid rgba(37,99,235,0.4)' : '1px solid rgba(255,255,255,0.07)',
              }}>{tab}</div>
            ))}
          </div>

          {/* Stat strip */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[
              { val: '317+',  label: 'Active Roles',  color: '#14B8AD' },
              { val: '6',     label: 'Sectors',        color: '#2563EB' },
              { val: avgSalary ? `~$${Math.round(avgSalary / 1000)}k` : '$168k', label: 'Avg Salary', color: '#F0B429' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: `${s.color}12`,
                border: `1px solid ${s.color}28`, borderRadius: 6,
                padding: '7px 6px', textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Section label */}
          <div style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.22)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 7 }}>
            Sector Heat
          </div>

          {/* Mini sector tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 14 }}>
            {miniSectors.map(s => {
              const hot     = s.count > 100;
              const rising  = s.weeklyDelta > 10;
              const badge   = rising ? '↑ RISING' : hot ? '● HOT' : '○ WARM';
              return (
                <div key={s.name} style={{
                  background: `${s.color}0d`,
                  border: `1px solid ${s.color}22`,
                  borderTop: `1.5px solid ${s.color}`,
                  borderRadius: 6, padding: '6px 7px',
                }}>
                  <div style={{ fontSize: '0.36rem', color: s.color, fontWeight: 700, marginBottom: 2 }}>{badge}</div>
                  <div style={{ fontSize: '0.46rem', color: '#fff', fontWeight: 700, lineHeight: 1.2, marginBottom: 3 }}>
                    {s.name.split(' / ')[0].split(' ').slice(0, 2).join(' ')}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: s.color, lineHeight: 1 }}>{s.count}</div>
                  {s.avgSalary > 0 && (
                    <div style={{ fontSize: '0.38rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      {fmtSalary(s.avgSalary)} avg
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section label */}
          <div style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.22)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 7 }}>
            Build Type Demand
          </div>

          {/* Mini build type bars */}
          {BUILD_TYPES.slice(0, 4).map(b => (
            <div key={b.label} style={{ marginBottom: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: '0.44rem', color: 'rgba(255,255,255,0.45)' }}>{b.label}</span>
                <span style={{ fontSize: '0.44rem', color: '#14B8AD', fontWeight: 700 }}>{b.pct}%</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{
                  height: '100%', width: `${b.pct}%`,
                  background: 'linear-gradient(90deg, #14B8AD 0%, #2563EB 100%)',
                  borderRadius: 2,
                }} />
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function Home() {
  const session = await auth();

  const [market, news] = await Promise.all([getMarketData(), getNews()]);
  const { sectors, velocity, topCompanies, total, avgSalary } = market;

  const bd  = 'rgba(255,255,255,0.07)';
  const dim = 'rgba(255,255,255,0.35)';
  const cb  = 'rgba(255,255,255,0.025)';

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #0d1829 0%, #08080f 50%, #06060e 100%)',
      color: '#fff',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ── Responsive styles ─────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-mockup { display: none !important; }
        }
        @media (max-width: 680px) {
          .sector-news-grid { grid-template-columns: 1fr !important; }
        }
      ` }} />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(6,6,14,0.85)', backdropFilter: 'blur(20px)',
      }}>
        <img src="/DEPLOYED_Logo.png" alt="MAX EV Deployed" style={{ height: 36, width: 'auto' }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {!session && (
            <a href="mailto:info@max-ev-holdings.com"
              style={{ fontSize: '0.78rem', color: dim, textDecoration: 'none' }}>
              Request Access
            </a>
          )}
          <Link href={session ? '/dashboard' : '/login'} style={{
            padding: '8px 20px', background: '#2563EB', color: '#fff',
            borderRadius: 7, fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none',
          }}>{session ? 'Dashboard' : 'Sign In'}</Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 60, position: 'relative', overflow: 'hidden' }}>

        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: [
            'linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 100%)',
        }} />

        {/* Radial glows */}
        <div style={{
          position: 'absolute', top: -120, left: -80, width: 700, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(20,184,173,0.18) 0%, transparent 65%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 60, right: -100, width: 600, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(37,99,235,0.16) 0%, transparent 65%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: '35%', width: 500, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(147,51,234,0.1) 0%, transparent 65%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />

        {/* Two-column hero grid */}
        <div className="hero-grid" style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1280, margin: '0 auto',
          padding: '88px 40px 72px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 64,
          alignItems: 'center',
        }}>

          {/* Left: headline + stats */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '5px 14px',
              background: 'rgba(20,184,173,0.08)',
              border: '1px solid rgba(20,184,173,0.25)',
              borderRadius: 20, marginBottom: 22,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#14B8AD', display: 'inline-block', boxShadow: '0 0 8px #14B8AD' }} />
              <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#14B8AD' }}>
                AI Engineering Intelligence
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.6rem, 5vw, 4.6rem)',
              letterSpacing: '0.04em',
              lineHeight: 0.9,
              marginBottom: 22,
            }}>
              THE AI JOB<br />MARKET <span style={{
                color: '#14B8AD',
                textShadow: '0 0 40px rgba(20,184,173,0.4)',
              }}>LIVE</span>
            </h1>

            <p style={{ fontSize: '1rem', color: dim, lineHeight: 1.75, maxWidth: 480, marginBottom: 40 }}>
              Live intelligence across {total.toLocaleString()}+ indexed roles in AI, FDE, LLM Engineering, and Data Engineering. Continuously updated from 35+ ATS pipelines.
            </p>

            {/* Stat pills */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { val: `${total}+`, label: 'Active Roles',   color: '#14B8AD' },
                { val: `${sectors.length}`, label: 'Sectors',  color: '#2563EB' },
                { val: avgSalary ? `~$${Math.round(avgSalary / 1000)}k` : '---', label: 'Avg Salary', color: '#F0B429' },
                { val: '35+',       label: 'ATS Sources',     color: '#A78BFA' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '12px 20px',
                  background: `${s.color}0d`,
                  border: `1px solid ${s.color}30`,
                  borderRadius: 10, textAlign: 'center', minWidth: 100,
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: '0.58rem', color: dim, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: dashboard mockup */}
          <div className="hero-mockup">
            <DashboardMockup sectors={sectors} avgSalary={avgSalary} />
          </div>

        </div>
      </section>

      {/* ── Sector Heat + News ───────────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${bd}`, padding: '0 40px', position: 'relative' }}>
        {/* Subtle section bg */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: [
            'linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '48px 48px',
        }} />
        <div className="sector-news-grid" style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1280, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 380px',
          gap: 40, padding: '52px 0',
        }}>

          {/* Sector Heat */}
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: dim, marginBottom: 20 }}>
              Sector Heat — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 12 }}>
              {sectors.map(s => {
                const hot        = s.count > 100;
                const rising     = s.weeklyDelta > 10;
                const statusLabel = rising ? '↑ RISING' : hot ? '● HOT' : s.count > 40 ? '○ WARM' : '○ COOL';
                return (
                  <div key={s.name} style={{
                    background: `${s.color}08`,
                    border: `1px solid ${s.color}22`,
                    borderTop: `2px solid ${s.color}`,
                    borderRadius: 12, padding: '18px 16px',
                    boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
                  }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', color: s.color, marginBottom: 6 }}>
                      {statusLabel}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 10 }}>{s.name}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: s.color, lineHeight: 1, marginBottom: 2, textShadow: `0 0 30px ${s.color}60` }}>{s.count}</div>
                    <div style={{ fontSize: '0.62rem', color: dim }}>active roles</div>
                    {s.avgSalary > 0 && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 6, fontWeight: 600 }}>
                        ~{fmtSalary(s.avgSalary)} avg
                      </div>
                    )}
                    {s.topCompanies.length > 0 && (
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>
                        {s.topCompanies.join(' · ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* News Feed */}
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: dim, marginBottom: 20 }}>
              Industry News
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {news.length === 0 ? (
                <div style={{ color: dim, fontSize: '0.78rem', padding: '20px 0' }}>Fetching news...</div>
              ) : news.map((item, i) => (
                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{
                  display: 'block', textDecoration: 'none',
                  padding: '13px 15px',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid rgba(255,255,255,0.07)`,
                  borderLeft: `3px solid ${SOURCE_COLORS[item.source] ?? '#6B7280'}`,
                  borderRadius: 8,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ fontSize: '0.79rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45, marginBottom: 7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em',
                      color: SOURCE_COLORS[item.source] ?? '#6B7280',
                      background: `${SOURCE_COLORS[item.source] ?? '#6B7280'}18`,
                      padding: '2px 7px', borderRadius: 4,
                    }}>{item.source}</span>
                    <span style={{ fontSize: '0.6rem', color: dim }}>{timeAgo(item.pubDate)}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What Employers Are Building ──────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${bd}`, padding: '52px 40px', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 48, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: dim, marginBottom: 12 }}>
                Build Type Demand
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.04em', lineHeight: 1.05, marginBottom: 14 }}>
                WHAT EMPLOYERS<br />ARE BUILDING
              </h2>
              <p style={{ fontSize: '0.8rem', color: dim, lineHeight: 1.7 }}>
                Aggregated from {total}+ job descriptions. Shows which AI system types appear most frequently across all indexed roles.
              </p>
            </div>
            <div>
              {BUILD_TYPES.map(bt => (
                <StageBar
                  key={bt.label}
                  label={bt.label}
                  count={bt.count}
                  max={BUILD_TYPES[0].count}
                  color="#14B8AD"
                  value={bt.pct}
                  maxVal={100}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Salary Intelligence ──────────────────────────────────────────── */}
      {sectors.some(s => s.avgSalary > 0) && (
        <section style={{ borderTop: `1px solid ${bd}`, padding: '52px 40px', position: 'relative' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: dim, marginBottom: 10 }}>
              Salary Intelligence
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.04em', marginBottom: 36 }}>
              COMPENSATION BY SECTOR
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {sectors.filter(s => s.avgSalary > 0).map(s => {
                const minK = Math.round(s.salaryMin / 1000);
                const maxK = Math.round(s.salaryMax / 1000);
                const avgK = Math.round(s.avgSalary / 1000);
                const DOMAIN_MIN = 80, DOMAIN_MAX = 380;
                const toX = (k: number) => Math.min(100, Math.max(0, ((k - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * 100));
                const minX = toX(minK), maxX = toX(maxK), avgX = toX(avgK);
                return (
                  <div key={s.name} style={{
                    background: cb, border: `1px solid ${bd}`,
                    borderRadius: 12, padding: '20px 22px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{s.name}</span>
                      <span style={{ fontSize: '0.78rem', color: s.color, fontWeight: 700 }}>${avgK}k avg</span>
                    </div>
                    <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                      <div style={{
                        position: 'absolute', top: 0, height: '100%',
                        left: `${minX}%`, width: `${maxX - minX}%`,
                        background: `${s.color}40`, borderRadius: 4,
                      }} />
                      <div style={{
                        position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
                        left: `${avgX}%`, width: 12, height: 12,
                        background: s.color, borderRadius: '50%',
                        boxShadow: `0 0 10px ${s.color}aa`,
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: '0.65rem', color: dim }}>${minK}k</span>
                      <span style={{ fontSize: '0.65rem', color: dim }}>${maxK}k</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Hiring Velocity ──────────────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${bd}`, padding: '52px 40px', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: dim, marginBottom: 10 }}>
            Hiring Velocity
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.04em', marginBottom: 32 }}>
            ROLES INDEXED PER WEEK
          </h2>
          <div style={{ maxWidth: 800 }}>
            <Sparkline
              data={velocity.map(v => v.count)}
              labels={velocity.map(v => v.label)}
              color="#2563EB"
            />
          </div>
        </div>
      </section>

      {/* ── Subscribe CTA ────────────────────────────────────────────────── */}
      <section style={{
        borderTop: `1px solid ${bd}`, padding: '80px 40px',
        background: 'linear-gradient(135deg, rgba(20,184,173,0.06) 0%, rgba(37,99,235,0.06) 50%, rgba(147,51,234,0.04) 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#14B8AD', marginBottom: 14 }}>
            Weekly AI Jobs Digest
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '0.04em', marginBottom: 14 }}>
            GET THE FULL PICTURE
          </h2>
          <p style={{ fontSize: '0.9rem', color: dim, lineHeight: 1.75, marginBottom: 36 }}>
            Full job listings with apply links, salary alerts by sector, company hiring signals, and the weekly market digest — every Friday.
          </p>
          <HubSubscribeForm />
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
            {['Full job listings + apply links', 'Salary alerts by sector', 'Weekly hiring digest'].map(f => (
              <div key={f} style={{ fontSize: '0.72rem', color: dim, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#14B8AD', fontWeight: 700 }}>+</span> {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top Hiring Companies (Teaser) ────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${bd}`, padding: '52px 40px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: dim, marginBottom: 6 }}>
                Top Hiring Companies
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.04em' }}>
                WHO&apos;S ACTIVELY HIRING
              </h2>
            </div>
            <div style={{ fontSize: '0.8rem', color: dim }}>
              {topCompanies.length > 5 ? `+${topCompanies.length - 5} more — ` : ''}
              <a href="#subscribe" style={{ color: '#14B8AD', textDecoration: 'none', fontWeight: 600 }}>Subscribe for full list →</a>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {topCompanies.slice(0, 5).map(c => (
              <div key={c.name} style={{
                padding: '12px 20px',
                background: cb, border: `1px solid ${bd}`,
                borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{c.name}</span>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, color: '#14B8AD',
                  background: 'rgba(20,184,173,0.12)', padding: '2px 8px', borderRadius: 20,
                }}>{c.count} roles</span>
              </div>
            ))}
            {topCompanies.length > 5 && (
              <div style={{
                padding: '12px 20px',
                background: 'rgba(255,255,255,0.02)',
                border: `1px dashed ${bd}`,
                borderRadius: 10, display: 'flex', alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.82rem', color: dim }}>+{topCompanies.length - 5} more hidden</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${bd}`, padding: '40px 40px', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.04em', marginBottom: 6 }}>
              WANT THE FULL CAREER PLATFORM?
            </div>
            <p style={{ fontSize: '0.82rem', color: dim }}>
              MAX EV Deployed — career management for technical professionals. W-2 + freelance, one system.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/login" style={{ padding: '11px 26px', background: '#2563EB', color: '#fff', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
              Sign In
            </Link>
            <a href="mailto:info@max-ev-holdings.com" style={{ padding: '11px 26px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${bd}`, color: dim, borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              Request Access
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${bd}`, padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <img src="/DEPLOYED_Logo.png" alt="MAX EV Deployed" style={{ height: 26, opacity: 0.3 }} />
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <a href="mailto:info@max-ev-holdings.com" style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>info@max-ev-holdings.com</a>
          <a href="tel:+12142320222"                style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>214-232-0222</a>
          <Link href="/login"                       style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Sign In</Link>
        </div>
        <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.15)' }}>
          &copy; {new Date().getFullYear()} Max EV Holdings LLC
        </div>
      </footer>

    </main>
  );
}
