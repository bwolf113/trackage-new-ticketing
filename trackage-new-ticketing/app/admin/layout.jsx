/* app/admin/layout.jsx */
'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin',             label: 'Dashboard',    icon: '⊞' },
  { href: '/admin/events',      label: 'Events',       icon: '🎫' },
  { href: '/admin/organisers',  label: 'Organisers',   icon: '👤' },
  { href: '/admin/orders',      label: 'Orders',       icon: '📋' },
  { href: '/admin/coupons',     label: 'Coupons',      icon: '🏷️' },
  { href: '/admin/reports',     label: 'Reports',      icon: '📊' },
  { href: '/admin/emails',      label: 'Email Log',    icon: '📨' },
  { href: '/admin/email-test',  label: 'Email Tester', icon: '✉️' },
];

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('sidebar_collapsed');
    if (stored === 'true' && window.innerWidth >= 769) setCollapsed(true);
  }, []);

  useEffect(() => {
    const isAdmin = localStorage.getItem('admin_authenticated') || sessionStorage.getItem('admin_authenticated');
    const hasToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    if ((!isAdmin || !hasToken) && pathname !== '/admin/login') router.push('/admin/login');
  }, [pathname]);

  function toggleCollapse() {
    if (window.innerWidth < 769) { setMobileOpen(false); return; }
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  }

  function handleLogout() {
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_token');
    router.push('/admin/login');
  }

  if (pathname === '/admin/login') return <>{children}</>;

  const sidebarW = collapsed ? '56px' : '220px';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #F5F6FA; --surface: #FFFFFF; --border: #EBEDF0;
          --muted: #767C8C; --green: #48C16E; --green-dim: rgba(72,193,110,0.12);
          --black: #000000; --white: #FFFFFF;
        }
        html, body { background: var(--bg); color: var(--black); font-family: 'Plus Jakarta Sans', sans-serif; overflow-x: hidden; }
        .al-sidebar {
          width: 220px; background: #000;
          border-right: 1px solid rgba(255,255,255,0.08);
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;
          overflow: hidden;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .al-sidebar.open { transform: translateX(0); }
        .al-logo {
          padding: 0 8px; height: 56px; min-height: 56px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: space-between; gap: 6px;
        }
        .al-logo-text { overflow: hidden; white-space: nowrap; }
        .al-logo-name { font-size: 13px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.02em; }
        .al-logo-sub  { font-size: 9px; font-weight: 600; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.1em; }
        .al-collapse {
          flex-shrink: 0; background: none; border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.45); border-radius: 5px; width: 24px; height: 24px;
          cursor: pointer; display: none; align-items: center; justify-content: center;
          font-size: 10px; transition: all 0.15s;
        }
        .al-collapse:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .al-nav { flex: 1; padding: 8px 6px; display: flex; flex-direction: column; gap: 1px; overflow-y: auto; overflow-x: hidden; }
        .al-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px; text-decoration: none;
          color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 500;
          transition: all 0.15s; white-space: nowrap; overflow: hidden;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .al-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .al-item.active { background: rgba(72,193,110,0.18); color: #48C16E; font-weight: 600; }
        .al-icon { font-size: 15px; min-width: 20px; width: 20px; text-align: center; }
        .al-label { overflow: hidden; white-space: nowrap; }
        .al-foot { padding: 10px 6px; border-top: 1px solid rgba(255,255,255,0.08); }
        .al-logout {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px; background: none; border: none;
          color: rgba(255,255,255,0.65); font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s; white-space: nowrap; overflow: hidden;
        }
        .al-logout:hover { background: rgba(239,68,68,0.15); color: #f87171; }
        .al-main { margin-left: 0; flex: 1; min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }
        .al-topbar { background: var(--surface); border-bottom: 1.5px solid var(--border); padding: 0 28px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
        .al-topbar-l { display: flex; align-items: center; gap: 12px; }
        .al-menu-btn { display: block; background: none; border: 1.5px solid var(--border); color: var(--muted); padding: 6px 9px; border-radius: 6px; cursor: pointer; font-size: 16px; line-height: 1; }
        .al-page-title { font-size: 15px; font-weight: 700; color: var(--black); font-family: 'Plus Jakarta Sans', sans-serif; }
        .al-topbar-r { display: flex; align-items: center; gap: 10px; }
        .al-avatar { width: 30px; height: 30px; background: var(--black); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 700; }
        .al-username { font-size: 13px; color: var(--muted); font-weight: 500; font-family: 'Plus Jakarta Sans', sans-serif; }
        .al-content { flex: 1; }
        .al-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90; }
        @media (min-width: 769px) {
          .al-sidebar { width: ${sidebarW}; transform: translateX(0); transition: width 0.2s ease; }
          .al-main { margin-left: ${sidebarW}; transition: margin-left 0.2s ease; }
          .al-menu-btn { display: none !important; }
          .al-content { padding: 28px 32px; }
          .al-collapse { display: flex; }
        }
        @media (max-width: 768px) {
          .al-overlay.show { display: block; }
          .al-content { padding: 20px 16px; }
          .al-topbar { padding: 0 16px; }
        }
      `}</style>

      <div className={`al-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`al-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="al-logo">
          {!collapsed && (
            <img src="https://tdqylvqcoxnyzqkesibj.supabase.co/storage/v1/object/public/emails/brand/logo-white.png" alt="Trackage Scheme" style={{ height: '22px', width: 'auto', display: 'block' }} />
          )}
          <button className="al-collapse" onClick={toggleCollapse} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="al-nav">
          {NAV_ITEMS.map(item => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`al-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : ''}
              >
                <span className="al-icon">{item.icon}</span>
                {!collapsed && <span className="al-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="al-foot">
          <button className="al-logout" onClick={handleLogout} title={collapsed ? 'Log out' : ''}>
            <span className="al-icon">↩</span>
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      <main className="al-main">
        <div className="al-topbar">
          <div className="al-topbar-l">
            <button className="al-menu-btn" onClick={() => setMobileOpen(v => !v)}>☰</button>
            <div className="al-page-title">
              {NAV_ITEMS.find(n =>
                n.href === '/admin' ? pathname === '/admin' : pathname === n.href || pathname.startsWith(n.href + '/')
              )?.label || 'Admin'}
            </div>
          </div>
          <div className="al-topbar-r">
            <span className="al-username">Admin</span>
            <div className="al-avatar">A</div>
          </div>
        </div>
        <div className="al-content">{children}</div>
      </main>
    </div>
  );
}
