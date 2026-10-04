import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';

const SHORT_LABELS = {
  'Component Size':         'Size',
  'Props & State':          'Props',
  'Component Architecture': 'Architecture',
  'Code Complexity':        'Complexity',
  'Code Duplication':       'Duplication',
};

const CategoryRadar = ({ categoryScores = {} }) => {
  const entries = Object.entries(categoryScores);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm"
           style={{ color: 'var(--text-muted)' }}>
        No category data
      </div>
    );
  }

  const data = entries.map(([cat, score]) => ({
    category:  SHORT_LABELS[cat] || cat,
    score:     typeof score === 'number' ? score : 0,
    fullMark:  100,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="rgba(255,255,255,0.07)" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#4f6ef7"
          fill="#4f6ef7"
          fillOpacity={0.2}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default CategoryRadar;
