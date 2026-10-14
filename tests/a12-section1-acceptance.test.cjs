'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression } = require('../scripts/audit-a12-section1.cjs');
const raw = require('../data/course/a1.2-section-1.json'), curriculum = require('../data/course/a1.2-curriculum.json');
const prior = [1, 2, 3, 4].map(n => require(`../data/course/a1.1-section-${n}.json`));
const a11 = require('../data/course/a1.1-curriculum.json'), sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = r => evaluate(r, curriculum, sidecar, prior, a11);
test('A1.2 shopping has full positive coverage and later retrieval across the stage boundary', () => {
  const report = verify(raw);
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.activities, 291);
  assert.equal(report.summary.introduced_surface_forms_and_expressions, 71);
  assert.equal(report.summary.surfaces_with_later_positive_review, 71);
  assert.equal(report.summary.grammar_concepts_with_later_review, 6);
  assert.deepEqual(curriculum.grammar_concepts, require('../scripts/sync-grammar-registry.cjs').registryFor(require('../data/course/master-curriculum.json'), 'A1.2'));
  const path = course.validateImplementedPath([{ level: 'A1.1', curriculum: a11, sections: prior }, { level: 'A1.2', curriculum, sections: [raw] }]);
  assert.equal(path.flatMap(s => s.lessons).length, 50);
  const section = path.at(-1);
  for (const lesson of section.lessons) {
    assert.equal(course.lessonObjectiveDisplay(lesson, section.items).structured, true);
    assert.equal(lesson.activities.length, lesson.activity_count);
    const progress = course.recordLessonCompletion(course.emptyProgress(), lesson.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(progress).lessonScores[lesson.id], { correct: 8, graded: 10, completedAt: 123 });
  }
  for (const lesson of section.lessons.slice(8)) {
    assert.deepEqual(lesson.new_targets, []);
    assert.ok(lesson.learning_objectives.lexical.every(g => g.status === 'reviewed'));
  }
  assert.equal(report.grammar_review.find(g => g.concept_id === 'a11-questions').introduced_in, 'lesson-5');
});
test('shopping acceptance rejects missing positive answers and vacuous recognition', () => {
  const missing = structuredClone(raw), target = 'a12s1-topic-sentti';
  missing.lessons[0].activities = missing.lessons[0].activities.map(a => a.item === target && ['type', 'choice'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: ' + target)));
  const unreviewed = structuredClone(raw);
  for (const l of unreviewed.lessons.slice(1)) l.activities = l.activities.map(a => a.item === target && ['type', 'choice'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(unreviewed).errors.some(e => e.includes('no later positive review: ' + target)));
  const single = structuredClone(raw), choice = single.lessons[0].activities.find(a => a.type === 'choice' && a.mode !== 'listen');
  choice.options = [choice.item];
  assert.ok(verify(single).errors.some(e => e.includes('meaningful alternatives')));
});
test('quantity, payment and negative grammar answers reject incorrect Finnish forms', () => {
  const section = course.validateSection(raw);
  for (const [fi, wrong] of [['Se maksaa viisi euroa.', 'Se maksaa viisi euro.'], ['Puoli litraa maitoa, kiitos.', 'Puoli litra maitoa, kiitos.'], ['Voinko maksaa kortilla?', 'Voinko maksaa korttia?'], ['Tämä ei toimi.', 'Tämä ei toimii.']]) {
    const a = section.lessons.flatMap(l => l.activities).find(a => a.type === 'controlled-production' && a.expected_fi === fi && a.grammar_concept_ids?.length);
    assert.ok(a, fi);
    assert.equal(course.gradeActivityAnswer(a, { surface_form: a.expected_fi, accepted_answers: a.accepted_answers }, fi).accepted, true);
    assert.equal(course.gradeActivityAnswer(a, { surface_form: a.expected_fi, accepted_answers: a.accepted_answers }, wrong).accepted, false, wrong);
  }
  const weak = structuredClone(raw), lesson = weak.lessons[7], goal = lesson.learning_objectives.grammar[0], a = lesson.activities[goal.evidence[0].activity_index];
  delete a.answer_policy;
  delete lesson.structured_practice.find(sp => sp.type === a.type && sp.item === a.item).answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('grammar production lacks morphology policy')));
});
test('shopping checkpoint preserves the fifteen-target contract, tasks and 80% threshold', () => {
  assert.deepEqual(raw.lessons[9].checkpoint_targets, ORIGINAL_CHECKPOINT_TARGETS);
  const cp = course.validateSection(raw).lessons[9];
  assert.equal(course.passesLessonRequirement(cp, 17, 21), true);
  assert.equal(course.passesLessonRequirement(cp, 16, 21), false);
  const weak = structuredClone(raw); weak.lessons[9].passing_score = 0.7;
  assert.ok(verify(weak).errors.some(e => e.includes('80% threshold')));
  const changed = structuredClone(raw); changed.lessons[9].checkpoint_targets.pop();
  assert.ok(verify(changed).errors.some(e => e.includes('Checkpoint target contract changed')));
});

test('shopping backfill retains original item records and stable core lesson contracts', () => {
  const hash = value => require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash(raw.items), '7b87c9200ddf26151d54aeb3bdd200f39ad3e807f354b294af29e2a4e67f8225');
  const core = raw.lessons.map(l => Object.fromEntries(['id', 'curriculum_id', 'production_targets', 'listening_targets', 'checkpoint_targets', 'passing_score', 'curriculum_target_refs'].map(k => [k, l[k] ?? null])));
  assert.equal(hash(core), 'aceb30f37b072b3a2ac4604ba7f181535f49453d82a14446044201fa09663433');
});

test('new shopping expressions are explicitly taught before the first graded answer', () => {
  for (const lesson of course.validateSection(raw).lessons) for (const target of lesson.new_targets) {
    if (raw.items[target].item_type !== 'expression') continue;
    const taught = lesson.activities.findIndex(a => a.type === 'teach' && a.item === target);
    const tested = lesson.activities.findIndex(a => assessesExpression(a, target, raw.items));
    assert.ok(taught >= 0 && taught < tested, target);
  }
});

test('expression teaching gate detects full answers attributed to component words', () => {
  const target = 'a12s1-expr-haluaisin-taman-kiitos-28';
  const component = 'a12s1-topic-haluaisin';
  const fi = raw.items[target].surface_form;
  assert.equal(assessesExpression({ type: 'controlled-production', item: component, expected_fi: fi }, target, raw.items), true);
  assert.equal(assessesExpression({ type: 'controlled-production', item: component, accepted_answers: [fi.toUpperCase().replace('.', '')] }, target, raw.items), true);
  assert.equal(assessesExpression({ type: 'choice', item: component, options: [component, target] }, target, raw.items), false);
  assert.equal(assessesExpression({ type: 'teach', item: component, expected_fi: fi }, target, raw.items), false);
  const broken = structuredClone(raw), lesson = broken.lessons[2];
  const old = [...lesson.activities];
  const evidence = lesson.learning_objectives.grammar.flatMap(g => g.evidence).map(e => [e, old[e.activity_index]]);
  const taught = lesson.activities.findIndex(a => a.type === 'teach' && a.item === target);
  const [card] = lesson.activities.splice(taught, 1);
  const assessed = lesson.activities.findIndex(a => a.type === 'controlled-production' && a.item === component);
  lesson.activities.splice(assessed + 1, 0, card);
  for (const [entry, activity] of evidence) entry.activity_index = lesson.activities.indexOf(activity);
  assert.ok(verify(broken).errors.some(e => e.includes('new expression must be taught before assessment: ' + target)));
});
