// Reelsidian Content Script: Intelligent short-form video metadata extractor
// Supports Instagram Reels, YouTube Shorts, and generic HTML5 video pages.

const NON_PROFILE_PATHS = new Set([
  'reels', 'reel', 'explore', 'direct', 'accounts', 'stories', 'p', 'tv', 'about', 'legal', 'audio', 'tags', 'locations', 'watch'
]);

function findPlayingVideo() {
  const videos = Array.from(document.querySelectorAll('video'));
  const inView = videos.filter((v) => {
    const r = v.getBoundingClientRect();
    return r.height > 100 && r.bottom > 0 && r.top < window.innerHeight;
  });
  return inView.find((v) => !v.paused) || inView[0] || videos[0] || null;
}

function usernameFromHref(href) {
  try {
    const parts = new URL(href, location.origin).pathname.split('/').filter(Boolean);
    if (parts.length === 1 && /^[A-Za-z0-9._]{2,30}$/.test(parts[0]) && !NON_PROFILE_PATHS.has(parts[0])) {
      return parts[0];
    }
  } catch (e) { /* ignore */ }
  return '';
}

function findReelContainer(video) {
  if (!video) return document.body;
  let node = video;
  for (let i = 0; i < 15 && node && node !== document.body; i++) {
    node = node.parentElement;
    if (!node) break;
    const hasProfileLink = Array.from(node.querySelectorAll('a[href]')).some((a) => usernameFromHref(a.getAttribute('href')));
    if (hasProfileLink) return node;
  }
  return document.querySelector('article') || document.querySelector('main') || document.body;
}

function extractExactUrl(container) {
  // If already on a dedicated reel page
  if (location.pathname.includes('/reel/') || location.pathname.includes('/p/') || location.pathname.includes('/shorts/')) {
    return location.href.split('?')[0];
  }

  // If in infinite scroll feed (/reels/), find the specific permalink in this reel's container
  const permalinkAnchor = container.querySelector('a[href*="/reel/"], a[href*="/p/"]');
  if (permalinkAnchor) {
    const href = permalinkAnchor.getAttribute('href');
    try {
      return new URL(href, location.origin).href.split('?')[0];
    } catch (e) { /* ignore */ }
  }

  return location.href.split('?')[0];
}

function extractCreator(container) {
  // 1. YouTube Shorts check
  if (location.hostname.includes('youtube.com')) {
    const ytChannel = document.querySelector('#channel-name a, ytd-channel-name a, #text.ytd-channel-name');
    if (ytChannel) return ytChannel.innerText.trim().replace(/^@/, '');
  }

  // 2. Instagram: Search within the container
  for (const a of container.querySelectorAll('a[href]')) {
    const name = usernameFromHref(a.getAttribute('href'));
    if (name) return name;
  }

  // 3. Fallback to path /username/reel/ID/
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length >= 2 && (parts[1] === 'reel' || parts[1] === 'p')) return parts[0];
  return 'creator';
}

function extractCaption(container, creator) {
  // 1. YouTube Shorts title
  if (location.hostname.includes('youtube.com')) {
    const titleEl = document.querySelector('h2.title, #title.ytd-reel-player-header-renderer');
    if (titleEl) return titleEl.innerText.trim();
  }

  // 2. Instagram single page h1
  const h1 = container.querySelector('h1') || document.querySelector('article h1');
  if (h1 && h1.innerText.trim().length > 3) return h1.innerText.trim();

  // 3. Instagram feed caption: Auto-expand "...more" if present
  const moreBtn = container.querySelector('span[role="button"]:not([aria-expanded="true"]), button[tabindex="0"]');
  if (moreBtn && /more/i.test(moreBtn.innerText || '')) {
    try { moreBtn.click(); } catch (e) { /* non-fatal */ }
  }

  // Find longest informative description block
  let best = '';
  container.querySelectorAll('span, div[dir="auto"], article').forEach((el) => {
    if (el.children.length > 5) return;
    const text = (el.innerText || '').trim();
    if (text.length > best.length && text.length > 15 && text !== creator && !/^(follow|more|audio|original audio|view comments)$/i.test(text)) {
      best = text;
    }
  });

  return best.slice(0, 3000);
}

function getActiveReelData() {
  const video = findPlayingVideo();
  const container = findReelContainer(video);
  const creator = extractCreator(container);
  const caption = extractCaption(container, creator);
  const url = extractExactUrl(container);

  return {
    url,
    caption,
    creator,
    duration: video && Number.isFinite(video.duration) ? video.duration : 0,
    currentTime: video ? video.currentTime : 0
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_REEL_METADATA') {
    sendResponse(getActiveReelData());
  }
  return true;
});
