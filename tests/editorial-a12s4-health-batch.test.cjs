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
      32
    ],
    "old": 34,
    "curated": 33,
    "gradedOld": 21,
    "gradedNew": 20,
    "slides": 19
  },
  {
    "n": 3,
    "removed": [
      26,
      33
    ],
    "old": 35,
    "curated": 33,
    "gradedOld": 24,
    "gradedNew": 22,
    "slides": 14
  },
  {
    "n": 4,
    "removed": [
      29
    ],
    "old": 34,
    "curated": 33,
    "gradedOld": 23,
    "gradedNew": 22,
    "slides": 16
  },
  {
    "n": 5,
    "removed": [
      34
    ],
    "old": 35,
    "curated": 34,
    "gradedOld": 23,
    "gradedNew": 22,
    "slides": 18
  },
  {
    "n": 6,
    "removed": [
      31,
      33
    ],
    "old": 36,
    "curated": 34,
    "gradedOld": 24,
    "gradedNew": 22,
    "slides": 19
  },
  {
    "n": 7,
    "removed": [
      28,
      33,
      35
    ],
    "old": 36,
    "curated": 33,
    "gradedOld": 24,
    "gradedNew": 21,
    "slides": 17
  },
  {
    "n": 8,
    "removed": [
      30,
      33
    ],
    "old": 34,
    "curated": 32,
    "gradedOld": 22,
    "gradedNew": 20,
    "slides": 16
  },
  {
    "n": 9,
    "removed": [
      29,
      30,
      31
    ],
    "old": 38,
    "curated": 35,
    "gradedOld": 35,
    "gradedNew": 32,
    "slides": 24
  }
];
const sectionPath = path.join(__dirname, '..', 'data/course/a1.2-section-4.json');
function loadSection() {
  return course.validateSection(JSON.parse(fs.readFileSync(sectionPath, 'utf8')));
}
const scored = activity => course.scoredOpportunitiesOnSlide(activity) > 0;

test('eight A1.2 Section 4 edits retain unchanged originals and independently scored grammar/first introductions', () => {
  const section = loadSection();
  const checkpoint = section.lessons[9];
  assert.equal(checkpoint.editorial_revision, undefined);
  assert.equal(section.lessons[0].editorial_revision, undefined);
  for (const spec of specs) {
    const lesson = section.lessons[spec.n - 1];
    assert.equal(lesson.editorial_revision.id, 'r189-a12s4-l' + String(spec.n).padStart(2, '0') + '-v2');
    assert.equal(lesson.study_pacing, undefined, 'Section 4 did not save paced editorial drafts in v1.60');
    const original = course.lessonEditionActivities(lesson, 'legacy');
    const edited = course.lessonEditionActivities(lesson, 'editorial');
    const slides = course.lessonEditionSlides(lesson, 'editorial');
    const removed = new Set(spec.removed);
    const retainedIndices = original.flatMap((activity, index) => removed.has(index) ? [] : [index]);
    assert.deepEqual(lesson.editorial_revision.activity_indices, retainedIndices,
      'Selection must retain exact original activities and ordering: ' + lesson.id);
    assert.equal(original.length, spec.old, lesson.id);
    assert.equal(edited.length, spec.curated, lesson.id);
    assert.equal(original.filter(scored).length, spec.gradedOld, lesson.id);
    assert.equal(edited.filter(scored).length, spec.gradedNew, lesson.id);
    assert.equal(slides.length, spec.slides, lesson.id);
    assert.ok(slides.length >= 12 && slides.length <= 25, lesson.id);
    assert.deepEqual(course.flattenLessonSlides(slides), edited, lesson.id);
    for (let i = 0; i < edited.length; i++) {
      assert.strictEqual(edited[i], original[retainedIndices[i]], lesson.id + ': original object identity');
    }
    assert.ok(edited.some(activity => activity.mode === 'listen'), lesson.id + ': missing listening');
    for (const dictation of original.filter(a => a.type === 'dictation')) {
      assert.ok(edited.includes(dictation), lesson.id + ': lost dictated recall ' + dictation.item);
    }
    assert.ok(edited.some(course.isProductiveCourseActivity), lesson.id + ': missing production');
    for (const goal of lesson.learning_objectives?.grammar || []) {
      for (const evidence of goal.evidence || []) {
        const originalActivity = Number.isInteger(evidence.activity_index)
          ? original[evidence.activity_index]
          : original.find(activity => activity.type === evidence.activity_type && activity.item === evidence.item_id);
        assert.ok(originalActivity && edited.includes(originalActivity), lesson.id + ': lost ' + goal.concept_id);
        assert.ok(scored(originalActivity), lesson.id + ': ungraded grammar evidence');
      }
    }
    for (const { target_id: target } of (lesson.learning_objectives?.lexical || []).filter(goal => goal.status === 'introduced')) {
      const teachAt = edited.findIndex(activity => activity.type === 'teach' && activity.item === target);
      const gradedAt = edited.findIndex(activity => activity.item === target && scored(activity));
      assert.ok(teachAt >= 0 && gradedAt > teachAt, lesson.id + ': introduced target not taught/graded ' + target);
    }
  }
});

