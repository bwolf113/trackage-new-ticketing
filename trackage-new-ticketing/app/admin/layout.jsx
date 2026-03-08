/* app/admin/layout.jsx */
'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '▦' },
  { href: '/admin/events', label: 'Events', icon: '◈' },
  { href: '/admin/organisers', label: 'Organisers', icon: '◉' },
  { href: '/admin/orders', label: 'Orders', icon: '◎' },
  { href: '/admin/coupons', label: 'Coupons', icon: '◆' },
  { href: '/admin/reports', label: 'Reports', icon: '◐' },
  { href: '/admin/stripe', label: 'Stripe', icon: '◇' },
];

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Simple admin auth check
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

  // Don't show layout on login page
  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <div className="admin-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --black: #0a0a0a;
          --surface: #111111;
          --surface2: #1a1a1a;
          --border: #2a2a2a;
          --accent: #c8f04a;
          --accent2: #ff4d6d;
          --text: #f0f0f0;
          --text-dim: #888;
          --sidebar-w: 220px;
        }

        body { background: var(--black); color: var(--text); font-family: 'Syne', sans-serif; }

        .admin-shell { display: flex; min-height: 100vh; }

        /* SIDEBAR */
        .sidebar {
          width: var(--sidebar-w);
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 100;
          transform: translateX(0);
          transition: transform 0.3s ease;
        }

        .sidebar.closed { transform: translateX(-100%); }

        .sidebar-logo {
          padding: 28px 24px 20px;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-logo .logo-text {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--accent);
        }

        .sidebar-logo .logo-sub {
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 2px;
          font-family: 'DM Mono', monospace;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 6px;
          text-decoration: none;
          color: var(--text-dim);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.05em;
          transition: all 0.15s ease;
        }

        .nav-item:hover { background: var(--surface2); color: var(--text); }

        .nav-item.active {
          background: var(--accent);
          color: var(--black);
        }

        .nav-item .nav-icon {
          font-size: 16px;
          width: 20px;
          text-align: center;
        }

        .sidebar-footer {
          padding: 16px 12px;
          border-top: 1px solid var(--border);
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 6px;
          background: none;
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          transition: all 0.15s ease;
        }

        .logout-btn:hover { border-color: var(--accent2); color: var(--accent2); }

        /* MAIN */
        .admin-main {
          margin-left: var(--sidebar-w);
          flex: 1;
          min-height: 100vh;
          background: var(--black);
        }

        /* TOPBAR */
        .topbar {
          padding: 20px 32px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--black);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .topbar-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }

        .topbar-badge {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: var(--text-dim);
          background: var(--surface2);
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid var(--border);
        }

        .menu-toggle {
          display: none;
          background: none;
          border: 1px solid var(--border);
          color: var(--text);
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 18px;
        }

        .page-content {
          padding: 32px;
        }

        /* Overlay for mobile */
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          z-index: 90;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .admin-main { margin-left: 0; }
          .menu-toggle { display: block; }
          .sidebar-overlay.visible { display: block; }
          .page-content { padding: 20px 16px; }
          .topbar { padding: 16px; }
        }
      `}</style>

      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-text">Trackage</div>
          <div className="logo-sub">Admin Panel</div>
        </div>

        <nav className="sidebar-nav">
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
            <span>↩</span> Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <div className="topbar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className="topbar-title">
            {NAV_ITEMS.find(n => n.href === pathname)?.label || 'Admin'}
          </div>
          <div className="topbar-badge">trackage admin v2</div>
        </div>
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
