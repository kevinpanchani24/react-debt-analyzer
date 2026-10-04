const fs   = require('fs-extra');
const path = require('path');

/**
 * Builds an afferent coupling (fan-in) map for all JS/JSX files.
 * Reads every file's import statements, resolves relative paths,
 * and counts how many files import each target file.
 *
 * Used to compute the CI (Coupling Index) dimension of RCDI.
 * Grounded in Martin (2002) afferent coupling / fan-in metric.
 *
 * @param {string[]} filePaths - absolute paths to all JS/JSX files
 * @param {string}   rootDir   - repo root (for relative path keys)
 * @returns {{ fanIn: Object }}  fanIn[relPath] = count of importers
 */
const buildImportGraph = async (filePaths, rootDir) => {
  const fileSet = new Set(filePaths);

  const resolveImport = (importStr, sourceFile) => {
    if (!importStr.startsWith('.')) return null;
    const base = path.resolve(path.dirname(sourceFile), importStr);
    const candidates = [
      base,
      `${base}.js`, `${base}.jsx`,
      `${base}/index.js`, `${base}/index.jsx`,
    ];
    return candidates.find(c => fileSet.has(c)) || null;
  };

  const importRe = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  const fanIn  = {};
  const fanOut = {};

  for (const fp of filePaths) {
    const rel = path.relative(rootDir, fp);
    fanIn[rel]  = fanIn[rel]  || 0;
    fanOut[rel] = fanOut[rel] || 0;

    let content = '';
    try { content = await fs.readFile(fp, 'utf8'); } catch { /* skip unreadable */ }

    let m;
    importRe.lastIndex = 0;
    while ((m = importRe.exec(content)) !== null) {
      const resolved = resolveImport(m[1], fp);
      if (!resolved) continue;
      const relT = path.relative(rootDir, resolved);
      fanIn[relT]  = (fanIn[relT]  || 0) + 1;
      fanOut[rel]  = (fanOut[rel]  || 0) + 1;
    }
  }

  return { fanIn, fanOut };
};

module.exports = { buildImportGraph };
