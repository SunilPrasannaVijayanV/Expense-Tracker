'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Receipt, PiggyBank, BarChart3, LogOut, Wallet } from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/expenses/add', label: 'Add Expense', icon: Wallet },
  { href: '/budgets', label: 'Budgets', icon: PiggyBank },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <aside className="sidebar" id="sidebar">
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
  );
}
