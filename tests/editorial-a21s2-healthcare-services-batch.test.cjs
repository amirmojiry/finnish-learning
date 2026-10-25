'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const audit = require('../scripts/audit-editorial-lesson-load.cjs');
const { positives } = require('../scripts/audit-course-coverage.cjs');

const specs = [
  { n: 2, removed: [15], old: 27, edited: 26, originalGraded: 21, graded: 20, slides: 17, hash: '8a075796' },
  { n: 3, removed: [7], old: 25, edited: 24, originalGraded: 18, graded: 17, slides: 16, hash: 'b561e2f8' },
  { n: 4, removed: [16, 22], old: 28, edited: 26, originalGraded: 20, graded: 18, slides: 17, hash: 'eb58926d' },
  { n: 5, removed: [16], old: 29, edited: 28, originalGraded: 22, graded: 21, slides: 17, hash: '21c4d23f' },
  { n: 6, removed: [17, 22], old: 28, edited: 26, originalGraded: 20, graded: 18, slides: 17, hash: '367632ae' },
  { n: 7, removed: [21], old: 28, edited: 27, originalGraded: 20, graded: 19, slides: 17, hash: 'f2fc315d' },
  { n: 8, removed: [21, 26], old: 38, edited: 36, originalGraded: 26, graded: 24, slides: 21, hash: '691f2a71' },
  { n: 9, removed: [0, 6], old: 28, edited: 26, originalGraded: 28, graded: 26, slides: 20, hash: 'df0fc9e7' },
];
const pathToSource = path.join(__dirname, '..', 'data/course/a2.1-section-2.json');
const rawSection = () => JSON.parse(fs.readFileSync(pathToSource, 'utf8'));
const effectiveSection = () => course.validateSection(rawSection());
const scored = a => course.scoredOpportunitiesOnSlide(a) > 0;

function fnv32(value) {
  const text = JSON.stringify(value);
  let n = 2166136261;
  for (let i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619) >>> 0;
  return n.toString(16).padStart(8, '0');
}

test('all eight curated A2.1 Section 2 editions retain original source activities and high-signal skills', () => {
  const raw = rawSection();
  const section = effectiveSection();
  assert.equal(section.lessons.length, 10);
  assert.equal(fnv32(raw.lessons[0].activities), 'd91b9857', 'lesson 1 source changed');
  assert.equal(fnv32(raw.lessons[9].activities), 'fbadc959', 'checkpoint source changed');
  assert.equal(section.lessons[0].editorial_revision, undefined);
  assert.equal(section.lessons[9].editorial_revision, undefined);
  assert.equal(section.lessons[9].passing_score, 0.8);
  assert.equal(section.lessons[9].checkpoint_targets.length, 15);

  let archived = 0, edited = 0, archivedGraded = 0, editedGraded = 0;
  for (const spec of specs) {
    const lesson = section.lessons[spec.n - 1];
    const original = course.lessonEditionActivities(lesson, 'legacy');
    const curated = course.lessonEditionActivities(lesson, 'editorial');
    const slides = course.lessonEditionSlides(lesson, 'editorial');
    const removed = new Set(spec.removed);
    const indices = original.flatMap((a, index) => removed.has(index) ? [] : [index]);

    assert.equal(fnv32(raw.lessons[spec.n - 1].activities), spec.hash,
      lesson.id + ': original content changed');
    assert.equal(lesson.editorial_revision.id, 'r219-a21s2-l' + String(spec.n).padStart(2, '0') + '-v1');
    assert.equal(lesson.study_pacing, undefined, 'do not create a saved-draft migration problem');
    assert.deepEqual(lesson.editorial_revision.activity_indices, indices);
    assert.equal(original.length, spec.old, lesson.id);
    assert.equal(curated.length, spec.edited, lesson.id);
    assert.equal(original.filter(scored).length, spec.originalGraded, lesson.id);
    assert.equal(curated.filter(scored).length, spec.graded, lesson.id);
    assert.equal(slides.length, spec.slides, lesson.id);
    assert.ok(slides.length >= 12 && slides.length <= 25, lesson.id);
    assert.deepEqual(course.flattenLessonSlides(slides), curated);
    indices.forEach((index, i) =>
      assert.strictEqual(curated[i], original[index], lesson.id + ': prepared activity identity/order changed'));

    assert.ok(curated.some(a => a.type === 'choice' && a.mode === 'listen'
      && a.item === lesson.listening_targets[0]), lesson.id + ': listening recognition lost');
    assert.ok(curated.some(a => a.type === 'dictation'
      && a.item === lesson.listening_targets[1]), lesson.id + ': dictation lost');
    for (const activity of original.filter(a => [
      'negative-transform', 'inflection-production', 'morphology-choice', 'short-reading',
      'guided-writing', 'sentence-order', 'controlled-production', 'expression-completion',
    ].includes(a.type))) {
      assert.ok(curated.includes(activity), lesson.id + ': specialised practice or reading lost ' + activity.type);
    }
    for (const goal of lesson.learning_objectives?.grammar || []) {
      for (const ref of goal.evidence || []) {
        const evidence = Number.isInteger(ref.activity_index)
          ? original[ref.activity_index]
          : original.find(a => a.type === ref.activity_type && a.item === ref.item_id);
        assert.ok(evidence && scored(evidence) && curated.includes(evidence),
          lesson.id + ': indexed or type-matched grammar evidence lost ' + goal.concept_id);
      }
    }
    for (const target of lesson.new_targets || []) {
      const teach = curated.findIndex(a => a.type === 'teach' && a.item === target);
      const firstScore = curated.findIndex(a => scored(a) && positives(a).includes(target));
      assert.ok(teach >= 0 && firstScore > teach, lesson.id + ': first teaching/assessment lost ' + target);
    }
    archived += original.length; edited += curated.length;
    archivedGraded += original.filter(scored).length;
    editedGraded += curated.filter(scored).length;
  }
  assert.deepEqual([archived, edited, archivedGraded, editedGraded], [231, 219, 175, 163]);
});

