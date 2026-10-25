/**
 * Transcription Service using ElevenLabs Scribe v2
 * Includes graceful fallback for music-only reels, silence, or missing credentials.
 */

const { ELEVENLABS_API_KEY, API_TIMEOUT_MS } = require('../config/constants');

async function transcribeAudio(buffer, mimeType) {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_API_KEY.trim()) {
    console.warn('⚠️ ELEVENLABS_API_KEY not configured. Falling back to caption/visual mode.');
    return {
      transcript: '',
      hasSpeech: false,
      notice: 'Audio transcription bypassed (No ElevenLabs key configured).'
    };
  }

  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), 'reel.webm');
  formData.append('model_id', 'scribe_v2');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`⚠️ ElevenLabs returned status ${response.status}: ${errText}`);
      // Graceful degradation: do not throw fatal error, proceed with caption analysis
      return {
        transcript: '',
        hasSpeech: false,
        notice: `ElevenLabs STT notice (${response.status}). Using reel caption context.`
      };
    }

    const data = await response.json();
    const text = (data.text || '').trim();

    return {
      transcript: text,
      hasSpeech: text.length > 0,
      notice: text.length > 0 ? null : 'No spoken words detected (Music/visual reel).'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`⚠️ Audio transcription failed: ${err.message}. Continuing with post caption.`);
    return {
      transcript: '',
      hasSpeech: false,
      notice: `Transcription unavailable (${err.message}). Using reel caption.`
    };
  }
}

module.exports = {
  transcribeAudio
};
