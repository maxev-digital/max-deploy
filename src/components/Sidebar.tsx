'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme';
import {
  LayoutDashboard, Inbox, GitBranch, Building2, Users,
  Sparkles, Activity, Mail, FileText, Receipt,
  DollarSign, Settings, LogOut, Sun, Moon,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';

const nav = [
  {
    group: 'Command',
    items: [
      { label: 'Dashboard',     href: '/dashboard',     icon: LayoutDashboard },
      { label: 'Inbox',         href: '/inbox',         icon: Inbox },
      { label: 'Pipeline',      href: '/pipeline',      icon: GitBranch },
      { label: 'Monitor',       href: '/monitor',       icon: Activity },
    ],
  },
  {
    group: 'Network',
    items: [
      { label: 'Companies',     href: '/companies',     icon: Building2 },
      { label: 'Contacts',      href: '/contacts',      icon: Users },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { label: 'AI Hub',        href: '/intelligence',  icon: Sparkles },
      { label: 'Outreach',      href: '/outreach',      icon: Mail },
    ],
  },
  {
    group: 'Earnings',
    items: [
      { label: 'Contracts',     href: '/contracts',     icon: FileText },
      { label: 'Invoices',      href: '/invoices',      icon: Receipt },
      { label: 'Earnings',      href: '/earnings',      icon: DollarSign },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Settings',      href: '/settings',      icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const w = collapsed ? 58 : 240;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

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
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  style={collapsed ? { justifyContent: 'center', padding: '8px 0' } : undefined}
                >
                  <Icon size={14} />
                  {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
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
