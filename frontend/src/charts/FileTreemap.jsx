import React from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

const getColor = (score) => {
  if (score === undefined || score === null) return '#334155';
  if (score >= 90) return '#16a34a';
  if (score >= 75) return '#65a30d';
  if (score >= 60) return '#ca8a04';
  if (score >= 40) return '#c2410c';
  return '#991b1b';
};

/**
 * CustomContent — called by Recharts for every cell in the treemap.
 * Recharts passes many props; we only use the ones we need.
 * ALL props must be treated as potentially undefined — Recharts calls this
 * during layout passes before data is fully resolved.
 */
const CustomContent = (props) => {
  const { x, y, width, height, name, score } = props || {};

  // Guard: skip render if dimensions are invalid or missing
  if (
    x === undefined || y === undefined ||
    !width || !height ||
    width < 2 || height < 2
  ) {
    return null;
  }

  if (width < 30 || height < 20) {
    // Still render the rect, just no label
    return (
      <g>
        <rect
          x={x + 1}
          y={y + 1}
          width={Math.max(width - 2, 0)}
          height={Math.max(height - 2, 0)}
          style={{ fill: getColor(score), stroke: 'var(--bg-primary)', strokeWidth: 1 }}
          rx={2}
        />
      </g>
    );
  }

  // Safe filename extraction — name may be undefined during layout
  const safeName  = typeof name === 'string' ? name : '';
  const fileName  = safeName.split('/').pop() || safeName || '?';
  const showLabel = width > 60 && height > 30;
  const label     = fileName.length > 14 ? fileName.slice(0, 12) + '…' : fileName;

  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(width - 2, 0)}
        height={Math.max(height - 2, 0)}
        style={{ fill: getColor(score), stroke: 'var(--bg-primary)', strokeWidth: 2 }}
        rx={4}
      />
      {showLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="rgba(255,255,255,0.9)"
            fontSize={10}
            fontFamily="IBM Plex Mono"
          >
            {label}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.7)"
            fontSize={10}
            fontWeight="bold"
          >
            {score ?? '—'}
          </text>
        </>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.[0]?.payload) return null;
  const { name, score, issueCount, loc } = payload[0].payload;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
      }}
    >
      <p className="font-mono font-medium mb-1 max-w-xs truncate">{name || '—'}</p>
      <p>Score: <strong style={{ color: getColor(score) }}>{score ?? '—'}</strong></p>
      <p>Issues: {issueCount ?? 0}</p>
      <p>LOC: {loc ?? 0}</p>
    </div>
  );
};

/**
 * Treemap showing file-level maintainability scores.
 * Each cell is sized by LOC and coloured by score (green = good, red = poor).
 */
const FileTreemap = ({ files = [] }) => {
  if (!files || files.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-48 rounded-lg text-sm"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
      >
        No file data available
      </div>
    );
  }

  const data = files.map((f) => ({
    name:       f.filePath  || 'unknown',
    size:       Math.max(f.loc || 1, 5),
    score:      f.maintainabilityScore ?? 100,
    issueCount: f.issueCount  ?? 0,
    loc:        f.loc         ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <Treemap
        data={data}
        dataKey="size"
        content={<CustomContent />}
        isAnimationActive={false}
      >
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
};

export default FileTreemap;
