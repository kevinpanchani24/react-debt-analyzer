import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useAnalysis from '../hooks/useAnalysis';

const STATUS_STEPS = [
  { key: 'pending',   label: 'Queued' },
  { key: 'cloning',   label: 'Cloning repository…' },
  { key: 'analyzing', label: 'Running AST analysis…' },
  { key: 'completed', label: 'Analysis complete' },
];

const stepIndex = (status) => STATUS_STEPS.findIndex((s) => s.key === status);

const StepRow = ({ step, currentStatus }) => {
  const myIdx      = stepIndex(step.key);
  const currentIdx = stepIndex(currentStatus);
  const isFailed   = currentStatus === 'failed';

  let state = 'waiting';
  if (!isFailed && currentIdx > myIdx)   state = 'done';
  if (!isFailed && currentIdx === myIdx) state = 'active';

  const colors = {
    done:    { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.5)',  text: '#22c55e' },
    active:  { bg: 'rgba(79,110,247,0.15)', border: 'rgba(79,110,247,0.5)', text: '#4f6ef7' },
    waiting: { bg: 'rgba(100,116,139,0.1)', border: 'var(--border-subtle)', text: 'var(--text-muted)' },
  };
  const c = colors[state];

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all duration-500"
        style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
      >
        {state === 'done'    && '✓'}
        {state === 'active'  && <span className="w-2.5 h-2.5 rounded-full bg-current animate-pulse" />}
        {state === 'waiting' && '○'}
      </div>
      <span className="text-sm" style={{ color: c.text, fontWeight: state === 'active' ? 500 : 400 }}>
        {step.label}
      </span>
    </div>
  );
};

const AnalysisPage = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { analysis, error, dbStatus } = useAnalysis(id);

  const status = analysis?.status || 'pending';

  useEffect(() => {
    if (status === 'completed') {
      const t = setTimeout(() => navigate(`/dashboard/${id}`), 900);
      return () => clearTimeout(t);
    }
  }, [status, id, navigate]);

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-6">
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Analysing Repository
        </h2>
        <p className="text-sm mb-6 font-mono truncate" style={{ color: 'var(--text-muted)' }}>
          {analysis?.repoUrl || '…'}
        </p>

        {/* DB still connecting banner */}
        {dbStatus === 'connecting' && (
          <div
            className="mb-5 px-4 py-3 rounded-lg text-xs"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', color: '#eab308' }}
          >
            <p className="font-semibold mb-1">⏳ Waiting for MongoDB to connect…</p>
            <p className="opacity-80">
              The backend is running but the database isn't connected yet.
              Check your backend terminal — if you see a MongoDB error, run:
            </p>
            <p className="font-mono mt-1 text-white opacity-90">
              sudo systemctl start mongodb
            </p>
            <p className="mt-1 opacity-70">or set a MongoDB Atlas URI in <span className="text-white">backend/.env</span></p>
          </div>
        )}

        {/* Step progress */}
        <div className="space-y-4">
          {STATUS_STEPS.map((step) => (
            <StepRow key={step.key} step={step} currentStatus={status} />
          ))}
        </div>

        {/* Failed */}
        {status === 'failed' && (
          <div
            className="mt-5 p-3 rounded-lg text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)' }}
          >
            <p className="font-medium mb-1">Analysis failed</p>
            <p className="text-xs opacity-80">{analysis?.error || 'Unknown error.'}</p>
          </div>
        )}

        {/* Hard error (404, invalid ID) */}
        {error && dbStatus !== 'connecting' && status !== 'failed' && (
          <p className="mt-4 text-xs p-3 rounded-lg"
             style={{ color: 'var(--warning)', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
            ⚠ {error} — retrying…
          </p>
        )}

        {/* Completed */}
        {status === 'completed' && (
          <div className="mt-5 p-3 rounded-lg text-sm text-center"
               style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e' }}>
            Redirecting to dashboard…
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-5 flex justify-between items-center"
             style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            ID: {id?.slice(0, 10)}…
          </span>
          {status === 'completed' && (
            <button onClick={() => navigate(`/dashboard/${id}`)} className="btn-primary text-xs py-1.5">
              View Dashboard →
            </button>
          )}
          {status === 'failed' && (
            <Link to="/" className="btn-primary text-xs py-1.5">Try Again</Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
