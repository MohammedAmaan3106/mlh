// Offscreen Audio Recording Engine for Reelsidian
const DEFAULT_BACKEND_URL = 'http://localhost:5000/api/process';

async function getBackendUrl() {
  try {
    const data = await chrome.storage.local.get(['reelsidian_backend_url']);
    if (data && data.reelsidian_backend_url) {
      const clean = data.reelsidian_backend_url.replace(/\/+$/, '');
      return `${clean}/api/process`;
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_BACKEND_URL;
}

let mediaRecorder = null;
let currentStream = null;
let audioContext = null;
let recordedChunks = [];
let activeMetadata = null;
let autoStopTimeout = null;

function finish(resultData) {
  if (typeof resultData === 'string') {
    resultData = { result: resultData, message: resultData };
  }
  chrome.runtime.sendMessage({ 
    type: 'RECORDING_COMPLETE', 
    result: resultData.result,
    message: resultData.message,
    title: resultData.title,
    creator: activeMetadata?.creator || 'Reel Creator'
  });
}

async function sendToBackend(blob) {
  if (blob.size < 300) {
    console.warn('Recording is too small (<300 bytes), skipping upload.');
    return { result: 'rejected', message: 'Audio recording was too short or empty.' };
  }

  const formData = new FormData();
  formData.append('url', activeMetadata?.url || '');
  formData.append('caption', activeMetadata?.caption || '');
  formData.append('creator', activeMetadata?.creator || '');
  formData.append('audio', blob, 'reel_audio.webm');

  const backendUrl = await getBackendUrl();

  try {
    const res = await fetch(backendUrl, { method: 'POST', body: formData });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log('Sent to Reelsidian Engine:', body);
      return { 
        result: 'sent', 
        message: 'Audio sent to Reelsidian website!', 
        title: body?.result?.analysis?.title || 'Processed Reel' 
      };
    }
    console.warn('Backend rejected recording:', res.status, body.error);
    return { result: 'rejected', message: body.error || 'Server rejected recording.' };
  } catch (err) {
    console.warn('Backend unreachable:', err.message);
    return { result: 'offline', message: 'Reelsidian server offline (http://localhost:5000).' };
  }
}

function cleanup() {
  clearTimeout(autoStopTimeout);
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }
  if (audioContext) {
    try {
      audioContext.close();
    } catch (e) { /* ignore */ }
    audioContext = null;
  }
}

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'START_CAPTURE') {
    try {
      recordedChunks = [];
      activeMetadata = message.metadata || {};

      currentStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: message.streamId
          }
        },
        video: false
      });

      // Pass-through audio context so user can still hear the video
      audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(currentStream);
      source.connect(audioContext.destination);

      mediaRecorder = new MediaRecorder(currentStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        cleanup();
        const result = await sendToBackend(blob);
        finish(result);
      };

      // Slice chunks every 500ms
      mediaRecorder.start(500);

      // Auto-stop after reel finishes (or max 90s)
      const remaining = activeMetadata.duration > 0
        ? Math.max(activeMetadata.duration - (activeMetadata.currentTime || 0), 3)
        : 60;
      const maxSeconds = Math.min(Math.ceil(remaining) + 1, 90);
      console.log(`🔴 Recording tab audio for up to ${maxSeconds}s...`);

      autoStopTimeout = setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, maxSeconds * 1000);
    } catch (err) {
      console.error('Offscreen capture error:', err);
      cleanup();
      finish('error');
    }
  }

  if (message.type === 'STOP_CAPTURE') {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  }
});
