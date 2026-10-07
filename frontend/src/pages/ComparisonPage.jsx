import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reportApi } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';

const SEV_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8' };

const ComparisonPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    reportApi.getComparison(id)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-57px)]">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-57px)]">
      <p style={{ color: 'var(--danger)' }}>{error}</p>
    </div>
  );

  const custom = data?.custom || {};
  const sevData = ['critical', 'high', 'medium', 'low'].map(s => ({
    severity: s, count: custom.issuesBySeverity?.[s] || 0,
  }));
  const catData = Object.entries(custom.issuesByCategory || {}).map(([c, n]) => ({
    category: c.replace('Component ', '').replace('Code ', ''), issues: n,
  }));
  const dimData = Object.entries(custom.dimensionScores || {}).map(([k, v]) => ({
    dim: k, score: typeof v === 'number' ? v : 0, fullMark: 100,
  }));

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        RCDI Analysis Results
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        React Component Debt Index v2 — five-dimension weighted composite score
      </p>

      {/* Top metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>RCDI Score</p>
          <p className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>{custom.rcdiScore ?? '—'}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>React Component Debt Index</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Total Issues</p>
          <p className="text-4xl font-bold" style={{ color: 'var(--danger)' }}>{custom.totalIssues ?? '—'}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>by 7 detection rules</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Severity Breakdown</p>
          {['critical', 'high', 'medium', 'low'].map(s => (
            <div key={s} className="flex justify-between text-xs mb-1">
              <span className="capitalize" style={{ color: SEV_COLORS[s] }}>{s}</span>
              <span style={{ color: 'var(--text-primary)' }}>{custom.issuesBySeverity?.[s] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Issues by Severity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sevData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="severity" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-primary)' }} />
              <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Issues by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis dataKey="category" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-primary)' }} />
              <Bar dataKey="issues" fill="var(--accent)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RCDI dimension radar */}
      {dimData.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            RCDI Five-Dimension Radar
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            SC (α=0.25) · StC (α=0.20) · CI (α=0.20) · PD (α=0.20) · CC (α=0.15)
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={dimData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgba(255,255,255,0.07)" />
              <PolarAngleAxis dataKey="dim" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Radar name="Score" dataKey="score" stroke="#4f6ef7" fill="#4f6ef7"
                fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Research note */}
      <div className="rounded-xl p-5 text-sm"
        style={{ background: 'rgba(79,110,247,0.05)', border: '1px solid rgba(79,110,247,0.2)' }}>
        <h4 className="font-semibold mb-2" style={{ color: 'var(--accent)' }}>Research Context — RCDI v2</h4>
        <p style={{ color: 'var(--text-secondary)' }}>
          Unlike ESLint (syntax patterns) or SonarQube (language-agnostic), RCDI measures five
          React-specific dimensions grounded in coupling/cohesion theory, McCabe complexity,
          cognitive load research, and Ferreira &amp; Valente (2022) React code smell taxonomy.
        </p>
        <p className="mt-2 font-mono text-xs" style={{ color: 'var(--accent)' }}>
          RCDI = 0.25·SC + 0.20·StC + 0.20·CI + 0.20·PD + 0.15·CC
        </p>
      </div>
    </div>
  );
};

export default ComparisonPage;
