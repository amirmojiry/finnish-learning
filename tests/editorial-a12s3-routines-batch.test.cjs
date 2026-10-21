'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const audit = require('../scripts/audit-editorial-lesson-load.cjs');

const specs = [
  {
    "n": 2,
    "removed": [
      28
    ],
    "old": 30,
    "edited": 29,
    "oldGraded": 20,
    "newGraded": 19,
    "slides": 14,
    "hash": "8397d286"
  },
  {
    "n": 3,
    "removed": [
      25
    ],
    "old": 31,
    "edited": 30,
    "oldGraded": 20,
    "newGraded": 19,
    "slides": 14,
    "hash": "909556db"
  },
  {
    "n": 4,
    "removed": [
      29
    ],
    "old": 36,
    "edited": 35,
    "oldGraded": 24,
    "newGraded": 23,
    "slides": 17,
    "hash": "04dedc15"
  },
  {
    "n": 5,
    "removed": [
      25,
      27,
      31
    ],
    "old": 33,
    "edited": 30,
    "oldGraded": 23,
    "newGraded": 20,
    "slides": 15,
    "hash": "040c5731"
  },
  {
    "n": 6,
    "removed": [
      33,
      38
    ],
    "old": 39,
    "edited": 37,
    "oldGraded": 25,
    "newGraded": 23,
    "slides": 19,
    "hash": "53448f22"
  },
  {
    "n": 7,
    "removed": [
      26,
      28,
      29,
      31,
      33
    ],
    "old": 35,
    "edited": 30,
    "oldGraded": 24,
    "newGraded": 19,
    "slides": 15,
    "hash": "99e7ca57"
  },
  {
    "n": 8,
    "removed": [
      22,
      25,
      28
    ],
    "old": 33,
    "edited": 30,
    "oldGraded": 22,
    "newGraded": 19,
    "slides": 15,
    "hash": "c517bf5d"
  },
  {
    "n": 9,
    "removed": [
      29,
      31,
      34,
      39
    ],
    "old": 40,
    "edited": 36,
    "oldGraded": 37,
    "newGraded": 33,
    "slides": 23,
    "hash": "fb3c4bd0"
  }
];
const sectionPath = path.join(__dirname, '..', 'data/course/a1.2-section-3.json');
function rawSection() {
  return JSON.parse(fs.readFileSync(sectionPath, 'utf8'));
}
function section() {
  return course.validateSection(rawSection());
}
const scored = activity => course.scoredOpportunitiesOnSlide(activity) > 0;
function fnv32(text) {
  let result = 2166136261;
  for (let i = 0; i < text.length; i++) result = Math.imul(result ^ text.charCodeAt(i), 16777619) >>> 0;
  return result.toString(16).padStart(8, '0');
}

test('all eight A1.2 S3 revisions preserve original archived activities and exact lesson identities', () => {
  const raw = rawSection();
  const prepared = section();
  assert.equal(prepared.lessons.length, 10);
  assert.equal(prepared.lessons[0].editorial_revision, undefined);
  assert.equal(prepared.lessons[9].editorial_revision, undefined, 'the section checkpoint cannot be silently rewritten');
  for (const spec of specs) {
    const original = raw.lessons[spec.n - 1];
    const lesson = prepared.lessons[spec.n - 1];
    const archived = course.lessonEditionActivities(lesson, 'legacy');
    const edited = course.lessonEditionActivities(lesson, 'editorial');
    const slides = course.lessonEditionSlides(lesson, 'editorial');
    const kept = original.activities.flatMap((activity, index) => spec.removed.includes(index) ? [] : [index]);
    assert.equal(fnv32(JSON.stringify(original.activities)), spec.hash, 'archived original changed for ' + lesson.id);
    assert.equal(archived.length, spec.old, lesson.id);
    assert.equal(edited.length, spec.edited, lesson.id);
    assert.equal(archived.filter(scored).length, spec.oldGraded, lesson.id);
    assert.equal(edited.filter(scored).length, spec.newGraded, lesson.id);
    assert.equal(slides.length, spec.slides, lesson.id);
    assert.ok(slides.length >= 12 && slides.length <= 25, lesson.id);
    assert.deepEqual(lesson.editorial_revision.activity_indices, kept, 'wrong ordered original indices ' + lesson.id);
    assert.deepEqual(course.flattenLessonSlides(slides), edited, lesson.id);
    for (const [i, index] of kept.entries()) assert.strictEqual(edited[i], archived[index], 'lost original activity identity');
    assert.ok(edited.some(a => a.mode === 'listen'), lesson.id + ': missing listening recognition');
    const dictations = archived.filter(a => a.type === 'dictation');
    assert.ok(dictations.length > 0, lesson.id + ': missing original dictation');
    for (const dictation of dictations) assert.ok(edited.includes(dictation), lesson.id + ': lost prepared dictation ' + dictation.item);
    assert.ok(edited.some(course.isProductiveCourseActivity), lesson.id + ': no independently productive language');
    for (const goal of lesson.learning_objectives?.grammar || []) for (const evidence of goal.evidence || []) {
      const reference = Number.isInteger(evidence.activity_index)
        ? archived[evidence.activity_index]
        : archived.find(a => a.type === evidence.activity_type && a.item === evidence.item_id);
      assert.ok(reference && edited.includes(reference) && scored(reference), lesson.id + ': lost indexed grammar evidence ' + goal.concept_id);
    }
    for (const { target_id: target } of (lesson.learning_objectives?.lexical || []).filter(x => x.status === 'introduced')) {
      const teaching = edited.findIndex(a => a.type === 'teach' && a.item === target);
      const firstScored = edited.findIndex(a => scored(a) && a.item === target);
      assert.ok(teaching >= 0 && firstScored > teaching, lesson.id + ': missing first teaching/assessment ' + target);
    }
    assert.equal(lesson.id, 'a1.2-section-3-lesson-' + spec.n);
  }
});

