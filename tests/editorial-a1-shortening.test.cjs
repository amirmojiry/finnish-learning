'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');

const cases = [
  ['a1.1-section-3', 'section-3-lesson-5', 40, 22, 36, 18, 18, 0],
  ['a1.1-section-2', 'section-2-lesson-10', 62, 62, 27, 27, 20, 15],
  ['a1.2-section-2', 'a1.2-section-2-lesson-7', 44, 28, 34, 18, 21, 0],
  ['a1.3-section-4', 'a1.3-section-4-lesson-10', 32, 32, 30, 30, 25, 15],
  ['a1.1-section-3', 'section-3-lesson-9', 48, 44, 32, 28, 21, 0],
  ['a1.1-section-4', 'section-4-lesson-9', 48, 44, 31, 27, 20, 0],
];
function fixture(id) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/course', id + '.json'), 'utf8'));
}
function inMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) { return map.get(key) ?? null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    map,
  };
}
function assessed(activities) {
  return activities.filter((activity) => course.scoredOpportunitiesOnSlide(activity) > 0).length;
}

test('all six curated editions genuinely reduce independently graded answers and reach 18-25 slides', () => {
  for (const [sectionId, lessonId, oldCount, oldGraded, newCount, newGraded, screens, checkpoints] of cases) {
    const section = course.validateSection(fixture(sectionId));
    const lesson = section.lessons.find((candidate) => candidate.id === lessonId);
    const legacy = course.lessonEditionActivities(lesson, 'legacy');
    const edited = course.lessonEditionActivities(lesson, 'editorial');
    const legacySlides = course.lessonEditionSlides(lesson, 'legacy');
    const editedSlides = course.lessonEditionSlides(lesson, 'editorial');
    const savedOriginal = structuredClone(lesson.activities);
    assert.equal(legacy.length, oldCount, lessonId);
    assert.equal(assessed(legacy), oldGraded, lessonId);
    assert.equal(edited.length, newCount, lessonId);
    assert.equal(assessed(edited), newGraded, lessonId);
    assert.equal(editedSlides.length, screens, lessonId);
    assert.ok(edited.length < legacy.length && newGraded < oldGraded, lessonId);
    assert.ok(editedSlides.length >= 12 && editedSlides.length <= 25, lessonId);
    assert.deepEqual(course.flattenLessonSlides(legacySlides), legacy);
    assert.deepEqual(course.flattenLessonSlides(editedSlides), edited);
    assert.deepEqual(lesson.activities, savedOriginal, 'Original archived activity objects are immutable');
    assert.equal((lesson.checkpoint_targets || []).length, checkpoints);
    const selected = new Set(edited.map((activity) => course.activityPrimaryTargetId(activity)).filter(Boolean));
    for (const target of lesson.checkpoint_targets || []) {
      assert.ok(selected.has(target), lessonId + ': lost checkpoint target ' + target);
    }
    for (const grammar of lesson.learning_objectives?.grammar || []) {
      for (const evidence of grammar.evidence || []) {
        const source = Number.isInteger(evidence.activity_index)
          ? legacy[evidence.activity_index]
          : legacy.find((a) => a.type === evidence.activity_type && a.item === evidence.item_id);
        assert.ok(source && edited.includes(source),
          lessonId + ': lost grammar evidence ' + grammar.concept_id);
      }
    }
    const sittings = course.planPacedLessonSessions(editedSlides, lesson.study_pacing);
    assert.ok(sittings.length >= 2 && sittings.every((s) => s.screens <= 15 && s.graded <= 20));
    assert.equal(sittings.at(-1).end, editedSlides.length);
    const allWrong = edited.filter((activity) => course.scoredOpportunitiesOnSlide(activity));
    const worst = course.planPacedLessonFlow(editedSlides, allWrong, lesson.study_pacing);
    assert.equal(worst.at(-1).end, editedSlides.length + newGraded);
    assert.ok(worst.every((s) => s.screens <= 15 && s.graded <= 20));
  }
});

