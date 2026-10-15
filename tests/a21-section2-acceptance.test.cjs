'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course.js');
const raw = require('../data/course/a2.1-section-2.json');
const curriculum = require('../data/course/a2.1-curriculum.json');
const sidecar = require('../data/course/lexical-identity-sidecar.json');
const previous = ['a1.1', 'a1.2', 'a1.3'].flatMap(level => [1, 2, 3, 4]
  .map(number => require('../data/course/' + level + '-section-' + number + '.json')));
previous.push(require('../data/course/a2.1-section-1.json'));
const curricula = Object.fromEntries(['a1.1', 'a1.2', 'a1.3', 'a2.1']
  .map(level => [level.toUpperCase(), require('../data/course/' + level + '-curriculum.json')]));
const { evaluate, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression } = require('../scripts/audit-a21-section2.cjs');
const verify = section => evaluate(section, curriculum, sidecar, previous, curricula);

test('ten A2.1 healthcare/services lessons have assessed goals and later retrieval for every new form', () => {
  const report = verify(raw);
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.lessons, 10);
  assert.equal(report.summary.missing_positive_targets, 0);
  assert.equal(report.summary.repeated_new_labels, 0);
  assert.equal(report.summary.introduced_surface_forms_and_expressions,
    report.summary.surfaces_with_later_positive_review);
  assert.equal(report.summary.grammar_concepts_with_later_review, 8);
  assert.ok(report.summary.activities > 184);
  for (const lesson of raw.lessons) {
    assert.equal(lesson.learning_objectives.grammar_scope, 'assessed');
    assert.equal(lesson.activity_count, lesson.activities.length);
  }
  for (const lesson of raw.lessons.slice(8)) assert.deepEqual(lesson.new_targets, []);
});

test('moved full phrases and service words are taught before assessed and no longer first appear in review lesson 9', () => {
  const section = course.validateSection(raw);
  for (const lesson of section.lessons) for (const id of lesson.new_targets) {
    if (raw.items[id].item_type !== 'expression') continue;
    const teachIndex = lesson.activities.findIndex(a => a.type === 'teach' && a.item === id);
    const positiveIndex = lesson.activities.findIndex(a => assessesExpression(a, id, section.items));
    assert.ok(teachIndex >= 0 && positiveIndex > teachIndex, lesson.id + ' / ' + id);
  }
  for (const id of ['a21s2-e-078', 'a21s2-e-079', 'a21s2-e-080']) {
    assert.ok(section.lessons[0].new_targets.includes(id));
    assert.ok(section.lessons[8].learning_objectives.lexical.some(g => g.target_id === id && g.status === 'reviewed'));
  }
  for (const id of ['a21s2-t-077', 'a21s2-e-081', 'a21s2-e-082']) {
    assert.ok(section.lessons[7].new_targets.includes(id));
  }
  const bad = structuredClone(raw), lesson = bad.lessons[0];
  const expr = lesson.new_targets.find(id => section.items[id].item_type === 'expression');
  lesson.activities = lesson.activities.filter(a => !(a.type === 'teach' && a.item === expr));
  lesson.activity_count = lesson.activities.length;
  assert.ok(verify(bad).errors.some(error => error.includes('complete expression assessed before teaching: ' + expr)));
});

test('review-only final two lessons preserve their historical checkpoint scope', () => {
  const checkpoint = raw.lessons[9];
  assert.deepEqual(checkpoint.checkpoint_targets, ORIGINAL_CHECKPOINT_TARGETS);
  assert.equal(checkpoint.passing_score, 0.8);
  assert.equal(checkpoint.activities.length, 15);
  assert.equal(Object.keys(raw.items).length, 85);
  assert.deepEqual(raw.lessons.map(l => l.id), Array.from({ length: 10 },
    (_, index) => 'a2.1-section-2-lesson-' + (index + 1)));
  const lesson = course.validateSection(raw).lessons[0];
  let stored = course.emptyProgress();
  stored = course.recordLessonCompletion(stored, lesson.id, 12, 18, 123);
  assert.deepEqual(course.sanitizeProgress(stored).lessonScores[lesson.id],
    { correct: 12, graded: 18, completedAt: 123 });
});

