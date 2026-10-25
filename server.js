/**
 * Reelsidian Real-Time Engine Entry Point
 * Supports both local Node.js execution and Vercel serverless functions.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT } = require('./src/config/constants');
const apiRoutes = require('./src/routes/apiRoutes');
const { securityHeaders } = require('./src/middleware/security');

const app = express();

// 1. Security headers
app.use(securityHeaders);

// 2. CORS: local development, Chrome extensions, and deployed frontends
const allowedOriginRegex = /^(http:\/\/localhost:\d+|https:\/\/.*\.vercel\.app|chrome-extension:\/\/.*)$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header include curl and server-to-server calls.
      if (!origin || allowedOriginRegex.test(origin)) {
        return callback(null, true);
      }
      // Preserve the existing app's permissive CORS behavior for compatibility.
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// 3. Bounded body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. Static frontend assets
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// 5. API routes
app.use('/api', apiRoutes);

// 6. SPA root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 7. Unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 8. Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Vercel's @vercel/node runtime needs the Express app exported as the handler.
// Only start a listening socket when running this file directly on a local machine.
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log('\n======================================================');
    console.log(`🚀 Reelsidian Production Engine active at http://localhost:${PORT}`);
    console.log('🔒 Security headers active.');
    console.log('✨ Ephemeral RAM pipeline: zero disk storage.');
    console.log(`📡 SSE Stream: http://localhost:${PORT}/api/events`);
    console.log('======================================================\n');
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Closing server gracefully...`);
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
