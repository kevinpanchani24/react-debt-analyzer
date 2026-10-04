import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportApi, historyApi } from '../services/api';
import ScoreGauge from '../charts/ScoreGauge';
import RCDIRadar from '../charts/RCDIRadar';
import IssuesBarChart from '../charts/IssuesBarChart';
import FileTreemap from '../charts/FileTreemap';
import RPSChart from '../charts/RPSChart';
import StatCard from '../components/StatCard';
import IssueList from '../components/IssueList';
import ComponentRCDITable from '../components/ComponentRCDITable';
import ErrorBoundary from '../components/ErrorBoundary';
import CommitTimeline from '../charts/CommitTimeline';

const SEV_COLORS = {
  critical: 'var(--danger)', high: '#f97316',
  medium: 'var(--warning)', low: 'var(--text-muted)',
};

const DIM_INFO = [
  {
    key: 'SC', label: 'Structural Complexity', weight: '25%',
    desc: 'Cyclomatic complexity + JSX nesting depth × 1.5. Grounded in McCabe (1976) and Abbes et al. (2011).'
  },
  {
    key: 'StC', label: 'State Complexity', weight: '20%',
    desc: 'useState / useReducer hook count per component. Threshold from Miller (1956) cognitive load.'
  },
  {
    key: 'CI', label: 'Coupling Index', weight: '20%',
    desc: 'How many files import this component (fan-in). Novel React application of Martin (2002) afferent coupling.'
  },
  {
    key: 'PD', label: 'Prop Depth Score', weight: '20%',
    desc: 'Prop chain depth + spread-prop count. Grounded in Ferreira & Valente (2022) prop drilling smell.'
  },
  {
    key: 'CC', label: 'Component Cohesion', weight: '15%',
    desc: 'JSX-to-logic line ratio measuring single responsibility (Martin 2002). Ideal ratio = 0.5.'
  },
];

const DashboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [issues, setIssues] = useState([]);
  const [files, setFiles] = useState([]);
  const [rcdiData, setRcdiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');
  const [history, setHistory] = useState(null);
  const [histLoading, setHistLoading] = useState(false);
  const [maxPoints, setMaxPoints] = useState(20);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    Promise.all([
      reportApi.getSummary(id),
      reportApi.getIssues(id),
      reportApi.getFiles(id),
      reportApi.getRcdi(id),
    ])
      .then(([s, i, f, r]) => {
        setSummary(s.data);
        setIssues(i.data || []);
        setFiles(f.data || []);
        setRcdiData(r.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-57px)]">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-57px)]">
      <div className="p-6 rounded-xl text-sm max-w-md text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--danger)' }}>
        {error}
      </div>
    </div>
  );

  const totalIssues =
    (summary?.issueCount?.critical || 0) + (summary?.issueCount?.high || 0) +
    (summary?.issueCount?.medium || 0) + (summary?.issueCount?.low || 0);

  const dimScores = summary?.dimensionScores || rcdiData?.dimensionScores || {};

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'rcdi', label: 'RCDI Breakdown' },
    { key: 'rps', label: 'Rerender Risk' },
    { key: 'issues', label: 'Issues', count: totalIssues },
    { key: 'files', label: 'Files', count: summary?.totalFiles },
    { key: 'history', label: 'Debt Timeline' },
  ];

  const sc = (s) => s >= 75 ? 'var(--success)' : s >= 50 ? 'var(--warning)' : 'var(--danger)';


  // Always fetch fresh status — no cache so page refresh works correctly
  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const res = await historyApi.get(id);
      setHistory(res.data);
      // If still building, keep polling automatically
      if (res.data?.status === 'building') {
        startPolling();
      }
    } catch (err) { console.error(err); }
    finally { setHistLoading(false); }
  };

  // Continuous polling — keeps running until completed or failed
  const startPolling = () => {
    const poll = setInterval(async () => {
      try {
        const res = await historyApi.get(id);
        setHistory(res.data);
        if (res.data?.status === 'completed' || res.data?.status === 'failed') {
          clearInterval(poll);
          setHistLoading(false);
        }
      } catch { clearInterval(poll); setHistLoading(false); }
    }, 5000);
    return poll;
  };

  const triggerBuild = async () => {
    setHistLoading(true);
    setHistory({ status: 'building', entries: [] }); // immediately show building state
    try {
      await historyApi.build(id, maxPoints, fromDate || null, toDate || null);
      startPolling(); // poll DB every 5s until completed or failed
    } catch (err) {
      setHistory({ status: 'failed', entries: [], error: err.message });
      setHistLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Analysis Dashboard
              </h1>
              {summary?.grade && (
                <span className="px-3 py-0.5 rounded-full text-sm font-bold"
                  style={{
                    background: 'rgba(79,110,247,0.15)', color: 'var(--accent)',
                    border: '1px solid rgba(79,110,247,0.3)'
                  }}>
                  Grade {summary.grade} — {summary.gradeLabel}
                </span>
              )}
            </div>
            <p className="text-sm font-mono truncate max-w-lg" style={{ color: 'var(--text-muted)' }}>
              {summary?.repoUrl}
            </p>
          </div>
          <button onClick={() => navigate(`/comparison/${id}`)} className="btn-primary text-sm">
            View Comparison →
          </button>
        </div>

        <div className="flex gap-1 mt-6 flex-wrap">
          {TABS.map(({ key, label, count }) => (
            <button key={key} onClick={() => { setTab(key); if (key === 'history') loadHistory(); }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === key ? 'var(--accent)' : 'var(--bg-card)',
                color: tab === key ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${tab === key ? 'var(--accent)' : 'var(--border-subtle)'}`,
              }}>
              {label}
              {count !== undefined && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-xs"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-2 card p-6 flex flex-col items-center justify-center">
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                RCDI Score
              </p>
              <ErrorBoundary>
                <ScoreGauge score={summary?.rcdiScore ?? summary?.maintainabilityScore ?? 0} />
              </ErrorBoundary>
              <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                React Component Debt Index
              </p>
            </div>
            <div className="col-span-4 grid grid-cols-2 gap-4">
              <StatCard label="Total Files" value={summary?.totalFiles ?? 0} sub="JS / JSX source files" />
              <StatCard label="Lines of Code" value={(summary?.totalLoc ?? 0).toLocaleString()} sub="across all files" />
              <StatCard label="Components" value={summary?.totalComponents ?? 0} sub="React components detected" />
              <StatCard label="Total Issues" value={totalIssues}
                sub={`${summary?.issueCount?.critical ?? 0} critical`}
                color={totalIssues > 0 ? 'var(--danger)' : 'var(--success)'} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {['critical', 'high', 'medium', 'low'].map(sev => (
              <div key={sev} className="card px-4 py-3 flex items-center gap-3"
                style={{ borderColor: SEV_COLORS[sev] + '33' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SEV_COLORS[sev] }} />
                <div>
                  <p className="text-lg font-bold" style={{ color: SEV_COLORS[sev] }}>
                    {summary?.issueCount?.[sev] ?? 0}
                  </p>
                  <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{sev}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                RCDI Dimension Scores
              </h3>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Five weighted dimensions — hover labels for research source
              </p>
              <ErrorBoundary><RCDIRadar dimensionScores={dimScores} /></ErrorBoundary>
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Issues by Category
              </h3>
              <ErrorBoundary><IssuesBarChart issues={issues} /></ErrorBoundary>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              File RCDI Map
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Sized by LOC — coloured by RCDI score (green = good, red = poor)
            </p>
            <ErrorBoundary><FileTreemap files={files} /></ErrorBoundary>
          </div>
        </div>
      )}

      {/* ── RCDI BREAKDOWN ───────────────────────────────────────────────── */}
      {tab === 'rcdi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-3">
            {DIM_INFO.map(({ key, label, weight, desc }) => {
              const score = dimScores[key] ?? 100;
              const color = score >= 80 ? '#22c55e' : score >= 60 ? '#84cc16' :
                score >= 40 ? '#eab308' : '#ef4444';
              return (
                <div key={key} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                      style={{ background: 'rgba(79,110,247,0.15)', color: 'var(--accent)' }}>
                      {key}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>α={weight}</span>
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color }}>{score}</p>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              );
            })}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Per-Component RCDI Breakdown
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Every detected React component with all five dimension scores
            </p>
            <ErrorBoundary>
              <ComponentRCDITable components={rcdiData?.components || []} />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* ── RERENDER RISK ────────────────────────────────────────────────── */}
      {tab === 'rps' && (
        <div className="space-y-6">
          <div className="card p-5"
            style={{ borderColor: 'rgba(79,110,247,0.3)', background: 'rgba(79,110,247,0.04)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent)' }}>
              Rerender Propagation Score (RPS) — Novel Metric
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              RPS quantifies rerender risk as the product of a component's state complexity and
              coupling. Components with many <code className="font-mono">useState</code> hooks
              that are widely imported cause cascading rerenders when state changes.
              Ferreira &amp; Valente (2022) identified unnecessary rerenders as a top React quality
              problem but proposed no measure — RPS is the first quantitative formula for it.
            </p>
            <p className="text-xs mt-2 font-mono" style={{ color: 'var(--accent)' }}>
              RPS_raw = hook_count × fan_in × (1 / memoisation_factor)
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Lower RPS score = higher risk. React.memo / useMemo gives 2× memoisation benefit.
            </p>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Highest Rerender Risk Components
            </h3>
            <ErrorBoundary>
              <RPSChart rpsRanking={summary?.rpsRanking || rcdiData?.rpsRanking || []} />
            </ErrorBoundary>
          </div>

          {(summary?.rpsRanking || rcdiData?.rpsRanking || []).length > 0 && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Component', 'File', 'RPS Score', 'Hooks', 'Fan-in', 'Memoised'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(summary?.rpsRanking || rcdiData?.rpsRanking || [])
                    .sort((a, b) => a.rpsScore - b.rpsScore)
                    .map((r, i) => {
                      const color = r.rpsScore >= 80 ? '#22c55e' :
                        r.rpsScore >= 40 ? '#eab308' : '#ef4444';
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td className="px-4 py-2.5 font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                            {r.name}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs truncate max-w-xs"
                            style={{ color: 'var(--text-muted)' }}>{r.filePath}</td>
                          <td className="px-4 py-2.5 font-bold text-sm" style={{ color }}>{r.rpsScore}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.hookCount}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.fanIn}</td>
                          <td className="px-4 py-2.5 text-xs">
                            {r.isMemoised
                              ? <span style={{ color: '#22c55e' }}>✓ Yes</span>
                              : <span style={{ color: 'var(--text-muted)' }}>No</span>}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ISSUES ───────────────────────────────────────────────────────── */}
      {tab === 'issues' && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            All Detected Issues
          </h3>
          <IssueList issues={issues} />
        </div>
      )}

      {/* ── FILES ────────────────────────────────────────────────────────── */}
      {tab === 'files' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['File', 'RCDI Score', 'LOC', 'Components', 'Issues'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => {
                const s = f.rcdiScore ?? f.maintainabilityScore ?? 0;
                return (
                  <tr key={f.filePath || i}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                    }}>
                    <td className="px-5 py-3 font-mono text-xs max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="truncate block">{f.filePath}</span>
                    </td>
                    <td className="px-5 py-3 font-bold text-sm" style={{ color: sc(s) }}>{s}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{f.loc ?? 0}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{f.componentCount ?? 0}</td>
                    <td className="px-5 py-3">
                      <span style={{ color: (f.issueCount ?? 0) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {f.issueCount ?? 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DEBT TIMELINE ────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-6">
          {/* Explainer */}
          <div className="card p-5"
            style={{ borderColor: 'rgba(79,110,247,0.3)', background: 'rgba(79,110,247,0.04)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent)' }}>
              Commit-History Debt Timeline
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Samples commits evenly spread across the FULL project history (no time limit — works
              on repos of any age), computes a full RCDI score at each point, and plots the
              result as a longitudinal debt trajectory. This reveals whether technical debt
              is growing, stable, or actively being reduced.
            </p>
            <p className="text-xs mt-2 font-mono" style={{ color: 'var(--accent)' }}>
              Each point = full RCDI analysis (AST + import graph) at that commit snapshot
            </p>
          </div>

          {/* Status / trigger */}
          {(!history || history.status === 'none') && (
            <div className="card p-8 flex flex-col items-center gap-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Debt timeline not yet built for this repository.
              </p>
              <p className="text-xs text-center max-w-md" style={{ color: 'var(--text-muted)' }}>
                This requires a full git clone (not shallow) and takes 3–10 minutes
                depending on repository size. It runs in the background.
              </p>
              {/* Date range controls */}
              <div className="flex gap-4 items-end flex-wrap justify-center">
                <div className="flex flex-col gap-1 text-xs">
                  <label style={{ color: 'var(--text-muted)' }}>From date (optional)</label>
                  <input type="date" value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg outline-none text-xs"
                    style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }} />
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <label style={{ color: 'var(--text-muted)' }}>To date (optional)</label>
                  <input type="date" value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg outline-none text-xs"
                    style={{
                      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }} />
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <label style={{ color: 'var(--text-muted)' }}>
                    Sample points: <strong style={{ color: 'var(--accent)' }}>{maxPoints}</strong>
                  </label>
                  <input type="range" min="5" max="50" value={maxPoints}
                    onChange={e => setMaxPoints(Number(e.target.value))}
                    style={{ accentColor: 'var(--accent)', width: 120 }} />
                </div>
              </div>
              <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
                Leave dates empty to analyse the <strong>full project history</strong> (any age).
                More sample points = more accurate but slower.
              </p>
              <button
                onClick={triggerBuild}
                disabled={histLoading}
                className="btn-primary"
              >
                {histLoading ? 'Starting…' : 'Build Debt Timeline'}
              </button>
            </div>
          )}

          {history?.status === 'building' && (
            <div className="card p-8 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Building debt timeline — analysing commits in background…
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                This page will auto-refresh every few seconds.
              </p>
              <button onClick={loadHistory} className="btn-primary text-xs py-1.5 px-4">
                Refresh Status
              </button>
            </div>
          )}

          {history?.status === 'failed' && (
            <div className="card p-6 text-center"
              style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--danger)' }}>
                Build failed
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                {history.error || 'Unknown error.'}
              </p>
              <button onClick={triggerBuild} className="btn-primary text-xs">
                Retry
              </button>
            </div>
          )}

          {history?.status === 'completed' && history.entries?.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  RCDI Score Over Time
                </h3>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {history.entries.length} commits sampled across full history
                </span>
              </div>
              <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
                Grade thresholds shown as dashed lines. Toggle dimensions to see
                which RCDI aspects changed over time.
              </p>
              <ErrorBoundary>
                <CommitTimeline entries={history.entries} />
              </ErrorBoundary>
            </div>
          )}

          {history?.status === 'completed' && history.status !== 'building' && (!history.entries || history.entries.length === 0) && (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No commits found. Try leaving both dates empty to analyse the full project history regardless of age.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default DashboardPage;