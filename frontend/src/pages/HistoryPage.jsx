import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisApi } from '../services/api';

const StatusBadge = ({ status }) => {
  const S = {
    completed: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    failed: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    analyzing: { bg: 'rgba(79,110,247,0.1)', color: '#4f6ef7', border: 'rgba(79,110,247,0.3)' },
    cloning: { bg: 'rgba(79,110,247,0.1)', color: '#4f6ef7', border: 'rgba(79,110,247,0.3)' },
    pending: { bg: 'rgba(100,116,139,0.1)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
  };
  const s = S[status] || S.pending;
  return (
    <span className="px-2 py-0.5 text-xs rounded capitalize font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
};

const scoreColor = (s) => {
  if (!s && s !== 0) return 'var(--text-muted)';
  if (s >= 75) return '#22c55e';
  if (s >= 50) return '#eab308';
  return '#ef4444';
};

const HistoryPage = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    analysisApi.list(1, 20)
      .then(r => { setAnalyses(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this analysis?')) return;
    try {
      await analysisApi.delete(id);
      setAnalyses(prev => prev.filter(a => a._id !== id));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Analysis History</h1>
        <button onClick={() => navigate('/')} className="btn-primary text-sm">+ New Analysis</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-20 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-2xl mb-2">◫</p>
          <p style={{ color: 'var(--text-secondary)' }}>No analyses yet.</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4 text-sm">
            Analyze a repository
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Repository', 'Status', 'RCDI', 'Grade', 'Files', 'Issues', 'Date', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analyses.map((a, i) => {
                const tot =
                  (a.issueCount?.critical || 0) + (a.issueCount?.high || 0) +
                  (a.issueCount?.medium || 0) + (a.issueCount?.low || 0);
                const score = a.rcdiScore ?? a.maintainabilityScore;
                return (
                  <tr key={a._id}
                    onClick={() => a.status === 'completed'
                      ? navigate(`/dashboard/${a._id}`)
                      : navigate(`/analysis/${a._id}`)
                    }
                    className="cursor-pointer transition-colors duration-100"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,110,247,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}>
                    <td className="px-5 py-3 max-w-xs">
                      <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.repoName}</p>
                      <p className="text-xs font-mono truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.repoUrl}</p>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3 font-bold" style={{ color: scoreColor(score) }}>
                      {score ?? '—'}
                    </td>
                    <td className="px-5 py-3 font-bold" style={{ color: 'var(--accent)' }}>
                      {a.grade ?? '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{a.totalFiles ?? '—'}</td>
                    <td className="px-5 py-3" style={{ color: tot > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {a.status === 'completed' ? tot : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={e => handleDelete(e, a._id)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.target.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