test('the rearranged A1.1 daily-routine lesson teaches each new target before its selected assessment', () => {
  const lesson = course.validateSection(fixture('a1.1-section-3')).lessons[4];
  const edited = course.lessonEditionActivities(lesson, 'editorial');
  const introduced = lesson.learning_objectives.lexical.filter((x) => x.status === 'introduced');
  for (const { target_id: id } of introduced) {
    const teaches = edited.findIndex((activity) => activity.type === 'teach' && activity.item === id);
    assert.ok(teaches >= 0, 'Missing introduction for ' + id);
    const graded = edited.findIndex((activity) =>
      activity.item === id && course.scoredOpportunitiesOnSlide(activity) > 0);
    if (graded >= 0) assert.ok(teaches < graded, id + ' is assessed before teaching');
  }
});

test('v1.56 in-progress drafts continue in the 62-question legacy edition unchanged', () => {
  const sectionId = 'a1.1-section-2';
  const lesson = course.validateSection(fixture(sectionId)).lessons.at(-1);
  const storage = inMemoryStorage();
  const snapshot = {
    nextIndex: 15, correct: 11, graded: 17,
    retryIndices: [0, 1, 4], retryPhase: false,
    sessionId: 'v156-original-checkpoint', sessionStartedAt: 15000,
  };
  assert.equal(course.savePacedLessonDraft(storage, sectionId, lesson, snapshot), true);
  const raw = JSON.parse(storage.getItem(course.PACED_DRAFT_STORAGE_KEY))[lesson.id];
  assert.equal(raw.editorialEdition, undefined);
  const restored = course.loadPacedLessonDraft(storage, sectionId, lesson);
  assert.deepEqual(restored, snapshot);
  assert.equal(course.lessonEditionSlides(lesson, restored.editorialEdition ? 'editorial' : 'legacy').length, 29);
  assert.equal(course.lessonEditionActivities(lesson, 'legacy').length, 62);
});

