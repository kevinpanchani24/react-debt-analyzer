const traverse = require('@babel/traverse').default;

/**
 * Single-pass AST traversal extracting all metrics needed for RCDI
 * from one JS/JSX file.
 *
 * Per-component metrics returned:
 *   name, filePath, loc, maxCyclomaticComplexity, maxJsxDepth,
 *   hookCount, isMemoised, spreadPropCount, propChainDepth,
 *   jsxLines, totalLines, fanIn (filled later by analysisService)
 */

const isPascalCase = (n) => /^[A-Z][a-zA-Z0-9]*$/.test(n || '');

const isFuncNode = (n) =>
  n && (n.type === 'FunctionDeclaration' ||
        n.type === 'FunctionExpression'  ||
        n.type === 'ArrowFunctionExpression');

// ── Cyclomatic complexity ─────────────────────────────────────────────────────
const DECISION_NODES = new Set([
  'IfStatement','ConditionalExpression','SwitchCase','LogicalExpression',
  'ForStatement','ForInStatement','ForOfStatement',
  'WhileStatement','DoWhileStatement','CatchClause',
]);

const measureCC = (node) => {
  let cc = 1;
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (DECISION_NODES.has(n.type)) {
      if (n.type === 'SwitchCase' && n.test === null) { /* skip default */ }
      else cc++;
    }
    for (const k of Object.keys(n)) {
      if (k === 'type' || k === 'loc' || k === 'start' || k === 'end') continue;
      const c = n[k];
      if (Array.isArray(c)) c.forEach(x => { if (x && !isFuncNode(x)) walk(x); });
      else if (c && typeof c === 'object' && !isFuncNode(c)) walk(c);
    }
  };
  if (node.body) walk(node.body);
  return cc;
};

// ── JSX nesting depth ─────────────────────────────────────────────────────────
const measureJsxDepth = (node, d = 1) => {
  if (!node || node.type !== 'JSXElement') return d;
  const ch = (node.children || []).filter(c => c.type === 'JSXElement');
  return ch.length === 0 ? d : Math.max(...ch.map(c => measureJsxDepth(c, d + 1)));
};

// ── JSX line count ────────────────────────────────────────────────────────────
const countJsxLines = (node) => {
  const lines = new Set();
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'JSXElement' && n.loc) {
      for (let l = n.loc.start.line; l <= n.loc.end.line; l++) lines.add(l);
    }
    for (const k of Object.keys(n)) {
      if (k === 'type' || k === 'loc') continue;
      const c = n[k];
      if (Array.isArray(c)) c.forEach(x => { if (x && typeof x === 'object') walk(x); });
      else if (c && typeof c === 'object') walk(c);
    }
  };
  walk(node);
  return lines.size;
};

// ── Hook detection ────────────────────────────────────────────────────────────
const STATEFUL_HOOKS = new Set(['useState', 'useReducer', 'useRef']);
const MEMO_HOOKS     = new Set(['useMemo', 'useCallback']);

const isHookCall = (n, set) => {
  if (!n || n.type !== 'CallExpression') return false;
  const c = n.callee;
  return (c.type === 'Identifier' && set.has(c.name)) ||
    (c.type === 'MemberExpression' &&
     c.object?.name === 'React' && set.has(c.property?.name));
};

const countHooksInNode = (node, set) => {
  let count = 0;
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (isHookCall(n, set)) count++;
    for (const k of Object.keys(n)) {
      if (k === 'type' || k === 'loc') continue;
      const c = n[k];
      if (Array.isArray(c)) c.forEach(x => { if (x && typeof x === 'object') walk(x); });
      else if (c && typeof c === 'object') walk(c);
    }
  };
  walk(node);
  return count;
};

// ── Main extractor ────────────────────────────────────────────────────────────
const extractComponentMetrics = (ast, filePath, loc) => {
  const components = [];
  let totalFunctions = 0;

  const process = (name, funcNode) => {
    if (!isPascalCase(name) || !funcNode || !funcNode.loc) return;
    const startLine  = funcNode.loc.start.line;
    const endLine    = funcNode.loc.end.line;
    const totalLines = endLine - startLine + 1;

    // CC
    let maxCC = Math.max(1, measureCC(funcNode));

    // JSX metrics
    let maxJsxDepth = 0, spreadCount = 0;
    const walkJsx = (n) => {
      if (!n || typeof n !== 'object') return;
      if (n.type === 'JSXElement') maxJsxDepth = Math.max(maxJsxDepth, measureJsxDepth(n));
      if (n.type === 'JSXOpeningElement' &&
          (n.attributes || []).some(a => a.type === 'JSXSpreadAttribute')) spreadCount++;
      for (const k of Object.keys(n)) {
        if (k === 'type' || k === 'loc') continue;
        const c = n[k];
        if (Array.isArray(c)) c.forEach(x => { if (x && typeof x === 'object') walkJsx(x); });
        else if (c && typeof c === 'object') walkJsx(c);
      }
    };
    walkJsx(funcNode);

    const jsxLines   = countJsxLines(funcNode);
    const hookCount  = countHooksInNode(funcNode, STATEFUL_HOOKS);
    const isMemoised = countHooksInNode(funcNode, MEMO_HOOKS) > 0;

    components.push({
      name, filePath, loc: totalLines,
      maxCyclomaticComplexity: maxCC, maxJsxDepth,
      hookCount, isMemoised,
      spreadPropCount: spreadCount,
      propChainDepth:  spreadCount > 0 ? 2 : 0,  // heuristic; real tracing = future work
      jsxLines, totalLines,
      fanIn:    0,  // filled by analysisService after import graph is built
      rcdi:     null, rpsScore: null,
    });
  };

  traverse(ast, {
    FunctionDeclaration(p) {
      totalFunctions++;
      process(p.node.id?.name, p.node);
    },
    VariableDeclarator(p) {
      const name = p.node.id?.name;
      const init = p.node.init;
      if (!name || !init) return;
      if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
        totalFunctions++;
        process(name, init);
      }
      // React.memo(Component) — mark wrapped component as memoised
      if (init.type === 'CallExpression') {
        const c = init.callee;
        const isMemoWrap =
          (c.type === 'Identifier' && c.name === 'memo') ||
          (c.type === 'MemberExpression' &&
           c.object?.name === 'React' && c.property?.name === 'memo');
        if (isMemoWrap) {
          const existing = components.find(comp => comp.name === name);
          if (existing) existing.isMemoised = true;
        }
      }
    },
    ClassDeclaration(p) {
      totalFunctions++;
      process(p.node.id?.name, p.node);
    },
  });

  return {
    components,
    fileStats: { totalFunctions, componentCount: components.length },
  };
};

module.exports = { extractComponentMetrics };
