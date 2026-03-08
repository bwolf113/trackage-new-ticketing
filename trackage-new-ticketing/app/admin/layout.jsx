/* app/admin/layout.jsx */
'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin',             label: 'Dashboard',  icon: '⊞' },
  { href: '/admin/events',      label: 'Events',     icon: '🎫' },
  { href: '/admin/organisers',  label: 'Organisers', icon: '👤' },
  { href: '/admin/orders',      label: 'Orders',     icon: '📋' },
  { href: '/admin/coupons',     label: 'Coupons',    icon: '🏷️' },
  { href: '/admin/reports',     label: 'Reports',    icon: '📊' },
  { href: '/admin/stripe',      label: 'Stripe',     icon: '💳' },
];

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    const isAdmin = localStorage.getItem('admin_authenticated');
    if (!isAdmin && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem('admin_authenticated');
    router.push('/admin/login');
  }

  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <div className="admin-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --accent:      #0a9e7f;
          --accent-dark: #087d65;
          --accent-bg:   #f0fdf9;
          --accent-light:#d1fae5;
          --text:        #111827;
          --text-mid:    #6b7280;
          --text-light:  #9ca3af;
          --border:      #e5e7eb;
          --bg:          #f9fafb;
          --white:       #ffffff;
          --sidebar-w:   240px;
          --danger:      #ef4444;
        }

        html, body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; }

        .admin-shell { display: flex; min-height: 100vh; }

        /* ── Sidebar ── */
        .sidebar {
          width: var(--sidebar-w);
          background: var(--white);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 100;
          transition: transform 0.25s ease;
        }

        .sidebar-logo {
          padding: 24px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-mark {
          width: 32px; height: 32px;
          background: var(--accent);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .logo-text { font-size: 15px; font-weight: 700; color: var(--text); }
        .logo-sub  { font-size: 11px; color: var(--text-light); margin-top: 1px; }

        .sidebar-nav {
          flex: 1;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }

        .nav-section-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-light);
          padding: 10px 10px 6px;
          margin-top: 4px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 8px;
          text-decoration: none;
          color: var(--text-mid);
          font-size: 14px;
          font-weight: 500;
          transition: all 0.15s;
        }

        .nav-item:hover { background: var(--bg); color: var(--text); }

        .nav-item.active {
          background: var(--accent-bg);
          color: var(--accent);
          font-weight: 600;
        }

        .nav-icon { font-size: 15px; width: 20px; text-align: center; }

        .sidebar-footer {
          padding: 16px 10px;
          border-top: 1px solid var(--border);
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 8px;
          background: none;
          border: none;
          color: var(--text-mid);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.15s;
          text-align: left;
        }
        .logout-btn:hover { background: #fef2f2; color: var(--danger); }

        /* ── Main ── */
        .admin-main {
          margin-left: var(--sidebar-w);
          flex: 1;
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          flex-direction: column;
        }

        /* ── Topbar ── */
        .topbar {
          background: var(--white);
          border-bottom: 1px solid var(--border);
          padding: 0 28px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .topbar-left { display: flex; align-items: center; gap: 12px; }

        .menu-toggle {
          display: none;
          background: none;
          border: 1px solid var(--border);
          color: var(--text-mid);
          padding: 6px 9px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        }

        .topbar-title { font-size: 16px; font-weight: 600; color: var(--text); }

        .topbar-right { display: flex; align-items: center; gap: 12px; }

        .topbar-avatar {
          width: 32px; height: 32px;
          background: var(--accent);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: white;
          font-size: 13px;
          font-weight: 600;
        }

        .topbar-user { font-size: 13px; font-weight: 500; color: var(--text-mid); }

        /* ── Page content ── */
        .page-content { padding: 28px 32px; flex: 1; }

        /* ── Overlay ── */
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 90;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .admin-main { margin-left: 0; }
          .menu-toggle { display: block; }
          .sidebar-overlay.visible { display: block; }
          .page-content { padding: 20px 16px; }
          .topbar { padding: 0 16px; }
        }
      `}</style>

      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">🎫</div>
          <div>
            <div className="logo-text">Trackage</div>
            <div className="logo-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span>↩</span> Log out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <div className="topbar-title">
              {NAV_ITEMS.find(n => n.href === pathname)?.label || 'Admin'}
            </div>
          </div>
          <div className="topbar-right">
            <span className="topbar-user">Admin</span>
            <div className="topbar-avatar">A</div>
          </div>
        </div>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
