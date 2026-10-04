const { glob } = require('glob');
const path = require('path');
const fs = require('fs-extra');

// Directories to skip during scanning
const IGNORED_DIRS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '.next',
  'out',
  'public',
  '.cache',
];

/**
 * Recursively finds all JavaScript and JSX files in a directory,
 * excluding common non-source directories.
 *
 * @param {string} rootDir - root directory to scan
 * @returns {Promise<string[]>} - array of absolute file paths
 */
const scanFiles = async (rootDir) => {
  const pattern = '**/*.{js,jsx}';
  const ignoredPatterns = IGNORED_DIRS.map(d => `**/${d}/**`);

  const files = await glob(pattern, {
    cwd: rootDir,
    absolute: true,
    ignore: ignoredPatterns,
  });

  return files;
};

/**
 * Reads a file's content and returns it along with line count.
 *
 * @param {string} filePath - absolute path to file
 * @returns {Promise<{ content: string, loc: number }>}
 */
const readFile = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  const loc = content.split('\n').length;
  return { content, loc };
};

/**
 * Returns a file path relative to the repo root.
 *
 * @param {string} filePath - absolute path
 * @param {string} rootDir - repo root
 * @returns {string}
 */
const relativePath = (filePath, rootDir) => {
  return path.relative(rootDir, filePath);
};

module.exports = { scanFiles, readFile, relativePath };
