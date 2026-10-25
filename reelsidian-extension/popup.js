// Reelsidian Extension Popup Script
// Coordinates capture start/stop, real-time equalizer loader, and status reporting

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const viewIdle = document.getElementById('viewIdle');
  const viewRecording = document.getElementById('viewRecording');
  const viewProcessing = document.getElementById('viewProcessing');
  const viewCompleted = document.getElementById('viewCompleted');

  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');
  const btnOpenDashboard = document.getElementById('btnOpenDashboard');

  const tabBadge = document.getElementById('tabBadge');
  const tabLabel = document.getElementById('tabLabel');
  const idleHelpText = document.getElementById('idleHelpText');
  const recordingTimer = document.getElementById('recordingTimer');
  const recordingCreator = document.getElementById('recordingCreator');
  const completedTitle = document.getElementById('completedTitle');
  const completedDesc = document.getElementById('completedDesc');
  const serverDot = document.getElementById('serverDot');
  const serverStatusText = document.getElementById('serverStatusText');

  let timerInterval = null;
  let recordingStartTimestamp = null;

  // View state switcher helper
  function switchView(viewName) {
    [viewIdle, viewRecording, viewProcessing, viewCompleted].forEach((el) => {
      if (el) el.classList.remove('active');
    });

    if (viewName === 'recording') {
      viewRecording.classList.add('active');
      btnStart.disabled = true;
      btnStop.disabled = false;
      btnStop.classList.add('pulsing');
    } else if (viewName === 'processing') {
      viewProcessing.classList.add('active');
      btnStart.disabled = true;
      btnStop.disabled = true;
      btnStop.classList.remove('pulsing');
    } else if (viewName === 'completed') {
      viewCompleted.classList.add('active');
      btnStart.disabled = false;
      btnStop.disabled = true;
      btnStop.classList.remove('pulsing');
    } else {
      viewIdle.classList.add('active');
      btnStart.disabled = false;
      btnStop.disabled = true;
      btnStop.classList.remove('pulsing');
    }
  }

  // Timer format (MM:SS)
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function startLiveTimer(initialElapsedMs = 0) {
    clearInterval(timerInterval);
    recordingStartTimestamp = Date.now() - initialElapsedMs;
    recordingTimer.textContent = formatTime(initialElapsedMs / 1000);

    timerInterval = setInterval(() => {
      const elapsedSeconds = Math.max(0, (Date.now() - recordingStartTimestamp) / 1000);
      recordingTimer.textContent = formatTime(elapsedSeconds);
    }, 1000);
  }

  function stopLiveTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // 1. Detect current active tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs[0];
    if (tab && tab.url) {
      const url = tab.url.toLowerCase();
      if (url.includes('instagram.com')) {
        tabBadge.classList.add('active');
        tabLabel.textContent = 'Instagram Reel';
        idleHelpText.textContent = 'Detected Instagram. Ready to record reel audio and synthesize study card.';
      } else if (url.includes('youtube.com')) {
        tabBadge.classList.add('active');
        tabLabel.textContent = 'YouTube Short';
        idleHelpText.textContent = 'Detected YouTube. Ready to record short audio and synthesize study card.';
      } else {
        tabLabel.textContent = 'Browser Tab';
        idleHelpText.textContent = 'Click Start Capture on any playing tab audio stream.';
      }
    }
  } catch (e) {
    tabLabel.textContent = 'Active Tab';
  }

  // 2. Ping Reelsidian backend status
  try {
    const pingRes = await fetch('http://localhost:5000/api/graph', { method: 'GET', signal: AbortSignal.timeout(2000) });
    if (pingRes.ok) {
      serverDot.classList.remove('offline');
      serverStatusText.textContent = 'Reelsidian Server (Online)';
    } else {
      serverDot.classList.add('offline');
      serverStatusText.textContent = 'Server (Port 5000)';
    }
  } catch (e) {
    serverDot.classList.add('offline');
    serverStatusText.textContent = 'Server (Offline)';
  }

  // 3. Sync state with background service worker
  try {
    const bgState = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (bgState) {
      if (bgState.isRecording) {
        switchView('recording');
        if (bgState.activeMetadata && bgState.activeMetadata.creator) {
          recordingCreator.textContent = `@${bgState.activeMetadata.creator}`;
        }
        startLiveTimer(bgState.elapsedMs || 0);
      } else if (bgState.status === 'processing') {
        switchView('processing');
      } else if (bgState.status === 'completed' && bgState.lastResult && (Date.now() - bgState.lastResult.timestamp < 90000)) {
        displayCompletedResult(bgState.lastResult);
      } else {
        switchView('idle');
      }
    }
  } catch (err) {
    console.warn('Could not query background state:', err);
    switchView('idle');
  }

  function displayCompletedResult(res) {
    switchView('completed');
    stopLiveTimer();

    if (res.result === 'sent') {
      completedTitle.textContent = 'Audio Sent to Website!';
      completedTitle.className = 'state-title text-success';
      completedDesc.textContent = res.message || 'The audio was dispatched to Reelsidian and is being transcribed & analyzed.';
    } else if (res.result === 'duplicate') {
      completedTitle.textContent = 'Duplicate Audio';
      completedTitle.className = 'state-title';
      completedDesc.textContent = 'This reel was already processed and verified in your knowledge graph.';
    } else if (res.result === 'offline') {
      completedTitle.textContent = 'Backend Offline';
      completedTitle.className = 'state-title';
      completedDesc.textContent = 'Unable to reach http://localhost:5000. Start the server and try again.';
    } else {
      completedTitle.textContent = 'Capture Finished';
      completedTitle.className = 'state-title';
      completedDesc.textContent = res.message || 'Audio recording ended.';
    }
  }

  // 4. Button Handlers
  btnStart.addEventListener('click', async () => {
    btnStart.disabled = true;
    switchView('recording');
    startLiveTimer(0);

    try {
      const response = await chrome.runtime.sendMessage({ type: 'POPUP_START_CAPTURE' });
      if (!response || !response.ok) {
        stopLiveTimer();
        switchView('idle');
        idleHelpText.textContent = response?.error || 'Could not start tab audio capture. Please try again.';
      } else if (response.state && response.state.activeMetadata?.creator) {
        recordingCreator.textContent = `@${response.state.activeMetadata.creator}`;
      }
    } catch (err) {
      stopLiveTimer();
      switchView('idle');
      idleHelpText.textContent = 'Failed to communicate with extension engine.';
    }
  });

  btnStop.addEventListener('click', async () => {
    stopLiveTimer();
    switchView('processing');

    try {
      await chrome.runtime.sendMessage({ type: 'POPUP_STOP_CAPTURE' });
    } catch (err) {
      console.error('Stop capture error:', err);
    }
  });

  btnOpenDashboard.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    window.close();
  });

  // 5. Live Runtime Message Listener
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'RECORDING_COMPLETE') {
      displayCompletedResult(message);
    } else if (message.type === 'STATE_UPDATED') {
      if (message.state.isRecording) {
        switchView('recording');
      } else if (message.state.status === 'processing') {
        switchView('processing');
      } else if (message.state.status === 'completed' && message.state.lastResult) {
        displayCompletedResult(message.state.lastResult);
      }
    }
  });
});
