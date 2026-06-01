const DEFAULT_TIMER_SETTINGS = {
  workDuration: 25,
  breakDuration: 5
};
const LESSON_QUEUE_REFILL_THRESHOLD = 2;
let isQueueRefilling = false;

// Analytics schema:
// {
//   totalFocusMinutes: number,
//   completedWorkSessions, completedBreaks: number,
//   lessonsConsumed: number, appLaunchCount: number,
//   currentStreakDays, longestStreakDays: number,
//   lastStudyDate: string (YYYY-MM-DD)
// }
const DEFAULT_ANALYTICS = {
  totalFocusMinutes: 0,
  completedWorkSessions: 0, completedBreaks: 0,
  lessonsConsumed: 0, appLaunchCount: 0,
  currentStreakDays: 0, longestStreakDays: 0, lastStudyDate: ''
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['timerSettings', 'analytics', 'breakLesson'], (data) => {
    const migrated = {};
    if (data.breakLesson) {
      migrated.currentBreakLesson = data.breakLesson;
    }
    chrome.storage.local.set({
      isRunning: false,
      phase: 'work',
      sessionCount: 0,
      topic: '',
      apiKey: '',
      startTime: null,
      currentBreakLesson: null,
      lessonQueue: [],
      lastQueueTopic: '',
      timerSettings: data.timerSettings || { ...DEFAULT_TIMER_SETTINGS },
      analytics: data.analytics || { ...DEFAULT_ANALYTICS },
      ...migrated
    });
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'pomodoroTick') {
    const data = await chrome.storage.local.get(null);
    if (!data.isRunning) return;

    const settings = { ...DEFAULT_TIMER_SETTINGS, ...(data.timerSettings || {}) };

    if (data.phase === 'work') {
      const lesson = await fetchLesson(data.topic, data.apiKey);

      await playSound('break');
      await trackPhaseCompletion('work', settings.workDuration);

      await chrome.storage.local.set({
        phase: 'break',
        startTime: Date.now(),
        currentBreakLesson: lesson,
        sessionCount: (data.sessionCount || 0) + 1
      });
      chrome.alarms.create('pomodoroTick', { delayInMinutes: settings.breakDuration });

      chrome.notifications.create('breakTime', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '☕ Break time!',
        message: lesson ? `Micro-lesson: ${lesson.title}` : 'Time to rest your eyes and stretch!',
        priority: 1
      });
    } else {
      await playSound('work');
      await trackPhaseCompletion('break', settings.breakDuration);

      await chrome.storage.local.set({
        phase: 'work',
        startTime: Date.now(),
        currentBreakLesson: null
      });
      chrome.alarms.create('pomodoroTick', { delayInMinutes: settings.workDuration });

      chrome.notifications.create('workTime', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '⏱️ Back to focus!',
        message: `Let's start another ${settings.workDuration} minute focus session.`,
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

async function fetchBatch(topic, apiKey) {
  if (AI_PROVIDER === "gemini") {
    return await fetchGeminiLesson(topic, apiKey);
  } else if (AI_PROVIDER === "openrouter") {
    return await fetchOpenRouterLesson(topic, apiKey);
  }
  return null;
}

async function triggerQueueRefill(topic, apiKey) {
  if (isQueueRefilling) return;
  isQueueRefilling = true;

  try {
    console.log('Refilling lesson queue...');
    const batch = await fetchBatch(topic, apiKey);
    if (batch && Array.isArray(batch)) {
      const data = await chrome.storage.local.get(['lessonQueue']);
      const queue = data.lessonQueue || [];
      queue.push(...batch);
      await chrome.storage.local.set({ lessonQueue: queue });
      console.log(`Refill added ${batch.length} lessons, queue now ${queue.length}`);
    }
  } catch (e) {
    console.error('Queue refill failed:', e);
  } finally {
    isQueueRefilling = false;
  }
}

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

  const data = await chrome.storage.local.get(['lessonQueue', 'lastQueueTopic']);
  let { lessonQueue, lastQueueTopic } = data;
  lessonQueue = lessonQueue || [];
  lastQueueTopic = lastQueueTopic || '';

  if (lastQueueTopic !== topic) {
    lessonQueue = [];
    isQueueRefilling = false;
    console.log('Topic changed, clearing lesson queue');
  }

  if (lessonQueue.length === 0) {
    console.log('Queue empty, fetching new lessons...');
    const batch = await fetchBatch(topic, apiKey);
    if (batch && Array.isArray(batch)) {
      lessonQueue = batch;
      lastQueueTopic = topic;
      console.log(`Fetched ${batch.length} lessons`);
    }
  }

  const lesson = lessonQueue.shift();
  await chrome.storage.local.set({ lessonQueue, lastQueueTopic });
  console.log(`Lessons remaining in queue: ${lessonQueue.length}`);

  if (lessonQueue.length < LESSON_QUEUE_REFILL_THRESHOLD) {
    triggerQueueRefill(topic, apiKey);
  }

  return lesson || null;
}

async function trackPhaseCompletion(phase, phaseDuration) {
  const data = await chrome.storage.local.get(['analytics']);
  const a = data.analytics || { ...DEFAULT_ANALYTICS };

  if (phase === 'work') {
    a.completedWorkSessions = (a.completedWorkSessions || 0) + 1;
    a.totalFocusMinutes = (a.totalFocusMinutes || 0) + phaseDuration;
    const today = new Date().toISOString().split('T')[0];
    const lastDate = a.lastStudyDate || '';
    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      a.currentStreakDays = lastDate === yesterday ? (a.currentStreakDays || 0) + 1 : 1;
      a.longestStreakDays = Math.max(a.currentStreakDays, a.longestStreakDays || 0);
      a.lastStudyDate = today;
    }
  } else if (phase === 'break') {
    a.completedBreaks = (a.completedBreaks || 0) + 1;
    a.lessonsConsumed = (a.lessonsConsumed || 0) + 1;
  }

  await chrome.storage.local.set({ analytics: a });
}

// openrouter - fetches 5 lessons at once
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
Generate 5 unique, diverse microlearning lessons.

Topic: ${topic || "interesting fact"}

Requirements:
- Each lesson should be on a different subtopic
- surprising or memorable
- avoid common trivia
- avoid repeating ideas across the 5 lessons
- concise and engaging

Return ONLY valid JSON array with 5 lessons:
[
  {
    "title": "",
    "concept": "",
    "detail": "",
    "emoji": "",
    "tag": ""
  }
]
`
            }
          ]
        })
      }
    );

    const data = await response.json();

    const text =
      data.choices?.[0]?.message?.content;

    const lessons = JSON.parse(text);

    // Return array of 5 lessons or null if invalid
    return Array.isArray(lessons) && lessons.length > 0 ? lessons : null;

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

// gemini testing - fetches 5 lessons at once
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
Generate 5 unique, diverse microlearning lessons.

Topic: ${topic || randomTopic}

Requirements:
- Each lesson should be on a different subtopic
- surprising or memorable
- avoid common trivia
- avoid repeating ideas across the 5 lessons
- concise
- engaging
- diverse difficulty levels (beginner to advanced mix)

Return valid JSON array with 5 lessons:
[
  {
    "title": "",
    "concept": "",
    "detail": "",
    "emoji": "",
    "tag": ""
  }
]
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

    const lessons = JSON.parse(text);

    // Return array of 5 lessons or null if invalid
    return Array.isArray(lessons) && lessons.length > 0 ? lessons : null;

  } catch (e) {
    console.error('Gemini Lesson fetch failed:', e);
    return null;
  }
}
// Fixed the closing brace closure right here
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_TIMER') {
    chrome.storage.local.get(['timerSettings'], (data) => {
      const settings = { ...DEFAULT_TIMER_SETTINGS, ...(data.timerSettings || {}) };
      chrome.alarms.create('pomodoroTick', { delayInMinutes: settings.workDuration });
      chrome.storage.local.set({
        isRunning: true,
        phase: 'work',
        startTime: Date.now(),
        currentBreakLesson: null
      }, () => sendResponse({ ok: true }));
    });
    return true;
  } else if (msg.type === 'STOP_TIMER') {
    chrome.alarms.clear('pomodoroTick');
    chrome.storage.local.set({
      isRunning: false,
      phase: 'work',
      startTime: null,
      currentBreakLesson: null
    }, () => sendResponse({ ok: true }));
    return true;
  } else if (msg.type === 'CLEAR_LESSON_QUEUE') {
    isQueueRefilling = false;
    chrome.storage.local.set({
      lessonQueue: [],
      lastQueueTopic: ''
    });
    sendResponse({ ok: true });
  } else if (msg.type === 'SKIP_PHASE') {
    chrome.alarms.clear('pomodoroTick');
    chrome.storage.local.get(null, async (data) => {
      const settings = { ...DEFAULT_TIMER_SETTINGS, ...(data.timerSettings || {}) };
      if (data.phase === 'work') {
        const lesson = await fetchLesson(data.topic, data.apiKey);
        await playSound('break');
        await trackPhaseCompletion('work', settings.workDuration);
        await chrome.storage.local.set({
          phase: 'break',
          startTime: Date.now(),
          currentBreakLesson: lesson,
          sessionCount: (data.sessionCount || 0) + 1
        });
        chrome.alarms.create('pomodoroTick', { delayInMinutes: settings.breakDuration });
      } else {
        await playSound('work');
        await trackPhaseCompletion('break', settings.breakDuration);
        await chrome.storage.local.set({
          phase: 'work',
          startTime: Date.now(),
          currentBreakLesson: null
        });
        chrome.alarms.create('pomodoroTick', { delayInMinutes: settings.workDuration });
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