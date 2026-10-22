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
      25,
      27,
      28
    ],
    "old": 29,
    "edited": 26,
    "origGraded": 19,
    "graded": 16,
    "slides": 19,
    "hash": "dfab3ea1",
    "reading": 0
  },
  {
    "n": 3,
    "removed": [
      27,
      31
    ],
    "old": 32,
    "edited": 30,
    "origGraded": 23,
    "graded": 21,
    "slides": 20,
    "hash": "7a9d3abd",
    "reading": 0
  },
  {
    "n": 4,
    "removed": [
      24,
      25
    ],
    "old": 29,
    "edited": 27,
    "origGraded": 21,
    "graded": 19,
    "slides": 17,
    "hash": "bf12f9a5",
    "reading": 0
  },
  {
    "n": 5,
    "removed": [
      27,
      28,
      30
    ],
    "old": 32,
    "edited": 29,
    "origGraded": 22,
    "graded": 19,
    "slides": 20,
    "hash": "7d1384a0",
    "reading": 0
  },
  {
    "n": 6,
    "removed": [
      26,
      29,
      30
    ],
    "old": 31,
    "edited": 28,
    "origGraded": 20,
    "graded": 17,
    "slides": 20,
    "hash": "3a172c81",
    "reading": 0
  },
  {
    "n": 7,
    "removed": [
      26,
      30,
      31
    ],
    "old": 32,
    "edited": 29,
    "origGraded": 23,
    "graded": 20,
    "slides": 20,
    "hash": "4f23e69e",
    "reading": 0
  },
  {
    "n": 8,
    "removed": [
      25,
      26,
      27,
      29
    ],
    "old": 31,
    "edited": 27,
    "origGraded": 23,
    "graded": 19,
    "slides": 18,
    "hash": "e9cbd626",
    "reading": 0
  },
  {
    "n": 9,
    "removed": [
      33
    ],
    "old": 34,
    "edited": 33,
    "origGraded": 32,
    "graded": 31,
    "slides": 21,
    "hash": "6c32d572",
    "reading": 4
  }
];
const sourcePath = path.join(__dirname, '..', 'data/course/a1.3-section-3.json');
const rawSection = () => JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const preparedSection = () => course.validateSection(rawSection());
const scored = activity => course.scoredOpportunitiesOnSlide(activity) > 0;
function fnv32(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) value = Math.imul(value ^ text.charCodeAt(index), 16777619) >>> 0;
  return value.toString(16).padStart(8, '0');
}

test('eight A1.3 S3 editorial editions retain original activity identities, grammar and all prepared dictations', () => {
  const raw = rawSection();
  const prepared = preparedSection();
  assert.equal(prepared.lessons.length, 10);
  assert.equal(prepared.lessons[0].editorial_revision, undefined);
  assert.equal(prepared.lessons[9].editorial_revision, undefined, 'section checkpoint remains unchanged');
  for (const sp of specs) {
    const lesson = prepared.lessons[sp.n - 1];
    const authored = raw.lessons[sp.n - 1];
    const archive = course.lessonEditionActivities(lesson, 'legacy');
    const edited = course.lessonEditionActivities(lesson, 'editorial');
    const slides = course.lessonEditionSlides(lesson, 'editorial');
    const removed = new Set(sp.removed);
    const expected = archive.flatMap((a, i) => removed.has(i) ? [] : [i]);
    assert.equal(fnv32(JSON.stringify(authored.activities)), sp.hash, lesson.id + ': historic activity fingerprint changed');
    assert.equal(lesson.editorial_revision.id, 'r189-a13s3-l' + String(sp.n).padStart(2, '0') + '-v1');
    assert.equal(lesson.study_pacing, undefined, lesson.id + ': no paced historical draft migration');
    assert.deepEqual(lesson.editorial_revision.activity_indices, expected, lesson.id + ': wrong ordered original indices');
    assert.equal(archive.length, sp.old, lesson.id);
    assert.equal(edited.length, sp.edited, lesson.id);
    assert.equal(archive.filter(scored).length, sp.origGraded, lesson.id);
    assert.equal(edited.filter(scored).length, sp.graded, lesson.id);
    assert.equal(slides.length, sp.slides, lesson.id);
    assert.ok(slides.length >= 12 && slides.length <= 25, lesson.id + ': editorial slide budget exceeded');
    assert.deepEqual(course.flattenLessonSlides(slides), edited, lesson.id + ': grouped slide order changed');
    expected.forEach((idx, i) => assert.strictEqual(edited[i], archive[idx], lesson.id + ': source identity mutated'));
    assert.ok(edited.some(a => a.mode === 'listen'), lesson.id + ': missing listening recognition');
    const dictations = archive.filter(a => a.type === 'dictation');
    assert.ok(dictations.length >= 1, lesson.id + ': expected prepared dictation');
    for (const d of dictations) assert.ok(edited.includes(d), lesson.id + ': prepared Finnish dictation removed ' + d.item);
    assert.ok(edited.some(course.isProductiveCourseActivity), lesson.id + ': no productive language exercise');
    assert.equal(edited.filter(a => a.type === 'short-reading').length, sp.reading, lesson.id + ': lost reading');
    for (const goal of lesson.learning_objectives?.grammar || []) for (const evidence of goal.evidence || []) {
      const ref = Number.isInteger(evidence.activity_index)
        ? archive[evidence.activity_index]
        : archive.find(a => a.type === evidence.activity_type && a.item === evidence.item_id);
      assert.ok(ref && edited.includes(ref) && scored(ref), lesson.id + ': missing positive grammar evidence ' + goal.concept_id);
    }
    for (const { target_id: id } of (lesson.learning_objectives?.lexical || []).filter(g => g.status === 'introduced')) {
      const firstTeach = edited.findIndex(a => a.type === 'teach' && a.item === id);
      const firstScore = edited.findIndex(a => scored(a) && positives(a).includes(id));
      assert.ok(firstTeach >= 0 && firstScore > firstTeach, lesson.id + ': first teach/score lost ' + id);
    }
  }
});

