const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srs = require('../spaced-repetition.js');

const ROOT = path.resolve(__dirname, '..');
const BASE = new Date('2026-07-31T12:00:00Z').getTime();
const words = [
  { rank: 1, word: 'ja', translation_fa: 'و', frequency_percent: 3.1363 },
  { rank: 2, word: 'on', translation_fa: 'است', frequency_percent: 2.4312 },
  { rank: 3, word: 'ei', translation_fa: 'نه', frequency_percent: 0.9321 },
  { rank: 4, word: 'että', translation_fa: 'که', frequency_percent: 0.8765 },
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
});

test('an incorrect answer resets repetitions and schedules a short retry', () => {
  const next = srs.scheduleAnswer({ repetitions: 4, intervalDays: 30, easeFactor: 2.7, lapses: 1 }, false, BASE);
  assert.equal(next.repetitions, 0);
  assert.equal(next.intervalDays, 0);
  assert.equal(next.dueAt, BASE + srs.RETRY_MS);
  assert.equal(next.lapses, 2);
});

test('review queues place overdue words before unseen words and honor the daily new limit', () => {
  const progress = srs.emptyProgress(BASE);
  progress.words.on = { ...srs.scheduleAnswer(null, true, BASE - 2 * srs.DAY_MS), dueAt: BASE - 1 };
  progress.dailyNew.count = 9;
  assert.deepEqual(srs.buildReviewQueue(words, progress, BASE).map((word) => word.word), ['on', 'ja']);
});

test('recording a first answer consumes one daily new-word slot but later answers do not', () => {
  let progress = srs.emptyProgress(BASE);
  progress = srs.recordAnswer(progress, words[0], true, BASE);
  assert.equal(progress.dailyNew.count, 1);
  progress = srs.recordAnswer(progress, words[0], false, BASE + 1000);
  assert.equal(progress.dailyNew.count, 1);
});

test('summary counts due, unseen, scheduled, and mastered words', () => {
  const progress = srs.emptyProgress(BASE);
  progress.words.ja = { ...srs.scheduleAnswer(null, true, BASE - srs.DAY_MS), dueAt: BASE - 1 };
  progress.words.on = { ...srs.scheduleAnswer(null, true, BASE), dueAt: BASE + srs.DAY_MS };
  progress.words.ei = { ...srs.scheduleAnswer(null, true, BASE), repetitions: 4, intervalDays: 30, dueAt: BASE + 30 * srs.DAY_MS };
  assert.deepEqual(srs.summarizeProgress(words, progress, BASE), { due: 1, unseen: 1, scheduled: 2, mastered: 1, learned: 3, availableNewToday: 1 });
});

test('frequency coverage sums reviewed and mastered Parole percentages separately', () => {
  const progress = srs.emptyProgress(BASE);
  progress.words.ja = { ...srs.scheduleAnswer(null, true, BASE), dueAt: BASE + srs.DAY_MS };
  progress.words.on = { ...srs.scheduleAnswer(null, true, BASE + 1000), repetitions: 3, intervalDays: 21, dueAt: BASE + 21 * srs.DAY_MS };
  const coverage = srs.calculateCoverage(words, progress, BASE);
  assert.equal(coverage.reviewedCount, 2);
  assert.equal(coverage.masteredCount, 1);
  assert.ok(Math.abs(coverage.reviewedPercent - 5.5675) < 0.000001);
  assert.ok(Math.abs(coverage.masteredPercent - 2.4312) < 0.000001);
});

test('reviewed word history is ordered by latest review and exposes accuracy and status', () => {
  const progress = srs.emptyProgress(BASE);
  progress.words.ja = { ...srs.scheduleAnswer(null, true, BASE - 2000), totalAnswers: 4, correctAnswers: 3, lastReviewedAt: BASE - 2000 };
  progress.words.on = { ...srs.scheduleAnswer(null, true, BASE - 1000), repetitions: 3, intervalDays: 21, totalAnswers: 5, correctAnswers: 4, lastReviewedAt: BASE - 1000 };
  const entries = srs.reviewedWordEntries(words, progress, BASE);
  assert.deepEqual(entries.map((entry) => entry.word.word), ['on', 'ja']);
  assert.equal(entries[0].mastered, true);
  assert.equal(entries[0].accuracyPercent, 80);
});