test('every omitted A1.2 S4 drill is reviewed and previously graded in an earlier EFFECTIVE lesson', () => {
  const section = loadSection();
  const report = audit.buildReport();
  for (const spec of specs) {
    const lesson = section.lessons[spec.n - 1];
    const original = course.lessonEditionActivities(lesson, 'legacy');
    const edited = course.lessonEditionActivities(lesson, 'editorial');
    const reviewed = new Set((lesson.learning_objectives?.lexical || [])
      .filter(goal => goal.status === 'reviewed').map(goal => goal.target_id));
    const expectedDeferred = new Set();
    for (const index of spec.removed) {
      const dropped = original[index];
      assert.equal(dropped.type, 'type', lesson.id + ' removed a non-typing exercise');
      assert.equal(dropped.mode, 'finnish', lesson.id + ' removed non-Finnish response');
      assert.ok(reviewed.has(dropped.item), lesson.id + ': removed an introduced target ' + dropped.item);
      const retainedHere = edited.some(a => scored(a) && a.item === dropped.item);
      const previous = section.lessons.slice(0, spec.n - 1).find(previousLesson =>
        course.lessonEditionActivities(previousLesson, 'editorial').some(a => scored(a) && a.item === dropped.item));
      assert.ok(previous || retainedHere, lesson.id + ': deferred without prior scored evidence ' + dropped.item);
      if (!retainedHere) expectedDeferred.add(dropped.item);
    }
    const entry = report.lessons.find(row => row.lesson_id === lesson.id);
    assert.ok(entry?.revised);
    assert.deepEqual(new Set(entry.deferred_review_target_ids), expectedDeferred,
      lesson.id + ': report must exclude targets still assessed here');
    assert.equal(entry.original_graded_answers - entry.learner_graded_answers, spec.removed.length);
  }
});


test('all 72 introduced Section 4 targets retain independent graded retrieval in later EFFECTIVE lessons', () => {
  const section = loadSection();
  const { positives } = require('../scripts/audit-course-coverage.cjs');
  let count = 0;
  for (const [index, lesson] of section.lessons.entries()) {
    for (const target of lesson.new_targets || []) {
      assert.ok(section.lessons.slice(index + 1).some(later => later.activities.some(a => positives(a).includes(target))),
        lesson.id + ': original later retrieval missing for ' + target);
      assert.ok(section.lessons.slice(index + 1).some(later =>
        course.lessonEditionActivities(later, 'editorial').some(a => positives(a).includes(target))),
        lesson.id + ': edited editions lost every later scored answer for ' + target);
      count++;
    }
  }
  assert.equal(count, 72);
});
test('integrated health dialogue retains both passages, all reading assessments, writing and grammar', () => {
  const section = loadSection();
  const lesson = section.lessons[8];
  const edited = course.lessonEditionActivities(lesson, 'editorial');
  const original = course.lessonEditionActivities(lesson, 'legacy');
  const retained = new Set(lesson.editorial_revision.activity_indices);
  for (const index of [0,1,2,9,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]) {
    assert.ok(retained.has(index), 'lost reading, listening, grammar or writing index ' + index);
  }
  const readings = edited.filter(activity => activity.type === 'short-reading');
  assert.equal(readings.length, 8);
  assert.equal(readings.filter(a => a.item === 'a12s4-extra-14').length, 4);
  assert.equal(readings.filter(a => a.item === 'a12s4-extra-15').length, 4);
  assert.ok(edited.some(a => a.type === 'dialogue-order'));
  assert.ok(edited.some(a => a.type === 'guided-writing'));
  assert.ok(edited.some(a => a.mode === 'listen'));
  assert.equal(original[10].type, 'dictation', 'legacy listening preparation converts this slot to Finnish dictation');
  assert.ok(edited.includes(original[10]), 'retain the first dictation in the edited dialogue');
  assert.equal(lesson.learning_objectives.grammar.flatMap(g => g.evidence || []).length, 8);
  assert.equal(original.length, 38, 'archive needed for historical progress continuity');
});

test('release metadata, cumulative editorial totals and uncurated priority list stay synchronized', () => {
  const root=path.join(__dirname,'..');
  const version=fs.readFileSync(path.join(root,'VERSION'),'utf8').trim();
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const changelog=fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8');
  const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
  const readmeFa=fs.readFileSync(path.join(root,'README.fa.md'),'utf8');
  assert.equal(version, '1.68.0');
  assert.equal(pkg.version,version);
  assert.match(changelog,/\[1\.60\.0\]/);
  assert.match(readme,/15 curated lessons \/ 137 fewer graded opportunities/);
  assert.match(readmeFa,/۱۵ درس بازنگری‌شده، ۱۳۷ پاسخ نمره‌دار کمتر/);
  const report=audit.buildReport();
  assert.equal(report.summary.shipped_lessons,140);
  assert.equal(report.summary.editorially_revised_lessons, 63);
  assert.equal(report.summary.removed_grading_opportunities, 221);
  assert.equal(report.summary.learner_lessons_exceeding_30_slides,0);
  assert.equal(audit.priorityRows(report).length, 77);
  assert.match(audit.priorityMarkdown(report),/Remaining uncurated lessons: \*\*77\*\*; all \*\*63\*\* previously curated lessons are excluded\./);
});
