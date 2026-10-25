/**
 * Reelsidian server entry point.
 * Runs locally and as a Vercel serverless handler.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, 'public');
const indexFile = path.join(publicDir, 'index.html');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

let apiRoutes = null;
let securityHeaders = (_req, _res, next) => next();
const startupIssues = [];

try {
  const securityModule = require('./src/middleware/security');
  if (typeof securityModule.securityHeaders === 'function') {
    securityHeaders = securityModule.securityHeaders;
  } else {
    startupIssues.push('src/middleware/security does not export securityHeaders');
  }
} catch (error) {
  startupIssues.push('Missing or unloadable module: ./src/middleware/security (' + error.message + ')');
}

try {
  apiRoutes = require('./src/routes/apiRoutes');
} catch (error) {
  startupIssues.push('Missing or unloadable module: ./src/routes/apiRoutes (' + error.message + ')');
}

app.use(securityHeaders);

if (apiRoutes) {
  app.use('/api', apiRoutes);
} else {
  app.use('/api', (_req, res) => {
    res.status(503).json({
      error: 'API modules are missing from the deployed repository.',
      details: startupIssues
    });
  });
}

app.get('/api/health', (_req, res) => {
  res.status(apiRoutes ? 200 : 503).json({
    status: apiRoutes ? 'ok' : 'degraded',
    service: 'Reelsidian',
    apiLoaded: Boolean(apiRoutes),
    frontendFound: fs.existsSync(indexFile),
    issues: startupIssues
  });
});

app.get('/', (_req, res) => {
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }

  res.status(503).type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reelsidian deployment diagnostics</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#0b1020;color:#eef2ff;font:16px/1.6 system-ui,sans-serif;display:grid;min-height:100vh;place-items:center;padding:24px}
main{max-width:760px;width:100%;padding:32px;border:1px solid #26324d;border-radius:20px;background:#111a2e}
h1{margin:0 0 8px;font-size:clamp(28px,5vw,42px)}p{color:#b9c5dc}.status{display:inline-block;padding:5px 10px;border-radius:999px;background:#51252d;color:#ffc4cb;font-size:13px}
code{overflow-wrap:anywhere;color:#a5d8ff}li{margin:8px 0}.note{margin-top:24px;padding:16px;border-radius:12px;background:#0b1020}
</style></head><body><main><span class="status">Deployment is reachable, app files are incomplete</span>
<h1>Reelsidian</h1><p>Vercel was returning a function invocation error because the server entry point imports application files that are not present or cannot load in this deployment.</p>
<h2>What needs to be restored</h2><ul>${startupIssues.map(issue => '<li><code>' + issue.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</code></li>').join('')}</ul>
<p>Also required: <code>public/index.html</code> for the frontend.</p>
<div class="note">The deployment is now able to report the underlying problem instead of failing with an opaque 500. Restore the missing project files to re-enable the complete application.</div>
</main></body></html>`);
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err && err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log('Reelsidian server listening on port ' + PORT);
    if (startupIssues.length) console.error('Startup issues:', startupIssues);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = app;
