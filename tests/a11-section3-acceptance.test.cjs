'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate } = require('../scripts/audit-a11-section3.cjs');
const comp = require('../scripts/audit-lesson-composition.cjs');
const raw = require('../data/course/a1.1-section-3.json');
const prior = [1, 2].map(n => require(`../data/course/a1.1-section-${n}.json`));
const curriculum = require('../data/course/a1.1-curriculum.json');
const sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = section => evaluate(section, curriculum, sidecar, prior);

test('all ten Section 3 lessons have bounded objectives, complete retrieval and preserved scores', () => {
  const report = verify(raw);
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.activities, 282);
  assert.equal(report.summary.introduced_surface_forms_and_expressions, 80);
  assert.equal(report.summary.surfaces_with_later_positive_review, 80);
  assert.equal(report.summary.grammar_concepts_with_later_review, 5);
  const section = course.validateSection(raw);
  for (const l of section.lessons) {
    assert.equal(course.lessonObjectiveDisplay(l, section.items).structured, true);
    assert.equal(l.activities.length, l.activity_count);
    for (const type of ['production', 'dictation']) assert.equal(l.activities.filter(a => a.type === type).length, 1);
    assert.equal(l.activities.filter(a => a.type === 'choice' && a.mode === 'listen').length, 1);
    const progress = course.recordLessonCompletion(course.emptyProgress(), l.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(progress).lessonScores[l.id], { correct: 8, graded: 10, completedAt: 123 });
    assert.doesNotMatch(l.grammar_fa, /runtime|UI|در داده|ذخیره/);
    const sentences = l.grammar_fa.split(/(?<=[.!؟])\s+/);
    assert.equal(new Set(sentences).size, sentences.length, l.id);
  }
  for (const l of section.lessons.slice(8)) {
    assert.deepEqual(l.new_targets, []);
    assert.ok(l.learning_objectives.lexical.every(g => g.status === 'reviewed'));
  }
  assert.equal(section.lessons[9].checkpoint_targets.length, 15);
});

test('weekdays, whole hours and time-of-day targets all have later positive retrieval', () => {
  const report = verify(raw);
  const targets = ['maanantai', 'tiistai', 'keskiviikko', 'torstai', 'perjantai', 'lauantai', 'sunnuntai',
    'kello-yksi', 'kello-kaksi', 'kello-kolme', 'kello-nelja', 'kello-viisi', 'aamulla', 'paivalla', 'illalla', 'yolla'];
  for (const t of targets) assert.ok(report.lexical_review.find(r => r.target_id === 's3-' + t)?.later_positive_lessons.length, t);
  const missing = structuredClone(raw);
  const lesson = missing.lessons[2];
  lesson.activities = lesson.activities.map(a => a.item === 's3-kello-viisi' && a.type === 'clock-choice' ? { type: 'teach', item: a.item } : a);
  lesson.activity_count = lesson.activities.length;
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: s3-kello-viisi')));
  const absentReview = structuredClone(raw);
  for (const l of absentReview.lessons.slice(2)) {
    l.activities = l.activities.map(a => a.item === 's3-torstai' ? { type: 'teach', item: a.item } : a);
    l.activity_count = l.activities.length;
  }
  assert.ok(verify(absentReview).errors.some(e => e.includes('no later positive review: s3-torstai')));
});

test('negative transforms reject affirmative and wrong-person forms in all five mappings', () => {
  const section = course.validateSection(raw);
  for (const l of [section.lessons[6], section.lessons[9]]) {
    const transforms = l.activities.filter(a => a.type === 'negative-transform');
    assert.equal(transforms.length, 5);
    for (const a of transforms) {
      const affirmative = section.items[a.affirmative_item], expected = section.items[a.negative_item];
      assert.equal(course.gradeActivityAnswer(a, expected, expected.surface_form).accepted, true);
      for (const wrong of ['En ' + affirmative.surface_form, 'Ei ' + expected.surface_form.slice(3), affirmative.surface_form]) {
        assert.equal(course.gradeActivityAnswer(a, expected, wrong).accepted, false, wrong);
      }
      assert.equal(course.gradeActivityAnswer(a, expected, course.foldFinnishDiacritics(expected.surface_form)).accepted, true);
    }
  }
  for (const l of section.lessons) for (const a of l.activities) {
    if (['type', 'production', 'dictation'].includes(a.type) && /^s3-negative-/.test(a.item)) {
      assert.equal(a.answer_policy, 'morphology', l.id);
      const key = a.item.replace('s3-negative-', 's3-');
      assert.equal(course.gradeActivityAnswer(a, section.items[a.item], 'En ' + section.items[key].surface_form).accepted, false);
    }
  }
  const missing = structuredClone(raw);
  const l = missing.lessons[9], index = l.activities.findIndex(a => a.negative_item === 's3-negative-juon');
  l.activities[index] = { type: 'type', mode: 'finnish', item: 's3-negative-juon', answer_policy: 'morphology', grammar_concept_ids: ['a11-negation'] };
  assert.ok(verify(missing).errors.some(e => e.includes('missing mapped negative transform: juon')));
});

test('review frames are taught earlier and are recognized without literal ellipsis/arrow typing', () => {
  const report = verify(raw), section = course.validateSection(raw);
  for (const row of report.lexical_review) assert.ok(Number(row.introduced_in.split('-').at(-1)) < 9, row.target_id);
  for (const l of section.lessons) for (const a of l.activities) {
    if (['type', 'production', 'dictation'].includes(a.type)) assert.doesNotMatch(section.items[a.item].surface_form, /[→…]/u);
  }
  const readings = section.lessons[8].activities.filter(a => a.type === 'short-reading');
  assert.equal(readings.length, 3);
  for (const a of readings) {
    const passage = section.items[a.item].surface_form;
    assert.ok(passage.includes(section.items[a.question_item].surface_form));
    assert.ok(a.options.filter(t => t !== a.question_item).every(t => !passage.includes(section.items[t].surface_form)));
  }
  assert.equal(section.lessons[8].activities.find(a => a.type === 'guided-writing').answer_policy, 'morphology');
  const wrong = structuredClone(raw);
  wrong.lessons[5].learning_objectives.lexical.find(g => g.target_id === 's3-mita').status = 'introduced';
  assert.ok(verify(wrong).errors.some(e => e.includes('incorrect lexical status: s3-mita')));
  const policy = structuredClone(raw);
  policy.lessons[0].activities[0].answer_policy = 'fuzzy-grammar';
  assert.throws(() => course.validateSection(policy), /Unknown activity answer policy/);
  assert.equal(report.grammar_review.find(g => g.concept_id === 'a11-negation').introduced_in, 'lesson-4');
});
