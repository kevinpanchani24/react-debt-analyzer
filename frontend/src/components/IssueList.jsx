import React, { useState } from 'react';

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const IssueRow = ({ issue }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg overflow-hidden transition-all duration-150"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`badge-${issue.severity} flex-shrink-0 mt-0.5`}>
          {issue.severity}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {issue.message}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {issue.file}
              {issue.line ? `:${issue.line}` : ''}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(79,110,247,0.1)',
                color: 'var(--accent)',
                fontSize: '10px',
              }}
            >
              {issue.category}
            </span>
          </div>
        </div>

        <span
          className="text-xs flex-shrink-0 mt-1"
          style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          ▾
        </span>
      </button>

      {expanded && issue.recommendation && (
        <div
          className="px-4 pb-3 pt-0 text-sm"
          style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
            Recommendation:{' '}
          </span>
          {issue.recommendation}
        </div>
      )}
    </div>
  );
};

/**
 * Filterable list of detected issues.
 */
const IssueList = ({ issues = [] }) => {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');

  const severities = ['all', 'critical', 'high', 'medium', 'low'];

  const filtered = issues
    .filter(
      (i) =>
        (severityFilter === 'all' || i.severity === severityFilter) &&
        (search === '' ||
          i.message.toLowerCase().includes(search.toLowerCase()) ||
          i.file.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1">
          {severities.map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className="px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all duration-150"
              style={{
                background: severityFilter === s ? 'var(--accent)' : 'var(--bg-surface)',
                color: severityFilter === s ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${severityFilter === s ? 'var(--accent)' : 'var(--border-subtle)'}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search issues…"
          className="ml-auto px-3 py-1.5 rounded-lg text-xs outline-none"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            width: 200,
          }}
        />
      </div>

      {/* Count */}
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Showing {filtered.length} of {issues.length} issues
      </p>

      {/* Issues */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            No issues match your filters.
          </div>
        ) : (
          filtered.slice(0, 100).map((issue, i) => (
            <IssueRow key={`${issue.ruleId}-${issue.file}-${issue.line}-${i}`} issue={issue} />
          ))
        )}
      </div>

      {filtered.length > 100 && (
        <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
          Showing first 100 of {filtered.length} results.
        </p>
      )}
    </div>
  );
};

export default IssueList;
