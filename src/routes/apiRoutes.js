/**
 * API Routes for Reelsidian Engine
 * Enhanced with strict MIME validation, input sanitization, and sliding-window rate limiting.
 */

const express = require('express');
const multer = require('multer');
const {
  MAX_AUDIO_SIZE,
  ALLOWED_AUDIO_MIMES,
  PRIMARY_MODEL,
  CANDIDATE_MODELS,
  ELEVENLABS_API_KEY,
  OPENROUTER_API_KEY,
  GEMINI_API_KEY,
  GOOGLE_GEMMA_MODELS
} = require('../config/constants');
const { registerClient, broadcast, getConnectedClientsCount } = require('../services/sseService');
const { transcribeAudio } = require('../services/transcriptionService');
const { analyzeContent } = require('../services/analysisService');
const {
  addGoal,
  deleteGoal,
  addReportToGraph,
  getGraph
} = require('../services/graphService');
const {
  heavyProcessingLimiter,
  generalApiLimiter,
  sanitizeText,
  sanitizeCreator,
  sanitizeUrl
} = require('../middleware/security');

const router = express.Router();

// Strict Multer Upload Configuration:
// 1. In-memory storage (Zero disk footprint, purged after request lifecycle)
// 2. File size ceiling (30MB)
// 3. MIME type allowlist enforcement
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AUDIO_SIZE,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    if (ALLOWED_AUDIO_MIMES.includes(mime)) {
      return cb(null, true);
    }
    return cb(new Error(`Unsupported file type (${mime}). Only audio and video formats are allowed.`));
  }
});

// Middleware to catch multer-specific errors (size limits, invalid file types)
function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Uploaded file is too large. Maximum size is 30MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
}

// Apply general rate limiter across all API routes
router.use(generalApiLimiter);

// SSE Events stream for live status and card dispatch
router.get('/events', (req, res) => {
  registerClient(req, res);
});

// ==========================================
// 1. Real-Time Audio Processing Pipeline
// ==========================================
router.post(
  '/process',
  heavyProcessingLimiter,
  (req, res, next) => {
    upload.single('audio')(req, res, (err) => {
      if (err) return handleUploadErrors(err, req, res, next);
      next();
    });
  },
  async (req, res) => {
    const creator = sanitizeCreator(req.body.creator);
    const caption = sanitizeText(req.body.caption, 8000);
    const url = sanitizeUrl(req.body.url);

    // Validate audio buffer
    if (!req.file || req.file.size < 300) {
      // If no audio but caption is present, we can analyze from text
      if (caption.length > 5) {
        console.log(`\n⚡ LIVE PROCESSING: Text/Caption only from @${creator}`);
        try {
          broadcast('status', { step: 'analyzing', message: '🧠 Analyzing caption with Gemma 4...' });
          const analysis = await analyzeContent('', caption, url);
          const result = {
            id: 'card_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
            creator,
            url,
            caption,
            transcript: '(No audio provided - analyzed directly from caption)',
            notice: 'Caption-only analysis',
            analysis: analysis.data,
            modelUsed: analysis.model,
            processedAt: new Date().toLocaleTimeString()
          };
          broadcast('result', result);
          return res.json({ success: true, result });
        } catch (err) {
          broadcast('status', { step: 'error', message: `Error: ${err.message}` });
          return res.status(500).json({ error: err.message });
        }
      }
      return res.status(400).json({ error: 'No audio captured or recording was too short (<0.5s).' });
    }

    const mime = ALLOWED_AUDIO_MIMES.includes(req.file.mimetype) ? req.file.mimetype : 'audio/webm';
    const audioDataUrl = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
    console.log(`\nLIVE PROCESSING: Reel from @${creator} (${(req.file.size / 1024).toFixed(1)} KB, ${mime})`);

    broadcast('status', {
      step: 'transcribing',
      message: 'Transcribing speech with ElevenLabs Scribe v2...'
    });

    try {
      // 1. Speech-to-Text Transcription
      const sttResult = await transcribeAudio(req.file.buffer, mime);
      console.log(`STT Output: "${(sttResult.transcript || sttResult.notice || '').slice(0, 70)}..."`);

      broadcast('status', {
        step: 'analyzing',
        message: 'Synthesizing comprehensive analysis with Google Gemma 4...'
      });

      // 2. Structured Academic Analysis
      const analysis = await analyzeContent(sttResult.transcript, caption, url);
      console.log(`Gemma analysis finished: "${analysis.data.title}"`);

      const result = {
        id: 'card_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
        creator,
        url,
        caption,
        audioDataUrl,
        transcript: sttResult.transcript,
        notice: sttResult.notice,
        analysis: analysis.data,
        modelUsed: analysis.model,
        processedAt: new Date().toLocaleTimeString()
      };

      // Broadcast live to all connected browser dashboards
      broadcast('result', result);

      // Ingest into Knowledge Graph with strict de-duplication
      addReportToGraph(result)
        .then((gRes) => {
          broadcast('graph_update', gRes.graph);
        })
        .catch((err) => console.warn('Knowledge graph update error:', err.message));

      // Audio buffer in req.file.buffer is naturally freed by garbage collector
      return res.json({ success: true, result });
    } catch (err) {
      console.error('Pipeline error:', err.message);
      broadcast('status', {
        step: 'error',
        message: `Error: ${err.message}`
      });
      return res.status(500).json({ error: err.message });
    }
  }
);

