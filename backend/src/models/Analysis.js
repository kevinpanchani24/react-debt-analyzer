const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  ruleId: { type: String, required: true },
  category: { type: String, required: true },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
  file: { type: String, required: true },
  line: { type: Number },
  message: { type: String, required: true },
  recommendation: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
});

const DimensionSchema = new mongoose.Schema({
  SC: { type: Number, default: 100 },
  StC: { type: Number, default: 100 },
  CI: { type: Number, default: 100 },
  PD: { type: Number, default: 100 },
  CC: { type: Number, default: 100 },
}, { _id: false });

const ComponentSchema = new mongoose.Schema({
  name: { type: String },
  filePath: { type: String },
  loc: { type: Number, default: 0 },
  maxCyclomaticComplexity: { type: Number, default: 1 },
  maxJsxDepth: { type: Number, default: 0 },
  hookCount: { type: Number, default: 0 },
  fanIn: { type: Number, default: 0 },
  isMemoised: { type: Boolean, default: false },
  spreadPropCount: { type: Number, default: 0 },
  propChainDepth: { type: Number, default: 0 },
  jsxLines: { type: Number, default: 0 },
  totalLines: { type: Number, default: 0 },
  rcdi: { type: Number, default: 100 },
  rpsScore: { type: Number, default: 100 },
  rpsRaw: { type: Number, default: 0 },
  dimensions: { type: DimensionSchema },
}, { _id: false });

const FileResultSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  loc: { type: Number, default: 0 },
  componentCount: { type: Number, default: 0 },
  functionCount: { type: Number, default: 0 },
  issues: [IssueSchema],
  rcdiScore: { type: Number, default: 100 },
  maintainabilityScore: { type: Number, default: 100 },
  components: [ComponentSchema],
  parseError: { type: String },
});

const RpsEntrySchema = new mongoose.Schema({
  name: { type: String },
  filePath: { type: String },
  hookCount: { type: Number },
  fanIn: { type: Number },
  isMemoised: { type: Boolean },
  rpsRaw: { type: Number },
  rpsScore: { type: Number },
}, { _id: false });

// ── NEW: One entry per sampled commit in the 12-month history ─────────────────
const CommitHistoryEntrySchema = new mongoose.Schema({
  commitHash: { type: String },   // short 8-char hash
  fullHash: { type: String },
  date: { type: String },   // ISO date string
  message: { type: String },   // first 80 chars of commit message
  rcdiScore: { type: Number },
  grade: { type: String },
  totalFiles: { type: Number },
  totalLoc: { type: Number },
  totalComponents: { type: Number },
  totalIssues: { type: Number },
  dimensionScores: { type: DimensionSchema },
}, { _id: false });

const AnalysisSchema = new mongoose.Schema({
  repoUrl: { type: String, required: true },
  repoName: { type: String },
  status: {
    type: String,
    enum: ['pending', 'cloning', 'analyzing', 'completed', 'failed'],
    default: 'pending',
  },
  error: { type: String },

  totalFiles: { type: Number, default: 0 },
  totalLoc: { type: Number, default: 0 },
  totalComponents: { type: Number, default: 0 },
  totalFunctions: { type: Number, default: 0 },

  issueCount: {
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 },
  },

  rcdiScore: { type: Number, default: 100 },
  maintainabilityScore: { type: Number, default: 100 },
  grade: { type: String },
  gradeLabel: { type: String },

  dimensionScores: {
    SC: { type: Number, default: 100 },
    StC: { type: Number, default: 100 },
    CI: { type: Number, default: 100 },
    PD: { type: Number, default: 100 },
    CC: { type: Number, default: 100 },
  },

  categoryScores: { type: mongoose.Schema.Types.Mixed, default: {} },
  rpsRanking: [RpsEntrySchema],

  // ── Commit history timeline ──────────────────────────────────────────────
  commitHistory: [CommitHistoryEntrySchema],
  commitHistoryStatus: {
    type: String,
    enum: ['none', 'building', 'completed', 'failed'],
    default: 'none',
  },
  commitHistoryError: { type: String },

  fileResults: [FileResultSchema],
  allIssues: [IssueSchema],

  eslintResults: { type: mongoose.Schema.Types.Mixed },
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Analysis', AnalysisSchema);
