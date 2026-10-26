'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const audit = require('../scripts/audit-editorial-lesson-load.cjs');
const { positives } = require('../scripts/audit-course-coverage.cjs');

const specs = [
  { n: 2, removed: [14], old: 28, edited: 27, oldGraded: 20, graded: 19, slides: 16, hash: '55589fb7' },
  { n: 3, removed: [12], old: 30, edited: 29, oldGraded: 22, graded: 21, slides: 17, hash: 'f7502c05' },
  { n: 4, removed: [10, 14], old: 25, edited: 23, oldGraded: 19, graded: 17, slides: 15, hash: '5061ab22' },
  { n: 5, removed: [16], old: 26, edited: 25, oldGraded: 18, graded: 17, slides: 16, hash: '51331e6d' },
  { n: 6, removed: [14], old: 28, edited: 27, oldGraded: 20, graded: 19, slides: 16, hash: '808643d0' },
  { n: 7, removed: [17, 23], old: 31, edited: 29, oldGraded: 22, graded: 20, slides: 18, hash: 'fb059086' },
  { n: 8, removed: [17], old: 32, edited: 31, oldGraded: 23, graded: 22, slides: 19, hash: '1b77ad5b' },
  { n: 9, removed: [2, 4], old: 25, edited: 23, oldGraded: 25, graded: 23, slides: 19, hash: '12043cd2' },
];

const sourcePath = path.join(__dirname, '../data/course/a2.1-section-1.json');
const rawSection = () => JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const section = () => course.validateSection(rawSection());
const scored = activity => course.scoredOpportunitiesOnSlide(activity) > 0;

function fnv32(value) {
  let n = 2166136261;
  const json = JSON.stringify(value);
  for (let i = 0; i < json.length; i++) n = Math.imul(n ^ json.charCodeAt(i), 16777619) >>> 0;
  return n.toString(16).padStart(8, '0');
}
function positiveIn(activities, target) {
  return activities.some(activity => scored(activity) && positives(activity).includes(target));
}
function activities(lesson, edition) {
  return course.lessonEditionActivities(lesson, edition);
}

test('eight travel/past-tense lessons retain archived source, full teaching and graded objectives', () => {
  const raw = rawSection(), s = section();
  assert.equal(s.lessons.length, 10);
  assert.equal(fnv32(raw.lessons[0].activities), '0f36accf');
  assert.equal(fnv32(raw.lessons[9].activities), 'b4d25305');
  assert.equal(s.lessons[0].editorial_revision, undefined);
  assert.equal(s.lessons[9].editorial_revision, undefined);
  assert.equal(s.lessons[9].passing_score, 0.8);
  assert.equal(s.lessons[9].checkpoint_targets.length, 15);

  const totals = { old: 0, edited: 0, oldGraded: 0, graded: 0, screens: 0 };
  for (const spec of specs) {
    const lesson = s.lessons[spec.n - 1];
    const original = activities(lesson, 'legacy');
    const curated = activities(lesson, 'editorial');
    const screens = course.lessonEditionSlides(lesson, 'editorial');
    const omitted = new Set(spec.removed);
    const indices = original.flatMap((a, i) => omitted.has(i) ? [] : [i]);

    assert.equal(fnv32(raw.lessons[spec.n - 1].activities), spec.hash, lesson.id + ': source array changed');
    assert.equal(lesson.editorial_revision.id, 'r221-a21s1-l' + String(spec.n).padStart(2, '0') + '-v1');
    assert.equal(lesson.study_pacing, undefined, lesson.id + ': historical paced drafts were not changed');
    assert.deepEqual(lesson.editorial_revision.activity_indices, indices);
    assert.equal(original.length, spec.old);
    assert.equal(curated.length, spec.edited);
    assert.equal(original.filter(scored).length, spec.oldGraded);
    assert.equal(curated.filter(scored).length, spec.graded);
    assert.equal(screens.length, spec.slides, lesson.id + ': prepared screen count drift');
    assert.ok(screens.length >= 12 && screens.length <= 25);
    assert.deepEqual(course.flattenLessonSlides(screens), curated);
    indices.forEach((index, i) => assert.strictEqual(curated[i], original[index]));
    assert.ok(curated.some(a => a.type === 'production' && a.item === lesson.production_targets[0]));
    assert.ok(curated.some(a => a.type === 'choice' && a.mode === 'listen'
      && a.item === lesson.listening_targets[0]), lesson.id + ': Finnish recognition lost');
    assert.ok(curated.some(a => a.type === 'dictation'
      && a.item === lesson.listening_targets[1]), lesson.id + ': Finnish dictation lost');

    for (const item of original.filter(a => [
      'inflection-production', 'morphology-choice', 'negative-transform', 'sentence-order',
      'expression-completion', 'controlled-production', 'guided-writing', 'short-reading',
    ].includes(a.type))) {
      assert.ok(curated.includes(item), lesson.id + ': high-signal grammar/reading/writing removed ' + item.type);
    }
    for (const grammar of lesson.learning_objectives?.grammar || []) {
      for (const ref of grammar.evidence || []) {
        const proof = Number.isInteger(ref.activity_index) ? original[ref.activity_index]
          : original.find(a => a.type === ref.activity_type && a.item === ref.item_id);
        assert.ok(proof && scored(proof) && curated.includes(proof),
          lesson.id + ': required grammar evidence lost ' + grammar.concept_id);
      }
    }
    for (const id of lesson.new_targets || []) {
      const teach = curated.findIndex(a => a.type === 'teach' && a.item === id);
      const positive = curated.findIndex(a => scored(a) && positives(a).includes(id));
      assert.ok(teach >= 0 && positive > teach,
        lesson.id + ': first taught or assessed positive form lost ' + id);
    }
    totals.old += original.length;
    totals.edited += curated.length;
    totals.oldGraded += original.filter(scored).length;
    totals.graded += curated.filter(scored).length;
    totals.screens += screens.length;
  }
  assert.deepEqual(totals, { old: 225, edited: 214, oldGraded: 169, graded: 158, screens: 136 });
});

