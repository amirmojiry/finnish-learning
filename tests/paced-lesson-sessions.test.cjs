'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');

const selected = [
  ['a1.1-section-3', 'section-3-lesson-5', 40, 30, [15, 15], [8, 14], 0],
  ['a1.1-section-2', 'section-2-lesson-10', 62, 29, [15, 6, 5, 3], [17, 18, 20, 7], 15],
  ['a1.2-section-2', 'a1.2-section-2-lesson-7', 44, 27, [15, 12], [8, 20], 0],
  ['a1.3-section-4', 'a1.3-section-4-lesson-10', 32, 27, [15, 12], [15, 17], 15],
];

function sectionFixture(id) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/course', id + '.json'), 'utf8'));
}
function memoryStorage() {
  const cache = new Map();
  return {
    getItem(key) { return cache.has(key) ? cache.get(key) : null; },
    setItem(key, value) { cache.set(key, String(value)); },
    removeItem(key) { cache.delete(key); },
    cache,
  };
}

test('all four heavy authored lessons have bounded sittings without losing any scored targets', () => {
  for (const [sectionId, lessonId, authoredCount, initialScreens, screenCounts, answerCounts, checkpointSize] of selected) {
    const source = sectionFixture(sectionId);
    const rawLesson = source.lessons.find((entry) => entry.id === lessonId);
    const checkpointBefore = structuredClone(rawLesson.checkpoint_targets || []);
    assert.equal(rawLesson.activities.length, authoredCount);
    assert.equal(checkpointBefore.length, checkpointSize);
    assert.deepEqual(rawLesson.study_pacing, { max_slides: 15, max_graded: 20 });
    const prepared = course.validateSection(source);
    const lesson = prepared.lessons.find((entry) => entry.id === lessonId);
    const before = structuredClone(lesson.activities);
    const slides = course.compactLessonActivities(lesson.activities);
    const sittings = course.planPacedLessonSessions(slides, lesson.study_pacing);
    assert.equal(slides.length, initialScreens);
    assert.deepEqual(sittings.map((entry) => entry.screens), screenCounts, lessonId);
    assert.deepEqual(sittings.map((entry) => entry.graded), answerCounts, lessonId);
    assert.equal(sittings.at(0).start, 0);
    assert.equal(sittings.at(-1).end, slides.length);
    assert.ok(sittings.length > 1);
    assert.ok(sittings.every((entry) => entry.screens <= 15 && entry.graded <= 20));
    assert.equal(sittings.reduce((total, entry) => total + entry.graded, 0),
      slides.reduce((total, slide) => total + course.scoredOpportunitiesOnSlide(slide), 0));
    assert.deepEqual(course.flattenLessonSlides(slides), before);
    assert.deepEqual(lesson.activities, before);
    assert.deepEqual(lesson.checkpoint_targets || [], checkpointBefore);
  }
});

test('other 136 published lessons remain unpaced and unchanged', () => {
  let unpaced = 0;
  for (const stage of course.COURSE_STAGES) {
    for (const url of stage.sectionUrls) {
      const section = course.validateSection(sectionFixture(path.basename(url, '.json')));
      for (const lesson of section.lessons) {
        if (lesson.study_pacing) continue;
        unpaced++;
        assert.deepEqual(course.planPacedLessonSessions(
          course.compactLessonActivities(lesson.activities), lesson.study_pacing
        ), []);
      }
    }
  }
  assert.equal(unpaced, 136);
});

test('resume draft round-trips and rejects wrong lesson, tampering and changed source', () => {
  const sectionId = 'a1.1-section-2';
  const lesson = course.validateSection(sectionFixture(sectionId)).lessons.at(-1);
  const storage = memoryStorage();
  const state = {
    nextIndex: 15, correct: 14, graded: 17, retryIndices: [0, 1],
    retryPhase: false, sessionId: 'session-1', sessionStartedAt: 1000,
  };
  assert.equal(course.savePacedLessonDraft(storage, sectionId, lesson, state), true);
  assert.deepEqual(course.loadPacedLessonDraft(storage, sectionId, lesson), state);
  assert.equal(course.loadPacedLessonDraft(storage, 'other-section', lesson), null);
  const changed = structuredClone(lesson);
  changed.activities[0].item = 'new-activity-id';
  assert.equal(course.loadPacedLessonDraft(storage, sectionId, changed), null);

  const saved = JSON.parse(storage.getItem(course.PACED_DRAFT_STORAGE_KEY));
  saved[lesson.id].nextIndex = 10000;
  storage.setItem(course.PACED_DRAFT_STORAGE_KEY, JSON.stringify(saved));
  assert.equal(course.loadPacedLessonDraft(storage, sectionId, lesson), null);
  saved[lesson.id].nextIndex = 15;
  saved[lesson.id].retryIndices = [0, 0];
  storage.setItem(course.PACED_DRAFT_STORAGE_KEY, JSON.stringify(saved));
  assert.equal(course.loadPacedLessonDraft(storage, sectionId, lesson), null);
});

