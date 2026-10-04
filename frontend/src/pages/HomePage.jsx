import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisApi } from '../services/api';
import api from '../services/api';

const EXAMPLE_REPOS = [
  'https://github.com/facebook/create-react-app',
  'https://github.com/pmndrs/zustand',
  'https://github.com/alan2207/bulletproof-react',
];

// ─── Server status banner ──────────────────────────────────────────────────────
const ServerStatus = ({ status }) => {
  if (!status) return null;

  if (status === 'checking') {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs mb-6"
        style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
      >
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
        Checking server status…
      </div>
    );
  }

  if (status === 'ok') {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs mb-6"
        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}
      >
        <span className="w-2 h-2 rounded-full bg-current" />
        Backend connected — ready to analyse
      </div>
    );
  }

  if (status === 'no-db') {
    return (
      <div
        className="px-4 py-3 rounded-lg text-xs mb-6"
        style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', color: '#eab308' }}
      >
        <p className="font-semibold mb-1">⚠ MongoDB is not connected</p>
        <p className="mb-2 opacity-80">The backend server is running but the database is not connected yet.</p>
        <p className="font-mono opacity-90">
          Option A — Local: <span className="text-white">sudo systemctl start mongodb</span><br />
          Option B — Atlas: set <span className="text-white">MONGODB_URI</span> in <span className="text-white">backend/.env</span> → restart backend
        </p>
      </div>
    );
  }

  if (status === 'no-backend') {
    return (
      <div
        className="px-4 py-3 rounded-lg text-xs mb-6"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
      >
        <p className="font-semibold mb-1">✕ Backend server is not running</p>
        <p className="font-mono mt-1 opacity-90">
          cd backend &amp;&amp; npm run dev
        </p>
      </div>
    );
  }

  return null;
};

// ─── Page ──────────────────────────────────────────────────────────────────────
const HomePage = () => {
  const [repoUrl,       setRepoUrl]       = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [serverStatus,  setServerStatus]  = useState('checking');
  const navigate = useNavigate();

  // Poll health endpoint every 4s so the banner auto-updates when DB connects
  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const res = await api.get('/health', { timeout: 3000 });
        if (cancelled) return;
        const { db } = res.data;
        setServerStatus(db === 'connected' ? 'ok' : 'no-db');
      } catch {
        if (cancelled) return;
        setServerStatus('no-backend');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = repoUrl.trim();
    if (!trimmed) return;

    if (serverStatus === 'no-backend') {
      setError('Backend server is not running. Run: cd backend && npm run dev');
      return;
    }
    if (serverStatus === 'no-db') {
      setError('MongoDB is not connected. Start MongoDB then restart the backend.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await analysisApi.submit(trimmed);
      navigate(`/analysis/${result.analysisId}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-57px)] flex flex-col items-center justify-center px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-12 max-w-2xl">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono mb-6"
          style={{ background: 'rgba(79,110,247,0.1)', color: 'var(--accent)', border: '1px solid rgba(79,110,247,0.25)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          AST-Based Static Analysis Engine
        </div>
        <h1 className="text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--text-primary)' }}>
          Detect Technical Debt in<br />
          <span style={{ color: 'var(--accent)' }}>React Applications</span>
        </h1>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Analyse any public GitHub repository for React-specific maintainability issues —
          oversized components, prop drilling, high complexity, and more.
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-xl rounded-2xl p-8"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 0 60px rgba(79,110,247,0.06)' }}
      >
        <ServerStatus status={serverStatus} />

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            GitHub Repository URL
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-mono outline-none transition-all duration-150"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--border)';  e.target.style.boxShadow = 'none'; }}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !repoUrl.trim() || serverStatus !== 'ok'}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting…
                </span>
              ) : 'Analyze'}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-xs p-3 rounded-lg"
               style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}
        </form>

        {/* Example repos */}
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Try an example:</p>
          <div className="flex flex-col gap-2">
            {EXAMPLE_REPOS.map((repo) => (
              <button
                key={repo}
                onClick={() => setRepoUrl(repo)}
                className="text-left text-xs px-3 py-2 rounded-lg font-mono transition-colors duration-150"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                onMouseEnter={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.color = 'var(--text-secondary)'; }}
              >
                {repo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="mt-12 grid grid-cols-3 gap-4 w-full max-w-3xl">
        {[
          { icon: '◎', title: 'AST Analysis',   desc: 'Deep static analysis using Babel parser on JSX/JS source files' },
          { icon: '◈', title: '7 Debt Rules',    desc: 'Component size, prop drilling, nesting, complexity, duplication & more' },
          { icon: '⊞', title: 'Scored Reports',  desc: 'Maintainability score 0–100 with per-file and per-category breakdowns' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="card p-5 text-center">
            <div className="text-2xl mb-3 w-10 h-10 rounded-lg flex items-center justify-center mx-auto"
                 style={{ background: 'rgba(79,110,247,0.1)', color: 'var(--accent)' }}>
              {icon}
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