test('eleven omissions only defer graded high-frequency reviews or replace redundant recognition', () => {
  const s = section(), report = audit.buildReport();
  const replacements = new Map([
    ['2:14', 'sentence-order'], ['3:12', 'dictation'], ['4:10', 'dictation'],
    ['6:14', 'sentence-order'], ['9:2', 'choice'], ['9:4', 'dictation'],
  ]);
  let removed = 0, deferred = 0, replaced = 0;
  for (const spec of specs) {
    const lesson = s.lessons[spec.n - 1];
    const original = activities(lesson, 'legacy');
    const curated = activities(lesson, 'editorial');
    const reviewed = new Set((lesson.learning_objectives.lexical || [])
      .filter(x => x.status === 'reviewed').map(x => x.target_id));
    const deferredTargets = new Set();
    for (const index of spec.removed) {
      const a = original[index], target = a.item;
      assert.equal(a.type, 'choice', lesson.id);
      assert.ok(['meaning', 'finnish'].includes(a.mode), lesson.id + ': do not omit listening');
      const earlier = s.lessons.slice(0, spec.n - 1).some(previous =>
        positiveIn(activities(previous, 'editorial'), target));
      const same = curated.find(other => scored(other) && positives(other).includes(target));
      assert.ok(earlier || same, lesson.id + ': removed choice lacks earlier/same-lesson grading ' + target);
      if (same) {
        const required = replacements.get(spec.n + ':' + index);
        assert.ok(required, lesson.id + ': unapproved within-lesson replacement');
        assert.equal(same.type, required, lesson.id + ': alternative grading mode changed');
        if (required === 'choice') assert.equal(same.mode, 'listen', 'receptive listening must survive');
        replaced++;
      } else {
        assert.ok(reviewed.has(target) && earlier, lesson.id + ': cannot defer first target assessment');
        deferredTargets.add(target);
        deferred++;
      }
      removed++;
    }
    const row = report.lessons.find(x => x.lesson_id === lesson.id);
    assert.ok(row?.revised);
    assert.deepEqual(new Set(row.deferred_review_target_ids), deferredTargets, lesson.id);
    assert.equal(row.original_graded_answers - row.learner_graded_answers, spec.removed.length);
  }
  assert.deepEqual({ removed, deferred, replaced }, { removed: 11, deferred: 5, replaced: 6 });
});

