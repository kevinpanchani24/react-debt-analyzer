const traverse = require('@babel/traverse').default;

const RULE_ID = 'deep-nesting';
const CATEGORY = 'Component Architecture';

const THRESHOLDS = {
  critical: 6,
  high: 5,
  medium: 4,
};

/**
 * Detects deeply nested JSX element trees within a single component render.
 * Deep nesting increases cognitive complexity and makes components hard to maintain.
 *
 * Strategy:
 * - Walk JSX element trees and measure maximum depth
 * - Report the deepest nesting found per component
 */
const detect = (ast, code, filePath) => {
  const issues = [];

  traverse(ast, {
    JSXElement(path) {
      // Only process top-level JSX returns (avoid counting every sub-element)
      const parentType = path.parent?.type;
      if (
        parentType !== 'ReturnStatement' &&
        parentType !== 'ArrowFunctionExpression' &&
        parentType !== 'ConditionalExpression' &&
        parentType !== 'LogicalExpression'
      ) {
        return;
      }

      const maxDepth = getMaxJSXDepth(path.node);

      let severity = null;
      if (maxDepth >= THRESHOLDS.critical) severity = 'critical';
      else if (maxDepth >= THRESHOLDS.high) severity = 'high';
      else if (maxDepth >= THRESHOLDS.medium) severity = 'medium';

      if (severity) {
        // Try to find the enclosing component name
        const componentName = getEnclosingComponentName(path);
        const line = path.node.loc?.start?.line;

        issues.push({
          ruleId: RULE_ID,
          category: CATEGORY,
          severity,
          file: filePath,
          line,
          message: `JSX nesting depth of ${maxDepth} detected${componentName ? ` in "${componentName}"` : ''}. Deep nesting reduces readability.`,
          recommendation: 'Extract deeply nested JSX into separate sub-components to flatten the tree and improve readability.',
          metadata: { componentName, nestingDepth: maxDepth },
        });
      }
    },
  });

  return issues;
};

/**
 * Recursively computes the maximum JSX nesting depth from a JSXElement node.
 */
const getMaxJSXDepth = (node, currentDepth = 1) => {
  if (!node || node.type !== 'JSXElement') return currentDepth;

  const children = node.children || [];
  const jsxChildren = children.filter(c => c.type === 'JSXElement');

  if (jsxChildren.length === 0) return currentDepth;

  return Math.max(...jsxChildren.map(child => getMaxJSXDepth(child, currentDepth + 1)));
};

/**
 * Walks up the AST from a JSX path to find the name of the enclosing component.
 */
const getEnclosingComponentName = (path) => {
  let current = path.parentPath;
  while (current) {
    const node = current.node;

    if (node.type === 'FunctionDeclaration' && node.id?.name) {
      return node.id.name;
    }

    if (
      node.type === 'VariableDeclarator' &&
      node.id?.name &&
      /^[A-Z]/.test(node.id.name)
    ) {
      return node.id.name;
    }

    if (node.type === 'ClassDeclaration' && node.id?.name) {
      return node.id.name;
    }

    current = current.parentPath;
  }
  return null;
};

module.exports = { detect, RULE_ID, CATEGORY };
