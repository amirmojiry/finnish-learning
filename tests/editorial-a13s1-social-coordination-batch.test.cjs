'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const audit = require('../scripts/audit-editorial-lesson-load.cjs');
const { positives } = require('../scripts/audit-course-coverage.cjs');

const specs = [
  { n: 2, removed: [22, 24], old: 26, edited: 24, originalGraded: 17, graded: 15, slides: 17, hash: '4acd0d15' },
  { n: 3, removed: [26, 27, 28, 30, 31], old: 32, edited: 27, originalGraded: 22, graded: 17, slides: 20, hash: '15e35002' },
  { n: 4, removed: [28, 31, 33], old: 34, edited: 31, originalGraded: 23, graded: 20, slides: 22, hash: '23d6c09f' },
  { n: 5, removed: [24, 27, 29], old: 30, edited: 27, originalGraded: 21, graded: 18, slides: 19, hash: 'a68c8d69' },
  { n: 6, removed: [27, 31], old: 32, edited: 30, originalGraded: 22, graded: 20, slides: 21, hash: 'dffc734a' },
  { n: 7, removed: [24, 28], old: 30, edited: 28, originalGraded: 21, graded: 19, slides: 19, hash: 'fcbf7e66' },
  { n: 8, removed: [28, 31], old: 33, edited: 31, originalGraded: 22, graded: 20, slides: 21, hash: 'cd28b7de' },
  { n: 9, removed: [3, 8], old: 33, edited: 31, originalGraded: 31, graded: 29, slides: 19, hash: '5d842dae' },
];

const sourcePath = path.join(__dirname, '..', 'data/course/a1.3-section-1.json');
const readSource = () => JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const readPrepared = () => course.validateSection(readSource());
const scored = activity => course.scoredOpportunitiesOnSlide(activity) > 0;

function hash(source) {
  let n = 2166136261;
  const serialized = JSON.stringify(source);
  for (let i = 0; i < serialized.length; i++) n = Math.imul(n ^ serialized.charCodeAt(i), 16777619) >>> 0;
  return n.toString(16).padStart(8, '0');
}

test('eight social-coordination edits retain original data, grading, teaching, audio and grammar', () => {
  const raw = readSource();
  const section = readPrepared();
  assert.equal(section.lessons.length, 10);
  assert.equal(section.lessons[0].editorial_revision, undefined, 'lesson 1 untouched');
  assert.equal(section.lessons[9].editorial_revision, undefined, 'checkpoint untouched');

  let previous = 0, next = 0, previousGraded = 0, nextGraded = 0;
  for (const spec of specs) {
    const lesson = section.lessons[spec.n - 1];
    const original = course.lessonEditionActivities(lesson, 'legacy');
    const curated = course.lessonEditionActivities(lesson, 'editorial');
    const slides = course.lessonEditionSlides(lesson, 'editorial');
    const removed = new Set(spec.removed);
    const indices = original.flatMap((_, index) => removed.has(index) ? [] : [index]);
    const source = raw.lessons[spec.n - 1];

    assert.equal(hash(source.activities), spec.hash, lesson.id + ': immutable original array changed');
    assert.equal(lesson.editorial_revision.id, 'r217-a13s1-l' + String(spec.n).padStart(2, '0') + '-v1');
    assert.equal(lesson.study_pacing, undefined, 'do not introduce a draft migration requirement');
    assert.deepEqual(lesson.editorial_revision.activity_indices, indices);
    assert.equal(original.length, spec.old);
    assert.equal(curated.length, spec.edited);
    assert.equal(original.filter(scored).length, spec.originalGraded);
    assert.equal(curated.filter(scored).length, spec.graded);
    assert.equal(slides.length, spec.slides, lesson.id + ': prepared slide count drift');
    assert.ok(slides.length >= 12 && slides.length <= 25);
    assert.deepEqual(course.flattenLessonSlides(slides), curated);
    indices.forEach((index, i) => assert.strictEqual(curated[i], original[index], 'prepared activity identity/order changed'));
    assert.ok(curated.some(a => a.mode === 'listen'), lesson.id + ': listening recognition lost');
    const dictations = original.filter(a => a.type === 'dictation');
    assert.ok(dictations.length >= 1, lesson.id + ': original Finnish dictation missing');
    dictations.forEach(a => assert.ok(curated.includes(a), lesson.id + ': dictation removed'));
    assert.ok(curated.some(course.isProductiveCourseActivity), lesson.id + ': contextual production lost');

    for (const goal of lesson.learning_objectives?.grammar || []) {
      for (const reference of goal.evidence || []) {
        const activity = Number.isInteger(reference.activity_index)
          ? original[reference.activity_index]
          : original.find(a => a.type === reference.activity_type && a.item === reference.item_id);
        assert.ok(activity && scored(activity) && curated.includes(activity),
          lesson.id + ': graded grammar evidence removed ' + goal.concept_id);
      }
    }
    for (const { target_id: id } of (lesson.learning_objectives?.lexical || []).filter(g => g.status === 'introduced')) {
      const teach = curated.findIndex(a => a.type === 'teach' && a.item === id);
      const assess = curated.findIndex(a => scored(a) && positives(a).includes(id));
      if (teach >= 0) assert.ok(assess > teach, lesson.id + ': first independent assessment lost ' + id);
      else assert.ok(assess >= 0, lesson.id + ': first independently graded assessment lost ' + id);
    }

    previous += original.length;
    next += curated.length;
    previousGraded += original.filter(scored).length;
    nextGraded += curated.filter(scored).length;
  }
  assert.deepEqual([previous, next, previousGraded, nextGraded], [250, 229, 179, 158]);
});