test('all 62 introduced expressions keep exactly the same later retrieval lesson positions', () => {
  const s = section();
  let counted = 0, uniqueSingleReview = 0;
  for (let i = 0; i < s.lessons.length; i++) {
    for (const id of s.lessons[i].new_targets || []) {
      const oldLater = [];
      const editedLater = [];
      let oldOpportunities = 0;
      for (let j = i + 1; j < s.lessons.length; j++) {
        const original = activities(s.lessons[j], 'legacy');
        if (positiveIn(original, id)) oldLater.push(j + 1);
        if (positiveIn(activities(s.lessons[j], 'editorial'), id)) editedLater.push(j + 1);
        oldOpportunities += original.filter(a => scored(a) && positives(a).includes(id)).length;
      }
      assert.ok(oldLater.length > 0, 'historical target unexpectedly has no later review ' + id);
      assert.deepEqual(editedLater, oldLater, 'later effective graded review lesson lost ' + id);
      if (oldOpportunities === 1) uniqueSingleReview++;
      counted++;
    }
  }
  assert.equal(counted, 62);
  assert.equal(uniqueSingleReview, 57);
  // Preserve reviewed tails whose only later independent grading is in the next lesson.
  for (const id of ['a21s1-t-057', 'a21s1-t-059', 'a21s1-e-060',
    'a21s1-e-063', 'a21s1-e-064']) {
    assert.ok(activities(s.lessons[7], 'editorial')
      .some(a => a.type === 'choice' && a.mode === 'finnish' && a.item === id));
  }
  for (const id of ['a21s1-t-067', 'a21s1-t-068', 'a21s1-e-069',
    'a21s1-e-071', 'a21s1-e-072']) {
    assert.ok(activities(s.lessons[8], 'editorial')
      .some(a => a.type === 'choice' && a.mode === 'finnish' && a.item === id));
  }
});

test('travel narration, event sequencing and original checkpoint remain comprehensive', () => {
  const s = section();
  const last = activities(s.lessons[8], 'editorial');
  assert.equal(s.lessons[8].learning_objectives.grammar.length, 5);
  const reading = last.filter(a => a.type === 'short-reading');
  assert.equal(reading.length, 4);
  for (const id of ['a21s1-reading-1', 'a21s1-reading-2']) {
    const items = reading.filter(a => a.item === id);
    assert.equal(items.length, 2);
    assert.equal(new Set(items.map(a => a.question_item)).size, 2);
  }
  for (const n of [8, 9]) {
    const writing = activities(s.lessons[n - 1], 'editorial')
      .filter(a => a.type === 'guided-writing');
    assert.equal(writing.length, 1);
    assert.equal(writing[0].expected_items.length, 4);
  }
  const sequence = activities(s.lessons[7], 'editorial');
  assert.ok(sequence.some(a => a.type === 'controlled-production' && a.item === 'a21s1-e-072'));
  assert.ok(sequence.some(a => a.type === 'sentence-order' && a.item === 'a21s1-e-072'));
  assert.ok(sequence.some(a => a.type === 'type' && a.item === 'a21s1-e-maan-001'));
  assert.ok(last.some(a => a.type === 'morphology-choice' && a.item === 'a21s1-e-080'));
  assert.ok(last.some(a => a.type === 'inflection-production' && a.item === 'a21s1-t-058'));
  assert.ok(last.some(a => a.type === 'morphology-choice' && a.item === 'a21s1-e-037'));
  assert.equal(s.lessons[9].editorial_revision, undefined);
  assert.equal(s.lessons[9].passing_score, 0.8);
  assert.equal(s.lessons[9].checkpoint_targets.length, 15);
  assert.equal(course.passesLessonRequirement(s.lessons[9], 12, 15), true);
  assert.equal(course.passesLessonRequirement(s.lessons[9], 11, 15), false);
});

test('all 140 stable course lesson IDs and workload audit remain consistent', () => {
  const report = audit.buildReport();
  assert.equal(report.summary.shipped_lessons, 140);
  assert.equal(report.summary.editorially_revised_lessons, 80);
  assert.equal(report.summary.removed_grading_opportunities, 254);
  assert.equal(report.summary.learner_lessons_exceeding_30_slides, 0);
  assert.equal(audit.priorityRows(report).length, 60);
  assert.match(audit.priorityMarkdown(report),
    /Remaining uncurated lessons: \*\*60\*\*; all \*\*80\*\* previously curated lessons are excluded\./);
  assert.equal(new Set(report.lessons.map(x => x.lesson_id)).size, 140);
  audit.check(report);
});

test('release 1.69.0 is synchronized in both README status summaries', () => {
  const root = path.join(__dirname, '..');
  const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const en = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const fa = fs.readFileSync(path.join(root, 'README.fa.md'), 'utf8');
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.equal(version, '1.72.0');
  assert.equal(pkg.version, version);
  assert.match(changelog, /\[1\.69\.0\]/);
  assert.match(en, /80 curated lessons \/ 254 fewer graded opportunities/);
  assert.match(fa, /۸۰ درس بازنگری‌شده و ۲۵۴ پاسخ نمره‌دار کمتر/);
});
