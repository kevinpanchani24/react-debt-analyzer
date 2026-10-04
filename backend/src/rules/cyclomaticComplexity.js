const traverse = require('@babel/traverse').default;

const RULE_ID = 'high-complexity';
const CATEGORY = 'Code Complexity';

// Cyclomatic complexity thresholds
const THRESHOLDS = {
  critical: 20,
  high: 15,
  medium: 10,
};

/**
 * Detects functions with high cyclomatic complexity.
 * Cyclomatic complexity increases with each branching decision point.
 *
 * Decision nodes counted:
 * - if / else if
 * - switch cases
 * - ternary expressions (?:)
 * - logical && and ||
 * - for / while / do-while loops
 * - catch blocks
 */
const detect = (ast, code, filePath) => {
  const issues = [];

  const checkFunction = (node, name) => {
    const complexity = calculateComplexity(node);

    let severity = null;
    if (complexity >= THRESHOLDS.critical) severity = 'critical';
    else if (complexity >= THRESHOLDS.high) severity = 'high';
    else if (complexity >= THRESHOLDS.medium) severity = 'medium';

    if (severity) {
      const line = node.loc?.start?.line;
      issues.push({
        ruleId: RULE_ID,
        category: CATEGORY,
        severity,
        file: filePath,
        line,
        message: `Function "${name || '<anonymous>'}" has cyclomatic complexity of ${complexity}.`,
        recommendation: `Reduce complexity by extracting logic into helper functions, using early returns, and simplifying conditionals. Target complexity ≤ 10.`,
        metadata: { functionName: name, complexity },
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
        path.parentPath?.parent?.id?.name ||
        null;
      checkFunction(path.node, name);
    },
    ArrowFunctionExpression(path) {
      const name =
        path.parent?.id?.name ||
        path.parentPath?.parent?.id?.name ||
        null;
      // Skip trivial arrow functions (single expression, no branching)
      if (path.node.body?.type !== 'BlockStatement') return;
      checkFunction(path.node, name);
    },
  });

  return issues;
};

/**
 * Calculates cyclomatic complexity for a function node.
 * Base complexity = 1, incremented for each decision point.
 */
const calculateComplexity = (funcNode) => {
  let complexity = 1;

  // We need to walk only within this function, not nested functions
  const countComplexity = (node) => {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
      case 'IfStatement':
      case 'ConditionalExpression':
        complexity++;
        break;
      case 'SwitchCase':
        if (node.test !== null) complexity++; // don't count 'default:'
        break;
      case 'LogicalExpression':
        if (node.operator === '&&' || node.operator === '||' || node.operator === '??') {
          complexity++;
        }
        break;
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
        complexity++;
        break;
      case 'CatchClause':
        complexity++;
        break;
    }

    // Recurse into children but skip nested function bodies
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
      const child = node[key];

      if (Array.isArray(child)) {
        child.forEach(c => {
          if (c && typeof c === 'object' && !isFunctionNode(c)) countComplexity(c);
          else if (c && typeof c === 'object' && isFunctionNode(c)) return; // skip nested
        });
      } else if (child && typeof child === 'object' && !isFunctionNode(child)) {
        countComplexity(child);
      }
    }
  };

  // Start counting inside the function body
  if (funcNode.body) countComplexity(funcNode.body);

  return complexity;
};

const isFunctionNode = (node) => {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
};

module.exports = { detect, RULE_ID, CATEGORY };
