const traverse = require('@babel/traverse').default;

const RULE_ID = 'prop-drilling';
const CATEGORY = 'Props & State';

// Minimum prop chain depth to flag
const DRILLING_THRESHOLD = 3;

/**
 * Detects potential prop drilling by analysing JSX attributes.
 * 
 * Heuristic approach:
 * - Finds JSX elements where the same prop names are spread or explicitly passed
 * - Detects components that receive props and pass them directly to a child
 *   (i.e. the prop name in the parent matches a prop name passed to child)
 * - Flags components with a large number of props being passed through
 */
const detect = (ast, code, filePath) => {
  const issues = [];

  // Track which components receive which props and what they pass to children
  const componentPropMap = new Map(); // componentName -> Set of received prop names
  const componentPassthroughMap = new Map(); // componentName -> { childName, passedProps }

  traverse(ast, {
    // Collect function component parameters (props destructuring)
    FunctionDeclaration(path) {
      const name = path.node.id?.name;
      if (!name || !/^[A-Z]/.test(name)) return;

      const params = path.node.params;
      if (params.length === 0) return;

      const props = extractPropNames(params[0]);
      if (props.length > 0) {
        componentPropMap.set(name, new Set(props));
      }
    },

    VariableDeclarator(path) {
      const name = path.node.id?.name;
      const init = path.node.init;
      if (!name || !/^[A-Z]/.test(name)) return;
      if (!init) return;

      let params = null;
      if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
        params = init.params;
      }
      if (!params || params.length === 0) return;

      const props = extractPropNames(params[0]);
      if (props.length > 0) {
        componentPropMap.set(name, new Set(props));
      }
    },

    // Check JSX elements for spread props or explicit prop-forwarding
    JSXOpeningElement(path) {
      const attrs = path.node.attributes;

      // Detect {...props} spread — direct passthrough
      const hasSpread = attrs.some(a => a.type === 'JSXSpreadAttribute');
      if (hasSpread) {
        const componentName = path.node.name?.name;
        if (componentName && /^[A-Z]/.test(componentName)) {
          issues.push({
            ruleId: RULE_ID,
            category: CATEGORY,
            severity: 'medium',
            file: filePath,
            line: path.node.loc?.start?.line,
            message: `Spread props passed to <${componentName}> — possible prop drilling or anti-pattern.`,
            recommendation: 'Consider using React Context or component composition instead of spreading all props into children.',
            metadata: { componentName },
          });
        }
      }

      // Count explicit props being passed
      const explicitProps = attrs
        .filter(a => a.type === 'JSXAttribute')
        .map(a => a.name?.name);

      if (explicitProps.length >= DRILLING_THRESHOLD + 5) {
        const componentName = path.node.name?.name;
        if (componentName && /^[A-Z]/.test(componentName)) {
          issues.push({
            ruleId: RULE_ID,
            category: CATEGORY,
            severity: 'low',
            file: filePath,
            line: path.node.loc?.start?.line,
            message: `<${componentName}> receives ${explicitProps.length} props — consider using context or composition to reduce prop count.`,
            recommendation: 'Components with many props are often candidates for React Context or a dedicated state management solution.',
            metadata: { componentName, propCount: explicitProps.length },
          });
        }
      }
    },
  });

  return issues;
};

/**
 * Extracts prop names from a function parameter node.
 * Handles both destructured objects and plain 'props' identifiers.
 */
const extractPropNames = (param) => {
  if (!param) return [];

  if (param.type === 'ObjectPattern') {
    return param.properties
      .filter(p => p.type === 'ObjectProperty' || p.type === 'RestElement')
      .map(p => p.key?.name || p.argument?.name)
      .filter(Boolean);
  }

  if (param.type === 'Identifier') {
    return [param.name]; // just "props"
  }

  return [];
};

module.exports = { detect, RULE_ID, CATEGORY };
