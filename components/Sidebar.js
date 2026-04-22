'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Receipt, PlusCircle, PiggyBank, BarChart3, LogOut, MessageCircle, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/expenses', label: 'History', icon: Receipt },
  { href: '/expenses/add', label: 'Add', icon: PlusCircle, isCenter: true },
  { href: '/budgets', label: 'Budgets', icon: PiggyBank },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <>
      {/* ========== MOBILE TOP HEADER ========== */}
      <header className="mobile-header" id="mobile-header">
        <div className="mobile-header-left">
          <div className="mobile-logo-icon">
            <LayoutDashboard size={18} color="white" />
          </div>
          <span className="mobile-logo-text">ExpenseAI</span>
        </div>
        <div className="mobile-header-right">
          <button className="mobile-avatar-btn" onClick={handleLogout} title="Logout">
            <div className="mobile-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </button>
        </div>
      </header>

      {/* ========== MOBILE BOTTOM TAB BAR ========== */}
      <nav className="bottom-tabs" id="bottom-tabs">
        {navItems.map(({ href, label, icon: Icon, isCenter }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`bottom-tab ${isActive ? 'active' : ''} ${isCenter ? 'center-tab' : ''}`}
              id={`tab-${label.toLowerCase()}`}
            >
              <div className={`bottom-tab-icon ${isCenter ? 'center-icon' : ''}`}>
                <Icon size={isCenter ? 24 : 22} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className="bottom-tab-label">{label}</span>
              {isActive && !isCenter && <div className="tab-active-dot" />}
            </Link>
          );
        })}
      </nav>

      {/* ========== DESKTOP SIDEBAR ========== */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <LayoutDashboard size={20} color="white" />
            </div>
            <h2 className="text-gradient">ExpenseAI</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname === href ? 'active' : ''}`}
              id={`nav-${label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div className="nav-link-icon">
                <Icon size={18} />
              </div>
              <span>{label}</span>
              {pathname === href && <div className="active-indicator" />}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile" onClick={handleLogout} title="Click to logout">
            <div className="user-avatar-glow">
              <div className="user-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-email">{user?.email || 'Premium Member'}</div>
            </div>
            <div className="logout-btn">
              <LogOut size={16} />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
