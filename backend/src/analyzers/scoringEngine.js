/**
 * Maintainability Scoring Engine
 *
 * Produces a score from 0–100 for each file and an overall project score.
 *
 * Penalty system:
 * - Each issue carries a penalty based on its severity
 * - Penalties are normalised against file size (LOC) to avoid penalising large files unfairly
 * - Category-level subscores are also computed for dashboard visualisation
 */

// Penalty points per issue severity
const SEVERITY_PENALTIES = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

// Categories tracked for subscores
const CATEGORIES = [
  'Component Size',
  'Props & State',
  'Component Architecture',
  'Code Complexity',
  'Code Duplication',
];

/**
 * Computes the maintainability score for a single file.
 *
 * @param {Array} issues - issues detected in this file
 * @param {number} loc - lines of code in this file
 * @returns {number} score 0–100
 */
const scoreFile = (issues, loc) => {
  if (!issues || issues.length === 0) return 100;

  let totalPenalty = 0;

  for (const issue of issues) {
    const penalty = SEVERITY_PENALTIES[issue.severity] || 5;
    totalPenalty += penalty;
  }

  // Normalise: larger files have slightly more tolerance
  const normalisedLoc = Math.max(loc, 20);
  const penaltyFactor = Math.min(1, 100 / normalisedLoc);
  const adjustedPenalty = totalPenalty * penaltyFactor;

  const score = Math.max(0, Math.round(100 - adjustedPenalty));
  return score;
};

/**
 * Computes the overall project maintainability score from all file results.
 * Weighted by file size (LOC) so larger files influence the score more.
 *
 * @param {Array} fileResults - array of { issues, loc, maintainabilityScore }
 * @returns {{ overall: number, categoryScores: object }}
 */
const scoreProject = (fileResults) => {
  if (!fileResults || fileResults.length === 0) {
    return { overall: 100, categoryScores: buildEmptyCategoryScores() };
  }

  // Weighted average of file scores
  let weightedSum = 0;
  let totalWeight = 0;

  for (const file of fileResults) {
    const weight = Math.max(file.loc || 1, 1);
    weightedSum += file.maintainabilityScore * weight;
    totalWeight += weight;
  }

  const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100;

  // Category subscores
  const categoryScores = buildCategoryScores(fileResults);

  return { overall: Math.max(0, Math.min(100, overall)), categoryScores };
};

/**
 * Computes per-category scores across the entire project.
 * Each category score reflects how well the project performs in that dimension.
 */
const buildCategoryScores = (fileResults) => {
  const categoryPenalties = {};
  for (const cat of CATEGORIES) categoryPenalties[cat] = 0;

  let totalLoc = 0;

  for (const file of fileResults) {
    totalLoc += file.loc || 0;
    for (const issue of file.issues || []) {
      if (categoryPenalties[issue.category] !== undefined) {
        categoryPenalties[issue.category] += SEVERITY_PENALTIES[issue.severity] || 5;
      }
    }
  }

  const normLoc = Math.max(totalLoc, 100);
  const scores = {};

  for (const cat of CATEGORIES) {
    const penalty = categoryPenalties[cat];
    const factor = Math.min(1, 150 / normLoc);
    scores[cat] = Math.max(0, Math.round(100 - penalty * factor));
  }

  return scores;
};

const buildEmptyCategoryScores = () => {
  const scores = {};
  for (const cat of CATEGORIES) scores[cat] = 100;
  return scores;
};

/**
 * Returns a human-readable grade and label for a score.
 */
const getScoreGrade = (score) => {
  if (score >= 90) return { grade: 'A', label: 'Excellent', color: '#22c55e' };
  if (score >= 75) return { grade: 'B', label: 'Good', color: '#84cc16' };
  if (score >= 60) return { grade: 'C', label: 'Fair', color: '#eab308' };
  if (score >= 40) return { grade: 'D', label: 'Poor', color: '#f97316' };
  return { grade: 'F', label: 'Critical', color: '#ef4444' };
};

module.exports = { scoreFile, scoreProject, getScoreGrade, CATEGORIES, SEVERITY_PENALTIES };
