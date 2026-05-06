require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
const tenantsRouter = require('./routes/tenants');
const accountsRouter = require('./routes/accounts');
const licensesRouter = require('./routes/licenses');
const usageRouter = require('./routes/usage');
const licenseCache = require('./utils/cache');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'API Gateway Online 🚀',
    version: '2.1.0',
    endpoints: {
      health: '/health',
      cache: '/cache/stats',
      tenants: '/v1/tenants',
      accounts: '/v1/accounts',
      licenses: '/v1/licenses',
      usage: '/v1/usage'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cache stats endpoint
app.get('/cache/stats', (req, res) => {
  res.json(licenseCache.stats());
});

// Protected routes
app.use('/v1/tenants', authMiddleware, tenantsRouter);
app.use('/v1/accounts', authMiddleware, accountsRouter);
app.use('/v1/licenses', authMiddleware, licensesRouter);
app.use('/v1/usage', authMiddleware, usageRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
  console.log(`Cache TTL: ${licenseCache.stats().ttl}ms`);
});