test('grammar evidence is truly linked to connegative, imperfect and quantitative partitive choices', () => {
  const section = course.validateSection(raw);
  const negatives = section.lessons[6].activities.find(a => a.type === 'inflection-production'
    && a.item === 'a21s2-e-063');
  assert.ok(negatives);
  assert.equal(negatives.frame_fi.replace('_____', negatives.expected_fi), 'En ymmärrä tätä kohtaa.');
  assert.ok(negatives.grammar_concept_ids.includes('a12-negation-expand'));
  const good = { surface_form: 'ymmärrä', accepted_answers: ['ymmärrä'] };
  assert.equal(course.gradeMorphologyAnswer(good, 'ymmärrä').accepted, true);
  for (const wrong of ['ymmärrän', 'ymmärtää', 'ymmärrät']) {
    assert.equal(course.gradeMorphologyAnswer(good, wrong).accepted, false, wrong);
  }
  const integrated = section.lessons[8];
  assert.ok(integrated.activities.some(a => a.type === 'morphology-choice' &&
    a.item === 'a21s2-e-026' && a.expected_fi === 'kuumetta'));
  for (const id of ['a21-imperfect', 'a21-rections', 'a12-quantities', 'a11-questions']) {
    const goal = integrated.learning_objectives.grammar.find(g => g.concept_id === id);
    assert.ok(goal, id);
    assert.equal(goal.status, 'reviewed');
    assert.ok(goal.evidence.length);
  }
  const broken = structuredClone(section.lessons[6]);
  broken.activities.find(a => a.type === 'inflection-production' && a.item === 'a21s2-e-063')
    .grammar_concept_ids = [];
  assert.throws(() => course.validateLessonObjectives(broken, section, curriculum.grammar_concepts),
    /explicit evidence concept link/);
});

test('both original service readings each assess two unique facts, with unambiguous alternatives', () => {
  const section = course.validateSection(raw);
  for (const id of ['a21s2-reading-1', 'a21s2-reading-2']) {
    const source = section.items[id];
    const activities = section.lessons[8].activities.filter(a => a.type === 'short-reading' && a.item === id);
    assert.equal(activities.length, 2);
    assert.equal(new Set(activities.map(a => a.question_item)).size, 2);
    for (const activity of activities) {
      assert.equal(activity.options.filter(itemId => source.surface_form.includes(section.items[itemId].surface_form)).length, 1);
    }
  }
});

test('two integrated guided writings reuse four previously taught, explicitly graded expressions', () => {
  const section = course.validateSection(raw);
  for (const index of [7, 8]) {
    const writing = section.lessons[index].activities.find(a => a.type === 'guided-writing');
    assert.ok(writing);
    assert.equal(writing.expected_items.length, 4);
    assert.equal(writing.answer_policy, 'morphology');
    for (const id of writing.expected_items) {
      assert.ok(section.lessons.slice(0, index + 1).some(l => l.activities
        .some(a => a.type === 'teach' && a.item === id)), index + ' / ' + id);
    }
  }
});

test('reject vacuous multiple-choice assessment and missing positive assessment', () => {
  const poorChoice = structuredClone(raw);
  const lesson = poorChoice.lessons[0];
  const choice = lesson.activities.find(a => a.type === 'choice' &&
    !lesson.production_targets.includes(a.item) && !lesson.listening_targets.includes(a.item));
  choice.options = [choice.item];
  assert.ok(verify(poorChoice).errors.some(e => e.includes('recognition choice requires meaningful alternatives')));
  const missing = structuredClone(raw), first = missing.lessons[0];
  const target = first.learning_objectives.lexical.find(g => g.target_id === 'a21s2-h-002').target_id;
  first.activities = first.activities.map(a =>
    a.item === target && a.type !== 'teach' ? { type: 'teach', item: target } : a);
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: ' + target)));
});

test('no clinical dosage claims and no playable A2.1 Section 3', () => {
  const source = Object.values(raw.items).map(item => item.surface_form + ' ' + item.translation_fa).join('\n');
  assert.doesNotMatch(source, /\b(?:mg|ml|milligramma|millilitra|annostus|tablettia)\b/iu);
  assert.equal(course.COURSE_STAGES.at(-1).sectionUrls.length, 2);
  assert.ok(curriculum.sections.slice(2).every(section => section.authoring_status === 'outline_only'));
});
