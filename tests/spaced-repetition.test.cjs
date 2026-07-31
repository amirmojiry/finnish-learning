const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srs = require('../spaced-repetition.js');

const ROOT = path.resolve(__dirname, '..');
const BASE = new Date('2026-07-31T12:00:00Z').getTime();
const words = [
  { rank: 1, word: 'ja' },
  { rank: 2, word: 'on' },
  { rank: 3, word: 'ei' },
  { rank: 4, word: 'että' },
];

test('correct answers advance through one-day, three-day, and expanding intervals', () => {
  const first = srs.scheduleAnswer(null, true, BASE);
  assert.equal(first.repetitions, 1);
  assert.equal(first.intervalDays, 1);
  assert.equal(first.dueAt, BASE + srs.DAY_MS);

  const second = srs.scheduleAnswer(first, true, first.dueAt);
  assert.equal(second.repetitions, 2);
  assert.equal(second.intervalDays, 3);

  const third = srs.scheduleAnswer(second, true, second.dueAt);
  assert.equal(third.repetitions, 3);
  assert.ok(third.intervalDays >= 7);
  assert.ok(third.dueAt > second.dueAt);
});

test('an incorrect answer resets repetitions and schedules a short retry', () => {
  const learned = { repetitions: 4, intervalDays: 30, easeFactor: 2.7, lapses: 1 };
  const next = srs.scheduleAnswer(learned, false, BASE);
  assert.equal(next.repetitions, 0);
  assert.equal(next.intervalDays, 0);
  assert.equal(next.dueAt, BASE + srs.RETRY_MS);
  assert.equal(next.lapses, 2);
  assert.equal(next.totalAnswers, 1);
});

test('review queues place overdue words before unseen words and honor the daily new limit', () => {
  const progress = srs.emptyProgress(BASE);
  progress.words.on = { ...srs.scheduleAnswer(null, true, BASE - 2 * srs.DAY_MS), dueAt: BASE - 1 };
  progress.dailyNew.count = 9;

  const queue = srs.buildReviewQueue(words, progress, BASE, { newLimit: 10, sessionLimit: 20 });
  assert.deepEqual(queue.map((word) => word.word), ['on', 'ja']);
});

test('recording a first answer consumes one daily new-word slot but later answers do not', () => {
  let progress = srs.emptyProgress(BASE);
  progress = srs.recordAnswer(progress, words[0], true, BASE);
  assert.equal(progress.dailyNew.count, 1);
  progress = srs.recordAnswer(progress, words[0], false, BASE + 1000);
  assert.equal(progress.dailyNew.count, 1);
  progress = srs.recordAnswer(progress, words[1], true, BASE + 2000);
  assert.equal(progress.dailyNew.count, 2);
});

test('a new local day resets the daily introduction counter', () => {
  const progress = srs.emptyProgress(BASE);
  progress.dailyNew.count = 10;
  const nextDay = BASE + srs.DAY_MS;
  const clean = srs.sanitizeProgress(progress, nextDay);
  assert.equal(clean.dailyNew.count, 0);
  assert.equal(clean.dailyNew.date, srs.localDateKey(nextDay));
});

test('summary counts due, unseen, scheduled, and mastered words', () => {
  const progress = srs.emptyProgress(BASE);
  progress.words.ja = { ...srs.scheduleAnswer(null, true, BASE - srs.DAY_MS), dueAt: BASE - 1 };
  progress.words.on = { ...srs.scheduleAnswer(null, true, BASE), dueAt: BASE + srs.DAY_MS };
  progress.words.ei = {
    ...srs.scheduleAnswer(null, true, BASE),
    repetitions: 4,
    intervalDays: 30,
    dueAt: BASE + 30 * srs.DAY_MS,
  };
  const summary = srs.summarizeProgress(words, progress, BASE);
  assert.deepEqual(summary, {
    due: 1,
    unseen: 1,
    scheduled: 2,
    mastered: 1,
    learned: 3,
    availableNewToday: 1,
  });
});

test('invalid stored data is replaced with a safe empty schema', () => {
  const storage = {
    getItem: () => '{not json',
    setItem: () => {},
  };
  const progress = srs.loadProgress(storage, BASE);
  assert.equal(progress.version, 1);
  assert.deepEqual(progress.words, {});
  assert.equal(progress.dailyNew.count, 0);
});

test('the browser integration assets are present exactly once and load after the base app', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.equal((html.match(/css\/spaced-repetition\.css/g) || []).length, 1);
  assert.equal((html.match(/spaced-repetition\.js/g) || []).length, 1);
  assert.ok(html.indexOf('app.js') < html.indexOf('spaced-repetition.js'));
});

test('the review integration keeps its required public app contracts', () => {
  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  for (const functionName of ['openWordDetail', 'startFocusedPractice', 'hideFeedback', 'renderQuestion']) {
    assert.match(app, new RegExp(`function ${functionName}\\(`));
  }
});
