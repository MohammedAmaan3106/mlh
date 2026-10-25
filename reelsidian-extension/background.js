// Background Service Worker for Reelsidian Audio Grabber
let state = {
  isRecording: false,
  status: 'idle', // 'idle' | 'recording' | 'processing' | 'completed' | 'error'
  startTime: null,
  targetTabId: null,
  activeMetadata: null,
  lastResult: null // { result: 'sent'|'offline'|'rejected'|'error', message: string, title: string, creator: string, timestamp: number }
};

function setBadge(text, color, clearAfterMs) {
  chrome.action.setBadgeText({ text });
  if (color) chrome.action.setBadgeBackgroundColor({ color });
  if (clearAfterMs) {
    setTimeout(() => {
      // Only clear if not actively recording
      if (!state.isRecording) {
        chrome.action.setBadgeText({ text: '' });
      }
    }, clearAfterMs);
  }
}

const RESULT_BADGES = {
  sent: ['DONE', '#10B981'],
  duplicate: ['DUP', '#F59E0B'],
  offline: ['OFF', '#F97316'],
  rejected: ['ERR', '#000000'],
  error: ['ERR', '#000000']
};

async function ensureOffscreenDocument() {
  const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (existing.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Record live tab audio stream for study synthesis'
    });
  }
}

async function startCapture(targetTab) {
  if (state.isRecording) return { ok: false, error: 'Already recording' };

  try {
    // 1. Ask the content script for real reel metadata
    let metadata = { url: targetTab.url || '', caption: '', creator: '', duration: 0, currentTime: 0 };
    try {
      const response = await chrome.tabs.sendMessage(targetTab.id, { type: 'GET_REEL_METADATA' });
      if (response) metadata = response;
    } catch (e) {
      console.warn('Content script not reachable on current tab:', e.message);
    }

    // 2. Ensure offscreen recorder exists
    await ensureOffscreenDocument();

    // 3. Acquire tab audio stream ID
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: targetTab.id });

    // 4. Update internal state
    state.isRecording = true;
    state.status = 'recording';
    state.startTime = Date.now();
    state.targetTabId = targetTab.id;
    state.activeMetadata = metadata;

    setBadge('REC', '#EF4444');

    // 5. Send capture instruction to offscreen document
    chrome.runtime.sendMessage({ type: 'START_CAPTURE', streamId, metadata });

    return { ok: true, state };
  } catch (err) {
    console.error('Failed to start capture:', err);
    state.isRecording = false;
    state.status = 'error';
    state.lastResult = { result: 'error', message: err.message || 'Capture initialization failed' };
    setBadge('ERR', '#000000', 3000);
    return { ok: false, error: err.message };
  }
}

async function stopCapture() {
  if (!state.isRecording && state.status !== 'recording') {
    return { ok: false, error: 'Not currently recording' };
  }

  state.status = 'processing';
  setBadge('...', '#6366F1');

  try {
    chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' });
    return { ok: true, state };
  } catch (err) {
    console.error('Failed to stop capture:', err);
    state.isRecording = false;
    state.status = 'error';
    return { ok: false, error: err.message };
  }
}

// Runtime messaging listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    sendResponse({
      ...state,
      elapsedMs: state.startTime && state.isRecording ? Date.now() - state.startTime : 0
    });
    return true;
  }

  if (message.type === 'POPUP_START_CAPTURE') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs && tabs[0];
      if (!activeTab) {
        sendResponse({ ok: false, error: 'No active tab found' });
        return;
      }
      const res = await startCapture(activeTab);
      sendResponse(res);
    });
    return true; // async sendResponse
  }

  if (message.type === 'POPUP_STOP_CAPTURE') {
    stopCapture().then((res) => sendResponse(res));
    return true; // async sendResponse
  }

  if (message.type === 'RECORDING_COMPLETE') {
    state.isRecording = false;
    state.status = 'completed';
    state.lastResult = {
      result: message.result || 'sent',
      message: message.message || 'Audio sent to Reelsidian website!',
      title: message.title || '',
      creator: message.creator || '',
      timestamp: Date.now()
    };

    const [text, color] = RESULT_BADGES[message.result] || RESULT_BADGES.error;
    setBadge(text, color, 5000);

    // Forward to any active popup listeners
    chrome.runtime.sendMessage({
      type: 'STATE_UPDATED',
      state: { ...state, elapsedMs: 0 }
    }).catch(() => { /* Popup may be closed */ });
  }

  if (message.type === 'OPEN_DASHBOARD') {
    const targetUrl = 'http://localhost:5000/';
    chrome.tabs.query({}, (tabs) => {
      const existing = tabs.find((t) => t.url && t.url.startsWith('http://localhost:5000'));
      if (existing && existing.id) {
        chrome.tabs.update(existing.id, { active: true });
        if (existing.windowId) chrome.windows.update(existing.windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: targetUrl });
      }
    });
    sendResponse({ ok: true });
    return true;
  }
});
