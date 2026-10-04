/**
 * React Component Debt Index (RCDI) — Scoring Engine
 * ====================================================
 * Replaces the old flat penalty-subtraction scoringEngine.js
 *
 * Theoretical grounding:
 *   SC  — McCabe (1976); Gill & Kemerer (1991); Abbes et al. (2011)
 *   StC — Miller (1956) cognitive load limit
 *   CI  — Martin (2002) afferent coupling; Alzamil (2023)
 *   PD  — Ferreira & Valente (2022) prop drilling smell
 *   CC  — Martin (2002) single responsibility; SQALE (Letouzey, 2012)
 *   RPS — Novel metric (no prior literature); fills gap from Ferreira & Valente (2022)
 *
 * Formula:
 *   RCDI(component) = 0.25·SC + 0.20·StC + 0.20·CI + 0.20·PD + 0.15·CC
 *   RCDI(project)   = Σ(RCDI(cᵢ) × LOC(cᵢ)) / Σ LOC(cᵢ)
 */

const WEIGHTS = { SC: 0.25, StC: 0.20, CI: 0.20, PD: 0.20, CC: 0.15 };

// ── SC: Structural Complexity ─────────────────────────────────────────────────
// JSX depth multiplied by 1.5 per Abbes et al. (2011) cognitive load finding.
// Threshold of 10 from Watson & McCabe (1996).
const scoreStructuralComplexity = (cc = 1, jsxDepth = 0) => {
  const raw = Math.max(cc, jsxDepth * 1.5);
  return Math.round(Math.max(0, 100 - Math.max(0, raw - 10) * 8));
};

// ── StC: State Complexity ─────────────────────────────────────────────────────
// Max hooks = 10 per Miller (1956) working memory limit (7 ± 2).
const scoreStateComplexity = (hookCount = 0) =>
  Math.round(Math.max(0, 100 - Math.min(1, hookCount / 10) * 100));

// ── CI: Coupling Index ────────────────────────────────────────────────────────
// Fan-in metric from Martin (2002). Safe threshold = 5; 10 pts per extra import.
const scoreCouplingIndex = (fanIn = 0) =>
  Math.round(Math.max(0, 100 - Math.max(0, fanIn - 5) * 10));

// ── PD: Prop Depth Score ──────────────────────────────────────────────────────
// Ferreira & Valente (2022): prop drilling = top React code smell.
const scorePropDepth = (chainDepth = 0, spreadCount = 0) =>
  Math.round(Math.max(0, 100 - chainDepth * 15 - spreadCount * 8));

// ── CC: Component Cohesion ────────────────────────────────────────────────────
// Ideal JSX ratio = 0.5 (balanced). Deviation × 200 maps ±0.5 → score 0.
const scoreComponentCohesion = (jsxLines = 0, totalLines = 1) => {
  if (totalLines === 0) return 100;
  const ratio = Math.min(1, jsxLines / totalLines);
  return Math.round(Math.max(0, 100 - Math.abs(ratio - 0.5) * 200));
};

// ── RCDI composite ────────────────────────────────────────────────────────────
const computeComponentRCDI = (m) => {
  const SC  = scoreStructuralComplexity(m.maxCyclomaticComplexity || 1, m.maxJsxDepth || 0);
  const StC = scoreStateComplexity(m.hookCount || 0);
  const CI  = scoreCouplingIndex(m.fanIn || 0);
  const PD  = scorePropDepth(m.propChainDepth || 0, m.spreadPropCount || 0);
  const CC  = scoreComponentCohesion(m.jsxLines || 0, m.totalLines || 1);
  const rcdi = Math.round(
    WEIGHTS.SC * SC + WEIGHTS.StC * StC + WEIGHTS.CI * CI +
    WEIGHTS.PD * PD + WEIGHTS.CC * CC
  );
  return { rcdi, dimensions: { SC, StC, CI, PD, CC } };
};

// ── RPS: Rerender Propagation Score (novel) ───────────────────────────────────
// Novel metric — no precedent in literature. Fills gap noted by Ferreira & Valente (2022).
// Calibrated: hookCount=10, fanIn=10, no memo → rpsRaw=100 → rpsScore=0 (max risk).
const computeRPS = (hookCount = 0, fanIn = 0, isMemoised = false) => {
  const rpsRaw   = (hookCount * fanIn) / (isMemoised ? 2 : 1);
  const rpsScore = Math.round(Math.max(0, 100 - rpsRaw));
  return { rpsRaw, rpsScore };
};

// ── Project-level RCDI (LOC-weighted, per SQALE aggregation principle) ────────
const computeProjectRCDI = (components) => {
  if (!components || !components.length) return 100;
  let wSum = 0, wTotal = 0;
  for (const c of components) {
    const w = Math.max(c.loc || 1, 1);
    wSum   += (c.rcdi || 100) * w;
    wTotal += w;
  }
  return wTotal > 0 ? Math.round(Math.max(0, Math.min(100, wSum / wTotal))) : 100;
};

// ── Grade helper ──────────────────────────────────────────────────────────────
const getGrade = (score) => {
  if (score >= 90) return { grade: 'A', label: 'Excellent', color: '#22c55e' };
  if (score >= 75) return { grade: 'B', label: 'Good',      color: '#84cc16' };
  if (score >= 60) return { grade: 'C', label: 'Fair',      color: '#eab308' };
  if (score >= 40) return { grade: 'D', label: 'Poor',      color: '#f97316' };
  return               { grade: 'F', label: 'Critical',  color: '#ef4444' };
};

module.exports = {
  computeComponentRCDI, computeProjectRCDI, computeRPS, getGrade, WEIGHTS,
  scoreStructuralComplexity, scoreStateComplexity, scoreCouplingIndex,
  scorePropDepth, scoreComponentCohesion,
};
