const path = require('path');

// ─── Load .env FIRST, before anything else ───────────────────────────────────
// Resolve to an absolute path so it works regardless of where `node` is invoked from
const envPath = path.resolve(__dirname, '..', '.env');
const dotenvResult = require('dotenv').config({ path: envPath });

if (dotenvResult.error) {
  console.error('\n' + '═'.repeat(60));
  console.error('  ❌  Could not load .env file');
  console.error(`  Expected at: ${envPath}`);
  console.error('\n  Fix: copy .env.example → .env and fill in your values:');
  console.error('    cd backend');
  console.error('    cp .env.example .env');
  console.error('    # then edit .env and set MONGODB_URI=...');
  console.error('═'.repeat(60) + '\n');
  // Don't exit — keep running so the proxy doesn't get ECONNREFUSED,
  // but every DB call will return a clear 503.
}

const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');

const { errorHandler } = require('./middleware/errorHandler');
const analysisRoutes   = require('./routes/analysisRoutes');
const reportRoutes     = require('./routes/reportRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/analysis', analysisRoutes);
app.use('/api/reports',  reportRoutes);

// Health — returns DB connection status
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const db = states[mongoose.connection.readyState] || 'unknown';
  res.json({
    status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded',
    db,
    envLoaded: !dotenvResult.error,
    mongoUri: process.env.MONGODB_URI
      ? process.env.MONGODB_URI.replace(/:\/\/[^@]+@/, '://<credentials>@')
      : 'NOT SET — check your .env file',
    timestamp: new Date().toISOString(),
  });
});

// 404 fallback
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found.` });
});

app.use(errorHandler);

// ─── Start Express immediately ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(60));
  console.log(`  🚀  Server running → http://localhost:${PORT}`);
  console.log(`  📄  .env path     → ${envPath}`);
  console.log(`  🔑  MONGODB_URI   → ${
    process.env.MONGODB_URI
      ? process.env.MONGODB_URI.replace(/:\/\/[^@]+@/, '://<credentials>@')
      : '❌ NOT SET'
  }`);
  console.log('═'.repeat(60) + '\n');
});

// ─── MongoDB with retry ───────────────────────────────────────────────────────
let retryCount = 0;

const connectDB = () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('  ❌  MONGODB_URI is not set in your .env file.');
    console.error('  Fix: open backend/.env and add:');
    console.error('       MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/tech-debt-analyzer\n');
    // Retry in 10s in case the user edits .env and restarts
    setTimeout(connectDB, 10000);
    return;
  }

  mongoose
    .connect(uri, { serverSelectionTimeoutMS: 8000 })
    .then(() => {
      retryCount = 0;
      console.log('  ✅  MongoDB connected\n');
    })
    .catch((err) => {
      retryCount++;
      console.error(`\n  ❌  MongoDB FAILED (attempt ${retryCount}): ${err.message}`);

      if (retryCount === 1) {
        if (uri.includes('localhost')) {
          console.error('  → Start local MongoDB:');
          console.error('    Ubuntu/Debian:  sudo systemctl start mongodb');
          console.error('    macOS:          brew services start mongodb-community\n');
        } else {
          console.error('  → Atlas checklist:');
          console.error('    1. Username & password are correct');
          console.error('    2. Your IP is in Atlas → Network Access → Add IP');
          console.error('    3. Cluster name in URI matches your Atlas cluster\n');
        }
      }

      const delay = Math.min(5000 * retryCount, 20000);
      console.error(`  Retrying in ${delay / 1000}s...\n`);
      setTimeout(connectDB, delay);
    });
};

mongoose.connection.on('disconnected', () => {
  console.warn('  ⚠  MongoDB disconnected — reconnecting...\n');
  setTimeout(connectDB, 3000);
});

connectDB();

module.exports = app;
