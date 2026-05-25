// const WORK_DURATION_MINS = 25;
// const BREAK_DURATION_MINS = 5;

const WORK_DURATION_MINS = 1;
const BREAK_DURATION_MINS = 1;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    isRunning: false,
    phase: 'work',
    sessionCount: 0,
    topic: '',
    apiKey: '',
    startTime: null,
    breakLesson: null
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'pomodoroTick') {
    const data = await chrome.storage.local.get(null);
    if (!data.isRunning) return;

    if (data.phase === 'work') {
      const lesson = await fetchLesson(data.topic, data.apiKey);
      
      // Play chime for entering Break phase
      await playSound('break');
      
      await chrome.storage.local.set({
        phase: 'break',
        startTime: Date.now(),
        breakLesson: lesson,
        sessionCount: (data.sessionCount || 0) + 1
      });
      chrome.alarms.create('pomodoroTick', { delayInMinutes: BREAK_DURATION_MINS });
      
      chrome.notifications.create('breakTime', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🧠 Break time! You earned it.',
        message: lesson ? `Quick lesson: ${lesson.title}` : 'Time to rest your eyes and stretch!',
        priority: 2,
        requireInteraction: true
      });
    } else {
      
      // Play chime for entering Work phase (Break is over!)
      await playSound('work');
      
      await chrome.storage.local.set({
        phase: 'work',
        startTime: Date.now(),
        breakLesson: null
      });
      chrome.alarms.create('pomodoroTick', { delayInMinutes: WORK_DURATION_MINS });
      
      chrome.notifications.create('workTime', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '⏱️ Back to focus!',
        message: `Break over. ${WORK_DURATION_MINS} minutes of deep work starts now.`,
        priority: 1
      });
    }
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);
});

// hardcoded for development testing
const AI_PROVIDER = "gemini";
USE_MOCK_LESSONS = false

async function fetchLesson(topic, apiKey) {
  
  if (USE_MOCK_LESSONS) {
    return {
      title: "Caching",
      concept: "Caching stores repeated results.",
      detail: "It reduces expensive recomputation.",
      emoji: "⚡",
      tag: "System Design"
    };
  }

  if (AI_PROVIDER === "gemini") {
    return await fetchGeminiLesson(topic, apiKey);
  }
  
  if (AI_PROVIDER === "openrouter") {
    return await fetchOpenRouterLesson(topic, apiKey);
  }

}

// openrouter
async function fetchOpenRouterLesson(topic, apiKey) {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemma-3-4b-it",
          messages: [
            {
              role: "user",
              content: `
Generate a concise microlearning lesson.

Topic: ${topic || "interesting fact"}

Return ONLY valid JSON:
{
  "title": "",
  "concept": "",
  "detail": "",
  "emoji": "",
  "tag": ""
}
`
            }
          ]
        })
      }
    );

    const data = await response.json();

    const text =
      data.choices?.[0]?.message?.content;

    return JSON.parse(text);

  } catch (e) {
    console.error(e);
    return null;
  }
}
const RANDOM_TOPICS = [
  "psychology",
  "history",
  "technology",
  "space",
  "biology",
  "career growth",
  "productivity",
  "system design",
  "AI",
  "philosophy"
];
const randomTopic =
  RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];

// gemini testing
async function fetchGeminiLesson(topic, apiKey) {
  if (!apiKey) return null;

  try {
    const url =
      // `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      // `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `
Generate ONE unique microlearning lesson.

Topic: ${topic || randomTopic}

Requirements:
- surprising or memorable
- avoid common trivia
- avoid repeating previous ideas
- concise
- engaging


Return valid JSON with:
title, concept, detail, emoji, tag
`
          }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 1.2,
          topP: 0.95
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API Error:', data.error.message);
      return null;
    }

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('Empty Gemini response:', data);
      return null;
    }

    return JSON.parse(text);

  } catch (e) {
    console.error('Gemini Lesson fetch failed:', e);
    return null;
  }
}
// Fixed the closing brace closure right here
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_TIMER') {
    chrome.alarms.create('pomodoroTick', { delayInMinutes: WORK_DURATION_MINS });
    chrome.storage.local.set({
      isRunning: true,
      phase: 'work',
      startTime: Date.now(),
      breakLesson: null
    });
    sendResponse({ ok: true });
  } else if (msg.type === 'STOP_TIMER') {
    chrome.alarms.clear('pomodoroTick');
    chrome.storage.local.set({
      isRunning: false,
      phase: 'work',
      startTime: null,
      breakLesson: null
    });
    sendResponse({ ok: true });
  } else if (msg.type === 'SKIP_PHASE') {
    chrome.alarms.clear('pomodoroTick');
    chrome.storage.local.get(null, async (data) => {
      if (data.phase === 'work') {
        const lesson = await fetchLesson(data.topic, data.apiKey);
        await playSound('break');
        await chrome.storage.local.set({
          phase: 'break',
          startTime: Date.now(),
          breakLesson: lesson,
          sessionCount: (data.sessionCount || 0) + 1
        });
        chrome.alarms.create('pomodoroTick', { delayInMinutes: BREAK_DURATION_MINS });
      } else {
        await playSound('work');
        await chrome.storage.local.set({
          phase: 'work',
          startTime: Date.now(),
          breakLesson: null
        });
        chrome.alarms.create('pomodoroTick', { delayInMinutes: WORK_DURATION_MINS });
      }
      sendResponse({ ok: true });
    });
    return true; 
  }
}); // <-- Added the crucial closing statement back safely!

// Keep track of the offscreen document creation status globally
let isOffscreenCreated = false;

// Helper function to accept a phase string
async function playSound(phase) {
  try {
    if (!isOffscreenCreated) {
      try {
        await chrome.offscreen.createDocument({
          url: 'offscreen.html',
          reasons: ['AUDIO_PLAYBACK'],
          justification: 'Play notification chimes when Pomodoro phases swap.'
        });
        isOffscreenCreated = true;
      } catch (err) {
        if (err.message.includes('Only a single offscreen document may be created')) {
          isOffscreenCreated = true;
        } else {
          console.error('Failed to create offscreen document:', err);
          return;
        }
      }
    }
    
    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'PLAY_SOUND',
      phase: phase 
    }).catch(() => {});

  } catch (globalError) {
    console.error('Audio playback pipeline error:', globalError);
  }
}