test('nineteen omitted reviewed typing answers had earlier effective scoring and are truly deferred', () => {
  const section = readPrepared();
  const report = audit.buildReport();
  let omittedTyping = 0;
  for (const spec of specs.filter(s => s.n < 9)) {
    const lesson = section.lessons[spec.n - 1];
    const original = course.lessonEditionActivities(lesson, 'legacy');
    const selected = course.lessonEditionActivities(lesson, 'editorial');
    const reviewed = new Set((lesson.learning_objectives?.lexical || [])
      .filter(g => g.status === 'reviewed').map(g => g.target_id));
    const deferred = new Set();
    for (const index of spec.removed) {
      const activity = original[index];
      assert.equal(activity.type, 'type', lesson.id);
      assert.equal(activity.mode, 'finnish', lesson.id);
      assert.ok(reviewed.has(activity.item), lesson.id + ': cannot omit newly introduced content ' + activity.item);
      assert.ok(section.lessons.slice(0, spec.n - 1).some(earlier =>
        course.lessonEditionActivities(earlier, 'editorial')
          .some(a => scored(a) && positives(a).includes(activity.item))),
      lesson.id + ': target lacks earlier effective scored practice ' + activity.item);
      assert.ok(!selected.some(a => scored(a) && positives(a).includes(activity.item)),
        lesson.id + ': purportedly deferred target is still assessed');
      deferred.add(activity.item);
      omittedTyping++;
    }
    const row = report.lessons.find(entry => entry.lesson_id === lesson.id);
    assert.ok(row?.revised);
    assert.deepEqual(new Set(row.deferred_review_target_ids), deferred);
    assert.equal(row.original_graded_answers - row.learner_graded_answers, spec.removed.length);
  }
  assert.equal(omittedTyping, 19);
});

test('integrated social dialogue omits only duplicate scored activities, not unique recall or skills', () => {
  const section = readPrepared();
  const lesson = section.lessons[8];
  const original = course.lessonEditionActivities(lesson, 'legacy');
  const curated = course.lessonEditionActivities(lesson, 'editorial');
  assert.equal(original[3].type, 'choice');
  assert.equal(original[3].mode, 'meaning');
  assert.equal(original[3].item, 'a13s1-e-073');
  assert.ok(curated.includes(original[2]), 'keep the first meaning recognition');
  assert.ok(curated.some(a => a.type === 'production' && a.item === 'a13s1-e-073'),
    'preserve contextual production rather than redundant recognition');
  assert.equal(original[8].type, 'type');
  assert.equal(original[8].item, 'a13s1-e-074');
  assert.ok(curated.some(a => a.type === 'dictation' && a.item === 'a13s1-e-074'),
    'keep independent dictated recall of e-074');
  assert.ok(section.lessons[9].activities.some(a => scored(a) && positives(a).includes('a13s1-e-074')),
    'keep later graded retrieval of e-074 in checkpoint');
  assert.ok(curated.includes(original[12]), 'integrated dialogue ordering was dropped');
  const passages = curated.filter(a => a.type === 'short-reading');
  assert.equal(passages.length, 4);
  for (const passage of ['a13s1-reading-1', 'a13s1-reading-2']) {
    const questions = passages.filter(a => a.item === passage);
    assert.equal(questions.length, 2);
    assert.equal(new Set(questions.map(a => a.question_item)).size, 2);
  }
  const writings = curated.filter(a => a.type === 'guided-writing');
  assert.equal(writings.length, 1);
  assert.equal(writings[0].expected_items.length, 4);
  assert.equal(lesson.learning_objectives.grammar.flatMap(g => g.evidence || []).length, 8);
  const row = audit.buildReport().lessons.find(entry => entry.lesson_id === lesson.id);
  assert.deepEqual(row.deferred_review_target_ids, [], 'same-lesson duplicate removals are not deferred targets');
});

