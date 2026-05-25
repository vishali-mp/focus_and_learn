// number of minutes
// original
const WORK_SECS = 25 * 60;
const LEARNING_SECS = 2 * 60;
const BREAK_SECS = 5 * 60;
// testing modified
// const WORK_SECS = 1 * 60;
// const LEARNING_SECS = 1 * 60;
// const BREAK_SECS = 1 * 60;

let tickInterval = null;

function showMain() {
  document.getElementById('mainScreen').classList.add('active');
  document.getElementById('settingsScreen').classList.remove('active');
  document.getElementById('libraryScreen').classList.remove('active');
  refresh();
}

function showSettings() {
  document.getElementById('mainScreen').classList.remove('active');
  document.getElementById('settingsScreen').classList.add('active');
  document.getElementById('libraryScreen').classList.remove('active');
  loadSettingsUI();
}

function showLibrary() {
  document.getElementById('mainScreen').classList.remove('active');
  document.getElementById('settingsScreen').classList.remove('active');
  document.getElementById('libraryScreen').classList.add('active');
  renderLibrary();
}

function fmtTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateRing(ratio, phase) {
  const ring = document.getElementById('ringFill');
  const circ = 515.2;
  ring.style.strokeDashoffset = circ * (1 - ratio);

  // Remove all phase classes
  ring.classList.remove('break-phase', 'learning-phase');

  // Add appropriate class
  if (phase === 'break') ring.classList.add('break-phase');
  else if (phase === 'learning') ring.classList.add('learning-phase');
}


async function renderLesson(lesson) {
  const area = document.getElementById('lessonArea');

  if (!lesson) {
    area.innerHTML = '';
    return;
  }

  const saved = await getSavedLessons();
  const alreadySaved = saved.some(s => s.title === lesson.title);

  area.innerHTML = `
    <div class="lesson-card">
      <div class="lesson-tag">${lesson.tag || 'Micro-lesson'}</div>
      <span class="lesson-emoji">${lesson.emoji || '💡'}</span>
      <div class="lesson-title">${lesson.title}</div>
      <div class="lesson-concept">${lesson.concept}</div>
      <div class="lesson-detail">${lesson.detail}</div>

      <div class="lesson-actions">
        <button 
          class="save-lesson-btn ${alreadySaved ? 'saved' : ''}" 
          id="saveLessonBtn"
        >
          ${alreadySaved ? '🔖 Saved' : '🔖 Save'}
        </button>

        <button 
          class="view-library-btn"
          id="viewLibraryBtn"
        >
          View library →
        </button>
      </div>
    </div>
  `;

  document
    .getElementById('saveLessonBtn')
    .addEventListener('click', toggleSaveLesson);

  document
    .getElementById('viewLibraryBtn')
    .addEventListener('click', showLibrary);
}

async function getSavedLessons() {
  return new Promise(resolve => {
    chrome.storage.local.get(['savedLessons'], d => resolve(d.savedLessons || []));
  });
}

async function toggleSaveLesson() {
  const data = await new Promise(r => chrome.storage.local.get(null, r));
  const lesson = data.breakLesson;
  if (!lesson) return;

  const saved = data.savedLessons || [];
  const idx = saved.findIndex(s => s.title === lesson.title);
  const btn = document.getElementById('saveLessonBtn');

  if (idx >= 0) {
    saved.splice(idx, 1);
    btn.textContent = '🔖 Save';
    btn.classList.remove('saved');
  } else {
    saved.unshift({ ...lesson, savedAt: Date.now(), note: '' });
    btn.textContent = '🔖 Saved';
    btn.classList.add('saved');
  }
  chrome.storage.local.set({ savedLessons: saved });
}

// ── LIBRARY ──
let activeTag = '';