test('all 21 omitted reviewed Finnish typing drills have earlier effective scored evidence', () => {
  const section = preparedSection();
  const report = audit.buildReport();
  let deleted = 0;
  for (const sp of specs) {
    const lesson = section.lessons[sp.n - 1];
    const archive = course.lessonEditionActivities(lesson, 'legacy');
    const edited = course.lessonEditionActivities(lesson, 'editorial');
    const reviewed = new Set((lesson.learning_objectives?.lexical || [])
      .filter(g => g.status === 'reviewed').map(g => g.target_id));
    const deferred = new Set();
    for (const index of sp.removed) {
      const activity = archive[index];
      assert.equal(activity.type, 'type', lesson.id);
      assert.equal(activity.mode, 'finnish', lesson.id);
      assert.ok(reviewed.has(activity.item), lesson.id + ': deleted a first-introduced item ' + activity.item);
      const earlier = section.lessons.slice(0, sp.n - 1).some(previous =>
        course.lessonEditionActivities(previous, 'editorial')
          .some(a => scored(a) && positives(a).includes(activity.item)));
      assert.ok(earlier, lesson.id + ': no earlier effective scored review for ' + activity.item);
      assert.ok(!edited.some(a => scored(a) && positives(a).includes(activity.item)),
        lesson.id + ': item not actually deferred by this selection ' + activity.item);
      deferred.add(activity.item);
      deleted++;
    }
    const row = report.lessons.find(r => r.lesson_id === lesson.id);
    assert.ok(row?.revised);
    assert.deepEqual(new Set(row.deferred_review_target_ids), deferred, lesson.id + ': deferred-target inventory diverged');
    assert.equal(row.original_graded_answers - row.learner_graded_answers, sp.removed.length, lesson.id);
  }
  assert.equal(deleted, 21);
});

test('all 56 newly introduced A1.3 S3 targets retain later independently graded EFFECTIVE retrieval', () => {
  const section = preparedSection();
  let checked = 0;
  for (const [n, lesson] of section.lessons.entries()) for (const target of lesson.new_targets || []) {
    assert.ok(section.lessons.slice(n + 1).some(later =>
      later.activities.some(a => scored(a) && positives(a).includes(target))),
      lesson.id + ': missing original later positive practice ' + target);
    assert.ok(section.lessons.slice(n + 1).some(later =>
      course.lessonEditionActivities(later, 'editorial').some(a => scored(a) && positives(a).includes(target))),
      lesson.id + ': the edited learner path lost every later scored review for ' + target);
    checked++;
  }
  assert.equal(checked, 56);
});

test('study/work integrated scenario retains instructions sequence, both readings, grammar and guided writing', () => {
  const section = preparedSection();
  const stepLesson = course.lessonEditionActivities(section.lessons[2], 'editorial');
  assert.ok(stepLesson.some(a => a.type === 'sequence-order'), 'instruction sequence exercise must survive');
  const integrated = section.lessons[8];
  const archive = course.lessonEditionActivities(integrated, 'legacy');
  const edited = course.lessonEditionActivities(integrated, 'editorial');
  const texts = edited.filter(a => a.type === 'short-reading');
  assert.equal(texts.length, 4);
  for (const passage of ['a13s3-reading-1', 'a13s3-reading-2']) {
    const questions = texts.filter(a => a.item === passage);
    assert.equal(questions.length, 2);
    assert.equal(new Set(questions.map(a => a.question_item)).size, 2);
  }
  const writing = edited.filter(a => a.type === 'guided-writing');
  assert.equal(writing.length, 1);
  assert.equal(writing[0].expected_items.length, 4);
  assert.equal(integrated.learning_objectives.grammar.flatMap(g => g.evidence || []).length, 12);
  assert.ok(archive.some(a => a.type === 'dictation') && edited.some(a => a.type === 'dictation'));
  const checkpoint = section.lessons[9];
  assert.equal(checkpoint.editorial_revision, undefined);
  assert.equal(course.lessonEditionActivities(checkpoint, 'editorial').length,
    course.lessonEditionActivities(checkpoint, 'legacy').length);
});

test('v1.64.0 bilingual status and deterministic 140-lesson audit match the current release', () => {
  const root = path.join(__dirname, '..');
  const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const en = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const fa = fs.readFileSync(path.join(root, 'README.fa.md'), 'utf8');
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.equal(version, '1.65.0');
  assert.equal(pkg.version, version);
  assert.match(changelog, /\[1\.64\.0\]/);
  assert.match(en, /39 curated lessons \/ 170 fewer graded opportunities/);
  assert.match(fa, /۳۹ درس بازنگری‌شده و ۱۷۰ پاسخ نمره‌دار کمتر/);
  const report = audit.buildReport();
  assert.equal(report.summary.shipped_lessons, 140);
  assert.equal(report.summary.editorially_revised_lessons, 47);
  assert.equal(report.summary.removed_grading_opportunities, 189);
  assert.equal(report.summary.learner_lessons_exceeding_30_slides, 0);
  assert.equal(audit.priorityRows(report).length, 93);
  assert.match(audit.priorityMarkdown(report), /Remaining uncurated lessons: \*\*93\*\*; all \*\*47\*\* previously curated lessons are excluded\./);
});
