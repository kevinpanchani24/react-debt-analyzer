import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

/**
 * CommitTimeline — plots RCDI score over time.
 * Works with repos of any age (no 12-month limit).
 * Smart X-axis formatting: shows year+month for multi-year repos,
 * just month for single-year repos.
 */

const DIM_COLORS = {
  rcdiScore: '#4f6ef7',
  SC: '#22c55e',
  StC: '#eab308',
  CI: '#f97316',
  PD: '#a855f7',
  CC: '#06b6d4',
};

const DIM_LABELS = {
  rcdiScore: 'RCDI (Overall)',
  SC: 'Structural Complexity',
  StC: 'State Complexity',
  CI: 'Coupling Index',
  PD: 'Prop Depth',
  CC: 'Component Cohesion',
};

const gradeColor = (score) => {
  if (!score && score !== 0) return 'var(--text-muted)';
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#84cc16';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

// Smart date label — year+month for multi-year, just month/day for single-year
const formatDateLabel = (dateStr, isMultiYear) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr.slice(0, 10);
  if (isMultiYear) {
    return d.toLocaleDateString('en-GB', { year: '2-digit', month: 'short' });
  }
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const e = payload[0]?.payload;
  return (
    <div className="px-3 py-2 rounded-lg text-xs"
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        color: 'var(--text-primary)', maxWidth: 300
      }}>
      <p className="font-mono font-semibold mb-0.5">{e?.date?.slice(0, 10)}</p>
      <p className="font-mono text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{e?.commitHash}</p>
      {e?.message && (
        <p className="mb-2 italic" style={{
          color: 'var(--text-muted)', maxWidth: 260,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {e.message}
        </p>
      )}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {DIM_LABELS[p.dataKey] || p.dataKey}: <strong>{p.value}</strong>
        </p>
      ))}
      {e?.totalIssues !== undefined && (
        <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
          Issues: {e.totalIssues} · Components: {e.totalComponents} · Files: {e.totalFiles}
        </p>
      )}
    </div>
  );
};

const CommitTimeline = ({ entries = [] }) => {
  const [showDims, setShowDims] = useState(false);

  if (!entries.length) return (
    <div className="flex items-center justify-center h-48 text-sm"
      style={{ color: 'var(--text-muted)' }}>
      No commit history data available.
    </div>
  );

  // Determine if multi-year repo
  const dates = entries.map(e => new Date(e.date)).filter(d => !isNaN(d));
  const isMultiYear = dates.length >= 2 &&
    (dates[dates.length - 1].getFullYear() - dates[0].getFullYear()) >= 1;

  const data = entries.map(e => ({
    ...e,
    ...(e.dimensionScores || {}),
    dateLabel: formatDateLabel(e.date, isMultiYear),
  }));

  const scores = data.map(d => d.rcdiScore).filter(Boolean);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const minEntry = data.find(d => d.rcdiScore === minScore);
  const maxEntry = data.find(d => d.rcdiScore === maxScore);
  const trend = scores.length >= 2
    ? scores[scores.length - 1] - scores[0]
    : 0;

  const activeLines = showDims
    ? ['rcdiScore', 'SC', 'StC', 'CI', 'PD', 'CC']
    : ['rcdiScore'];

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-4 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
          <span>
            Peak: <strong style={{ color: gradeColor(maxScore) }}>{maxScore}</strong>
            {maxEntry && <span className="ml-1 opacity-70">({maxEntry.date?.slice(0, 10)})</span>}
          </span>
          <span>
            Lowest: <strong style={{ color: gradeColor(minScore) }}>{minScore}</strong>
            {minEntry && <span className="ml-1 opacity-70">({minEntry.date?.slice(0, 10)})</span>}
          </span>
          <span>
            Range: <strong style={{ color: 'var(--text-primary)' }}>{maxScore - minScore} pts</strong>
          </span>
          <span>
            Trend: <strong style={{ color: trend >= 0 ? '#22c55e' : '#ef4444' }}>
              {trend >= 0 ? '+' : ''}{trend} pts
            </strong>
            <span className="ml-1 opacity-70">(first → last)</span>
          </span>
          <span style={{ color: 'var(--accent)' }}>
            {data.length} data points
            {isMultiYear && (
              <span className="ml-1 opacity-70">
                ({dates[0]?.getFullYear()} → {dates[dates.length - 1]?.getFullYear()})
              </span>
            )}
          </span>
        </div>
        <button
          onClick={() => setShowDims(!showDims)}
          className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
          style={{
            background: showDims ? 'var(--accent)' : 'var(--bg-surface)',
            color: showDims ? 'white' : 'var(--text-secondary)',
            border: `1px solid ${showDims ? 'var(--accent)' : 'var(--border-subtle)'}`,
          }}>
          {showDims ? 'Hide Dimensions' : 'Show Dimensions'}
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
            axisLine={false} tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 8) - 1)}
            angle={data.length > 10 ? -35 : 0}
            textAnchor={data.length > 10 ? 'end' : 'middle'}
            height={data.length > 10 ? 50 : 30}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {showDims && (
            <Legend formatter={v => (
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                {DIM_LABELS[v] || v}
              </span>
            )} />
          )}

          {/* Grade threshold lines */}
          {[
            { y: 90, color: '#22c55e', label: 'A' },
            { y: 75, color: '#84cc16', label: 'B' },
            { y: 60, color: '#eab308', label: 'C' },
            { y: 40, color: '#f97316', label: 'D' },
          ].map(({ y, color, label }) => (
            <ReferenceLine key={label} y={y} stroke={color} strokeDasharray="4 4"
              label={{ value: label, fill: color, fontSize: 10, position: 'right' }} />
          ))}

          {activeLines.map(key => (
            <Line key={key} type="monotone" dataKey={key}
              stroke={DIM_COLORS[key]}
              strokeWidth={key === 'rcdiScore' ? 3 : 1.5}
              dot={key === 'rcdiScore'
                ? { r: 4, fill: DIM_COLORS[key], stroke: 'var(--bg-card)', strokeWidth: 2 }
                : { r: 2, fill: DIM_COLORS[key], strokeWidth: 1 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Commit table */}
      <div className="mt-4 rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--border-subtle)', maxHeight: 220, overflowY: 'auto' }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0">
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
              {['Date', 'Commit', 'Message', 'RCDI', 'Grade', 'Issues', 'Files'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium"
                  style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((e, i) => (
              <tr key={i} style={{
                borderBottom: '1px solid var(--border-subtle)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
              }}>
                <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  {e.date?.slice(0, 10)}
                </td>
                <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {e.commitHash}
                </td>
                <td className="px-3 py-1.5 max-w-xs truncate" style={{ color: 'var(--text-muted)', maxWidth: 180 }}
                  title={e.message}>
                  {e.message}
                </td>
                <td className="px-3 py-1.5 font-bold" style={{ color: gradeColor(e.rcdiScore) }}>
                  {e.rcdiScore}
                </td>
                <td className="px-3 py-1.5 font-bold" style={{ color: 'var(--accent)' }}>
                  {e.grade}
                </td>
                <td className="px-3 py-1.5"
                  style={{ color: e.totalIssues > 10 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  {e.totalIssues ?? '—'}
                </td>
                <td className="px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>
                  {e.totalFiles ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommitTimeline;
