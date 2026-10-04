const simpleGit = require('simple-git');
const path      = require('path');
const fs        = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

/**
 * Resolve the clone base directory.
 *
 * CLONE_BASE_DIR in .env should be set to a path OUTSIDE the backend folder.
 * We resolve it relative to the backend root (where package.json lives),
 * NOT relative to this file — so ../temp/repos means project/temp/repos.
 *
 * This is critical on Windows: keeping cloned repos inside backend/temp
 * triggers nodemon's file watcher causing infinite restart loops.
 */
const BACKEND_ROOT = path.resolve(__dirname, '..', '..'); // .../project/backend
const CLONE_RELATIVE = process.env.CLONE_BASE_DIR || '../temp/repos';
const BASE_DIR = path.resolve(BACKEND_ROOT, CLONE_RELATIVE);

console.log(`[Git] Clone directory: ${BASE_DIR}`);

/**
 * Clones a GitHub repository (shallow, depth=1) into a UUID-named subfolder.
 * @param {string} repoUrl
 * @returns {Promise<string>} absolute path to cloned repo
 */
const cloneRepository = async (repoUrl) => {
  await fs.ensureDir(BASE_DIR);

  const clonePath = path.join(BASE_DIR, uuidv4());
  const git = simpleGit({ timeout: { block: 120000 } }); // 2 min timeout

  await git.clone(repoUrl, clonePath, ['--depth', '1']);
  return clonePath;
};

/**
 * Deletes a cloned repo from disk after analysis.
 * @param {string} clonePath
 */
const removeRepository = async (clonePath) => {
  try {
    await fs.remove(clonePath);
    console.log(`[Git] Removed: ${path.basename(clonePath)}`);
  } catch (err) {
    console.warn(`[Git] Cleanup failed for ${clonePath}:`, err.message);
  }
};

module.exports = { cloneRepository, removeRepository, BASE_DIR };
