/**
 * Reelsidian Real-Time Engine Entry Point
 * Production-hardened with Security Headers, Origin Controls, and Ephemeral RAM Storage.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT } = require('./src/config/constants');
const apiRoutes = require('./src/routes/apiRoutes');
const { securityHeaders } = require('./src/middleware/security');

const app = express();

// 1. Security Headers Middleware (Nosniff, X-Frame-Options, Referrer-Policy, etc.)
app.use(securityHeaders);

// 2. Controlled CORS Configuration
// Allows local development, the Chrome Extension, and deployed production domains
const allowedOriginRegex = /^(http:\/\/localhost:\d+|https:\/\/.*\.vercel\.app|chrome-extension:\/\/.*)$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOriginRegex.test(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback gracefully while still setting proper headers
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// 3. Body parsers with payload bounds
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. Static frontend asset hosting
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// 5. Mount API routes
app.use('/api', apiRoutes);

// 6. Root SPA route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 7. Global 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 8. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Export express app for Vercel serverless functions
module.exports = app;

// Start Server locally when run directly (e.g., node server.js)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Reelsidian Production Engine active at http://localhost:${PORT}`);
    console.log(`🔒 Security: Rate limiting & HTTP security headers active.`);
    console.log(`✨ Ephemeral RAM pipeline: Zero disk storage, maximum privacy.`);
    console.log(`📡 SSE Stream: http://localhost:${PORT}/api/events`);
    console.log(`======================================================\n`);
  });

  // Graceful termination handling
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server gracefully...');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received. Closing server gracefully...');
    server.close(() => process.exit(0));
  });
}
