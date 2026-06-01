# Focus & Learn - Pomodoro Brain Booster 🍅🧠

A minimalist, high-utility Chrome Extension built using **Manifest V3**. It combines the proven **Pomodoro Technique** with instant, AI-powered micro-lessons generated on the fly. Instead of mindlessly scrolling during your focus breaks, you get a bite-sized learning moment tailored to your interests.

Built with a dark, modern aesthetic utilizing custom synthesized audio feedback for seamless context switching.

---

## 🚀 Features

* **3-Phase Pomodoro Cycle:** Complete workflow with Focus (25 min) → Learning (2 min) → Break (5 min) phases, each with distinct visual and audio cues.
* **AI Micro-Lessons with Smart Queueing:** Leverages Google's **Gemini 3.1 Flash Lite** via AI Studio to deliver hyper-focused, concise concepts during your 2-minute learning sessions. Batches 5 lessons per API call and queues them for efficiency—only refetches when the queue is empty or topic changes.
* **Custom Synthesized Audio:** Bypasses browser autoplay restrictions using the Web Audio API to create unique sound signatures:
    * *Learning Time:* An enlightening ascending chime to signal your micro-lesson.
    * *Break Time:* A relaxing, double ambient bell chime.
    * *Focus Time:* A crisp, grounding triple-beep to get your head back in the game.
* **Personalized Learning Topics:** Choose from preset categories (Engineering, Data/ML, Psychology) or type your own custom focus topic.
* **Local Library & Storage:** Save your favorite lessons, tag them, search through your repository, and add your own reflections or notes.

---

## 🛠️ Architecture & Tech Stack

* **Manifest V3** Chrome Extension architecture.
* **Service Workers (`background.js`):** Handles alarms, storage state-management, notifications, and edge-case execution.
* **Offscreen Document API:** Safely processes background Web Audio context synthesis without impacting browser performance.
* **Frontend UI:** Vanilla JavaScript, HTML5, and CSS variables featuring a premium custom circular SVG timer interface.

---

## 📥 Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git) ```

cd YOUR_REPO_NAME

### 2. Load the Extension into Chrome
Open Google Chrome and navigate to chrome://extensions/.

Enable Developer mode using the toggle switch in the top-right corner.

Click the Load unpacked button in the top-left corner.

Select the pomodoro-extension folder containing the manifest.json file.

### 3. Connect the Gemini API
Head over to Google AI Studio and grab a free API key.

Click the ⚙️ icon in the extension popup.

Paste your key into the Gemini API Key field and save.

📂 File Structure

pomodoro-extension/
├── manifest.json       # Extension configurations, permissions, and service worker routing
├── popup.html          # Main UI view layout (Timer, Library, Settings)
├── popup.js            # Main screen interactions, DOM rendering, and storage sync listeners
├── background.js       # Core backend engine, Chrome alarm managers, and Gemini API requests
├── offscreen.html      # Invisible DOM hook for background audio execution
├── offscreen.js        # Web Audio API synth chime engines
└── icons/              # Extension logo assets