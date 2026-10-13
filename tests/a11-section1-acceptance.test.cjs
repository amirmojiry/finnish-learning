'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate } = require('../scripts/audit-a11-section1.cjs');
const raw = require('../data/course/a1.1-section-1.json');
const curriculum = require('../data/course/a1.1-curriculum.json');
const sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = section => evaluate(section, curriculum, sidecar);

test('all ten lessons have truthful objectives, complete positive coverage and later recycling', () => {
  const report = verify(raw);
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.lessons, 10);
  assert.equal(report.summary.activities, 233);
  assert.equal(report.summary.introduced_surface_forms_and_expressions, 49);
  assert.equal(report.summary.surfaces_with_later_positive_review, 49);
  assert.equal(report.summary.grammar_concepts_with_later_review, 5);
  assert.equal(report.summary.missing_positive_targets, 0);
  assert.equal(report.summary.repeated_new_labels, 0);
  assert.deepEqual(report.summary.formulaic_lessons, ['lesson-1', 'lesson-6']);
  const section = course.validateSection(raw);
  for (const lesson of section.lessons) {
    assert.equal(course.lessonObjectiveDisplay(lesson, section.items).structured, true);
    assert.equal(lesson.activities.length, lesson.activity_count);
    for (const type of ['production', 'dictation']) assert.equal(lesson.activities.filter(a => a.type === type).length, 1);
    assert.equal(lesson.activities.filter(a => a.type === 'choice' && a.mode === 'listen').length, 1);
    const old = course.recordLessonCompletion(course.emptyProgress(), lesson.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(old).lessonScores[lesson.id], { correct: 8, graded: 10, completedAt: 123 });
  }
  for (const lesson of section.lessons.slice(8)) {
    assert.deepEqual(lesson.new_targets, []);
    assert.ok(lesson.learning_objectives.lexical.every(goal => goal.status === 'reviewed'));
  }
  assert.equal(section.lessons[9].checkpoint_targets.length, 15);
});

test('acceptance rejects missing assessment, absent later retrieval and false new labels', () => {
  const missing = structuredClone(raw);
  const lesson = missing.lessons[3];
  lesson.activities = lesson.activities.filter(a => !(a.type === 'type' && a.item === 'vastaus'));
  lesson.activity_count = lesson.activities.length;
  assert.ok(verify(missing).errors.some(error => error.includes('target lacks positive answer: vastaus')));
  const unreviewed = structuredClone(raw);
  for (const later of unreviewed.lessons.slice(1)) {
    later.activities = later.activities.filter(a => !(a.type === 'type' && a.item === 'huomenta'));
    later.activity_count = later.activities.length;
  }
  assert.ok(verify(unreviewed).errors.some(error => error.includes('no later positive review: huomenta')));
  const repeated = structuredClone(raw);
  repeated.lessons[5].learning_objectives.lexical.find(goal => goal.target_id === 'kiitos').status = 'introduced';
  assert.ok(verify(repeated).errors.some(error => error.includes('incorrect lexical status: kiitos')));
});

test('formulaic lessons cannot claim grammar and prerequisite introduction is chronological', () => {
  const fabricated = structuredClone(raw);
  fabricated.lessons[0].learning_objectives.grammar = structuredClone(raw.lessons[1].learning_objectives.grammar);
  assert.throws(() => verify(fabricated), /formulaic lesson cannot claim grammar objectives/);
  const premature = structuredClone(raw);
  premature.lessons[2].learning_objectives.grammar[0].status = 'reviewed';
  assert.ok(verify(premature).errors.some(error => error.includes('prerequisite not introduced earlier: a11-present-chunks')));
  const section = course.validateSection(raw), negative = section.lessons[6];
  const choice = negative.activities.find(a => a.type === 'morphology-choice');
  assert.equal(choice.expected_fi, 'En');
  const typed = negative.activities.find(a => a.type === 'expression-completion' && a.item === 'en');
  assert.equal(course.gradeTypedAnswer({ surface_form: 'En', accepted_answers: typed.accepted_answers }, 'ei').accepted, false);
});

test('teaching-card headings reuse canonical introduced/reviewed metadata', () => {
  assert.equal(course.teachingActivityHeading(raw.lessons[5], { item: 'kiitos' }), 'عبارت آشنا را مرور کن و با صدای بلند تکرار کن.');
  assert.equal(course.teachingActivityHeading(raw.lessons[5], { item: 'anteeksi' }), 'عبارت جدید را ببین و با صدای بلند تکرار کن.');
  assert.equal(course.teachingActivityHeading({}, { item: 'legacy' }), 'عبارت جدید را ببین و با صدای بلند تکرار کن.');
});


test('learner grammar notes contain no duplicated explanatory sentences', () => {
  for (const lesson of raw.lessons) {
    const sentences = lesson.grammar_fa.split(/(?<=[.!؟])\s+/);
    assert.equal(new Set(sentences).size, sentences.length, lesson.id);
    assert.ok(lesson.grammar_fa.length > 0);
  }
});