test('retry continuation and reset keep course score and retry semantics stable', () => {
  const sectionId = 'a1.3-section-4';
  const lesson = course.validateSection(sectionFixture(sectionId)).lessons.at(-1);
  const slides = course.compactLessonActivities(lesson.activities);
  const storage = memoryStorage();
  const retry = {
    nextIndex: slides.length + 1, correct: 22, graded: 33,
    retryIndices: [0, 2], retryPhase: true,
    sessionId: 'checkpoint-session', sessionStartedAt: 2000,
  };
  assert.equal(course.savePacedLessonDraft(storage, sectionId, lesson, retry), true);
  assert.deepEqual(course.loadPacedLessonDraft(storage, sectionId, lesson), retry);
  assert.equal(course.passesLessonRequirement(lesson, retry.correct, retry.graded - 1),
    course.passesLessonRequirement(lesson, 22, 32));
  course.clearPacedLessonDraft(storage, lesson.id);
  assert.equal(course.loadPacedLessonDraft(storage, sectionId, lesson), null);

  course.savePacedLessonDraft(storage, sectionId, lesson, retry);
  course.resetProgress(storage);
  assert.equal(storage.getItem(course.PACED_DRAFT_STORAGE_KEY), null);
});

test('validation rejects overly large sittings and invalid local storage is harmless', () => {
  const source = sectionFixture('a1.2-section-2');
  const lesson = source.lessons.find((entry) => entry.id === 'a1.2-section-2-lesson-7');
  lesson.study_pacing.max_graded = 0;
  assert.throws(() => course.validateSection(source), /Invalid paced lesson screen/);
  lesson.study_pacing.max_graded = 20;
  lesson.study_pacing.max_slides = 25;
  assert.throws(() => course.validateSection(source), /Invalid paced lesson screen/);
  const good = course.validateSection(sectionFixture('a1.2-section-2')).lessons[6];
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(course.loadPacedLessonDraft(blocked, 'a1.2-section-2', good), null);
  assert.equal(course.savePacedLessonDraft(blocked, 'a1.2-section-2', good, {
    retryIndices: [], nextIndex: 1, correct: 0, graded: 0,
    retryPhase: false, sessionId: 'x', sessionStartedAt: 0,
  }), false);
});


test('all-wrong checkpoint retry phase is split into bounded additional sittings', () => {
  const sectionId = 'a1.1-section-2';
  const lesson = course.validateSection(sectionFixture(sectionId)).lessons.at(-1);
  const initialSlides = course.compactLessonActivities(lesson.activities);
  const missed = lesson.activities.slice(); // Worst case: all 62 graded questions were missed.
  const firstAttempt = course.planPacedLessonSessions(initialSlides, lesson.study_pacing);
  const allSittings = course.planPacedLessonFlow(initialSlides, missed, lesson.study_pacing);
  assert.equal(initialSlides.length, 29);
  assert.equal(missed.length, 62);
  assert.equal(firstAttempt.length, 4);
  assert.equal(allSittings.length, 9); // Four initial + five independently bounded retry sittings.
  assert.deepEqual(allSittings.map(s => s.screens), [15, 6, 5, 3, 15, 15, 15, 15, 2]);
  assert.deepEqual(allSittings.map(s => s.graded), [17, 18, 20, 7, 15, 15, 15, 15, 2]);
  assert.deepEqual(allSittings.map(s => s.phase),
    [...Array(4).fill('initial'), ...Array(5).fill('retry')]);
  assert.equal(allSittings[3].end, initialSlides.length);
  assert.equal(allSittings[4].start, initialSlides.length);
  assert.equal(allSittings.at(-1).end, initialSlides.length + missed.length);
  assert.equal(allSittings.reduce((n, s) => n + s.graded, 0), 124);
  for (let i = 0; i < allSittings.length; i++) {
    const sitting = allSittings[i];
    assert.ok(sitting.screens <= 15 && sitting.graded <= 20);
    assert.equal(sitting.end - sitting.start, sitting.screens);
    if (i > 0) assert.equal(allSittings[i - 1].end, sitting.start);
  }
});

test('partial retry, no-retry and interrupted retry remain bounded with stable draft restore', () => {
  const sectionId = 'a1.3-section-4';
  const lesson = course.validateSection(sectionFixture(sectionId)).lessons.at(-1);
  const initial = course.compactLessonActivities(lesson.activities);
  const noRetry = course.planPacedLessonFlow(initial, [], lesson.study_pacing);
  assert.equal(noRetry.length, 2);
  assert.equal(noRetry.at(-1).end, initial.length);
  assert.deepEqual(noRetry.map(s => s.phase), ['initial', 'initial']);

  const missedIndices = Array.from({ length: 17 }, (_, index) => index);
  const missedActivities = missedIndices.map(index => lesson.activities[index]);
  const sessions = course.planPacedLessonFlow(initial, missedActivities, lesson.study_pacing);
  assert.equal(sessions.length, 4);
  assert.deepEqual(sessions.map(s => s.screens), [15, 12, 15, 2]);
  assert.deepEqual(sessions.map(s => s.graded), [15, 17, 15, 2]);
  assert.equal(sessions[1].end, sessions[2].start); // First retry is a separate sitting.
  const storage = memoryStorage();
  const savedState = {
    nextIndex: initial.length + 15,
    correct: 5,
    graded: 32 + 15,
    retryIndices: missedIndices,
    retryPhase: true,
    sessionId: 'retry-in-progress',
    sessionStartedAt: 2000,
  };
  assert.equal(course.savePacedLessonDraft(storage, sectionId, lesson, savedState), true);
  assert.deepEqual(course.loadPacedLessonDraft(storage, sectionId, lesson), savedState);
  assert.equal(sessions[2].end, savedState.nextIndex);
  assert.equal(sessions[3].start, savedState.nextIndex);
  const restored = savedState.retryIndices.map(index => lesson.activities[index]);
  assert.deepEqual(course.planPacedLessonFlow(initial, restored, lesson.study_pacing), sessions);
  assert.deepEqual(course.flattenLessonSlides(initial), lesson.activities);
});
