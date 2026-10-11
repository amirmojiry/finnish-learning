'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course.js');
const curriculum = require('../data/course/a2.1-curriculum.json');
const section = course.validateSection(require('../data/course/a2.1-section-1.json'));
const lessons = section.lessons.slice(3, 6);
const prerequisiteIds = curriculum.grammar_concepts.find(concept => concept.id === 'a21-imperfect').prerequisites;

test('A2.1 travel lessons 4-6 link reviewed simple-past goals to graded positive production', () => {
  assert.equal(lessons.length, 3);
  for (const lesson of lessons) {
    assert.doesNotThrow(() => course.validateLessonObjectives(lesson, section, curriculum.grammar_concepts));
    assert.deepEqual(lesson.learning_objectives.communicative, [
      { id: lesson.id + '-can-do', can_do_fa: lesson.objective_fa },
    ]);
    assert.deepEqual(lesson.learning_objectives.lexical.map(goal => goal.target_id), lesson.new_targets);
    assert.deepEqual(lesson.learning_objectives.grammar.map(goal => goal.concept_id), ['a21-imperfect']);
    const goal = lesson.learning_objectives.grammar[0];
    assert.equal(goal.status, 'reviewed');
    assert.deepEqual(goal.prerequisite_concept_ids, prerequisiteIds);
    assert.deepEqual(goal.evidence.map(evidence => evidence.mode), ['supported_production']);
    const spec = lesson.morphology_practice[0];
    const evidence = goal.evidence[0];
    assert.equal(evidence.activity_type, 'inflection-production');
    assert.equal(evidence.item_id, spec.item);
    const graded = lesson.activities.find(activity => activity.type === evidence.activity_type && activity.item === evidence.item_id);
    assert.ok(graded, 'missing injected graded activity for ' + lesson.id);
    assert.ok(graded.grammar_concept_ids.includes(goal.concept_id));
    assert.ok(graded.accepted_answers.includes(graded.expected_fi));
    assert.ok(graded.frame_fi.includes('_____'), 'only supported production is assessed');
    assert.deepEqual(goal.examples, [{
      fi: section.items[spec.item].surface_form,
      fa: section.items[spec.item].translation_fa,
    }]);
    assert.equal(goal.explanation_fa, spec.explanation_fa);
  }
});

test('already introduced forms have reviewed, not new, lexical status', () => {
  const [departure, hotel, problems] = lessons;
  const mapped = new Map(departure.learning_objectives.lexical.map(goal => [goal.target_id, goal.status]));
  assert.equal(mapped.get('a21s1-t-031'), 'reviewed'); // ajoissa, previously in A1.2
  assert.equal(mapped.get('a21s1-t-032'), 'reviewed'); // myöhässä, previously in A1.2
  assert.equal(mapped.get('a21s1-t-033'), 'introduced'); // tuntia form
  assert.ok(hotel.learning_objectives.lexical.every(goal => goal.status === 'introduced'));
  const problemsMap = new Map(problems.learning_objectives.lexical.map(goal => [goal.target_id, goal.status]));
  assert.equal(section.items['a21s1-t-050'].surface_form, 'lippua');
  assert.equal(problemsMap.get('a21s1-t-050'), 'reviewed');
  assert.ok(problems.learning_objectives.lexical.every(goal => (
    goal.target_id === 'a21s1-t-050' || goal.status === 'introduced'
  )));
  const priorTravel = require('../data/course/a1.2-section-2.json');
  const previouslyAssessed = priorTravel.lessons.flatMap(lesson => lesson.morphology_practice || [])
    .find(activity => activity.type === 'inflection-production' && activity.expected_fi === 'lippua');
  assert.ok(previouslyAssessed, 'A1.2 must positively assess lippua before it can be reviewed');
  assert.ok(previouslyAssessed.accepted_answers.includes('lippua'));
});

test('preserve contextual grammar notes without falsely asserting their independent assessment', () => {
  assert.match(lessons[1].grammar_fa, /مفعول کامل/u);
  assert.match(lessons[2].grammar_fa, /منفی گذشته/u);
  assert.equal(lessons[1].learning_objectives.grammar.length, 1);
  assert.equal(lessons[2].learning_objectives.grammar.length, 1);
  assert.equal(section.lessons[0].learning_objectives.grammar[0].status, 'introduced');
  assert.equal(section.lessons[1].learning_objectives.grammar[0].status, 'reviewed');
});

test('reject unlinked or missing correct-answer grammar evidence for each mapped lesson', () => {
  for (const original of lessons) {
    const withoutLink = structuredClone(original);
    withoutLink.activities.find(activity => activity.type === 'inflection-production').grammar_concept_ids = [];
    assert.throws(() => course.validateLessonObjectives(withoutLink, section, curriculum.grammar_concepts), /explicit evidence concept link/);
    const withoutEvidence = structuredClone(original);
    withoutEvidence.learning_objectives.grammar[0].evidence = [];
    assert.throws(() => course.validateLessonObjectives(withoutEvidence, section, curriculum.grammar_concepts), /positive assessment/);
  }
});

test('reject independent production label for explicitly scaffolded inflection tasks', () => {
  const invalid = structuredClone(lessons[0]);
  invalid.learning_objectives.grammar[0].evidence[0].mode = 'independent_production';
  assert.throws(() => course.validateLessonObjectives(invalid, section, curriculum.grammar_concepts), /independent production cannot use a scaffold/);
});

test('unassessed case-object grammar cannot claim the simple-past exercise as its evidence', () => {
  const invalid = structuredClone(lessons[1]);
  const goal = invalid.learning_objectives.grammar[0];
  goal.concept_id = 'a21-object-core';
  goal.prerequisite_concept_ids = curriculum.grammar_concepts.find(concept => concept.id === 'a21-object-core').prerequisites;
  assert.throws(() => course.validateLessonObjectives(invalid, section, curriculum.grammar_concepts), /explicit evidence concept link/);
});
