# Changelog

## 2.0.0 — 2026-05-31

### Breaking
- **Removed "learning" as a standalone timer phase.** The cycle is now `focus → break → repeat` (was `focus → learning → break → repeat`). AI micro-lessons are now served during break instead of a dedicated learning phase.
- **Storage key renamed:** `breakLesson` → `currentBreakLesson`. Automatic migration on extension update.
- **`timerSettings` simplified:** `learningDuration` removed. Only `workDuration` and `breakDuration` are used.
- **Analytics simplified:** `totalLearningMinutes` and `completedLearningSessions` removed. `lessonsConsumed` now increments on break completion.

### Added
- **Break Mode view swap:** When the timer enters break, the stats row hides and the timer ring scales down (`body.break-mode` CSS class), pulling the lesson card up so it's visible without scrolling.
- **`renderSimpleBreak()` fallback:** When no lesson is available, a "Rest your mind — Stretch, hydrate, or just breathe." message is shown instead of a loading spinner.
- **Fixed-height layout (600px):** Body is locked to Chrome's max popup height. The extension window no longer resizes or jitters when switching views.
- **Scrollable library list:** Library header/search/filters are pinned at top; the lesson list fills remaining space with internal scrolling.
- **Backward-compatible `breakLesson` migration:** Old stored lessons carry over to `currentBreakLesson` on first load after update.

### Fixed
- **First-click timer start race condition:** `sendResponse` was called outside the async `storage.local.set` callback, causing the popup to read stale state on the very first click. Now waits for storage commit before responding.
- **Delete button in library not working:** Static `querySelectorAll` ran at `DOMContentLoaded` before library cards existed. Replaced with event delegation on `#libList`.

### Removed
- **Note/reflection feature removed from saved lessons.** The textarea, save button, and pencil toggle are gone from library cards.
- **"Learning" notification removed.** Notifications now only fire on break start ("Break time") and focus start ("Back to focus!").
- **Learning chime sound removed from `offscreen.js`.**

### Changed
- Notification for work→break transition now includes the lesson title when available.
- Phase labels in popup: "until learning" → "until break".

## 1.0.0 — 2026-05-25

Initial release.

- Pomodoro timer with three-phase cycle: focus → learning → break.
- AI-powered micro-lessons via Gemini API during learning phase.
- Lesson queue with background refill (5 lessons at a time).
- Saved lessons library with notes and search.
- Offscreen document API for audio chimes.
- Analytics tracking (focus time, learning time, streaks).
