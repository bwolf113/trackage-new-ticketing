/* app/organiser/layout.jsx */
'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const NAV_ITEMS = [
  { href: '/organiser',         label: 'Dashboard', icon: '⊞', exact: true },
  { href: '/organiser/events',  label: 'My Events', icon: '🎫' },
  { href: '/organiser/crm',     label: 'CRM',       icon: '📊' },
  { href: '/organiser/profile', label: 'Profile',   icon: '👤' },
];

const AUTH_PATHS = ['/organiser/login', '/organiser/signup', '/organiser/auth/callback'];

export default function OrganiserLayout({ children }) {
  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [organiserName, setOrganiserName] = useState('');
  const router   = useRouter();
  const pathname = usePathname();

  const isAuthPage = AUTH_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (isAuthPage) return;
    const stored = localStorage.getItem('sidebar_org_collapsed');
    if (stored === 'true') setCollapsed(true);

    checkAuth();
  }, [pathname]);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    const organiserId = localStorage.getItem('organiser_id');

    if (!session || !organiserId) {
      // Try to restore from session
      if (session && !organiserId) {
        const res  = await fetch('/api/organiser/me', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body:    JSON.stringify({}),
        });
        const json = await res.json();
        if (json.organiser) {
          localStorage.setItem('organiser_id',   json.organiser.id);
          localStorage.setItem('organiser_name', json.organiser.name);
          setOrganiserName(json.organiser.name);
          return;
        }
      }
      router.push('/organiser/login');
      return;
    }

    setOrganiserName(localStorage.getItem('organiser_name') || 'Organiser');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem('organiser_id');
    localStorage.removeItem('organiser_name');
    router.push('/organiser/login');
  }

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_org_collapsed', String(next));
  }

  if (isAuthPage) return <>{children}</>;

  const sidebarW = collapsed ? '56px' : '220px';
  const initials = (organiserName || 'O').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --accent: #0a9e7f; --accent-dark: #087d65; --accent-bg: #f0fdf9;
          --text: #111827; --text-mid: #6b7280; --text-light: #9ca3af;
          --border: #e5e7eb; --bg: #f9fafb; --white: #ffffff; --danger: #ef4444;
        }
        html, body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; }
        .ol-sidebar {
          width: ${sidebarW}; background: #000;
          border-right: 1px solid rgba(255,255,255,0.08);
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;
          transition: width 0.2s ease; overflow: hidden;
        }
        .ol-logo {
          padding: 0 10px; height: 56px; min-height: 56px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: space-between; gap: 6px;
        }
        .ol-logo-img { height: 28px; width: auto; object-fit: contain; opacity: 0.92; flex-shrink: 0; transition: opacity 0.15s; }
        .ol-logo-img:hover { opacity: 1; }
        .ol-logo-text { overflow: hidden; white-space: nowrap; }
        .ol-logo-name { font-size: 13px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.02em; }
        .ol-logo-sub  { font-size: 9px; font-weight: 600; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.1em; }
        .ol-collapse {
          flex-shrink: 0; background: none; border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.45); border-radius: 5px; width: 24px; height: 24px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 10px; transition: all 0.15s;
        }
        .ol-collapse:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .ol-nav { flex: 1; padding: 8px 6px; display: flex; flex-direction: column; gap: 1px; overflow-y: auto; overflow-x: hidden; }
        .ol-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px; text-decoration: none;
          color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 500;
          transition: all 0.15s; white-space: nowrap; overflow: hidden;
        }
        .ol-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .ol-item.active { background: rgba(10,158,127,0.2); color: #0a9e7f; font-weight: 600; }
        .ol-icon { font-size: 15px; min-width: 20px; width: 20px; text-align: center; }
        .ol-foot { padding: 10px 6px; border-top: 1px solid rgba(255,255,255,0.08); }
        .ol-logout {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px; background: none; border: none;
          color: rgba(255,255,255,0.65); font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; white-space: nowrap; overflow: hidden;
        }
        .ol-logout:hover { background: rgba(239,68,68,0.15); color: #f87171; }
        .ol-main { margin-left: ${sidebarW}; flex: 1; min-height: 100vh; background: var(--bg); transition: margin-left 0.2s ease; }
        .ol-topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 0 28px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
        .ol-topbar-l { display: flex; align-items: center; gap: 12px; }
        .ol-menu-btn { display: none; background: none; border: 1px solid var(--border); color: var(--text-mid); padding: 6px 9px; border-radius: 6px; cursor: pointer; font-size: 16px; }
        .ol-page-title { font-size: 15px; font-weight: 600; color: var(--text); }
        .ol-topbar-r { display: flex; align-items: center; gap: 10px; }
        .ol-avatar { width: 30px; height: 30px; background: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 700; }
        .ol-username { font-size: 13px; color: var(--text-mid); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ol-content { padding: 28px 32px; flex: 1; }
        .ol-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90; }
        @media (max-width: 768px) {
          .ol-sidebar { width: 220px !important; transform: translateX(-100%); transition: transform 0.25s ease; }
          .ol-sidebar.open { transform: translateX(0); }
          .ol-main { margin-left: 0 !important; width: 100%; max-width: 100vw; overflow-x: hidden; }
          .ol-menu-btn { display: block; }
          .ol-overlay.show { display: block; }
          .ol-content { padding: 20px 16px; width: 100%; box-sizing: border-box; }
          .ol-topbar { padding: 0 16px; }
          .ol-collapse { display: none; }
        }
      `}</style>

      <div className={`ol-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`ol-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="ol-logo">
          {!collapsed && (
            <img src="https://bflmjuzmmuhytkxpdrbw.supabase.co/storage/v1/object/public/emails/brand/logo-white.png" alt="Trackage Scheme" className="ol-logo-img" />
          )}
          <button className="ol-collapse" onClick={toggleCollapse} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="ol-nav">
          {NAV_ITEMS.map(item => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ol-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : ''}
              >
                <span className="ol-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="ol-foot">
          <button className="ol-logout" onClick={handleLogout} title={collapsed ? 'Log out' : ''}>
            <span className="ol-icon">↩</span>
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      <main className="ol-main">
        <div className="ol-topbar">
          <div className="ol-topbar-l">
            <button className="ol-menu-btn" onClick={() => setMobileOpen(v => !v)}>☰</button>
            <div className="ol-page-title">
              {NAV_ITEMS.find(n =>
                n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + '/')
              )?.label || 'Organiser Portal'}
            </div>
          </div>
          <div className="ol-topbar-r">
            <span className="ol-username">{organiserName}</span>
            <div className="ol-avatar">{initials}</div>
          </div>
        </div>
        <div className="ol-content">{children}</div>
      </main>
    </div>
  );
}
