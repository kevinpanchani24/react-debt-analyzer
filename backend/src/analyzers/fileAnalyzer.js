const { parseCode } = require('../parsers/astParser');
const { runRules } = require('../rules/ruleEngine');
const { extractComponentMetrics } = require('./componentMetricsExtractor');
const { computeComponentRCDI, computeRPS } = require('./rcdiEngine');

/**
 * Analyses one JS/JSX file.
 * Replaces old scoreFile() penalty model with RCDI per-component scoring.
 * fanIn defaults to 0 here — analysisService updates it after import graph build.
 */
const analyzeFile = (code, filePath, loc) => {
  const { ast, error } = parseCode(code, filePath);

  if (!ast) {
    return {
      filePath, loc,
      componentCount: 0, functionCount: 0,
      components: [], issues: [],
      rcdiScore: 100, maintainabilityScore: 100,
      parseError: error,
    };
  }

  // 7 detection rules — unchanged
  const issues = runRules(ast, code, filePath);

  // Extract per-component structural metrics
  const { components, fileStats } = extractComponentMetrics(ast, filePath, loc);

  // Compute initial RCDI per component (fanIn=0, updated later)
  for (const comp of components) {
    const { rcdi, dimensions } = computeComponentRCDI(comp);
    const { rpsScore, rpsRaw } = computeRPS(comp.hookCount, comp.fanIn, comp.isMemoised);
    comp.rcdi = rcdi;
    comp.dimensions = dimensions;
    comp.rpsScore = rpsScore;
    comp.rpsRaw = rpsRaw;
  }

  // File-level RCDI = LOC-weighted average of component RCDIs
  let rcdiScore;
  if (components.length > 0) {
    const totalW = components.reduce((s, c) => s + Math.max(c.loc, 1), 0);
    const wSum = components.reduce((s, c) => s + c.rcdi * Math.max(c.loc, 1), 0);
    rcdiScore = Math.round(wSum / totalW);
  } else {
    // Non-component files (utils, config): issue-penalty fallback
    const penalties = { critical: 25, high: 15, medium: 8, low: 3 };
    let penalty = 0;
    for (const i of issues) penalty += penalties[i.severity] || 5;
    rcdiScore = Math.max(0, Math.round(100 - penalty * Math.min(1, 100 / Math.max(loc, 20))));
  }

  return {
    filePath, loc,
    componentCount: fileStats.componentCount,
    functionCount: fileStats.totalFunctions,
    components,
    issues,
    rcdiScore,
    maintainabilityScore: rcdiScore,  // alias — frontend uses both names
    parseError: null,
  };
};

module.exports = { analyzeFile };
