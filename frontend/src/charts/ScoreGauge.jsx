import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';

const getScoreColor = (score) => {
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#84cc16';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

const getGrade = (score) => {
  if (score >= 90) return { grade: 'A', label: 'Excellent' };
  if (score >= 75) return { grade: 'B', label: 'Good' };
  if (score >= 60) return { grade: 'C', label: 'Fair' };
  if (score >= 40) return { grade: 'D', label: 'Poor' };
  return { grade: 'F', label: 'Critical' };
};

const ScoreGauge = ({ score = 0 }) => {
  // Clamp score to valid range
  const safeScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  const color = getScoreColor(safeScore);
  const { grade, label } = getGrade(safeScore);

  const data = [
    { value: safeScore,       color },
    { value: 100 - safeScore, color: 'rgba(255,255,255,0.05)' },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28">
        <PieChart width={192} height={112}>
          <Pie
            data={data}
            cx={96}
            cy={96}
            startAngle={180}
            endAngle={0}
            innerRadius={58}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
            isAnimationActive={false}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className="text-4xl font-bold leading-none" style={{ color }}>
            {safeScore}
          </span>
          <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>/ 100</span>
        </div>
      </div>
      <div className="mt-1 text-center">
        <span className="text-lg font-bold mr-2" style={{ color }}>{grade}</span>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
    </div>
  );
};

export default ScoreGauge;
