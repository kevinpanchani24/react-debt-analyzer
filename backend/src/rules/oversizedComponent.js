const traverse = require('@babel/traverse').default;

const RULE_ID = 'oversized-component';
const CATEGORY = 'Component Size';

// Thresholds (lines of code)
const THRESHOLDS = {
  critical: 500,
  high: 300,
  medium: 150,
};

/**
 * Detects React components that exceed acceptable line count thresholds.
 * Large components are harder to understand, test, and maintain.
 *
 * Strategy:
 * - Detect function declarations/expressions named with PascalCase (React convention)
 * - Detect arrow functions assigned to PascalCase variables
 * - Detect class components extending React.Component / Component
 */
const detect = (ast, code, filePath) => {
  const issues = [];
  const lines = code.split('\n');

  const getComponentLines = (node) => {
    const start = node.loc?.start?.line || 0;
    const end = node.loc?.end?.line || 0;
    return { start, end, count: end - start + 1 };
  };

  const isPascalCase = (name) => /^[A-Z][a-zA-Z0-9]*$/.test(name);

  const checkComponent = (name, node) => {
    if (!isPascalCase(name)) return;

    const { start, count } = getComponentLines(node);

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
        line: start,
        message: `Component "${name}" has ${count} lines. Consider splitting it into smaller components.`,
        recommendation: `Extract logical sections of "${name}" into separate, focused components. Aim for components under 150 lines.`,
        metadata: { componentName: name, lineCount: count },
      });
    }
  };

  traverse(ast, {
    // function MyComponent() { ... }
    FunctionDeclaration(path) {
      const name = path.node.id?.name;
      if (name) checkComponent(name, path.node);
    },

    // const MyComponent = function() { ... }
    // const MyComponent = () => { ... }
    VariableDeclarator(path) {
      const name = path.node.id?.name;
      const init = path.node.init;
      if (
        name &&
        init &&
        (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
      ) {
        checkComponent(name, init);
      }
    },

    // class MyComponent extends React.Component { ... }
    ClassDeclaration(path) {
      const name = path.node.id?.name;
      if (name) checkComponent(name, path.node);
    },
  });

  return issues;
};

module.exports = { detect, RULE_ID, CATEGORY };