async function renderLibrary() {
  const saved = await getSavedLessons();
  const query = (document.getElementById('libSearch')?.value || '').toLowerCase();

  // Build tag filter chips
  const tags = [...new Set(saved.map(s => s.tag).filter(Boolean))];
  const filtersEl = document.getElementById('libFilters');
  filtersEl.innerHTML = `<div class="filter-chip ${activeTag === '' ? 'active' : ''}" data-tag="">All</div>` +
    tags.map(t => `<div class="filter-chip ${activeTag === t ? 'active' : ''}" data-tag="${t}">${t}</div>`).join('');
  filtersEl.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeTag = chip.dataset.tag;
      renderLibrary();
    });
  });

  // Filter
  const filtered = saved.filter(s => {
    const matchTag = activeTag === '' || s.tag === activeTag;
    const matchQuery = !query ||
      s.title.toLowerCase().includes(query) ||
      s.concept.toLowerCase().includes(query) ||
      (s.note || '').toLowerCase().includes(query);
    return matchTag && matchQuery;
  });

  document.getElementById('libCount').textContent = `${filtered.length} saved`;

  const list = document.getElementById('libList');
  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="lib-empty">
        <div class="lib-empty-icon">${query || activeTag ? '🔍' : '📭'}</div>
        <div class="lib-empty-text">${query || activeTag ? 'No lessons match your filter.' : 'No saved lessons yet.\nSave one during your next break!'}</div>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map((s, i) => {
    const realIdx = saved.indexOf(s);
    const date = new Date(s.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `
      <div class="saved-card" id="card-${realIdx}">
        <div class="saved-tag">${s.tag || 'Lesson'}</div>
        <div class="saved-card-top">
          <span class="saved-emoji">${s.emoji || '💡'}</span>
          <div class="saved-title">${s.title}</div>
        </div>
        <div class="saved-concept">${s.concept}</div>
        ${s.detail ? `<div class="saved-concept" style="margin-top:4px;font-size:10px;color:#6a6865">${s.detail}</div>` : ''}
        ${s.note ? `<div class="saved-note">${escHtml(s.note)}</div>` : ''}
        <div class="note-input-wrap" id="noteWrap-${realIdx}">
          <textarea class="note-textarea" id="noteText-${realIdx}" placeholder="Add your own note or reflection...">${escHtml(s.note || '')}</textarea>
          <button class="note-save-btn" data-save-note="${realIdx}">Save note</button>
        </div>
        <div class="saved-card-footer">
          <span class="saved-date">${date}</span>
          <div class="saved-actions">
          <button class="icon-btn" data-toggle-note="${realIdx}">✏️</button>
          <button class="icon-btn delete" data-delete="${realIdx}">🗑</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// Save note buttons
document.querySelectorAll('[data-save-note]').forEach(btn => {
  btn.addEventListener('click', () => {
    saveNote(btn.dataset.saveNote);
  });
});

// Toggle note buttons
document.querySelectorAll('[data-toggle-note]').forEach(btn => {
  btn.addEventListener('click', () => {
    toggleNoteInput(btn.dataset.toggleNote);
  });
});

// Delete buttons
document.querySelectorAll('[data-delete]').forEach(btn => {
  btn.addEventListener('click', () => {
    deleteLesson(btn.dataset.delete);
  });
});

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toggleNoteInput(idx) {
  const wrap = document.getElementById(`noteWrap-${idx}`);
  wrap.classList.toggle('open');
  if (wrap.classList.contains('open')) {
    document.getElementById(`noteText-${idx}`)?.focus();
  }
}

async function saveNote(idx) {
  const text = document.getElementById(`noteText-${idx}`)?.value.trim() || '';
  const saved = await getSavedLessons();
  if (!saved[idx]) return;
  saved[idx].note = text;
  chrome.storage.local.set({ savedLessons: saved }, () => renderLibrary());
}

async function deleteLesson(idx) {
  const saved = await getSavedLessons();
  saved.splice(idx, 1);
  chrome.storage.local.set({ savedLessons: saved }, () => renderLibrary());
}

function renderLessonLoading() {
  const area = document.getElementById('lessonArea');
  area.innerHTML = `
    <div class="lesson-card">
      <div class="lesson-loading">
        <div class="loading-dots"><span>·</span><span>·</span><span>·</span></div>
        <div style="margin-top:8px;font-size:11px;color:var(--muted)">Generating your lesson...</div>
      </div>
    </div>
  `;
}

function renderNoKey() {
  const area = document.getElementById('lessonArea');
  area.innerHTML = `
    <div class="no-key-hint">
      Add your Gemini API key in settings to unlock AI-powered micro-lessons during breaks. ⚙
    </div>
  `;
}

function renderIdle() {
  const area = document.getElementById('lessonArea');
  area.innerHTML = `
    <div class="idle-prompt">
      <div class="idle-icon">🍅</div>
      <div class="idle-title">Ready when you are</div>
      <div class="idle-sub">Start a 25-min focus session.<br>You'll get a micro-lesson at every break.</div>
    </div>
  `;
}

async function refresh() {
  const data = await chrome.storage.local.get(null);
  const { isRunning, phase, startTime, sessionCount, topic, apiKey, breakLesson } = data;

  const badge = document.getElementById('phaseBadge');
  const phaseLabel = document.getElementById('phaseLabel');
  const timerDisplay = document.getElementById('timerDisplay');
  const timerSub = document.getElementById('timerSublabel');
  const mainBtn = document.getElementById('mainBtn');
  const skipBtn = document.getElementById('skipBtn');

  document.getElementById('sessionCount').textContent = sessionCount || 0;
  document.getElementById('focusTime').textContent = `${(sessionCount || 0) * 25}m`;
  document.getElementById('topicDisplay').textContent = topic
    ? topic.split(' ')[0]
    : '—';

  if (!isRunning) {
    clearInterval(tickInterval);
    badge.className = 'phase-badge work';
    phaseLabel.textContent = 'Ready';
    timerDisplay.textContent = '25:00';
    timerSub.textContent = 'focus session';
    mainBtn.textContent = 'Start Focus';
    mainBtn.className = 'btn-primary';
    skipBtn.style.display = 'none';
    updateRing(1, 'work');
    if (!apiKey) renderNoKey();
    else renderIdle();
    return;
  }

  skipBtn.style.display = 'flex';
  mainBtn.textContent = 'Stop';
  mainBtn.className = 'btn-primary stop';

  // Determine total seconds based on phase
  let totalSecs, phaseClass, phaseLabelText, timerSubText;

  if (phase === 'work') {
    totalSecs = WORK_SECS;
    phaseClass = 'work';
    phaseLabelText = 'Focus mode';
    timerSubText = 'until learning';
  } else if (phase === 'learning') {
    totalSecs = LEARNING_SECS;
    phaseClass = 'learning';
    phaseLabelText = 'Learning time';
    timerSubText = 'until break';
  } else { // break
    totalSecs = BREAK_SECS;
    phaseClass = 'break';
    phaseLabelText = 'Break time';
    timerSubText = 'until next session';
  }

  badge.className = `phase-badge ${phaseClass}`;
  phaseLabel.textContent = phaseLabelText;
  timerSub.textContent = timerSubText;

  // Show lesson during learning and break phases
  if (phase === 'learning' || phase === 'break') {
    if (breakLesson) await renderLesson(breakLesson);
    else if (apiKey) renderLessonLoading();
    else renderNoKey();
  } else {
    if (!apiKey) renderNoKey();
    else renderIdle();
  }

  // clearInterval(tickInterval);
  // tickInterval = setInterval(() => {
  //   const elapsed = Math.floor((Date.now() - startTime) / 1000);
  //   const remaining = Math.max(0, totalSecs - elapsed);
  //   timerDisplay.textContent = fmtTime(remaining);
  //   updateRing(remaining / totalSecs, isBreak);
  // }, 500);

  clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, totalSecs - elapsed);

    timerDisplay.textContent = fmtTime(remaining);
    updateRing(remaining / totalSecs, phase);

    // FIX: If the timer hits zero, stop ticking and sync with background storage
    if (remaining === 0) {
      clearInterval(tickInterval);
      // Small timeout gives the background service worker a moment to process its alarm
      setTimeout(refresh, 500);
    }
  }, 500);

  const elapsed0 = Math.floor((Date.now() - startTime) / 1000);
  const remaining0 = Math.max(0, totalSecs - elapsed0);
  timerDisplay.textContent = fmtTime(remaining0);
  updateRing(remaining0 / totalSecs, phase);
}

function handleMainBtn() {
  chrome.storage.local.get(['isRunning'], (data) => {
    if (data.isRunning) {
      chrome.runtime.sendMessage({ type: 'STOP_TIMER' }, () => {
        clearInterval(tickInterval);
        refresh();
      });
    } else {
      chrome.runtime.sendMessage({ type: 'START_TIMER' }, () => refresh());
    }
  });
}

function handleSkip() {
  chrome.runtime.sendMessage({ type: 'SKIP_PHASE' }, () => {
    setTimeout(refresh, 200);
  });
}

// ── SETTINGS ──
function loadSettingsUI() {
  
 

  chrome.storage.local.get(['apiKey', 'topic'], (data) => {
    document.getElementById('apiKeyInput').value = data.apiKey || '';
    const savedTopic = data.topic || '';
    const chips = document.querySelectorAll('#topicChips .chip');
    let matched = false;
    chips.forEach(chip => {
      chip.classList.remove('active');
      if (chip.dataset.topic === savedTopic) {
        chip.classList.add('active');
        matched = true;
      }
    });

    document.getElementById('customTopic').addEventListener('input', () => {
      document.querySelectorAll('#topicChips .chip').forEach(c => c.classList.remove('active'));
    });

    if (!matched && savedTopic) {
      document.getElementById('customTopic').value = savedTopic;
    }
  });

  document.querySelectorAll('#topicChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#topicChips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      document.getElementById('customTopic').value = '';
    });
  });
}

function saveSettings() {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  const customTopic = document.getElementById('customTopic').value.trim();
  const activeChip = document.querySelector('#topicChips .chip.active');
  const topic = customTopic || (activeChip ? activeChip.dataset.topic : '');

  chrome.storage.local.set({ apiKey, topic }, () => {
    const btn = document.querySelector('.save-btn');
    btn.textContent = 'Saved ✓';
    btn.style.background = '#a8e83d';
    setTimeout(() => {
      btn.textContent = 'Save settings';
      btn.style.background = '';
      showMain();
    }, 1200);
  });
}

document.addEventListener('DOMContentLoaded', () => {

  document
    .getElementById('libraryBtn')
    .addEventListener('click', showLibrary);

  document
    .getElementById('settingsBtn')
    .addEventListener('click', showSettings);

  document
    .getElementById('mainBtn')
    .addEventListener('click', handleMainBtn);

  document
    .getElementById('skipBtn')
    .addEventListener('click', handleSkip);

  document
    .getElementById('backBtn1')
    .addEventListener('click', showMain);

  document
    .getElementById('backBtn2')
    .addEventListener('click', showMain);

  document
    .getElementById('saveSettingsBtn')
    .addEventListener('click', saveSettings);
  
  document
    .getElementById('libSearch')
    .addEventListener('input', renderLibrary);


  refresh();
});

window.addEventListener('focus', () => refresh());
