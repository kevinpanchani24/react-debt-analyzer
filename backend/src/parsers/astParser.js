const parser = require('@babel/parser');

/**
 * Babel parser options configured to handle modern JavaScript and JSX,
 * including React hooks, decorators, and optional chaining.
 */
const PARSER_OPTIONS = {
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  plugins: [
    'jsx',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'decorators-legacy',
    'optionalChaining',
    'nullishCoalescingOperator',
    'dynamicImport',
    'objectRestSpread',
    'asyncGenerators',
    'logicalAssignment',
  ],
};

/**
 * Parses JavaScript/JSX source code into a Babel AST.
 * Returns null if parsing fails (e.g. syntax errors in analysed code).
 *
 * @param {string} code - raw source code
 * @param {string} filePath - used for error messages only
 * @returns {{ ast: object|null, error: string|null }}
 */
const parseCode = (code, filePath = 'unknown') => {
  try {
    const ast = parser.parse(code, PARSER_OPTIONS);
    return { ast, error: null };
  } catch (err) {
    return {
      ast: null,
      error: `Parse error in ${filePath}: ${err.message}`,
    };
  }
};

module.exports = { parseCode };
