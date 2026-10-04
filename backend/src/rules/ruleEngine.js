const oversizedComponent = require('./oversizedComponent');
const propDrilling = require('./propDrilling');
const deepNesting = require('./deepNesting');
const cyclomaticComplexity = require('./cyclomaticComplexity');
const longFunction = require('./longFunction');
const duplicateCode = require('./duplicateCode');
const excessiveUseState = require('./excessiveUseState');

/**
 * Registry of all detection rules.
 * Each rule module must export: { detect, RULE_ID, CATEGORY }
 */
const RULES = [
  oversizedComponent,
  propDrilling,
  deepNesting,
  cyclomaticComplexity,
  longFunction,
  duplicateCode,
  excessiveUseState,
];

/**
 * Runs all registered rules against a single file's AST and source code.
 *
 * @param {object} ast - Babel AST
 * @param {string} code - raw source code
 * @param {string} filePath - relative file path (for issue reporting)
 * @returns {Array} - flat array of detected issues
 */
const runRules = (ast, code, filePath) => {
  const allIssues = [];

  for (const rule of RULES) {
    try {
      const issues = rule.detect(ast, code, filePath);
      allIssues.push(...issues);
    } catch (err) {
      console.warn(`Rule "${rule.RULE_ID}" threw an error on ${filePath}:`, err.message);
    }
  }

  return allIssues;
};

module.exports = { runRules, RULES };