test('every omitted type-only reviewed item was graded in an earlier effective A1.2 S3 lesson', () => {
  const prepared = section();
  const report = audit.buildReport();
  let removedTotal = 0;
  for (const spec of specs) {
    const lesson = prepared.lessons[spec.n - 1];
    const original = course.lessonEditionActivities(lesson, 'legacy');
    const edited = course.lessonEditionActivities(lesson, 'editorial');
    const reviewed = new Set((lesson.learning_objectives?.lexical || [])
      .filter(goal => goal.status === 'reviewed').map(goal => goal.target_id));
    const deferred = new Set();
    for (const index of spec.removed) {
      const dropped = original[index];
      assert.equal(dropped.type, 'type', lesson.id + ' tried to remove a non-typing activity at ' + index);
      assert.equal(dropped.mode, 'finnish');
      assert.ok(reviewed.has(dropped.item), lesson.id + ': removed first introduction ' + dropped.item);
      const earlier = prepared.lessons.slice(0, spec.n - 1)
        .some(prior => course.lessonEditionActivities(prior, 'editorial')
          .some(activity => scored(activity) && activity.item === dropped.item));
      assert.ok(earlier, lesson.id + ': removed target without earlier effective scored evidence ' + dropped.item);
      assert.ok(!edited.some(a => scored(a) && a.item === dropped.item), lesson.id + ': removed duplicate still assessed locally');
      deferred.add(dropped.item);
      removedTotal++;
    }
    const entry = report.lessons.find(row => row.lesson_id === lesson.id);
    assert.ok(entry?.revised);
    assert.deepEqual(new Set(entry.deferred_review_target_ids), deferred, lesson.id + ': audit deferred review mismatch');
    assert.equal(entry.original_graded_answers - entry.learner_graded_answers, spec.removed.length);
  }
  assert.equal(removedTotal, 20);
});


test('all 79 introduced Section 3 exact targets keep independent positive retrieval in a LATER EFFECTIVE lesson', () => {
  const prepared = section();
  const { positives } = require('../scripts/audit-course-coverage.cjs');
  let checked = 0;
  for (const [index, lesson] of prepared.lessons.entries()) {
    for (const id of lesson.new_targets || []) {
      const historicalLater = prepared.lessons.slice(index + 1)
        .some(later => later.activities.some(a => positives(a).includes(id)));
      assert.ok(historicalLater, lesson.id + ': historical later retrieval missing for ' + id);
      const effectiveLater = prepared.lessons.slice(index + 1)
        .some(later => course.lessonEditionActivities(later, 'editorial')
          .some(a => positives(a).includes(id)));
      assert.ok(effectiveLater, lesson.id + ': editorial selection silently erased all later spaced retrieval for ' + id);
      checked++;
    }
  }
  assert.equal(checked, 79);
});

test('integrated weekly reading and guided writing retain two full passages and dictated recall', () => {
  const prepared = section();
  const lesson = prepared.lessons[8];
  const archived = course.lessonEditionActivities(lesson, 'legacy');
  const edited = course.lessonEditionActivities(lesson, 'editorial');
  const kept = new Set(lesson.editorial_revision.activity_indices);
  for (const index of [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27]) {
    assert.ok(kept.has(index), 'integrated dialogue/reading/production/dictation index lost: ' + index);
  }
  assert.equal(archived[13].type, 'dictation', 'last repeated source typing converts to dictated recall');
  assert.ok(edited.includes(archived[13]), 'preserve prepared Finnish dictation');
  const readings = edited.filter(a => a.type === 'short-reading');
  assert.equal(readings.length, 8);
  for (const passage of ['a12s3-reading-week', 'a12s3-reading-time']) {
    const questions = readings.filter(a => a.item === passage);
    assert.equal(questions.length, 4);
    assert.equal(new Set(questions.map(a => a.question_item)).size, 4);
  }
  assert.ok(edited.some(a => a.type === 'dialogue-order'));
  const writing = edited.filter(a => a.type === 'guided-writing');
  assert.equal(writing.length, 1);
  assert.equal(writing[0].expected_items.length, 4);
  assert.equal(lesson.learning_objectives.grammar.flatMap(g => g.evidence || []).length, 6);
});

test('current version, cumulative counts and priority report reflect eight more curated lessons', () => {
  const root = path.join(__dirname, '..');
  const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const en = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const fa = fs.readFileSync(path.join(root, 'README.fa.md'), 'utf8');
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.equal(version, '1.62.0');
  assert.equal(pkg.version, version);
  assert.match(changelog, /\[1\.61\.0\]/);
  assert.match(en, /23 curated lessons \/ 129 fewer graded opportunities/);
  assert.match(fa, /۲۳ درس بازنگری‌شده و ۱۲۹ پاسخ نمره‌دار کمتر/);
  const report = audit.buildReport();
  assert.equal(report.summary.shipped_lessons, 140);
  assert.equal(report.summary.editorially_revised_lessons, 23);
  assert.equal(report.summary.removed_grading_opportunities, 129);
  assert.equal(report.summary.learner_lessons_exceeding_30_slides, 0);
  assert.equal(audit.priorityRows(report).length, 117);
  assert.match(audit.priorityMarkdown(report), /Remaining uncurated lessons: \*\*117\*\*; all \*\*23\*\* previously curated lessons are excluded\./);
});
