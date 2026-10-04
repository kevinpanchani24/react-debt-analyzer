const traverse = require('@babel/traverse').default;

const RULE_ID = 'excessive-usestate';
const CATEGORY = 'Props & State';

const THRESHOLDS = {
  critical: 10,
  high: 7,
  medium: 5,
};

/**
 * Detects React components that declare an excessive number of useState hooks.
 * Too many independent state variables in one component suggests it is doing too much
 * and should be refactored — either by splitting the component or using useReducer.
 */
const detect = (ast, code, filePath) => {
  const issues = [];

  // Map of component name -> { count, line }
  const componentStateMap = new Map();

  traverse(ast, {
    // We want to scope useState counting to individual component functions
    FunctionDeclaration(path) {
      const name = path.node.id?.name;
      if (!name || !/^[A-Z]/.test(name)) return;
      const count = countUseState(path);
      if (count > 0) {
        componentStateMap.set(name, { count, line: path.node.loc?.start?.line });
      }
    },

    VariableDeclarator(path) {
      const name = path.node.id?.name;
      const init = path.node.init;
      if (!name || !/^[A-Z]/.test(name)) return;
      if (!init) return;
      if (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression') return;

      const count = countUseStateInNode(init);
      if (count > 0) {
        componentStateMap.set(name, { count, line: path.node.loc?.start?.line });
      }
    },
  });

  for (const [name, { count, line }] of componentStateMap) {
    let severity = null;
    if (count >= THRESHOLDS.critical) severity = 'critical';
    else if (count >= THRESHOLDS.high) severity = 'high';
    else if (count >= THRESHOLDS.medium) severity = 'medium';

    if (severity) {
      issues.push({
        ruleId: RULE_ID,
        category: CATEGORY,
        severity,
        file: filePath,
        line,
        message: `Component "${name}" uses ${count} useState hooks — this is a sign of excessive local state complexity.`,
        recommendation: `Consider consolidating related state into a single useReducer, or splitting "${name}" into smaller components each managing their own simpler state.`,
        metadata: { componentName: name, useStateCount: count },
      });
    }
  }

  return issues;
};

/**
 * Counts useState calls within a FunctionDeclaration path (scoped traversal).
 */
const countUseState = (path) => {
  let count = 0;
  path.traverse({
    CallExpression(inner) {
      if (isUseStateCall(inner.node)) count++;
    },
  });
  return count;
};

/**
 * Counts useState calls within a raw AST node (no path scope).
 */
const countUseStateInNode = (node) => {
  let count = 0;
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'CallExpression' && isUseStateCall(n)) count++;
    for (const key of Object.keys(n)) {
      if (key === 'type' || key === 'loc') continue;
      const child = n[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === 'object') walk(child);
    }
  };
  walk(node);
  return count;
};

/**
 * Returns true if a CallExpression node is a call to useState.
 */
const isUseStateCall = (node) => {
  if (!node || node.type !== 'CallExpression') return false;
  const callee = node.callee;
  // useState(...)
  if (callee.type === 'Identifier' && callee.name === 'useState') return true;
  // React.useState(...)
  if (
    callee.type === 'MemberExpression' &&
    callee.object?.name === 'React' &&
    callee.property?.name === 'useState'
  )
    return true;
  return false;
};

module.exports = { detect, RULE_ID, CATEGORY };
