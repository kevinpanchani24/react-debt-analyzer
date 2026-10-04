import React from 'react';

/**
 * Simple stat card for dashboard header metrics.
 */
const StatCard = ({ label, value, sub, accent = false, color }) => {
  return (
    <div
      className="card p-5 flex flex-col gap-1"
      style={accent ? { borderColor: 'rgba(79,110,247,0.4)', background: 'rgba(79,110,247,0.05)' } : {}}
    >
      <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        className="text-2xl font-bold"
        style={{ color: color || (accent ? 'var(--accent)' : 'var(--text-primary)') }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </span>
      )}
    </div>
  );
};

export default StatCard;
