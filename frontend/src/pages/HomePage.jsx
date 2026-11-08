import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisApi } from '../services/api';
import api from '../services/api';

const EXAMPLE_REPOS = [
  'https://github.com/facebook/create-react-app',
  'https://github.com/pmndrs/zustand',
  'https://github.com/alan2207/bulletproof-react',
];

// How long we treat a failing health check as "server waking up" before
// declaring it genuinely unreachable (Render free tier cold start ≈ 30–60s).
const WAKE_WINDOW_MS = 90000;
const RETRY_FAST_MS = 3000;   // while waking
const RETRY_SLOW_MS = 20000;  // once connected

const ServerStatus = ({ status, elapsed }) => {
  if (status === 'checking' || status === 'waking') return (
    <div className="px-4 py-3 rounded-lg text-xs mb-6"
      style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.25)', color: 'var(--accent)' }}>
      <div className="flex items-center gap-2 font-semibold">
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Waking up the server… {elapsed > 0 && <span className="font-mono opacity-80">{elapsed}s</span>}
      </div>
      <p className="mt-1.5 opacity-80">
        The demo runs on a free server that sleeps when idle. It usually takes 30–50 seconds
        to start — you can paste a repository URL while you wait.
      </p>
    </div>
  );
  if (status === 'ok') return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs mb-6"
      style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
      <span className="w-2 h-2 rounded-full bg-current" />
      Server connected — ready to analyse
    </div>
  );
  if (status === 'no-db') return (
    <div className="px-4 py-3 rounded-lg text-xs mb-6"
      style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', color: '#eab308' }}>
      <p className="font-semibold mb-1">⚠ Database is not connected</p>
      <p className="opacity-80">The server is running but cannot reach the database. Please try again in a minute.</p>
    </div>
  );
  if (status === 'no-backend') return (
    <div className="px-4 py-3 rounded-lg text-xs mb-6"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
      <p className="font-semibold mb-1">✕ Could not reach the server</p>
      <p className="opacity-80">Please refresh the page in a minute. If it keeps failing, the demo may be temporarily offline.</p>
    </div>
  );
  return null;
};

const HomePage = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [elapsed, setElapsed] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let timer;
    const startedAt = Date.now();
    const inWakeWindow = () => Date.now() - startedAt < WAKE_WINDOW_MS;

    const ticker = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    const check = async () => {
      let delay = RETRY_FAST_MS;
      try {
        // Generous timeout: a cold-starting server can take a while to answer
        const res = await api.get('/health', { timeout: 15000 });
        if (cancelled) return;
        const { db } = res.data;
        if (db === 'connected') {
          setServerStatus('ok');
          delay = RETRY_SLOW_MS;
        } else {
          // Server is up but Mongo is still connecting right after wake-up
          setServerStatus(inWakeWindow() ? 'waking' : 'no-db');
        }
      } catch {
        if (cancelled) return;
        setServerStatus(inWakeWindow() ? 'waking' : 'no-backend');
      }
      if (!cancelled) timer = setTimeout(check, delay);
    };

    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(ticker);
    };
  }, []);

  const serverReady = serverStatus === 'ok';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = repoUrl.trim();
    if (!trimmed || !serverReady) return;
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
    <div className="min-h-[calc(100vh-57px)] flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-10 w-full max-w-2xl">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono mb-6"
          style={{ background: 'rgba(79,110,247,0.1)', color: 'var(--accent)', border: '1px solid rgba(79,110,247,0.25)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          AST-Based Static Analysis Engine
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--text-primary)' }}>
          Detect Technical Debt in<br />
          <span style={{ color: 'var(--accent)' }}>React Applications</span>
        </h1>
        <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Analyse any public GitHub repository for React-specific maintainability issues —
          oversized components, prop drilling, high complexity, and more.
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-xl rounded-2xl p-5 sm:p-8"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 0 60px rgba(79,110,247,0.06)' }}
      >
        <ServerStatus status={serverStatus} elapsed={elapsed} />
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            GitHub Repository URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-mono outline-none transition-all duration-150 min-w-0"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto"
              disabled={loading || !repoUrl.trim() || !serverReady}
              title={!serverReady ? 'Waiting for the server to start…' : undefined}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting…
                </span>
              ) : serverReady ? 'Analyze' : 'Starting server…'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-xs p-3 rounded-lg"
              style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}
        </form>

        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Try an example:</p>
          <div className="flex flex-col gap-2">
            {EXAMPLE_REPOS.map((repo) => (
              <button
                key={repo}
                type="button"
                onClick={() => setRepoUrl(repo)}
                className="text-left text-xs px-3 py-2 rounded-lg font-mono transition-colors duration-150 break-all"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                {repo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
        {[
          { icon: '◎', title: 'AST Analysis', desc: 'Deep static analysis using Babel parser on JSX/JS source files' },
          { icon: '◈', title: '7 Debt Rules', desc: 'Component size, prop drilling, nesting, complexity, duplication & more' },
          { icon: '⊞', title: 'Scored Reports', desc: 'Maintainability score 0–100 with per-file and per-category breakdowns' },
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