test('every removed choice is backed by graded evidence, without dropping a unique modality or first teaching', () => {
  const section = effectiveSection();
  const report = audit.buildReport();
  let removed = 0;
  let fullyDeferred = 0;
  for (const spec of specs) {
    const lesson = section.lessons[spec.n - 1];
    const original = course.lessonEditionActivities(lesson, 'legacy');
    const curated = course.lessonEditionActivities(lesson, 'editorial');
    const removedTargets = new Set();
    const reviewed = new Set((lesson.learning_objectives?.lexical || [])
      .filter(g => g.status === 'reviewed').map(g => g.target_id));
    for (const index of spec.removed) {
      const activity = original[index];
      assert.equal(activity.type, 'choice', lesson.id + ': only reviewed choices or redundant recognition may be removed');
      assert.ok(['meaning', 'finnish'].includes(activity.mode), lesson.id + ': do not remove listening');
      assert.ok(section.lessons.slice(0, spec.n - 1).some(previous =>
        course.lessonEditionActivities(previous, 'editorial')
          .some(a => scored(a) && positives(a).includes(activity.item)))
        || curated.some(a => scored(a) && positives(a).includes(activity.item)),
      lesson.id + ': removed target lacks earlier or same-lesson graded positive evidence ' + activity.item);
      const stillInLesson = curated.some(a => scored(a) && positives(a).includes(activity.item));
      if (!stillInLesson) {
        assert.ok(reviewed.has(activity.item), lesson.id + ': newly introduced target lost all in-lesson positives');
        removedTargets.add(activity.item);
        fullyDeferred++;
      } else {
        assert.ok(curated.some(a => a.type !== 'choice' && scored(a) && positives(a).includes(activity.item)),
          lesson.id + ': substitute must include contextual production, typed answer or sentence ordering');
      }
      removed++;
    }
    const row = report.lessons.find(entry => entry.lesson_id === lesson.id);
    assert.ok(row?.revised);
    assert.deepEqual(new Set(row.deferred_review_target_ids), removedTargets,
      lesson.id + ': deferred target inventory diverged');
    assert.equal(row.original_graded_answers - row.learner_graded_answers, spec.removed.length);
  }
  assert.equal(removed, 12);
  assert.equal(fullyDeferred, 5);
});

