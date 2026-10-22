'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const { positives } = require('../scripts/audit-course-coverage.cjs');

function rawSection(id) {
  return JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'data/course', id + '.json'), 'utf8'
  ));
}
function loadSection(id) {
  return course.validateSection(rawSection(id));
}
function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}
const section = loadSection('a1.3-section-4');
const checkpoint = section.lessons.at(-1);
const firstEdition = checkpoint.editorial_revision_history[0];
const scored = (a) => course.scoredOpportunitiesOnSlide(a) > 0;

test('the old source and frozen v1 checkpoint are unchanged; v2 restores later scored review', () => {
  assert.equal(checkpoint.id, 'a1.3-section-4-lesson-10');
  assert.equal(checkpoint.passing_score, 0.8);
  assert.equal(checkpoint.activities.length, 32);
  assert.equal(firstEdition.id, 'r189-a13-s4-l10-v1');
  assert.equal(checkpoint.editorial_revision.id, 'r215-a13-s4-l10-v2');
  const v1 = course.lessonEditionActivities(checkpoint, firstEdition.id);
  const v2 = course.lessonEditionActivities(checkpoint, 'editorial');
  assert.equal(v1.length, 29);
  assert.equal(v2.length, 30);
  assert.deepEqual(v2.slice(0, v1.length), v1);
  assert.strictEqual(v2.at(-1), checkpoint.activities[31]);
  assert.deepEqual(course.lessonEditionActivities(checkpoint, 'legacy'), checkpoint.activities);
  assert.ok(!v1.some(a => scored(a) && positives(a).includes('a13s4-e-076')));
  assert.ok(v2.some(a => scored(a) && positives(a).includes('a13s4-e-076')));
  const lesson8 = course.lessonEditionActivities(section.lessons[7], 'editorial');
  assert.ok(lesson8.some(a => a.type === 'teach' && a.item === 'a13s4-e-076'));
  assert.ok(lesson8.some(a => scored(a) && positives(a).includes('a13s4-e-076')));
  assert.equal(course.passesLessonRequirement(checkpoint, 24, 30), true);
  assert.equal(course.passesLessonRequirement(checkpoint, 23, 30), false);
  assert.equal(course.passesLessonRequirement(checkpoint, 24, 29), true);
  assert.equal(course.passesLessonRequirement(checkpoint, 23, 29), false);
});

test('frozen v1 saved drafts resume unchanged, including historical fingerprint and retry cursor', () => {
  const storage = memoryStorage();
  const oldShippedLesson = { ...checkpoint, editorial_revision: firstEdition };
  const validRetries = firstEdition.activity_indices.filter(i => scored(checkpoint.activities[i])).slice(0, 2);
  assert.equal(validRetries.length, 2);
  const saved = {
    nextIndex: 12, correct: 8, graded: 10,
    retryIndices: validRetries, retryPhase: false,
    sessionId: 'paced-v1-learner', sessionStartedAt: 12345,
    editorialEdition: firstEdition.id,
  };
  assert.equal(course.savePacedLessonDraft(storage, section.id, oldShippedLesson, saved), true);
  const before = JSON.parse(storage.getItem(course.PACED_DRAFT_STORAGE_KEY))[checkpoint.id];
  const restored = course.loadPacedLessonDraft(storage, section.id, checkpoint);
  assert.deepEqual(restored, saved, 'old v1 persisted fingerprint must still match');
  assert.equal(course.lessonEditionSlides(checkpoint, firstEdition.id).length, 24);
  assert.equal(course.lessonEditionSlides(checkpoint, 'editorial').length, 25);
  // Saving from the newly deployed runtime must keep the exact old edition hash.
  assert.equal(course.savePacedLessonDraft(storage, section.id, checkpoint, restored), true);
  const after = JSON.parse(storage.getItem(course.PACED_DRAFT_STORAGE_KEY))[checkpoint.id];
  assert.equal(after.editorialFingerprint, before.editorialFingerprint);
  assert.equal(after.fingerprint, before.fingerprint);
  const retry = { ...restored, retryPhase: true, nextIndex: 25, correct: 12, graded: 30 };
  assert.equal(course.savePacedLessonDraft(storage, section.id, checkpoint, retry), true);
  assert.deepEqual(course.loadPacedLessonDraft(storage, section.id, checkpoint), retry);
  const badDraft = JSON.parse(storage.getItem(course.PACED_DRAFT_STORAGE_KEY));
  badDraft[checkpoint.id].retryIndices = [31];
  storage.setItem(course.PACED_DRAFT_STORAGE_KEY, JSON.stringify(badDraft));
  assert.equal(course.loadPacedLessonDraft(storage, section.id, checkpoint), null,
    'v2-only source index must not be accepted for historical v1 resumes');
});

test('fresh drafts select v2; tampered or unknown archived revisions fail closed', () => {
  const storage = memoryStorage();
  const saved = {
    nextIndex: 10, correct: 8, graded: 10, retryIndices: [31],
    retryPhase: false, sessionId: 'paced-v2-learner', sessionStartedAt: 123456,
    editorialEdition: checkpoint.editorial_revision.id,
  };
  assert.equal(course.savePacedLessonDraft(storage, section.id, checkpoint, saved), true);
  assert.deepEqual(course.loadPacedLessonDraft(storage, section.id, checkpoint), saved);
  const tampered = structuredClone(checkpoint);
  tampered.editorial_revision.activity_indices.pop();
  assert.equal(course.loadPacedLessonDraft(storage, section.id, tampered), null);
  course.clearPacedLessonDraft(storage, checkpoint.id);
  assert.equal(course.loadPacedLessonDraft(storage, section.id, checkpoint), null);
  assert.equal(course.savePacedLessonDraft(storage, section.id, checkpoint,
    { ...saved, editorialEdition: 'unknown-edition' }), false);
  assert.equal(course.loadPacedLessonDraft(storage, section.id, checkpoint), null);
});

test('frozen editions obey pacing limits and historical revision metadata is validated', () => {
  assert.equal(checkpoint.study_pacing.max_slides, 15);
  assert.equal(checkpoint.study_pacing.max_graded, 20);
  for (const edition of [firstEdition.id, 'editorial']) {
    const slides = course.lessonEditionSlides(checkpoint, edition);
    const assessed = course.lessonEditionActivities(checkpoint, edition).filter(scored);
    const plan = course.planPacedLessonFlow(slides, assessed, checkpoint.study_pacing);
    assert.equal(plan.at(-1).end, slides.length + assessed.length);
    assert.ok(plan.every(s => s.screens <= 15 && s.graded <= 20));
  }
  const invalid = rawSection('a1.3-section-4');
  invalid.lessons.at(-1).editorial_revision_history[0].activity_indices.reverse();
  assert.throws(() => course.validateSection(invalid), /Historical editorial activity indices must stay in source order/);
  const repeated = rawSection('a1.3-section-4');
  repeated.lessons.at(-1).editorial_revision_history[0].id = checkpoint.editorial_revision.id;
  assert.throws(() => course.validateSection(repeated), /Historical editorial revision IDs must be unique/);
});

test('the section retains its lesson identities and the shipped course remains 140 lessons', () => {
  const ids = new Set();
  let count = 0;
  for (const stage of course.COURSE_STAGES) {
    for (const file of stage.sectionUrls) {
      const s = loadSection(path.basename(file, '.json'));
      for (const lesson of s.lessons) {
        assert.ok(!ids.has(lesson.id), 'duplicate lesson identity: ' + lesson.id);
        ids.add(lesson.id);
        count++;
      }
    }
  }
  assert.equal(count, 140);
});
