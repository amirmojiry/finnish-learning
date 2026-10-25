'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate } = require('../scripts/audit-a11-section1.cjs');
const composition = require('../scripts/audit-lesson-composition.cjs');
const raw = require('../data/course/a1.1-section-2.json');
const prior = require('../data/course/a1.1-section-1.json');
const curriculum = require('../data/course/a1.1-curriculum.json');
const sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = section => evaluate(section, curriculum, sidecar, [prior]);

test('complete Section 2 preserves scores, scoped objectives and review-only ending', () => {
  const report = verify(raw);
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.activities, 270);
  assert.equal(report.summary.introduced_surface_forms_and_expressions, 77);
  assert.equal(report.summary.surfaces_with_later_positive_review, 77);
  assert.equal(report.summary.grammar_concepts_with_later_review, 5);
  const section = course.validateSection(raw);
  for (const lesson of section.lessons) {
    assert.equal(course.lessonObjectiveDisplay(lesson, section.items).structured, true);
    assert.equal(lesson.activities.length, lesson.activity_count);
    for (const type of ['production', 'dictation']) assert.equal(lesson.activities.filter(a => a.type === type).length, 1);
    assert.equal(lesson.activities.filter(a => a.type === 'choice' && a.mode === 'listen').length, 1);
    const score = course.recordLessonCompletion(course.emptyProgress(), lesson.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(score).lessonScores[lesson.id], { correct: 8, graded: 10, completedAt: 123 });
    const sentences = lesson.grammar_fa.split(/(?<=[.!؟])\s+/);
    assert.equal(new Set(sentences).size, sentences.length, lesson.id);
    assert.doesNotMatch(lesson.grammar_fa, /runtime|UI|ذخیره|برنامه/);
  }
  for (const lesson of section.lessons.slice(8)) {
    assert.deepEqual(lesson.new_targets, []);
    assert.ok(lesson.learning_objectives.lexical.every(goal => goal.status === 'reviewed'));
  }
  assert.equal(section.lessons[9].checkpoint_targets.length, 15);
});

test('every 0–20 number has an actual positive answer and later retrieval, not only a grid', () => {
  const section = course.validateSection(raw), numbers = section.lessons[6].activities.find(a => a.type === 'number-grid').items;
  assert.equal(numbers.length, 21);
  const report = verify(raw);
  for (const target of numbers) {
    const row = report.lexical_review.find(r => r.target_id === target);
    assert.ok(row?.later_positive_lessons.length, target);
    assert.ok(composition.positiveEvidence(section, section.lessons[6], new Map()).has(composition.identity(section, target, new Map()).id), target);
  }
  const missing = structuredClone(raw);
  for (const lesson of missing.lessons) {
    const originalCount = lesson.activities.length;
    lesson.activities = lesson.activities.filter(a => a.item !== 's2-num-yhdeksantoista');
    lesson.activity_count = lesson.activities.length;
    // This negative fixture tests missing authored target evidence, not stale
    // editorial source indices after intentionally removing an activity.
    if (lesson.activities.length !== originalCount) delete lesson.editorial_revision;
  }
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: s2-num-yhdeksantoista')));
  assert.ok(verify(missing).errors.some(e => e.includes('no later positive review: s2-num-yhdeksantoista')));
});

test('prior prerequisites and punctuation-equivalent greeting are verified without merging identities', () => {
  const grammar = verify(raw).grammar_review;
  assert.equal(grammar.find(g => g.concept_id === 'a11-olla').introduced_in, 'lesson-2');
  assert.equal(grammar.find(g => g.concept_id === 'a11-case-chunks').introduced_in, 'section-2-lesson-2');
  assert.equal(raw.lessons[0].learning_objectives.lexical.find(g => g.target_id === 's2-han').status, 'reviewed');
  assert.equal(raw.lessons[9].learning_objectives.lexical.find(g => g.target_id === 's2-hei').status, 'reviewed');
  assert.notEqual(composition.identity(prior, 'hei', new Map()).id, composition.identity(raw, 's2-hei', new Map()).id);
  const falseIntroduction = structuredClone(raw);
  falseIntroduction.lessons[0].learning_objectives.grammar[0].status = 'introduced';
  assert.ok(verify(falseIntroduction).errors.some(e => e.includes('repeated grammar introduction')));
  const invalid = structuredClone(raw);
  invalid.prior_target_refs['s2-hei'].item_id = 'kirja';
  assert.throws(() => verify(invalid), /Invalid prior exact-answer reference/);
  assert.throws(() => evaluate(raw, curriculum, sidecar), /Invalid prior exact-answer reference/);
});

test('profile offers four reading facts and a supported four-sentence writing task', () => {
  const section = course.validateSection(raw), profile = section.lessons[8];
  const readings = profile.activities.filter(a => a.type === 'short-reading');
  assert.equal(readings.length, 4);
  assert.deepEqual(new Set(readings.map(a => a.question_item)), new Set(['s2-profile-name', 's2-profile-origin', 's2-profile-live', 's2-profile-lang']));
  assert.equal(profile.activities.find(a => a.type === 'guided-writing').expected_items.length, 4);
  for (const reading of readings) {
    assert.ok(section.items[reading.item].surface_form.includes(section.items[reading.question_item].surface_form));
    for (const distractor of reading.options.filter(t => t !== reading.question_item)) {
      assert.ok(!section.items[reading.item].surface_form.includes(section.items[distractor].surface_form));
    }
  }
  const broken = structuredClone(raw);
  broken.lessons[2].learning_objectives.grammar[0].evidence = [];
  assert.throws(() => verify(broken), /requires positive assessment/);
});
