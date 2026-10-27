'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const audit = require('../scripts/audit-editorial-lesson-load.cjs');
const { positives } = require('../scripts/audit-course-coverage.cjs');

const specs = [
  {
    "n": 2,
    "removed": [
      23
    ],
    "old": 25,
    "edited": 24,
    "origGraded": 16,
    "graded": 15,
    "slides": 18,
    "hash": "8d73d837",
    "reading": 0
  },
  {
    "n": 3,
    "removed": [
      26,
      29
    ],
    "old": 30,
    "edited": 28,
    "origGraded": 20,
    "graded": 18,
    "slides": 19,
    "hash": "3b688e3d",
    "reading": 0
  },
  {
    "n": 4,
    "removed": [
      27,
      28,
      31
    ],
    "old": 33,
    "edited": 30,
    "origGraded": 23,
    "graded": 20,
    "slides": 20,
    "hash": "37d6948c",
    "reading": 0
  },
  {
    "n": 5,
    "removed": [
      29,
      30,
      33,
      34
    ],
    "old": 35,
    "edited": 31,
    "origGraded": 24,
    "graded": 20,
    "slides": 22,
    "hash": "776da7f1",
    "reading": 0
  },
  {
    "n": 6,
    "removed": [
      31,
      33
    ],
    "old": 34,
    "edited": 32,
    "origGraded": 24,
    "graded": 22,
    "slides": 21,
    "hash": "c6fd2a1b",
    "reading": 0
  },
  {
    "n": 7,
    "removed": [
      30,
      32,
      35
    ],
    "old": 37,
    "edited": 34,
    "origGraded": 26,
    "graded": 23,
    "slides": 24,
    "hash": "b8912719",
    "reading": 2
  },
  {
    "n": 8,
    "removed": [
      25,
      26,
      29,
      30
    ],
    "old": 31,
    "edited": 27,
    "origGraded": 21,
    "graded": 17,
    "slides": 19,
    "hash": "f48fc7aa",
    "reading": 0
  },
  {
    "n": 9,
    "removed": [
      29
    ],
    "old": 34,
    "edited": 33,
    "origGraded": 32,
    "graded": 31,
    "slides": 21,
    "hash": "01925582",
    "reading": 4
  }
];
const file = path.join(__dirname, '..', 'data/course/a1.3-section-2.json');
const rawSection = () => JSON.parse(fs.readFileSync(file, 'utf8'));
const preparedSection = () => course.validateSection(rawSection());
const scored = a => course.scoredOpportunitiesOnSlide(a) > 0;
function fnv32(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16).padStart(8, '0');
}

test('eight A1.3 Section 2 curated lessons preserve archived activities and every grammar/listening introduction', () => {
  const source = rawSection();
  const section = preparedSection();
  assert.equal(section.lessons.length, 10);
  assert.equal(section.lessons[0].editorial_revision, undefined);
  assert.equal(section.lessons[9].editorial_revision, undefined, 'section checkpoint remains unmodified');
  for (const sp of specs) {
    const saved = source.lessons[sp.n - 1];
    const lesson = section.lessons[sp.n - 1];
    const archive = course.lessonEditionActivities(lesson, 'legacy');
    const edited = course.lessonEditionActivities(lesson, 'editorial');
    const slides = course.lessonEditionSlides(lesson, 'editorial');
    const d = new Set(sp.removed);
    const indices = archive.flatMap((_, i) => d.has(i) ? [] : [i]);
    assert.equal(fnv32(JSON.stringify(saved.activities)), sp.hash, 'historical authored source mutated: ' + lesson.id);
    assert.deepEqual(lesson.editorial_revision.activity_indices, indices, lesson.id);
    assert.equal(lesson.editorial_revision.id, 'r189-a13s2-l' + String(sp.n).padStart(2, '0') + '-v1');
    assert.equal(lesson.study_pacing, undefined, 'no stored paced drafts are migrated');
    assert.equal(archive.length, sp.old, lesson.id);
    assert.equal(edited.length, sp.edited, lesson.id);
    assert.equal(archive.filter(scored).length, sp.origGraded, lesson.id);
    assert.equal(edited.filter(scored).length, sp.graded, lesson.id);
    assert.equal(slides.length, sp.slides, lesson.id);
    assert.ok(slides.length >= 12 && slides.length <= 25, lesson.id);
    assert.deepEqual(course.flattenLessonSlides(slides), edited, lesson.id);
    indices.forEach((index, i) => assert.strictEqual(edited[i], archive[index], lesson.id + ': changed original activity'));
    assert.ok(edited.some(a => a.mode === 'listen'), lesson.id + ': missing Finnish listening');
    const dictations = archive.filter(a => a.type === 'dictation');
    assert.ok(dictations.length >= 1, lesson.id + ': source listening dictation transformation missing');
    dictations.forEach(a => assert.ok(edited.includes(a), lesson.id + ': missing prepared dictation ' + a.item));
    assert.ok(edited.some(course.isProductiveCourseActivity), lesson.id + ': missing language production');
    assert.equal(edited.filter(a => a.type === 'short-reading').length, sp.reading);
    for (const concept of lesson.learning_objectives?.grammar || []) for (const evidence of concept.evidence || []) {
      const originalActivity = Number.isInteger(evidence.activity_index)
        ? archive[evidence.activity_index]
        : archive.find(a => a.type === evidence.activity_type && a.item === evidence.item_id);
      assert.ok(originalActivity && edited.includes(originalActivity) && scored(originalActivity),
        lesson.id + ': missing positive grammar evidence ' + concept.concept_id);
    }
    for (const item of (lesson.learning_objectives?.lexical || []).filter(x => x.status === 'introduced')) {
      const teachAt = edited.findIndex(a => a.type === 'teach' && a.item === item.target_id);
      const scoredAt = edited.findIndex(a => scored(a) && positives(a).includes(item.target_id));
      assert.ok(teachAt >= 0 && scoredAt > teachAt, lesson.id + ': new target lost teach-first assessment ' + item.target_id);
    }
  }
});

