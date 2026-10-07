import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Analyze', icon: '⬡', exact: true },
  { to: '/history', label: 'History', icon: '◫' },
];

const MainLayout = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDashboard = location.pathname.includes('/dashboard/');
  const isComparison = location.pathname.includes('/comparison/');
  const id = location.pathname.split('/').pop();

  const navLinkStyle = (isActive) => ({
    background: isActive ? 'var(--accent)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-secondary)',
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Top nav */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'var(--accent)' }}
            >
              RD
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                React Debt Analyzer
              </span>
              <span
                className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(79,110,247,0.15)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(79,110,247,0.3)',
                }}
              >
                MSc Research
              </span>
            </div>
            <div className="sm:hidden">
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                RDA
              </span>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={({ isActive }) => navLinkStyle(isActive)}
              >
                <span className="text-xs">{icon}</span>
                {label}
              </NavLink>
            ))}
            {(isDashboard || isComparison) && (
              <>
                <NavLink
                  to={`/dashboard/${id}`}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={() => navLinkStyle(isDashboard && !isComparison)}
                >
                  <span className="text-xs">◈</span>
                  Dashboard
                </NavLink>
                <NavLink
                  to={`/comparison/${id}`}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={() => navLinkStyle(isComparison)}
                >
                  <span className="text-xs">⊞</span>
                  Comparison
                </NavLink>
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded-lg"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden px-4 pb-3 flex flex-col gap-1"
            style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {NAV_ITEMS.map(({ to, label, icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={({ isActive }) => navLinkStyle(isActive)}
              >
                <span className="text-xs">{icon}</span>
                {label}
              </NavLink>
            ))}
            {(isDashboard || isComparison) && (
              <>
                <NavLink
                  to={`/dashboard/${id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={() => navLinkStyle(isDashboard && !isComparison)}
                >
                  <span className="text-xs">◈</span>
                  Dashboard
                </NavLink>
                <NavLink
                  to={`/comparison/${id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={() => navLinkStyle(isComparison)}
                >
                  <span className="text-xs">⊞</span>
                  Comparison
                </NavLink>
              </>
            )}
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
