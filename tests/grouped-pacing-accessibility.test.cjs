'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const courseSource = fs.readFileSync(path.join(__dirname, '..', 'course.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(__dirname, '..', 'css/course.css'), 'utf8');

test('grouped controls use native descriptive labels instead of generic ARIA replacements', () => {
  const begin = courseSource.indexOf('function renderCompactActivityGroup(');
  const end = courseSource.indexOf('function questionHeading(', begin);
  assert.ok(begin > 0 && end > begin);
  const renderer = courseSource.slice(begin, end);
  assert.match(renderer, /label\.append\(numbering, title\)/);
  assert.match(renderer, /label\.append\(control\)/);
  assert.doesNotMatch(renderer, /control\.setAttribute\('aria-label', 'پاسخ '/);
  assert.match(renderer, /title\.lang = 'fi'/);
  assert.match(renderer, /title\.dir = 'ltr'/);
  assert.match(renderer, /feedback\.setAttribute\('role', 'status'\)/);
  assert.match(renderer, /feedback\.focus\(\)/);
});

test('mobile grouped and pacing UI keep scroll, focus and large touch targets', () => {
  assert.match(cssSource, /\.course-question-card\.is-grouped\s*\{[^}]*overflow-y: auto/s);
  assert.match(cssSource, /\.course-grouped-answer\s*\{[^}]*min-height: 44px/s);
  assert.match(cssSource, /\.course-pacing-break button:focus-visible/);
  assert.match(cssSource, /\.course-pacing-break button\s*\{[^}]*min-height: 48px/s);
  assert.match(cssSource, /\.course-grouped-answer\s*\{\s*font-size: 16px;/);
});

test('saved study breaks never offer leave-as-saved without successful local storage read', () => {
  const start = courseSource.indexOf('function renderPacingBreak(');
  const end = courseSource.indexOf('function startLesson(', start);
  const pause = courseSource.slice(start, end);
  assert.match(pause, /loadPacedLessonDraft\(windowObject\.localStorage/);
  assert.match(pause, /if \(saved\) \{/);
  assert.match(pause, /ذخیره و بازگشت به درس‌ها/);
  assert.match(pause, /ذخیره در این مرورگر در دسترس نیست/);
});

test('study-sitting progress stays outside the small global progress bar', () => {
  assert.match(courseSource, /sittingCaption\.className = 'course-pacing-progress-label'/);
  assert.match(courseSource, /progressWrap\.append\(sittingCaption\)/);
  assert.match(courseSource, /counter\.textContent = \x60\$\{toPersianNumber\(activityIndex \+ 1\)\} \/ \$\{toPersianNumber\(activeLesson\.activities\.length\)\}\x60/);
  assert.match(cssSource, /\.course-pacing-progress-label\s*\{[^}]*overflow-wrap: anywhere/s);
});


test('retry-phase transition displays a paced break instead of unbounded retry questions', () => {
  const start = courseSource.indexOf('function nextActivity()');
  const end = courseSource.indexOf('function completeLesson()', start);
  assert.ok(start > 0 && end > start);
  const next = courseSource.slice(start, end);
  assert.match(next, /lessonRetryPhase = true;[\s\S]*?const breakpoint = pacingBreakForNextIndex\(activityIndex\);/);
  assert.match(next, /if \(breakpoint\) renderPacingBreak\(breakpoint\);/);

  const breakStart = courseSource.indexOf('function pacingBreakForNextIndex(');
  const breakEnd = courseSource.indexOf('function renderPacingBreak(', breakStart);
  const pauses = courseSource.slice(breakStart, breakEnd);
  assert.match(pauses, /planPacedLessonFlow\(/);
  assert.match(pauses, /lessonRetryPhase \? retryActivities : \[\]/);
  assert.doesNotMatch(pauses, /if \(lessonRetryPhase\) return null/);

  const renderStart = courseSource.indexOf('function renderActivity()');
  const renderEnd = courseSource.indexOf('function showFeedback(', renderStart);
  const renderer = courseSource.slice(renderStart, renderEnd);
  assert.match(renderer, /const phaseLabel = sitting\.phase === 'retry'/);
  assert.match(renderer, /course-pacing-progress-label/);
});
