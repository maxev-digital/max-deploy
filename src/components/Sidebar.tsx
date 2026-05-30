'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme';
import {
  LayoutDashboard, Inbox, GitBranch, Building2, Users,
  Sparkles, Activity, Mail, FileText, Receipt,
  DollarSign, Settings, LogOut, Sun, Moon,
  PanelLeftClose, PanelLeftOpen, MailOpen,
} from 'lucide-react';

type Counts = {
  inbox: number; pipeline: number; monitor: number;
  email: number; outreach: number; invoices: number;
  contracts: number; tasks: number;
};

// Maps each href to the counts key that drives its badge
const BADGE_KEY: Record<string, keyof Counts> = {
  '/inbox':       'inbox',
  '/pipeline':    'pipeline',
  '/monitor':     'monitor',
  '/email':       'email',
  '/outreach':    'outreach',
  '/invoices':    'invoices',
  '/contracts':   'contracts',
  '/tasks':       'tasks',
};

const nav = [
  {
    group: 'Command',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Inbox',     href: '/inbox',     icon: Inbox },
      { label: 'Pipeline',  href: '/pipeline',  icon: GitBranch },
      { label: 'Monitor',   href: '/monitor',   icon: Activity },
    ],
  },
  {
    group: 'Network',
    items: [
      { label: 'Companies', href: '/companies', icon: Building2 },
      { label: 'Contacts',  href: '/contacts',  icon: Users },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { label: 'AI Hub',   href: '/intelligence', icon: Sparkles },
      { label: 'Outreach', href: '/outreach',     icon: Mail },
      { label: 'Email',    href: '/email',         icon: MailOpen },
    ],
  },
  {
    group: 'Earnings',
    items: [
      { label: 'Contracts', href: '/contracts', icon: FileText },
      { label: 'Invoices',  href: '/invoices',  icon: Receipt },
      { label: 'Earnings',  href: '/earnings',  icon: DollarSign },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Tasks',    href: '/tasks',    icon: Activity },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

function Badge({ count, collapsed }: { count: number; collapsed: boolean }) {
  if (!count) return null;
  const display = count > 99 ? '99+' : String(count);
  if (collapsed) {
    // Small dot in top-right when sidebar is collapsed
    return (
      <span style={{
        position: 'absolute', top: 4, right: 6,
        minWidth: 14, height: 14, borderRadius: 7,
        background: '#f97316', color: '#fff',
        fontSize: '0.55rem', fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 3px', lineHeight: 1,
        boxShadow: '0 0 0 2px var(--dark)',
      }}>
        {count > 9 ? '!' : display}
      </span>
    );
  }
  return (
    <span style={{
      minWidth: 18, height: 18, borderRadius: '50%',
      background: '#f97316', color: '#fff',
      fontSize: '0.62rem', fontWeight: 800, lineHeight: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, padding: '0 4px',
      boxShadow: '0 1px 4px rgba(249,115,22,0.4)',
    }}>
      {display}
    </span>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState<Counts>({ inbox: 0, pipeline: 0, monitor: 0, email: 0, outreach: 0, invoices: 0, contracts: 0, tasks: 0 });

  const w = collapsed ? 58 : 240;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  useEffect(() => {
    function fetchCounts() {
      fetch('/api/sidebar-counts')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setCounts(d); })
        .catch(() => {});
    }
    fetchCounts();
    // Refresh every 2 minutes
    const iv = setInterval(fetchCounts, 2 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <aside className="admin-sidebar" style={{ width: w, minWidth: w, transition: 'width 0.22s ease' }}>
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.06em', color: '#2563EB', lineHeight: 1 }}>MAX-DEPLOY</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>Career OS</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {nav.map(section => (
          <div key={section.group} className="sidebar-group">
            {!collapsed && <div className="sidebar-group-label">{section.group}</div>}
            {section.items.map(item => {
              const Icon      = item.icon;
              const badgeKey  = BADGE_KEY[item.href];
              const badgeCount = badgeKey ? (counts[badgeKey] ?? 0) : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  style={{ ...(collapsed ? { justifyContent: 'center', padding: '8px 0' } : {}), position: 'relative' }}
                >
                  <Icon size={14} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      <Badge count={badgeCount} collapsed={false} />
                    </>
                  )}
                  {collapsed && <Badge count={badgeCount} collapsed={true} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-item"
          onClick={toggle}
          style={collapsed ? { width: '100%', justifyContent: 'center', padding: '8px 0', background: 'none', border: 'none' } : { width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {!collapsed && (theme === 'dark' ? 'Light Mode' : 'Dark Mode')}
        </button>
        {!collapsed && (
          <Link href="/api/auth/signout" className="sidebar-item">
            <LogOut size={14} />
            Sign Out
          </Link>
        )}
      </div>
    </aside>
  );
}
