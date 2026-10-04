const traverse = require('@babel/traverse').default;

const RULE_ID = 'long-function';
const CATEGORY = 'Code Complexity';

const THRESHOLDS = {
  critical: 100,
  high: 60,
  medium: 40,
};

/**
 * Detects functions that are too long to be easily understood.
 * Long functions are a core maintainability smell — they often violate
 * the single responsibility principle.
 */
const detect = (ast, code, filePath) => {
  const issues = [];

  const checkFunction = (node, name) => {
    const start = node.loc?.start?.line || 0;
    const end = node.loc?.end?.line || 0;
    const lineCount = end - start + 1;

    let severity = null;
    if (lineCount >= THRESHOLDS.critical) severity = 'critical';
    else if (lineCount >= THRESHOLDS.high) severity = 'high';
    else if (lineCount >= THRESHOLDS.medium) severity = 'medium';

    if (severity) {
      issues.push({
        ruleId: RULE_ID,
        category: CATEGORY,
        severity,
        file: filePath,
        line: start,
        message: `Function "${name || '<anonymous>'}" is ${lineCount} lines long.`,
        recommendation: 'Extract logical sub-tasks into smaller helper functions. Functions should ideally be under 40 lines.',
        metadata: { functionName: name, lineCount },
      });
    }
  };

  traverse(ast, {
    FunctionDeclaration(path) {
      checkFunction(path.node, path.node.id?.name);
    },
    FunctionExpression(path) {
      const name =
        path.parent?.id?.name ||
        path.parent?.key?.name ||
        null;
      checkFunction(path.node, name);
    },
    ArrowFunctionExpression(path) {
      // Skip implicit return arrows — they're intentionally short
      if (path.node.body?.type !== 'BlockStatement') return;
      const name = path.parent?.id?.name || null;
      checkFunction(path.node, name);
    },
  });

  return issues;
};

module.exports = { detect, RULE_ID, CATEGORY };
