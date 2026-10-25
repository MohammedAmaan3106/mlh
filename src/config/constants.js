/**
 * Reelsidian Configuration & Constants
 * Secure Environment Variable Loader (Strictly loads from process.env / .env)
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from the single root .env file
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
}
require('dotenv').config();

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  
  // Google AI Studio Direct Gemma 4 Settings
  GEMINI_API_KEY: (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY || '').trim(),
  GOOGLE_GEMMA_MODELS: [
    'models/gemma-4-31b-it',
    'models/gemma-4-26b-a4b-it'
  ],
  
  // OpenRouter Gemma 4 Models (strictly Gemma 4)
  PRIMARY_MODEL: process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it',
  CANDIDATE_MODELS: [
    process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it',
    'google/gemma-4-26b-a4b-it',
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free'
  ],
  
  // ElevenLabs Speech-to-Text Key
  ELEVENLABS_API_KEY: (process.env.ELEVENLABS_API_KEY || '').trim(),
  
  // OpenRouter Key
  OPENROUTER_API_KEY: (process.env.OPENROUTER_API_KEY || '').trim(),
  
  // Maximum audio upload size (RAM only, 30MB limit)
  MAX_AUDIO_SIZE: 30 * 1024 * 1024,
  
  // Allowed media MIME types for upload
  ALLOWED_AUDIO_MIMES: [
    'audio/webm',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/aac',
    'video/webm',
    'video/mp4',
    'video/quicktime'
  ],
  
  // Fetch timeout for external AI APIs
  API_TIMEOUT_MS: 45000,
  
  // Rate limits per IP
  RATE_LIMITS: {
    WINDOW_MS: 60 * 1000,     // 1 minute window
    MAX_HEAVY_REQUESTS: 12,    // Max 12 AI processing calls per minute
    MAX_GENERAL_REQUESTS: 60   // Max 60 general API requests per minute
  }
};
