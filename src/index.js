import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './db/index.js';
import simulator from './services/simulator.js';
import { getMetrics } from './services/metrics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Initialize database
initDatabase();

// Start auto-update for hunger decay
simulator.startAutoUpdate(60000); // Update every minute

// API Routes
app.get('/api/status', (req, res) => {
  const state = simulator.updateHunger();
  res.json({
    isAlive: state.isAlive,
    hunger: state.hunger,
    tankLevel: state.tankLevel,
    daysSurvived: state.daysSurvived,
    bornAt: state.bornAt,
    lastFedAt: state.lastFedAt
  });
});

app.post('/api/feed', (req, res) => {
  const result = simulator.feed();
  res.json(result);
});

app.post('/api/order', (req, res) => {
  const result = simulator.order();
  res.json(result);
});

app.post('/api/respawn', (req, res) => {
  const result = simulator.respawn();
  res.json(result);
});

app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const history = simulator.getDeathHistory(limit);
  res.json(history);
});

app.get('/api/actions', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const actions = simulator.getRecentActions(limit);
  res.json(actions);
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', 'text/plain');
    res.send(await getMetrics());
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🐟 Salmon.cafe server running on http://localhost:${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`🎮 Play at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  simulator.stopAutoUpdate();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  simulator.stopAutoUpdate();
  process.exit(0);
});
