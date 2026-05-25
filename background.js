const WORK_DURATION_MINS = 25;
const LEARNING_DURATION_MINS = 2;
const BREAK_DURATION_MINS = 5;

// const WORK_DURATION_MINS = 1;
// const LEARNING_DURATION_MINS = 1; // 2 minutes for testing set to 1
// const BREAK_DURATION_MINS = 1;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    isRunning: false,
    phase: 'work', // Can be: 'work', 'learning', or 'break'
    sessionCount: 0,
    topic: '',
    apiKey: '',
    startTime: null,
    breakLesson: null,
    lessonQueue: [], // Queue of pre-fetched lessons
    lastQueueTopic: '' // Track topic for which lessons were fetched
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'pomodoroTick') {
    const data = await chrome.storage.local.get(null);
    if (!data.isRunning) return;

    if (data.phase === 'work') {
      // Work session complete → Start Learning phase
      const lesson = await fetchLesson(data.topic, data.apiKey);

      await playSound('learning');

      await chrome.storage.local.set({
        phase: 'learning',
        startTime: Date.now(),
        breakLesson: lesson,
        sessionCount: (data.sessionCount || 0) + 1
      });
      chrome.alarms.create('pomodoroTick', { delayInMinutes: LEARNING_DURATION_MINS });

      chrome.notifications.create('learningTime', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🧠 Learning time!',
        message: lesson ? `Quick lesson: ${lesson.title}` : 'Time for a micro-learning session!',
        priority: 2,
        requireInteraction: true
      });
    } else if (data.phase === 'learning') {
      // Learning session complete → Start Break phase
      await playSound('break');

      await chrome.storage.local.set({
        phase: 'break',
        startTime: Date.now()
        // Keep the breakLesson from learning phase
      });
      chrome.alarms.create('pomodoroTick', { delayInMinutes: BREAK_DURATION_MINS });

      chrome.notifications.create('breakTime', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '☕ Break time! Relax.',
        message: 'Time to rest your eyes and stretch!',
        priority: 1
      });
    } else {
      // Break complete → Back to Work phase
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
        message: `Let's start another ${WORK_DURATION_MINS} minute focus session.`,
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

  // Get current queue state from storage
  const data = await chrome.storage.local.get(['lessonQueue', 'lastQueueTopic']);
  let { lessonQueue, lastQueueTopic } = data;

  // Initialize if not present
  lessonQueue = lessonQueue || [];
  lastQueueTopic = lastQueueTopic || '';

  // Check if topic changed or queue is empty
  const topicChanged = lastQueueTopic !== topic;

  if (topicChanged) {
    // Topic changed - clear the old queue
    lessonQueue = [];
    console.log('Topic changed, clearing lesson queue');
  }

  if (lessonQueue.length === 0) {
    // Queue is empty - fetch new batch of lessons
    console.log('Fetching new batch of 5 lessons...');

    let newLessons = null;

    if (AI_PROVIDER === "gemini") {
      newLessons = await fetchGeminiLesson(topic, apiKey);
    } else if (AI_PROVIDER === "openrouter") {
      newLessons = await fetchOpenRouterLesson(topic, apiKey);
    }

    if (newLessons && Array.isArray(newLessons)) {
      lessonQueue = newLessons;
      lastQueueTopic = topic;
      console.log(`Added ${newLessons.length} lessons to queue`);
    } else {
      // Fallback if API fails - return single lesson or null
      return newLessons;
    }
  }

  // Pop the first lesson from the queue
  const lesson = lessonQueue.shift();

  // Save updated queue back to storage
  await chrome.storage.local.set({
    lessonQueue,
    lastQueueTopic
  });

  console.log(`Lessons remaining in queue: ${lessonQueue.length}`);

  return lesson;
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
  } else if (msg.type === 'CLEAR_LESSON_QUEUE') {
    // Clear the lesson queue when topic changes
    chrome.storage.local.set({
      lessonQueue: [],
      lastQueueTopic: ''
    });
    sendResponse({ ok: true });
  } else if (msg.type === 'SKIP_PHASE') {
    chrome.alarms.clear('pomodoroTick');
    chrome.storage.local.get(null, async (data) => {
      if (data.phase === 'work') {
        // Skip to learning phase
        const lesson = await fetchLesson(data.topic, data.apiKey);
        await playSound('learning');
        await chrome.storage.local.set({
          phase: 'learning',
          startTime: Date.now(),
          breakLesson: lesson,
          sessionCount: (data.sessionCount || 0) + 1
        });
        chrome.alarms.create('pomodoroTick', { delayInMinutes: LEARNING_DURATION_MINS });
      } else if (data.phase === 'learning') {
        // Skip to break phase
        await playSound('break');
        await chrome.storage.local.set({
          phase: 'break',
          startTime: Date.now()
          // Keep the lesson
        });
        chrome.alarms.create('pomodoroTick', { delayInMinutes: BREAK_DURATION_MINS });
      } else {
        // Skip to work phase
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