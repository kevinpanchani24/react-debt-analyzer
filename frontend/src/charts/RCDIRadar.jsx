import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

/**
 * RCDIRadar — five-dimension RCDI score radar chart.
 * Replaces old CategoryRadar with the five RCDI dimensions:
 *   SC  = Structural Complexity (McCabe 1976 + Abbes et al. 2011)
 *   StC = State Complexity (Miller 1956)
 *   CI  = Coupling Index (Martin 2002, Alzamil 2023)
 *   PD  = Prop Depth (Ferreira & Valente 2022)
 *   CC  = Component Cohesion (Martin 2002 single responsibility)
 */
const DIM_LABELS = {
  SC: 'Structural Complexity',
  StC: 'State Complexity',
  CI: 'Coupling Index',
  PD: 'Prop Depth',
  CC: 'Component Cohesion',
};

const Tip = ({ active, payload }) => {
  if (!active || !payload?.[0]) return null;
  const { category, score } = payload[0].payload;
  return (
    <div className="px-3 py-2 rounded-lg text-xs"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      <p className="font-semibold">{category}</p>
      <p style={{ color: '#4f6ef7' }}>Score: <strong>{score}</strong> / 100</p>
    </div>
  );
};

const RCDIRadar = ({ dimensionScores = {} }) => {
  const data = Object.entries(DIM_LABELS).map(([key, label]) => ({
    category: label,
    score: dimensionScores[key] ?? 100,
    fullMark: 100,
  }));

  if (!Object.keys(dimensionScores).length) {
    return (
      <div className="flex items-center justify-center h-64 text-sm"
        style={{ color: 'var(--text-muted)' }}>
        No dimension data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="rgba(255,255,255,0.07)" />
        <PolarAngleAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
        <Radar name="RCDI Dimension" dataKey="score"
          stroke="#4f6ef7" fill="#4f6ef7" fillOpacity={0.2}
          strokeWidth={2} isAnimationActive={false} />
        <Tooltip content={<Tip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default RCDIRadar;