// Backward compatibility alias for the Chrome extension
router.post('/ingest', (req, res, next) => {
  req.url = '/process';
  router.handle(req, res, next);
});

// ==========================================
// 2. Quick Text / Caption Analysis
// ==========================================
router.post('/analyze-text', heavyProcessingLimiter, express.json({ limit: '1mb' }), async (req, res) => {
  const content = sanitizeText(req.body.text || req.body.caption, 12000);
  const caption = sanitizeText(req.body.caption, 8000);
  const creator = sanitizeCreator(req.body.creator);
  const url = sanitizeUrl(req.body.url);

  if (!content) {
    return res.status(400).json({ error: 'Please provide some text or reel caption to analyze.' });
  }

  try {
    broadcast('status', { step: 'analyzing', message: '🧠 Analyzing text with Gemma 4...' });
    const analysis = await analyzeContent(content, caption, url);

    const result = {
      id: 'card_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      creator,
      url,
      caption,
      transcript: content,
      notice: 'Text/Notes mode',
      analysis: analysis.data,
      modelUsed: analysis.model,
      processedAt: new Date().toLocaleTimeString()
    };

    broadcast('result', result);

    // Ingest into Knowledge Graph with strict de-duplication
    addReportToGraph(result)
      .then((gRes) => {
        broadcast('graph_update', gRes.graph);
      })
      .catch((err) => console.warn('Knowledge graph update error:', err.message));

    return res.json({ success: true, result });
  } catch (err) {
    broadcast('status', { step: 'error', message: `Error: ${err.message}` });
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. Knowledge Graph & Academic Goals
// ==========================================
router.get('/graph', (req, res) => {
  res.json({ success: true, graph: getGraph() });
});

router.post('/goals', express.json({ limit: '64kb' }), async (req, res) => {
  try {
    const rawGoal = sanitizeText(req.body.goalText, 500);
    if (!rawGoal) {
      return res.status(400).json({ error: 'Goal text cannot be empty (maximum 500 characters).' });
    }
    const result = await addGoal(rawGoal);
    broadcast('graph_update', result.graph);
    res.json({ success: true, goal: result.goal, graph: result.graph });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/goals/:id', (req, res) => {
  try {
    const goalId = sanitizeText(req.params.id, 100);
    const graph = deleteGoal(goalId);
    broadcast('graph_update', graph);
    res.json({ success: true, graph });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. Diagnostic & Health Endpoint
// ==========================================
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    mode: 'ephemeral-realtime',
    connected_dashboards: getConnectedClientsCount(),
    google_ai_studio_configured: Boolean(GEMINI_API_KEY.trim()),
    elevenlabs_configured: Boolean(ELEVENLABS_API_KEY.trim()),
    openrouter_configured: Boolean(OPENROUTER_API_KEY.trim()),
    primary_model: PRIMARY_MODEL,
    rate_limits: {
      window_seconds: 60,
      max_ai_calls_per_minute: 12
    }
  });
});

module.exports = router;