test('new curated drafts resume with their own shorter cursor, retries and unchanged lesson IDs', () => {
  const sectionId = 'a1.1-section-2';
  const lesson = course.validateSection(fixture(sectionId)).lessons.at(-1);
  const indices = lesson.editorial_revision.activity_indices;
  const storage = inMemoryStorage();
  const saved = {
    nextIndex: 15, correct: 13, graded: 16, retryIndices: [indices[0], indices[2]],
    retryPhase: false, sessionId: 'curated-checkpoint',
    sessionStartedAt: 18000, editorialEdition: lesson.editorial_revision.id,
  };
  assert.equal(course.savePacedLessonDraft(storage, sectionId, lesson, saved), true);
  assert.deepEqual(course.loadPacedLessonDraft(storage, sectionId, lesson), saved);
  assert.equal(course.lessonEditionSlides(lesson, 'editorial').length, 20);
  const resumed = structuredClone(lesson);
  resumed.editorial_revision.activity_indices.pop();
  assert.equal(course.loadPacedLessonDraft(storage, sectionId, resumed), null, 'Changed edition invalidates only its own draft');

  const stored = JSON.parse(storage.getItem(course.PACED_DRAFT_STORAGE_KEY));
  stored[lesson.id].retryIndices = [22]; // Not selected for the curated checkpoint.
  storage.setItem(course.PACED_DRAFT_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(course.loadPacedLessonDraft(storage, sectionId, lesson), null);
  course.clearPacedLessonDraft(storage, lesson.id);
  assert.equal(course.loadPacedLessonDraft(storage, sectionId, lesson), null);
});

test('malformed or pedagogically incomplete edits fail closed without touching the historical activity array', () => {
  const base = fixture('a1.1-section-2');
  const checkpoint = base.lessons.at(-1);
  checkpoint.editorial_revision.activity_indices = [0, 0, 1];
  assert.throws(() => course.validateSection(base), /editorial revision activity indices must be unique/);
  checkpoint.editorial_revision.activity_indices = [0, 1, 2, 3];
  assert.throws(() => course.validateSection(base), /editorial revision removes a checkpoint target/);
  const intro = fixture('a1.1-section-3');
  intro.lessons[4].editorial_revision.activity_indices =
    intro.lessons[4].editorial_revision.activity_indices.filter((index) => index !== 35);
  assert.throws(() => course.validateSection(intro),
    /editorial revision removes the only independent assessment for introduced target/);
  const grammar = fixture('a1.1-section-2');
  grammar.lessons.at(-1).editorial_revision.activity_indices =
    grammar.lessons.at(-1).editorial_revision.activity_indices.filter((index) => index !== 15);
  assert.throws(() => course.validateSection(grammar),
    /editorial revision removes grammar evidence/);
});

test('only explicitly audited lessons have curated content; all others preserve original editions', () => {
  let curated = 0, total = 0;
  const selected = new Set([...cases.map(([,id])=>id), 'a1.2-section-1-lesson-9',
    ...Array.from({ length: 8 }, (_, i) => `a1.2-section-4-lesson-${i + 2}`),
    ...Array.from({ length: 8 }, (_, i) => `a1.2-section-3-lesson-${i + 2}`),
    ...Array.from({ length: 8 }, (_, i) => `a1.3-section-1-lesson-${i + 2}`),
    ...Array.from({ length: 8 }, (_, i) => `a2.1-section-1-lesson-${i + 2}`),
    ...Array.from({ length: 8 }, (_, i) => `a2.1-section-2-lesson-${i + 2}`),
    ...Array.from({ length: 8 }, (_, i) => `a1.3-section-2-lesson-${i + 2}`),
    ...Array.from({ length: 8 }, (_, i) => `a1.3-section-3-lesson-${i + 2}`),
    ...Array.from({ length: 8 }, (_, i) => `a1.3-section-4-lesson-${i + 2}`)]);
  for (const stage of course.COURSE_STAGES) {
    for (const file of stage.sectionUrls) {
      const section = course.validateSection(fixture(path.basename(file, '.json')));
      for (const lesson of section.lessons) {
        total++;
        if (lesson.editorial_revision) {
          curated++;
          assert.ok(selected.has(lesson.id));
        } else {
          assert.deepEqual(course.lessonEditionActivities(lesson, 'editorial'), lesson.activities);
          assert.deepEqual(course.lessonEditionSlides(lesson, 'editorial'),
            course.compactLessonActivities(lesson.activities, 30),
            'Unedited edition helper remains deterministic');
        }
      }
    }
  }
  assert.equal(total, 140);
  assert.equal(curated, 71);
});

test('deferred-reviewed-target audit excludes targets still assessed in the curated edition', () => {
  const audit = require('../scripts/audit-editorial-lesson-load.cjs');
  const report = audit.buildReport();
  const checkpoint = report.lessons.find((lesson) => lesson.lesson_id === 'a1.3-section-4-lesson-10');
  assert.ok(checkpoint && checkpoint.revised);
  assert.ok(!checkpoint.deferred_review_target_ids.includes('a13s4-e-037'),
    'e-037 is retained by contextual production and morphology assessment');
  assert.ok(!checkpoint.deferred_review_target_ids.includes('a13s4-e-047'),
    'e-047 is retained by contextual production');
  const retainedGraded = course.lessonEditionActivities(
    course.validateSection(fixture('a1.3-section-4')).lessons.at(-1), 'editorial'
  );
  for (const target of checkpoint.deferred_review_target_ids) {
    assert.ok(!retainedGraded.some((activity) =>
      course.scoredOpportunitiesOnSlide(activity) > 0
      && (activity.item === target || course.activityPrimaryTargetId(activity) === target)),
    'Audit must not defer a target with surviving graded evidence: ' + target);
  }
  const nonRevised = report.lessons.filter((lesson) => !lesson.revised);
  assert.equal(nonRevised.length, 69);
  assert.match(audit.priorityMarkdown(report), /Remaining uncurated lessons: \*\*69\*\*; all \*\*71\*\* previously curated lessons are excluded\./);
  assert.ok(nonRevised.every((lesson) => lesson.deferred_review_target_ids.length === 0),
    'Unedited lessons have no deferred review targets');
  audit.check(report);
});

test('both README languages clearly distinguish shorter fresh lessons from unchanged legacy resumes', () => {
  const en = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  const fa = fs.readFileSync(path.join(__dirname, '..', 'README.fa.md'), 'utf8');
  assert.match(en, /52 fewer independently graded answers/);
  assert.match(en, /original question count and sequence apply only when resuming a saved v1\.56 legacy attempt/);
  assert.match(en, /Grouped-slide presentation alone/);
  assert.match(fa, /۵۲ پاسخ نمره‌دار کمتر/);
  assert.match(fa, /تعداد سؤال‌ها و ترتیب قدیمی فقط برای ادامهٔ درس نیمه‌تمام/);
  assert.match(fa, /گروه‌بندی اسلایدها به‌تنهایی تعداد پاسخ‌های نمره‌دار را کاهش نمی‌دهد/);
});


test('Persian release history and generated editorial report describe both batches correctly', () => {
  const fa = fs.readFileSync(path.join(__dirname, '..', 'README.fa.md'), 'utf8');
  const en = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  const previousBatch = fa.slice(fa.indexOf('چهار درس اولویت‌دار'), fa.indexOf('گروه‌بندی اسلایدها'));
  assert.match(previousBatch, /1\.57\.0/, 'The original four-lesson batch belongs to v1.57.0');
  assert.doesNotMatch(previousBatch, /1\.58\.0/, 'Do not rewrite history for the original four-lesson batch');
  assert.match(fa, /شش درس بازنگری‌شدهٔ A1/);
  assert.match(en, /six edited A1 lessons/);

  const audit = require('../scripts/audit-editorial-lesson-load.cjs');
  const report = audit.buildReport();
  const markdown = audit.markdown(report);
  assert.equal(report.summary.editorially_revised_lessons, 71);
  assert.equal(report.summary.removed_grading_opportunities, 232);
  assert.match(markdown, /To date, 71 priority lessons have been editorially shortened/);
  assert.match(en, /seven curated lessons/);
  assert.match(fa, /هفت درس بازنگری‌شده/);
  assert.doesNotMatch(markdown, /Only the four priority lessons/);
});

test('integrated-reading editorial editions retain original comprehension and explicit production evidence', () => {
  for (const [sectionId, lessonId, kept] of [
    ['a1.1-section-3', 'section-3-lesson-9', [4, 5, 11, 15, 16, 17, 18, 19]],
    ['a1.1-section-4', 'section-4-lesson-9', [4, 5, 6, 8, 10, 15, 16, 17, 18, 19]],
  ]) {
    const lesson = course.validateSection(fixture(sectionId)).lessons.find(l => l.id === lessonId);
    const indices = new Set(lesson.editorial_revision.activity_indices);
    for (const index of kept) assert.ok(indices.has(index), lessonId + ': lost reading, listening or grammar evidence at ' + index);
    const edited = course.lessonEditionActivities(lesson, 'editorial');
    assert.ok(edited.some(a => a.mode === 'listen'));
    assert.ok(edited.filter(a => a.type === 'short-reading').length >= 3);
    assert.ok(edited.some(a => course.isProductiveCourseActivity(a)));
    assert.deepEqual(course.flattenLessonSlides(course.lessonEditionSlides(lesson, 'editorial')), edited);
  }
});


test('A1.2 shopping dialogue revision preserves six graded grammar references and legacy lesson', () => {
  const lesson = course.validateSection(fixture('a1.2-section-1')).lessons[8];
  const selected = new Set(lesson.editorial_revision.activity_indices);
  assert.equal(lesson.activities.length, 31);
  assert.equal(course.lessonEditionActivities(lesson, 'legacy').length, 31);
  assert.equal(course.lessonEditionActivities(lesson, 'editorial').length, 22);
  assert.equal(assessed(course.lessonEditionActivities(lesson, 'editorial')), 17);
  assert.equal(course.lessonEditionSlides(lesson, 'editorial').length, 13);
  for (const index of [0, 1, 2, 9, 10, 11, 26, 27, 28, 29, 30]) {
    assert.ok(selected.has(index), 'lost dialogue, reading, listening or production at ' + index);
  }
  for (const goal of lesson.learning_objectives.grammar) {
    for (const evidence of goal.evidence) {
      assert.ok(selected.has(evidence.activity_index), 'lost grammar evidence ' + goal.concept_id);
    }
  }
  assert.deepEqual(lesson.activities.map((a, i) => a), course.lessonEditionActivities(lesson, 'legacy'));
});
