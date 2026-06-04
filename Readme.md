# Focus & Learn - Pomodoro Brain Booster

A minimalist Chrome Extension built with **Manifest V3** that combines the **Pomodoro Technique** with AI-powered micro-lessons. During every break, instead of mindlessly scrolling, you get a bite-sized learning moment.

---

## Features

- **2-Phase Pomodoro Cycle:** Focus → Break → repeat. Configurable durations (work: 1–180 min, break: 1–60 min).
- **AI Micro-Lessons:** Uses **Gemini 3.1 Flash Lite** via Google AI Studio. Batches 5 lessons per API call and queues them—refetches automatically when the queue is low or topic changes. Also supports OpenRouter as an alternative provider.
- **Custom Synthesized Audio:** Web Audio API generates unique chimes (no audio files to bundle). An ascending bell signals break time; sharp triple-beep signals focus time. Played through an offscreen document to comply with Chrome autoplay policies.
- **Personalized Topics:** Choose from presets (Engineering, Product, Data/ML, Psychology, History, Finance, Science) or type a custom focus topic.
- **Saved Lessons Library:** Save lessons with one click, search by title/concept, filter by tag, and delete individual entries. All persisted in `chrome.storage.local`.
- **Analytics Dashboard:** Tracks total focus time, completed sessions, breaks taken, lessons consumed, app opens, current streak, and longest streak.
- **Dark, Modern UI:** Fixed 360x600px popup with SVG circular timer, animated phase badge, and responsive break-mode layout that highlights the lesson card.

---

## Architecture & Tech Stack

- **Manifest V3** Chrome Extension
- **Service Worker (`background.js`):** Handles alarms, storage state management, Gemini API calls, notifications, and audio orchestration.
- **Offscreen Document (`offscreen.html` + `offscreen.js`):** Safely processes Web Audio synthesis without impacting browser performance.
- **Frontend UI:** Vanilla JavaScript, HTML5, and CSS custom properties featuring a circular SVG timer and dark theme (`--bg: #0e0e0f`, accent `#c8f53d`).

---

## Permissions

| Permission | Purpose |
|---|---|
| `alarms` | Pomodoro timer countdown |
| `notifications` | Break/focus transition alerts |
| `storage` | Persistent state, settings, analytics, saved lessons |
| `offscreen` | Audio playback via offscreen document API |
| `https://generativelanguage.googleapis.com/*` | Gemini API requests |

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 2. Load the Extension into Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** (top-left)
4. Select the `pomodoro-extension` folder

### 3. Connect the Gemini API

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/)
2. Click the ⚙️ icon in the extension popup
3. Paste your key into the **Gemini API Key** field and save

---

## File Structure

```
pomodoro-extension/
├── manifest.json        # Extension config, permissions, service worker
├── popup.html           # Main UI (timer, settings, library, analytics)
├── popup.js             # Popup interactions, DOM rendering, storage sync
├── background.js        # Service worker: alarms, API calls, audio orchestration
├── offscreen.html       # Invisible DOM hook for audio execution
├── offscreen.js         # Web Audio API synthesized chimes
├── icons/               # 16x16, 48x48, 128x128 icons
└── screenshots/         # Chrome Web Store listing screenshots
```
