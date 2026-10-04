import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

/**
 * RPSChart — Rerender Propagation Score bar chart.
 * Novel metric (Ferreira & Valente 2022 identified the problem;
 * RPS is the first quantitative measure proposed for it).
 * Lower rpsScore = higher rerender risk.
 */
const gc = (score) => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return '#ef4444';
};

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="px-3 py-2 rounded-lg text-xs"
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        color: 'var(--text-primary)', maxWidth: 240
      }}>
      <p className="font-semibold mb-1 truncate">{d.name}</p>
      <p className="truncate mb-1" style={{ color: 'var(--text-muted)' }}>{d.filePath}</p>
      <p>RPS Score: <strong style={{ color: gc(d.rpsScore) }}>{d.rpsScore}</strong></p>
      <p>Hooks: {d.hookCount} | Fan-in: {d.fanIn}</p>
      {d.isMemoised && <p style={{ color: '#22c55e' }}>✓ Memoised</p>}
    </div>
  );
};

const RPSChart = ({ rpsRanking = [] }) => {
  if (!rpsRanking.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm"
        style={{ color: 'var(--text-muted)' }}>
        No rerender risk data — no stateful components with fan-in detected
      </div>
    );
  }

  const data = [...rpsRanking]
    .sort((a, b) => a.rpsScore - b.rpsScore)
    .map(d => ({
      ...d,
      label: d.name?.length > 14 ? d.name.slice(0, 12) + '…' : d.name,
    }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="rpsScore" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((entry, i) => <Cell key={i} fill={gc(entry.rpsScore)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default RPSChart;