test('all 67 newly introduced exact forms retain later independently graded positive retrieval in effective lessons', () => {
  const section = effectiveSection();
  let checked = 0;
  for (const [i, lesson] of section.lessons.entries()) {
    for (const target of lesson.new_targets || []) {
      assert.ok(section.lessons.slice(i + 1).some(later =>
        later.activities.some(a => scored(a) && positives(a).includes(target))),
        lesson.id + ': historical later retrieval missing ' + target);
      assert.ok(section.lessons.slice(i + 1).some(later =>
        course.lessonEditionActivities(later, 'editorial')
          .some(a => scored(a) && positives(a).includes(target))),
        lesson.id + ': lost later independently graded retrieval in effective edition ' + target);
      checked++;
    }
  }
  assert.equal(checked, 67);
  // They are the sole graded later retrieval for six freshly introduced
  // expressions from Lesson 7; none can be bulk-removed as a "review tail".
  for (const id of ['a21s2-e-062', 'a21s2-e-063', 'a21s2-e-064', 'a21s2-e-065']) {
    assert.ok(course.lessonEditionActivities(section.lessons[7], 'editorial')
      .some(a => a.type === 'type' && a.item === id));
  }
  for (const id of ['a21s2-e-071', 'a21s2-e-072', 'a21s2-e-074']) {
    assert.ok(course.lessonEditionActivities(section.lessons[8], 'editorial')
      .some(a => a.type === 'type' && a.item === id));
  }
});

test('integrated services preserve original four readings, both guided writing tasks and final checkpoint', () => {
  const section = effectiveSection();
  const lesson9 = section.lessons[8];
  const edited9 = course.lessonEditionActivities(lesson9, 'editorial');
  const passages = edited9.filter(a => a.type === 'short-reading');
  assert.equal(passages.length, 4);
  for (const id of ['a21s2-reading-1', 'a21s2-reading-2']) {
    const questions = passages.filter(a => a.item === id);
    assert.equal(questions.length, 2);
    assert.equal(new Set(questions.map(a => a.question_item)).size, 2);
  }
  for (const n of [8, 9]) {
    const edited = course.lessonEditionActivities(section.lessons[n - 1], 'editorial');
    const writing = edited.filter(a => a.type === 'guided-writing');
    assert.equal(writing.length, 1);
    assert.equal(writing[0].expected_items.length, 4);
  }
  assert.equal(lesson9.learning_objectives.grammar.length, 6);
  const original = course.lessonEditionActivities(lesson9, 'legacy');
  const edited = course.lessonEditionActivities(lesson9, 'editorial');
  assert.equal(original[0].type, 'choice');
  assert.ok(edited.some(a => a.type === 'production' && a.item === 'a21s2-e-078'));
  assert.equal(original[6].type, 'choice');
  assert.ok(edited.some(a => a.type === 'sentence-order' && a.item === 'a21s2-e-081'));
  assert.equal(section.lessons[9].editorial_revision, undefined);
  assert.equal(course.passesLessonRequirement(section.lessons[9], 12, 15), true);
  assert.equal(course.passesLessonRequirement(section.lessons[9], 11, 15), false);
});

test('all 140 lesson IDs and course-wide editorial workload totals remain consistent', () => {
  const report = audit.buildReport();
  assert.equal(report.summary.shipped_lessons, 140);
  assert.equal(report.summary.editorially_revised_lessons, 63);
  assert.equal(report.summary.removed_grading_opportunities, 221);
  assert.equal(report.summary.learner_lessons_exceeding_30_slides, 0);
  assert.equal(audit.priorityRows(report).length, 77);
  assert.match(audit.priorityMarkdown(report),
    /Remaining uncurated lessons: \*\*77\*\*; all \*\*63\*\* previously curated lessons are excluded\./);
  assert.equal(new Set(report.lessons.map(entry => entry.lesson_id)).size, 140);
  audit.check(report);
});

test('v1.68.0 release and bilingual current status agree', () => {
  const root = path.join(__dirname, '..');
  const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const en = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const fa = fs.readFileSync(path.join(root, 'README.fa.md'), 'utf8');
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.equal(version, '1.68.0');
  assert.equal(pkg.version, version);
  assert.match(changelog, /\[1\.68\.0\]/);
  assert.match(en, /63 curated lessons \/ 221 fewer graded opportunities/);
  assert.match(fa, /۶۳ درس بازنگری‌شده و ۲۲۱ پاسخ نمره‌دار کمتر/);
});
