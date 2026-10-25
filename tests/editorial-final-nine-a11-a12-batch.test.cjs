'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const audit = require('../scripts/audit-editorial-lesson-load.cjs');
const { positives } = require('../scripts/audit-course-coverage.cjs');

const specs = [
  { section: 'a1.1-section-2', n: 7, id: 'section-2-lesson-7', removed: [13, 15],
    source: 36, edited: 34, initialGraded: 31, editedGraded: 30, screens: 21, hash: '8e3469aa',
    edition: 'r223-a11-s2-l07-v1', paced: true },
  { section: 'a1.1-section-3', n: 10, id: 'section-3-lesson-10', removed: [6, 10, 11, 12],
    source: 37, edited: 33, initialGraded: 37, editedGraded: 33, screens: 23, hash: 'a3bed958',
    edition: 'r223-a11-s3-l10-v1', paced: true },
  { section: 'a1.2-section-1', n: 2, id: 'a1.2-section-1-lesson-2', removed: [16, 19, 21],
    source: 36, edited: 33, initialGraded: 23, editedGraded: 20, screens: 18, hash: '4f5a034d',
    edition: 'r223-a12-s1-l02-v1' },
  { section: 'a1.2-section-1', n: 3, id: 'a1.2-section-1-lesson-3', removed: [1, 19, 26],
    source: 34, edited: 31, initialGraded: 25, editedGraded: 22, screens: 21, hash: '31523209',
    edition: 'r223-a12-s1-l03-v1' },
  { section: 'a1.2-section-1', n: 6, id: 'a1.2-section-1-lesson-6', removed: [1, 3],
    source: 31, edited: 29, initialGraded: 21, editedGraded: 19, screens: 20, hash: '18490000',
    edition: 'r223-a12-s1-l06-v1' },
  { section: 'a1.2-section-1', n: 8, id: 'a1.2-section-1-lesson-8', removed: [19, 22, 24],
    source: 32, edited: 29, initialGraded: 20, editedGraded: 17, screens: 18, hash: '3c3c87a2',
    edition: 'r223-a12-s1-l08-v1' },
  { section: 'a1.2-section-2', n: 5, id: 'a1.2-section-2-lesson-5', removed: [26, 27, 31],
    source: 33, edited: 30, initialGraded: 21, editedGraded: 18, screens: 19, hash: '1e482455',
    edition: 'r223-a12-s2-l05-v1' },
  { section: 'a1.2-section-2', n: 6, id: 'a1.2-section-2-lesson-6', removed: [11],
    source: 32, edited: 31, initialGraded: 22, editedGraded: 21, screens: 17, hash: '54e1d0d8',
    edition: 'r223-a12-s2-l06-v1' },
  { section: 'a1.2-section-2', n: 8, id: 'a1.2-section-2-lesson-8', removed: [26, 32],
    source: 35, edited: 33, initialGraded: 24, editedGraded: 22, screens: 19, hash: '4bbf9764',
    edition: 'r223-a12-s2-l08-v1' },
];

const sectionNames = [...new Set(specs.map(x => x.section))];
const source = id => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/course', id + '.json'), 'utf8'));
const prepare = id => course.validateSection(source(id));
const graded = a => course.scoredOpportunitiesOnSlide(a) > 0;
const positivelyAssessed = (activities, id) => activities.some(a => graded(a) && positives(a).includes(id));

