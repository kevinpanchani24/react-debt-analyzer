import React, { useState } from 'react';

const DIM_KEYS = ['SC', 'StC', 'CI', 'PD', 'CC'];
const DIM_LABELS = {
  SC: 'Structural', StC: 'State', CI: 'Coupling', PD: 'Prop Depth', CC: 'Cohesion',
};
const DIM_DESC = {
  SC: 'Cyclomatic complexity + JSX depth (McCabe 1976; Abbes et al. 2011)',
  StC: 'useState / useReducer hook count (Miller 1956)',
  CI: 'Files that import this component — fan-in (Martin 2002; Alzamil 2023)',
  PD: 'Prop chain depth + spread props (Ferreira & Valente 2022)',
  CC: 'JSX-to-logic line ratio — single responsibility (Martin 2002)',
};

const sc = (s) => {
  if (s === undefined || s === null) return 'var(--text-muted)';
  if (s >= 80) return '#22c55e';
  if (s >= 60) return '#84cc16';
  if (s >= 40) return '#eab308';
  if (s >= 20) return '#f97316';
  return '#ef4444';
};

const Pill = ({ score, dim }) => (
  <span title={DIM_DESC[dim]}
    className="px-2 py-0.5 rounded text-xs font-mono font-bold cursor-help"
    style={{
      background: score >= 80 ? 'rgba(34,197,94,0.1)' :
        score >= 60 ? 'rgba(132,204,22,0.1)' :
          score >= 40 ? 'rgba(234,179,8,0.1)' :
            'rgba(239,68,68,0.1)',
      color: sc(score),
      border: `1px solid ${sc(score)}44`,
    }}>
    {score ?? '—'}
  </span>
);

/**
 * Per-component RCDI breakdown table.
 * Sortable by RCDI, RPS, fan-in, or hook count.
 * Dimension score pills show literature source on hover.
 */
const ComponentRCDITable = ({ components = [] }) => {
  const [sort, setSort] = useState('rcdi');
  const [search, setSearch] = useState('');

  if (!components.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm"
        style={{ color: 'var(--text-muted)' }}>
        No React components detected in this repository.
      </div>
    );
  }

  const sorted = [...components]
    .filter(c =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.filePath?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sort === 'rcdi' ? (a.rcdi ?? 100) - (b.rcdi ?? 100) :
        sort === 'rps' ? (a.rpsScore ?? 100) - (b.rpsScore ?? 100) :
          sort === 'fanIn' ? (b.fanIn ?? 0) - (a.fanIn ?? 0) :
            (b.hookCount ?? 0) - (a.hookCount ?? 0)
    );

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1">
          {[['rcdi', 'Worst RCDI'], ['rps', 'Worst RPS'], ['fanIn', 'Most Coupled'], ['hooks', 'Most Hooks']].map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: sort === k ? 'var(--accent)' : 'var(--bg-surface)',
                color: sort === k ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${sort === k ? 'var(--accent)' : 'var(--border-subtle)'}`,
              }}>
              {l}
            </button>
          ))}
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name or file…"
          className="ml-auto px-3 py-1.5 rounded-lg text-xs outline-none"
          style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)', width: 200
          }} />
      </div>

      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        {sorted.length} of {components.length} components — hover dimension scores for source
      </p>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th className="px-4 py-2.5 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Component</th>
              <th className="px-3 py-2.5 text-center font-medium" style={{ color: 'var(--text-muted)' }}>RCDI</th>
              {DIM_KEYS.map(d => (
                <th key={d} className="px-2 py-2.5 text-center font-medium"
                  style={{ color: 'var(--text-muted)' }} title={DIM_DESC[d]}>
                  {DIM_LABELS[d]}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-medium" style={{ color: 'var(--text-muted)' }}>RPS</th>
              <th className="px-3 py-2.5 text-center font-medium" style={{ color: 'var(--text-muted)' }}>Hooks</th>
              <th className="px-3 py-2.5 text-center font-medium" style={{ color: 'var(--text-muted)' }}>Fan-in</th>
              <th className="px-3 py-2.5 text-center font-medium" style={{ color: 'var(--text-muted)' }}>Memo</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 60).map((c, i) => (
              <tr key={`${c.name}-${c.filePath}-${i}`}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                }}>
                <td className="px-4 py-2.5">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                  <p className="font-mono truncate max-w-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                    {c.filePath}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="font-bold text-sm" style={{ color: sc(c.rcdi) }}>{c.rcdi ?? '—'}</span>
                </td>
                {DIM_KEYS.map(d => (
                  <td key={d} className="px-2 py-2.5 text-center">
                    <Pill score={c.dimensions?.[d]} dim={d} />
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center" style={{ color: sc(c.rpsScore) }}>
                  {c.rpsScore ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-center" style={{ color: 'var(--text-secondary)' }}>
                  {c.hookCount ?? 0}
                </td>
                <td className="px-3 py-2.5 text-center" style={{ color: 'var(--text-secondary)' }}>
                  {c.fanIn ?? 0}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {c.isMemoised
                    ? <span style={{ color: '#22c55e' }}>✓</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length > 60 && (
          <p className="text-center py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing 60 of {sorted.length}
          </p>
        )}
      </div>
    </div>
  );
};

export default ComponentRCDITable;