test('all 20 omitted reviewed forms had graded previous EFFECTIVE practice', () => {
  const section = preparedSection();
  const report = audit.buildReport();
  let removed = 0;
  for (const sp of specs) {
    const lesson = section.lessons[sp.n - 1];
    const archive = course.lessonEditionActivities(lesson, 'legacy');
    const kept = course.lessonEditionActivities(lesson, 'editorial');
    const reviewed = new Set((lesson.learning_objectives?.lexical || []).filter(g => g.status === 'reviewed').map(g => g.target_id));
    const deferred = new Set();
    for (const index of sp.removed) {
      const activity = archive[index];
      assert.equal(activity.type, 'type', lesson.id);
      assert.equal(activity.mode, 'finnish', lesson.id);
      assert.ok(reviewed.has(activity.item), lesson.id + ': first-introduced item was deleted ' + activity.item);
      assert.ok(section.lessons.slice(0, sp.n - 1).some(previous =>
        course.lessonEditionActivities(previous, 'editorial').some(a =>
          scored(a) && positives(a).includes(activity.item))),
        lesson.id + ': removed only or first positively scored review ' + activity.item);
      assert.ok(!kept.some(a => scored(a) && positives(a).includes(activity.item)),
        lesson.id + ': target still scored here, audit deferral requires update');
      deferred.add(activity.item);
      removed++;
    }
    const row = report.lessons.find(r => r.lesson_id === lesson.id);
    assert.ok(row?.revised);
    assert.deepEqual(new Set(row.deferred_review_target_ids), deferred, lesson.id + ': incomplete deferred target audit');
    assert.equal(row.original_graded_answers - row.learner_graded_answers, sp.removed.length, lesson.id);
  }
  assert.equal(removed, 20);
});

test('all 59 Section 2 newly introduced exact targets retain subsequent graded recall in effective editions', () => {
  const section = preparedSection();
  let count = 0;
  for (const [index, lesson] of section.lessons.entries()) for (const target of lesson.new_targets || []) {
    assert.ok(section.lessons.slice(index + 1).some(later =>
      later.activities.some(a => scored(a) && positives(a).includes(target))),
      lesson.id + ': original later graded retrieval missing ' + target);
    assert.ok(section.lessons.slice(index + 1).some(later =>
      course.lessonEditionActivities(later, 'editorial').some(a => scored(a) && positives(a).includes(target))),
      lesson.id + ': later EFFECTIVE graded retrieval lost ' + target);
    count++;
  }
  assert.equal(count, 59);
});

test('integrated neighborhood reading and message writing stay graded; checkpoint stays intact', () => {
  const section = preparedSection();
  const lesson7 = section.lessons[6];
  const lesson9 = section.lessons[8];
  const edited7 = course.lessonEditionActivities(lesson7, 'editorial');
  const edited9 = course.lessonEditionActivities(lesson9, 'editorial');
  assert.equal(edited7.filter(a => a.type === 'short-reading').length, 2);
  assert.equal(edited9.filter(a => a.type === 'short-reading').length, 4);
  assert.ok(edited9.some(a => a.type === 'guided-writing'));
  assert.equal(lesson9.learning_objectives.grammar.flatMap(g => g.evidence || []).length, 9);
  assert.equal(course.lessonEditionActivities(section.lessons[9], 'editorial').length,
    course.lessonEditionActivities(section.lessons[9], 'legacy').length);
});

test('v1.63.0 bilingual release metadata and cumulative priority report stay synchronized', () => {
  const root = path.join(__dirname, '..');
  const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const en = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const fa = fs.readFileSync(path.join(root, 'README.fa.md'), 'utf8');
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.equal(version, '1.73.1');
  assert.equal(pkg.version, version);
  assert.match(changelog, /\[1\.63\.0\]/);
  assert.match(en, /31 curated lessons \/ 149 fewer graded opportunities/);
  assert.match(fa, /۳۱ درس بازنگری‌شده و ۱۴۹ پاسخ نمره‌دار کمتر/);
  const report = audit.buildReport();
  assert.equal(report.summary.shipped_lessons, 140);
  assert.equal(report.summary.editorially_revised_lessons, 80);
  assert.equal(report.summary.removed_grading_opportunities, 254);
  assert.equal(report.summary.learner_lessons_exceeding_30_slides, 0);
  assert.equal(audit.priorityRows(report).length, 60);
  assert.match(audit.priorityMarkdown(report), /Remaining uncurated lessons: \*\*60\*\*; all \*\*80\*\* previously curated lessons are excluded\./);
});