function fnv32(value) {
  let hash = 2166136261;
  const text = JSON.stringify(value);
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  return hash.toString(16).padStart(8, '0');
}
function storage() {
  const map = new Map();
  return {
    getItem(k) { return map.get(k) ?? null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
  };
}

test('nine formerly overlong lessons keep every archived activity, source order, objective and modality', () => {
  const tally = { authored: 0, edited: 0, gradedBefore: 0, gradedAfter: 0, screens: 0 };
  for (const spec of specs) {
    const raw = source(spec.section);
    const lesson = prepare(spec.section).lessons[spec.n - 1];
    const legacy = course.lessonEditionActivities(lesson, 'legacy');
    const effective = course.lessonEditionActivities(lesson, 'editorial');
    const slides = course.lessonEditionSlides(lesson, 'editorial');
    const omitted = new Set(spec.removed);
    const selectedIndices = legacy.flatMap((_, i) => omitted.has(i) ? [] : [i]);

    assert.equal(lesson.id, spec.id);
    assert.equal(fnv32(raw.lessons[spec.n - 1].activities), spec.hash, lesson.id + ': original source mutated');
    assert.deepEqual(legacy, lesson.activities, lesson.id + ': authored fallback changed');
    assert.equal(lesson.editorial_revision.id, spec.edition);
    assert.deepEqual(lesson.editorial_revision.activity_indices, selectedIndices, lesson.id);
    assert.equal(legacy.length, spec.source);
    assert.equal(effective.length, spec.edited);
    assert.equal(legacy.filter(graded).length, spec.initialGraded);
    assert.equal(effective.filter(graded).length, spec.editedGraded);
    assert.equal(slides.length, spec.screens);
    assert.ok(slides.length >= 12 && slides.length <= 25);
    assert.deepEqual(course.flattenLessonSlides(slides), effective);
    selectedIndices.forEach((index, i) => assert.strictEqual(effective[i], legacy[index]));

    if (spec.paced) assert.deepEqual(lesson.study_pacing, { max_slides: 15, max_graded: 20 });
    else assert.equal(lesson.study_pacing, undefined);

    assert.ok(effective.some(a => a.type === 'production' && a.item === lesson.production_targets[0]),
      lesson.id + ': independent contextual production lost');
    assert.ok(effective.some(a => a.type === 'choice' && a.mode === 'listen' && a.item === lesson.listening_targets[0]),
      lesson.id + ': Finnish listening recognition lost');
    assert.ok(effective.some(a => a.type === 'dictation' && a.item === lesson.listening_targets[1]),
      lesson.id + ': Finnish dictation lost');

    for (const activity of legacy.filter(a => [
      'number-grid', 'inflection-production', 'morphology-choice', 'negative-transform',
      'sentence-order', 'expression-completion', 'controlled-production',
      'guided-writing', 'short-reading', 'dialogue-order',
    ].includes(a.type))) {
      assert.ok(effective.includes(activity), lesson.id + ': critical authored or injected skill removed: ' + activity.type);
    }
    for (const goal of lesson.learning_objectives?.grammar || []) {
      for (const ref of goal.evidence || []) {
        const evidence = Number.isInteger(ref.activity_index) ? legacy[ref.activity_index]
          : legacy.find(a => a.type === ref.activity_type && a.item === ref.item_id);
        assert.ok(evidence && graded(evidence) && effective.includes(evidence),
          lesson.id + ': required scored grammar evidence missing ' + goal.concept_id);
      }
    }
    for (const goal of lesson.learning_objectives?.lexical || []) {
      if (goal.status !== 'introduced') continue;
      const originalTeach = legacy.find(a => a.type === 'teach' && a.item === goal.target_id);
      if (originalTeach) {
        assert.ok(effective.includes(originalTeach), lesson.id + ': first teaching removed ' + goal.target_id);
      }
      if (positivelyAssessed(legacy, goal.target_id)) {
        assert.ok(positivelyAssessed(effective, goal.target_id), lesson.id + ': first graded introduction lost ' + goal.target_id);
      }
    }

    tally.authored += legacy.length;
    tally.edited += effective.length;
    tally.gradedBefore += legacy.filter(graded).length;
    tally.gradedAfter += effective.filter(graded).length;
    tally.screens += slides.length;
  }
  assert.deepEqual(tally, { authored: 306, edited: 283, gradedBefore: 224, gradedAfter: 202, screens: 176 });
});

test('every omitted graded answer has same-lesson coverage or is a safely deferred reviewed form', () => {
  let omittedGraded = 0, omittedTeach = 0, deferred = 0, replaced = 0;
  const report = audit.buildReport();
  for (const spec of specs) {
    const s = prepare(spec.section), lesson = s.lessons[spec.n - 1];
    const legacy = course.lessonEditionActivities(lesson, 'legacy');
    const selected = course.lessonEditionActivities(lesson, 'editorial');
    const reviewed = new Set((lesson.learning_objectives?.lexical || [])
      .filter(g => g.status === 'reviewed').map(g => g.target_id));
    const fullyDeferred = new Set();
    for (const index of spec.removed) {
      const a = legacy[index], id = course.activityPrimaryTargetId(a);
      if (a.type === 'teach') {
        assert.ok(selected.some(x => x.type === 'teach' && x.item === a.item),
          lesson.id + ': omitted first teaching card');
        omittedTeach++;
        continue;
      }
      assert.ok(graded(a), lesson.id + ': unexpected nonscored omission');
      const same = positivelyAssessed(selected, id);
      const earlier = s.lessons.slice(0, spec.n - 1).some(prev =>
        positivelyAssessed(course.lessonEditionActivities(prev, 'editorial'), id));
      if (same) {
        assert.ok(selected.some(x => graded(x) && positives(x).includes(id) &&
          (x.type !== a.type || x.mode !== a.mode)),
        lesson.id + ': repeated recognition lacks a distinct scored mode ' + id);
        replaced++;
      } else {
        assert.ok(reviewed.has(id) && earlier,
          lesson.id + ': deferred item was never independently graded earlier ' + id);
        assert.ok(s.lessons.slice(spec.n).some(next =>
          positivelyAssessed(course.lessonEditionActivities(next, 'editorial'), id)),
        lesson.id + ': deferred item lacks later independently scored recall ' + id);
        fullyDeferred.add(id);
        deferred++;
      }
      omittedGraded++;
    }
    const row = report.lessons.find(x => x.lesson_id === lesson.id);
    assert.ok(row?.revised);
    assert.deepEqual(new Set(row.deferred_review_target_ids), fullyDeferred);
    assert.equal(row.original_graded_answers - row.learner_graded_answers,
      spec.initialGraded - spec.editedGraded);
  }
  assert.deepEqual({ omittedGraded, omittedTeach, deferred, replaced },
    { omittedGraded: 22, omittedTeach: 1, deferred: 13, replaced: 9 });
});

test('every existing later positively graded retrieval is preserved; legacy gaps are not mislabeled as fixed', () => {
  const expectedIntroductions = {
    'a1.1-section-2': 77, 'a1.1-section-3': 80, 'a1.2-section-1': 71, 'a1.2-section-2': 80,
  };
  const changed = new Set(specs.map(x => x.id));
  for (const sectionId of sectionNames) {
    const s = prepare(sectionId);
    let introductions = 0, previouslyRecalled = 0, nowRecalled = 0;
    for (const [i, lesson] of s.lessons.entries()) {
      for (const id of lesson.new_targets || []) {
        introductions++;
        const before = s.lessons.slice(i + 1).some(next =>
          positivelyAssessed(course.lessonEditionActivities(next,
            changed.has(next.id) ? 'legacy' : 'editorial'), id));
        const after = s.lessons.slice(i + 1).some(next =>
          positivelyAssessed(course.lessonEditionActivities(next, 'editorial'), id));
        if (before) previouslyRecalled++;
        if (after) nowRecalled++;
        assert.ok(!before || after, sectionId + ': newly lost later graded recall of ' + id);
      }
    }
    assert.equal(introductions, expectedIntroductions[sectionId]);
    assert.equal(nowRecalled, previouslyRecalled, sectionId + ': later recall coverage regressed');
  }
});

test('numbers, negative transformations, both A1.1 checkpoint bounds and section assessment targets survive', () => {
  const a11s2 = prepare('a1.1-section-2');
  const numbers = a11s2.lessons[6];
  const effectiveNumbers = course.lessonEditionActivities(numbers, 'editorial');
  assert.equal(effectiveNumbers.filter(a => a.type === 'number-grid').length, 1);
  assert.ok(effectiveNumbers.some(a => a.type === 'dictation' && a.item === 's2-olen-12-vuotias'));
  assert.ok(effectiveNumbers.some(a => a.type === 'expression-completion' && a.item === 's2-olen-12-vuotias'));
  for (const id of numbers.new_targets) {
    if (positivelyAssessed(course.lessonEditionActivities(numbers, 'legacy'), id)) {
      assert.ok(positivelyAssessed(effectiveNumbers, id), 'numeric/age graded introduction lost ' + id);
    }
  }

  const a11s3 = prepare('a1.1-section-3'), checkpoint = a11s3.lessons[9];
  const original = course.lessonEditionActivities(checkpoint, 'legacy');
  const edited = course.lessonEditionActivities(checkpoint, 'editorial');
  assert.equal(checkpoint.checkpoint_targets.length, 15);
  assert.equal(checkpoint.passing_score, undefined, 'do not invent a new pass threshold');
  for (const id of checkpoint.checkpoint_targets) {
    assert.ok(positivelyAssessed(edited, id), 'checkpoint target lost ' + id);
  }
  const oldNegative = original.filter(a => a.type === 'negative-transform');
  assert.equal(oldNegative.length, 5);
  oldNegative.forEach(a => assert.ok(edited.includes(a)));
  assert.ok(edited.some(a => a.type === 'expression-completion' && a.item === 's3-milloin-expr'));
  assert.ok(edited.some(a => a.type === 'expression-completion' && a.item === 's3-yolla'));

  // Explicit regression if grammar evidence or checkpoint identities are dropped.
  const bad = source('a1.1-section-3');
  bad.lessons[9].editorial_revision.activity_indices =
    bad.lessons[9].editorial_revision.activity_indices.filter(i => i !== 15);
  assert.throws(() => course.validateSection(bad), /removes explicit grammar evidence/);
  const badTarget = source('a1.1-section-3');
  badTarget.lessons[9].editorial_revision.activity_indices =
    badTarget.lessons[9].editorial_revision.activity_indices.filter(i => i !== 0);
  assert.throws(() => course.validateSection(badTarget), /removes a checkpoint target/);
});

test('two new intensive A1.1 revisions split initial and all-wrong retry work into bounded, resumable sittings', () => {
  for (const spec of specs.filter(x => x.paced)) {
    const lesson = prepare(spec.section).lessons[spec.n - 1];
    const initialSlides = course.lessonEditionSlides(lesson, 'editorial');
    const selected = course.lessonEditionActivities(lesson, 'editorial');
    const retrySlides = selected.filter(graded);
    const flow = course.planPacedLessonFlow(initialSlides, retrySlides, lesson.study_pacing);
    const initial = flow.filter(x => x.phase === 'initial');
    const retries = flow.filter(x => x.phase === 'retry');
    assert.ok(initial.length >= 2 && retries.length >= 2);
    assert.ok(flow.every(x => x.screens >= 1 && x.screens <= 15 && x.graded >= 0 && x.graded <= 20));
    assert.equal(initial.reduce((n, x) => n + x.graded, 0), spec.editedGraded);
    assert.equal(retries.reduce((n, x) => n + x.graded, 0), spec.editedGraded);
    assert.equal(flow.at(-1).end, initialSlides.length + retrySlides.length);

    const st = storage(), firstRetryIndex = lesson.editorial_revision.activity_indices
      .find(index => graded(lesson.activities[index]));
    assert.ok(Number.isInteger(firstRetryIndex));
    const saved = { nextIndex: 1, correct: 0, graded: 1, retryIndices: [firstRetryIndex],
      retryPhase: false, sessionId: 'editorial-nine-' + spec.id,
      sessionStartedAt: 123456, editorialEdition: spec.edition };
    assert.equal(course.savePacedLessonDraft(st, spec.section, lesson, saved), true);
    assert.deepEqual(course.loadPacedLessonDraft(st, spec.section, lesson), saved);
    const retry = { ...saved, nextIndex: initialSlides.length + 1,
      graded: spec.editedGraded + 1, retryPhase: true };
    assert.equal(course.savePacedLessonDraft(st, spec.section, lesson, retry), true);
    assert.deepEqual(course.loadPacedLessonDraft(st, spec.section, lesson), retry);
    const drafts = JSON.parse(st.getItem(course.PACED_DRAFT_STORAGE_KEY));
    drafts[lesson.id].editorialFingerprint = 'tampered';
    st.setItem(course.PACED_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    assert.equal(course.loadPacedLessonDraft(st, spec.section, lesson), null);
    course.clearPacedLessonDraft(st, lesson.id);
    assert.equal(course.loadPacedLessonDraft(st, spec.section, lesson), null);
  }
});

test('all 55 originally >30-entry lesson manifests have a reviewed shorter edition; other 60 are not auto-trimmed', () => {
  const report = audit.buildReport();
  assert.equal(report.summary.shipped_lessons, 140);
  assert.equal(report.summary.editorially_revised_lessons, 80);
  assert.equal(report.summary.removed_grading_opportunities, 254);
  assert.equal(report.summary.learner_lessons_exceeding_30_slides, 0);
  assert.equal(audit.priorityRows(report).length, 60);
  assert.equal(new Set(report.lessons.map(x => x.lesson_id)).size, 140);
  const originalLong = report.lessons.filter(x => x.original_activities > 30);
  assert.equal(originalLong.length, 55);
  assert.equal(originalLong.filter(x => x.revised).length, 55);
  audit.check(report);
});

test('v1.70.0 release, changelog and bilingual README summary are synchronized', () => {
  const root = path.join(__dirname, '..');
  const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const en = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const fa = fs.readFileSync(path.join(root, 'README.fa.md'), 'utf8');
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.equal(version, '1.70.0');
  assert.equal(pkg.version, version);
  assert.match(changelog, /\[1\.70\.0\]/);
  assert.match(en, /80 curated lessons \/ 254 fewer graded opportunities/);
  assert.match(fa, /۸۰ درس بازنگری‌شده و ۲۵۴ پاسخ نمره‌دار کمتر/);
});
