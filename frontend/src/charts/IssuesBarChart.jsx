import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#94a3b8',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg text-xs"
         style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: SEVERITY_COLORS[p.dataKey] || p.fill }}>
          {p.dataKey}: {p.value}
        </p>
      ))}
    </div>
  );
};

const IssuesBarChart = ({ issues = [] }) => {
  if (!issues || issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm"
           style={{ color: 'var(--text-muted)' }}>
        No issues detected
      </div>
    );
  }

  // Group issues by category
  const categoryMap = {};
  for (const issue of issues) {
    const cat = issue.category || 'Other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { critical: 0, high: 0, medium: 0, low: 0 };
    }
    if (issue.severity in categoryMap[cat]) {
      categoryMap[cat][issue.severity]++;
    }
  }

  const data = Object.entries(categoryMap).map(([cat, counts]) => ({
    category: cat.replace('Component ', '').replace('Code ', ''),
    ...counts,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="category"
               tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
               axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
               axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        {['critical', 'high', 'medium', 'low'].map((sev, i, arr) => (
          <Bar key={sev} dataKey={sev} stackId="a"
               fill={SEVERITY_COLORS[sev]}
               radius={i === arr.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
               isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IssuesBarChart;