test('all 60 introduced Section 1 exact targets have later independently scored effective retrieval', () => {
  const section = readPrepared();
  let checked = 0;
  for (const [i, lesson] of section.lessons.entries()) {
    for (const target of lesson.new_targets || []) {
      assert.ok(section.lessons.slice(i + 1).some(later =>
        later.activities.some(a => scored(a) && positives(a).includes(target))),
        lesson.id + ': historical source lost later retrieval of ' + target);
      assert.ok(section.lessons.slice(i + 1).some(later =>
        course.lessonEditionActivities(later, 'editorial')
          .some(a => scored(a) && positives(a).includes(target))),
        lesson.id + ': curated edition lost later retrieval of ' + target);
      checked++;
    }
  }
  assert.equal(checked, 60);
  // The following forms otherwise have only one later multi-item guided-writing
  // aggregate. Keep their independent typed recalls in Lessons 5 and 6.
  assert.ok(course.lessonEditionActivities(section.lessons[4], 'editorial')
    .some(a => a.type === 'type' && a.item === 'a13s1-e-038'));
  assert.ok(course.lessonEditionActivities(section.lessons[5], 'editorial')
    .some(a => a.type === 'type' && a.item === 'a13s1-e-039'));
});

test('checkpoint, all 140 lesson IDs, and course-wide editorial totals remain intact', () => {
  const base = readSource();
  const prepared = readPrepared();
  assert.equal(prepared.lessons[9].editorial_revision, undefined);
  assert.deepEqual(prepared.lessons[9].activities.map(a => a.item || a.question_item || null),
    course.validateSection(base).lessons[9].activities.map(a => a.item || a.question_item || null));
  assert.equal(prepared.lessons[9].passing_score, 0.8);
  assert.equal(prepared.lessons[9].checkpoint_targets.length, 15);
  assert.equal(course.passesLessonRequirement(prepared.lessons[9], 20, 25), true);
  assert.equal(course.passesLessonRequirement(prepared.lessons[9], 19, 25), false);

  const report = audit.buildReport();
  assert.equal(report.summary.shipped_lessons, 140);
  assert.equal(report.summary.editorially_revised_lessons, 80);
  assert.equal(report.summary.removed_grading_opportunities, 254);
  assert.equal(report.summary.learner_lessons_exceeding_30_slides, 0);
  assert.equal(audit.priorityRows(report).length, 60);
  assert.match(audit.priorityMarkdown(report),
    /Remaining uncurated lessons: \*\*60\*\*; all \*\*80\*\* previously curated lessons are excluded\./);
  const ids = report.lessons.map(entry => entry.lesson_id);
  assert.equal(new Set(ids).size, 140);
});

test('current release and bilingual summary remain synchronized', () => {
  const root = path.join(__dirname, '..');
  const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const en = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const fa = fs.readFileSync(path.join(root, 'README.fa.md'), 'utf8');
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.equal(version, '1.73.0');
  assert.equal(pkg.version, version);
  assert.match(changelog, /\[1\.67\.0\]/);
  assert.match(en, /80 curated lessons \/ 254 fewer graded opportunities/);
  assert.match(fa, /۸۰ درس بازنگری‌شده و ۲۵۴ پاسخ نمره‌دار کمتر/);
});
