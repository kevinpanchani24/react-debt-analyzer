import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Analyze', icon: '⬡', exact: true },
  { to: '/history', label: 'History', icon: '◫' },
];

const MainLayout = () => {
  const location = useLocation();
  const isDashboard = location.pathname.includes('/dashboard/');
  const isComparison = location.pathname.includes('/comparison/');
  const id = location.pathname.split('/').pop();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Top nav */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'var(--accent)' }}
          >
            RD
          </div>
          <div>
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
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-white'
                    : ''
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
              })}
            >
              <span className="text-xs">{icon}</span>
              {label}
            </NavLink>
          ))}

          {(isDashboard || isComparison) && (
            <NavLink
              to={`/dashboard/${id}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150`
              }
              style={({ isActive }) => ({
                background: isDashboard && !isComparison ? 'var(--accent)' : 'transparent',
                color: isDashboard && !isComparison ? 'white' : 'var(--text-secondary)',
              })}
            >
              <span className="text-xs">◈</span>
              Dashboard
            </NavLink>
          )}

          {(isDashboard || isComparison) && (
            <NavLink
              to={`/comparison/${id}`}
              style={({ isActive }) => ({
                background: isComparison ? 'var(--accent)' : 'transparent',
                color: isComparison ? 'white' : 'var(--text-secondary)',
              })}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
            >
              <span className="text-xs">⊞</span>
              Comparison
            </NavLink>
          )}
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
