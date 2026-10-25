# Reelsidian: The Obsidian for Instagram Reels & YouTube Shorts

> **Autonomous Video Intelligence, Academic Study Synthesis & Semantic Knowledge Graph**  
> *Turn passive doom-scrolling into an interconnected, actionable second brain.*

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Google Gemma 4](https://img.shields.io/badge/AI%20Model-Google%20Gemma%204-orange.svg)](https://ai.google.dev/)
[![ElevenLabs](https://img.shields.io/badge/STT-ElevenLabs%20Scribe%20v2-purple.svg)](https://elevenlabs.io/)
[![Knowledge Graph](https://img.shields.io/badge/Visualization-Force--Graph%20%2B%20D3.js-red.svg)](https://github.com/vasturiano/force-graph)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## The Problem: The "Collector's Fallacy" of Social Media

Students, engineers, and lifelong learners consume hundreds of educational micro-videos every week on Instagram Reels and YouTube Shorts covering algorithms, system design, life hacks, mathematics, and productivity.

However, saving them creates a **digital graveyard**:
1. **The Bookmark Cemetery**: You save 500 reels into Instagram folders (*"Coding"*, *"Math"*, *"Productivity"*), but you almost never open them again.
2. **The Black Box Dilemma**: Video is an unsearchable format. When you need that specific 10-second explanation 3 weeks later, you cannot search inside the video audio. You are forced to re-watch dozens of flashy 60-second clips with loud background music.
3. **No Synthesis or Goal Connection**: Videos exist in total isolation. They do not connect to your actual current projects, homework, or exam goals.

---

## The Solution: Reelsidian

**Reelsidian** bridges the gap between passive short-form video consumption and permanent personal knowledge management. It captures clean audio directly from the video tab, transcribes spoken words verbatim, synthesizes a structured academic study report, and plots every concept onto an interactive, **Obsidian-style Force-Directed Knowledge Graph** that automatically links to your personal academic goals.

```
┌──────────────────────────────────────────────────────────────┐
│                    INSTAGRAM / YOUTUBE                       │
│              Educational Short-Form Video Feed               │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│            REELSIDIAN CHROME EXTENSION (MV3)                 │
│  - Obsidian Glass Dialog Popup                               │
│  - Dedicated Start Capture & Stop Capture Controls           │
│  - Real-time 7-Bar Audio Wave Equalizer Loader               │
│  - Ephemeral WebRTC tabCapture & Offscreen Opus Streamer     │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTP POST multipart/form-data
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                REELSIDIAN NODE.JS SERVER                     │
│  - Speech Transcription: ElevenLabs Scribe v2                │
│  - Academic Study Synthesis: Google Gemma 4                  │
│  - Canonical De-Duplication Engine (SHA-256 Fingerprinting)  │
│  - AI Semantic Link Bridge (Gemini Evaluation Engine)        │
└──────────────────────────────┬───────────────────────────────┘
                               │ WebSocket Real-Time Stream
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                  REELSIDIAN DASHBOARD                        │
│  - Fluted Glass Three.js WebGL Shader Background             │
│  - Structured Study Cards (Problem, Solution, Action Items)  │
│  - Interactive Bipartite Obsidian Knowledge Graph            │
│  - Multi-Lingual Text-to-Speech Review (EN / HI / BN)        │
│  - One-Click Anki Flashcard & Markdown Export                │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Modern Chrome Extension Popup (Manifest V3)
- **Glassmorphic Popup Dialog**: Opens directly from the browser toolbar with an obsidian dark theme and burnt copper highlights.
- **Dedicated Controls**: Distinct **Start Capture** (burnt copper gradient) and **Stop Capture** (pulsing glass red border) buttons.
- **Audio-Themed Animated Wave Equalizer**: A dynamic 7-bar audio frequency wave equalizer pulses during active recording alongside a live elapsed timer (`00:00`).
- **Context-Aware Tab Detection**: Automatically detects whether you are viewing an **Instagram Reel**, a **YouTube Short**, or a generic browser video.
- **State Persistence**: The background service worker preserves active recording timers and equalizer state even if you close and reopen the popup.
- **Instant Dispatch Confirmation**: Displays a completion banner when the audio is successfully transmitted to the server with an **Open Dashboard** shortcut button.

### 2. High-Yield Academic Study Synthesis
- **Verbatim Speech Transcription**: Powered by **ElevenLabs Scribe v2** to accurately transcribe technical terminology, mixed accents, and fast speech over background music.
- **Structured Knowledge Extraction**: Powered by **Google Gemma 4** (via Google AI Studio / OpenRouter):
  - **Core Problem Breakdown**: Identifies the fundamental question or challenge.
  - **Detailed Solution & Mechanics**: Explains the technical and theoretical foundation without hand-waving.
  - **Core Key Points**: Scannable, bulleted principles.
  - **Action Items**: Immediate, practical steps the student can take.
  - **Self-Check Flashcards**: Active recall questions to test concept retention.
- **Export Ready**: Export flashcards directly to **Anki** (TSV) or copy markdown directly into **Obsidian** or **Notion**.

### 3. Obsidian-Style Goal Knowledge Graph
- **Force-Directed Bipartite Graph**: Visualizes the relationship between what you watch and what you want to achieve.
  - **Study Reports** anchor to the left ($x = -260$).
  - **Academic Goals** anchor to the right ($x = +260$).
  - Repulsive force simulation keeps cards spaced with zero overlap.
- **Frosted Glass Cards on Canvas**: Rendered directly in HTML5 Canvas with transparent obsidian backgrounds, rounded pill borders, and multi-line automatic text wrapping.
- **AI Semantic Bridges**: When a new goal or report is added, Google Gemini evaluates the semantic connection, generating a relevance score ($0.0 - 1.0$) and a human-readable explanation of *why* the video helps achieve the goal.
- **Traveling Particle Links**: Dynamic illuminated particles travel along links in the graph, showing active knowledge pathways.

### 4. Zero-Spam De-Duplication Engine
- If you watch 5 different creators explaining the same topic (e.g. *"CSS Grid vs Flexbox"* or *"JavaScript Closures"*), Reelsidian normalizes the transcript and computes a **SHA-256 canonical fingerprint**.
- Evaluates Jaccard token similarity ($\ge 80\%$). Duplicate uploads are seamlessly rejected or linked to existing nodes, preventing graph clutter.

### 5. Fluted Glass WebGL Background
- Hardware-accelerated **Three.js** custom fragment shader.
- Features vertical optical ribs, organic fluid caustics, and subtle copper/obsidian wave diffraction running at a smooth 60 FPS.

---

## Repository Structure

```
MLH-HACKATHON/
├── .env.example               # Single configuration template
├── .gitignore                 # Security-first Git exclusions (.env, node_modules)
├── package.json               # Project dependencies and runner scripts
├── package-lock.json          # Exact dependency lockfile
├── server.js                  # Production server entry point & security headers
├── vercel.json                # Vercel deployment configuration
├── README.md                  # Comprehensive project documentation
├── public/                    # Web Dashboard Frontend
│   ├── index.html             # Main dashboard HTML (Deck & Graph views)
│   ├── css/style.css          # Segregated Obsidian styling & theme tokens
│   └── js/
│       ├── app.js             # Knowledge Deck & Graph (with safeUrl XSS protection)
│       └── shader.js          # Three.js WebGL fluted glass background shader
├── src/                       # Backend Architecture & Services
│   ├── config/
│   │   └── constants.js       # Secure API configuration loader
│   ├── middleware/
│   │   └── security.js        # Rate limiting, security headers, & input sanitizers
│   ├── routes/
│   │   └── apiRoutes.js       # Hardened API endpoints with MIME & size validation
│   ├── services/
│   │   ├── analysisService.js      # Google Gemma 4 educational extraction
│   │   ├── graphService.js         # Force-graph engine & AI semantic link evaluator
│   │   ├── sseService.js           # Real-time SSE hub with dead-socket cleanup
│   │   └── transcriptionService.js # ElevenLabs Scribe v2 speech-to-text
│   └── utils/
│       └── jsonParser.js           # Resilient JSON repair utility
└── reelsidian-extension/      # Chrome Extension (Manifest V3)
    ├── manifest.json          # Extension configuration & permissions
    ├── popup.html             # Obsidian glass popup dialog UI
    ├── popup.css              # Styled equalizer animations & theme tokens
    ├── popup.js               # State coordinator, live timer, and event listener
    ├── background.js          # Service worker managing tabs, streams, and badges
    ├── content.js             # Intelligent video metadata extractor (IG & YouTube)
    ├── offscreen.html         # Offscreen document container
    └── offscreen.js           # MediaRecorder Opus streamer & API dispatcher
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Google Chrome**: Latest version (Manifest V3 support)
- **API Keys**:
  - [Google AI Studio](https://aistudio.google.com/) — Gemini / Gemma API Key
  - [ElevenLabs](https://elevenlabs.io/) — Speech-to-Text API Key
  - [OpenRouter](https://openrouter.ai/) — *(Optional fallback)*

---

### Step 1: Clone & Configure Server

1. **Clone the repository**:
   ```bash
   git clone https://github.com/anshuvdebnath-cyber/MLH-HACKATHON.git
   cd MLH-HACKATHON
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` in the root folder:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and paste your API keys:
   ```env
   PORT=5000

   # 1. ElevenLabs Speech-to-Text (Scribe v2)
   ELEVENLABS_API_KEY=your_elevenlabs_key_here

   # 2. Google AI Studio API Key (Gemma 4 SDK)
   GEMINI_API_KEY=your_gemini_api_key_here

   # 3. OpenRouter API Key (Optional Fallback)
   OPENROUTER_API_KEY=your_openrouter_key_here
   OPENROUTER_MODEL=google/gemma-4-31b-it
   ```

3. **Install Dependencies & Start Server**:
   ```bash
   npm install
   npm start
   ```
   Your terminal will confirm:
   ```
   ======================================================
   🚀 Reelsidian Real-Time Engine active at http://localhost:5000
   ✨ Ephemeral RAM pipeline: Zero disk storage, maximum privacy.
   📡 SSE Stream: http://localhost:5000/api/events
   ======================================================
   ```

---

### Step 2: Install Chrome Extension

1. Open Google Chrome and enter `chrome://extensions/` in the URL bar.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `reelsidian-extension/` folder from this project directory.
5. Pin **Reelsidian Audio Grabber** to your Chrome toolbar.

---

## Step-by-Step Usage Guide

### 1. Capturing an Instagram Reel or YouTube Short
1. Open any educational video on [Instagram Reels](https://www.instagram.com/reels/) or [YouTube Shorts](https://www.youtube.com/shorts/).
2. Click the **Reelsidian icon** in your Chrome toolbar.
3. The popup will automatically detect your tab (e.g. *"Instagram Reel"*).
4. Click **Start Capture**:
   - The **animated 7-bar audio wave equalizer** will begin dancing in burnt copper and amber.
   - The live timer will track the clip duration.
5. Click **Stop Capture** (or let the reel finish):
   - The audio is transmitted to the local engine.
   - The popup displays: *"Audio Sent to Website!"*.
   - Click **Open Dashboard** to jump directly to your synthesized study card.

### 2. Exploring the Dashboard
- **Knowledge Deck View**:
  - Listen to the captured clean audio.
  - Review the verbatim ElevenLabs transcript.
  - Read the structured problem breakdown, core solution, action items, and flashcards.
  - Export cards to Anki or copy formatted Markdown.
- **Knowledge Graph View**:
  - Click **Knowledge Graph** in the top navigation.
  - Input an academic goal (e.g., *"Master JavaScript Scopes and Closures"*).
  - Watch the graph position your goal on the right and your study cards on the left.
  - Observe the traveling particle links indicating semantic relevance computed by Gemini.

---

## API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/process` | Multipart upload (`audio` buffer, `url`, `caption`, `creator`). Transcribes with ElevenLabs and analyzes with Gemma 4. |
| `POST` | `/api/analyze-text` | JSON body (`text`, `caption`, `url`). Directly analyzes textual transcripts. |
| `GET` | `/api/graph` | Retrieves current graph state (`nodes`, `links`, `goals`). |
| `POST` | `/api/goals` | Adds an academic goal and triggers Gemini semantic link evaluations. |
| `DELETE` | `/api/goals/:id` | Removes an academic goal and cleans up associated graph links. |
| `GET` | `/api/events` | Server-Sent Events (SSE) stream for real-time live updates. |

---

## Privacy & Security Architecture

1. **Zero Secret Leakage**:
   - API keys are strictly parsed from `process.env` and local `.env` files. Zero credentials are hardcoded or embedded in client/server code.
   - Comprehensive `.gitignore` safeguards `.env`, temporary logs, and node dependencies from public Git tracking.
2. **Sliding-Window Rate Limiting (DoS & Quota Protection)**:
   - Built-in in-memory rate limiter safeguards heavy AI generation endpoints (`/api/process`, `/api/analyze-text`) with a strict ceiling of **12 requests/minute per IP**.
   - Standard API endpoints are limited to **60 requests/minute per IP**, returning standard `HTTP 429` and `Retry-After` headers upon breach.
3. **MIME Type Allowlist & Memory Isolation**:
   - File uploads are validated via Multer's `fileFilter` against a strict whitelist of audio and video mimetypes (`audio/webm`, `audio/mp3`, `audio/wav`, `video/mp4`, etc.).
   - Uploaded media is processed ephemerally in RAM buffers (`multer.memoryStorage()`) and freed by the garbage collector immediately after transcription. Zero raw user audio or video recordings are saved to persistent disk.
4. **Input Sanitization & XSS Neutralization**:
   - All string inputs (`creator`, `caption`, `url`, `goalText`) are bounded and sanitized against payload ballooning.
   - External resource links rendered in the UI are filtered through `safeUrl()` protocol verification to neutralize `javascript:` or `data:` pseudo-protocol reflected/stored XSS exploits.
5. **HTTP Security Headers & CORS Controls**:
   - Production headers enforced: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin`.
   - Explicit CORS policy permits only validated local development origins, Chrome Extension origins (`chrome-extension://`), and authorized production domains.
6. **Tab Audio Capture Isolation**:
   - The extension captures only the audio stream of the active media tab via `chrome.tabCapture` with explicit user button clicks. No webcam, screen video, or browser history permissions are requested.

---

## Technology Stack

- **Extension**: Chrome Extension Manifest V3, Web Audio API, WebRTC `tabCapture`, `chrome.offscreen`.
- **Backend**: Node.js, Express, Multer, Server-Sent Events.
- **AI & Speech Models**: ElevenLabs Scribe v2, Google Gemma 4 (Google AI Studio / OpenRouter).
- **Frontend & Visuals**: Vanilla JavaScript (ES6+), Three.js (WebGL Fluted Glass Shader), Force-Graph, D3.js.
- **Typography & Theme**: Outfit, JetBrains Mono, Obsidian Glass, Burnt Copper (`#ea580c`), Warm Amber (`#fed7aa`).

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details. Built for the MLH Hackathon.
