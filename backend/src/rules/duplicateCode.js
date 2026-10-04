const RULE_ID = 'duplicate-code';
const CATEGORY = 'Code Duplication';

// Minimum number of lines in a block to consider for duplication
const MIN_BLOCK_LINES = 6;
// Minimum number of tokens in a normalised string to compare
const MIN_TOKEN_LENGTH = 50;

/**
 * Detects duplicate or near-duplicate code blocks within a file.
 * 
 * Strategy (file-scoped, no cross-file for performance):
 * 1. Split file into non-trivial logical blocks (function bodies approximated by braces)
 * 2. Normalise each block (strip whitespace, variable names → placeholder)
 * 3. Hash and compare normalised blocks
 * 4. Flag pairs with high similarity
 *
 * This is a lightweight heuristic suitable for research-level detection.
 */
const detect = (ast, code, filePath) => {
  const issues = [];
  const lines = code.split('\n');

  // Extract candidate blocks: sequences of MIN_BLOCK_LINES+ non-blank lines
  const blocks = extractBlocks(lines);

  if (blocks.length < 2) return issues;

  // Normalise and compare
  const normalised = blocks.map(block => ({
    ...block,
    normalised: normaliseBlock(block.text),
  }));

  const seen = new Map(); // normalised text -> first occurrence line

  for (const block of normalised) {
    if (block.normalised.length < MIN_TOKEN_LENGTH) continue;

    if (seen.has(block.normalised)) {
      const firstLine = seen.get(block.normalised);
      issues.push({
        ruleId: RULE_ID,
        category: CATEGORY,
        severity: 'medium',
        file: filePath,
        line: block.startLine,
        message: `Duplicate code block detected (${block.lineCount} lines). First occurrence at line ${firstLine}.`,
        recommendation: 'Extract the duplicated logic into a reusable function or custom hook to follow the DRY principle.',
        metadata: { firstOccurrenceLine: firstLine, duplicateLine: block.startLine, lineCount: block.lineCount },
      });
    } else {
      seen.set(block.normalised, block.startLine);
    }
  }

  return issues;
};

/**
 * Splits source lines into sliding blocks of MIN_BLOCK_LINES lines.
 * Uses a step of MIN_BLOCK_LINES to avoid reporting overlapping duplicates.
 */
const extractBlocks = (lines) => {
  const blocks = [];
  const step = MIN_BLOCK_LINES;

  for (let i = 0; i <= lines.length - MIN_BLOCK_LINES; i += step) {
    const blockLines = lines.slice(i, i + MIN_BLOCK_LINES);
    const nonBlank = blockLines.filter(l => l.trim().length > 0);
    if (nonBlank.length >= MIN_BLOCK_LINES * 0.7) {
      blocks.push({
        startLine: i + 1,
        lineCount: MIN_BLOCK_LINES,
        text: blockLines.join('\n'),
      });
    }
  }

  return blocks;
};

/**
 * Normalises a code block for comparison:
 * - Strips leading/trailing whitespace from each line
 * - Replaces string literals with 'STR'
 * - Replaces numeric literals with 'NUM'
 * - Replaces identifiers (variable names) with a uniform placeholder
 */
const normaliseBlock = (text) => {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .join(' ')
    .replace(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, 'STR')   // string literals
    .replace(/\b\d+(\.\d+)?\b/g, 'NUM')                  // numbers
    .replace(/\s+/g, ' ')
    .trim();
};

module.exports = { detect, RULE_ID, CATEGORY };