test('word review status is absent before review and reports due or mastered state afterward', () => {
  const progress = srs.emptyProgress(BASE);
  assert.equal(srs.wordReviewStatus(words[0], progress, BASE), null);
  progress.words.ja = { ...srs.scheduleAnswer(null, true, BASE - srs.DAY_MS), dueAt: BASE - 1 };
  assert.equal(srs.wordReviewStatus(words[0], progress, BASE).due, true);
  progress.words.ja.repetitions = 3;
  progress.words.ja.intervalDays = 21;
  assert.equal(srs.wordReviewStatus(words[0], progress, BASE).mastered, true);
});

test('invalid stored data is replaced with a safe empty schema', () => {
  const progress = srs.loadProgress({ getItem: () => '{not json', setItem: () => {} }, BASE);
  assert.equal(progress.version, 1);
  assert.deepEqual(progress.words, {});
});

test('the browser integration assets are present exactly once and load after the base app', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.equal((html.match(/css\/spaced-repetition\.css/g) || []).length, 1);
  assert.equal((html.match(/spaced-repetition\.js/g) || []).length, 1);
  assert.equal((html.match(/profile-review-mount\.js/g) || []).length, 0);
  assert.ok(html.indexOf('app.js') < html.indexOf('spaced-repetition.js'));
});

test('profile owns review while settings owns appearance and the about link', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(ROOT, 'spaced-repetition.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'css', 'spaced-repetition.css'), 'utf8');
  const navigation = fs.readFileSync(path.join(ROOT, 'settings.js'), 'utf8');
  const bottomNav = html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0] || '';
  const profileView = html.match(/<div id="profile-view"[\s\S]*?<div id="settings-view"/)?.[0] || '';
  const settingsView = html.match(/<div id="settings-view"[\s\S]*?<\/main>/)?.[0] || '';

  assert.match(html, /id="profile-view"/);
  assert.match(html, /id="settings-view"/);
  assert.match(profileView, /id="spaced-review-slot"/);
  assert.doesNotMatch(profileView, /data-theme-choice=/);
  assert.doesNotMatch(profileView, /about-view-link/);
  assert.match(settingsView, /data-theme-choice="light"/);
  assert.match(settingsView, /data-theme-choice="dark"/);
  assert.match(settingsView, /class="[^"]*about-view-link/);
  assert.doesNotMatch(settingsView, /id="spaced-review-slot"/);
  assert.equal((bottomNav.match(/bottom-nav-item/g) || []).length, 5);
  assert.match(bottomNav, /course-view-link/);
  assert.match(bottomNav, /profile-view-link/);
  assert.match(bottomNav, /settings-view-link/);
  assert.doesNotMatch(bottomNav, /about-view-link/);
  assert.match(source, /getElementById\('spaced-review-slot'\)/);
  assert.doesNotMatch(source, /insertAdjacentElement\('afterend'/);
  assert.match(source, /spaced-review-history/);
  assert.match(source, /detail-review-status/);
  assert.match(source, /calculateCoverage/);
  assert.match(css, /\.profile-review-slot/);
  assert.doesNotMatch(css, /\.settings-review-slot/);
  assert.doesNotMatch(css, /\.home-view\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(navigation, /location\.hash === '#settings'/);
  assert.match(navigation, /location\.hash === '#profile'/);
});

test('the review integration keeps its required public app contracts', () => {
  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  for (const functionName of ['openWordDetail', 'startFocusedPractice', 'hideFeedback', 'renderQuestion']) {
    assert.match(app, new RegExp(`function ${functionName}\\(`));
  }
});
