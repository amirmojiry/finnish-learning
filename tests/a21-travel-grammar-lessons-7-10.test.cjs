'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course.js');
const section = course.validateSection(require('../data/course/a2.1-section-1.json'));
const curriculum = require('../data/course/a2.1-curriculum.json');
const earlierA12 = require('../data/course/a1.2-section-3.json');
const earlierA13 = require('../data/course/a1.3-section-4.json');
const lessons = section.lessons.slice(6);
const grammar = curriculum.grammar_concepts.find(c => c.id === 'a21-imperfect');

test('A2.1 travel lessons 7-10 assess reviewed imperfect using positive supported production', () => {
  assert.equal(lessons.length, 4);
  const expected = ['Kävin', 'ostin', 'kävin', 'Näin'];
  lessons.forEach((lesson, index) => {
    assert.doesNotThrow(() => course.validateLessonObjectives(lesson, section, curriculum.grammar_concepts));
    assert.deepEqual(lesson.learning_objectives.communicative, [{ id: lesson.id + '-can-do', can_do_fa: lesson.objective_fa }]);
    const goal = lesson.learning_objectives.grammar[0];
    assert.equal(goal.concept_id, grammar.id);
    assert.equal(goal.status, 'reviewed');
    assert.deepEqual(goal.prerequisite_concept_ids, grammar.prerequisites);
    assert.deepEqual(goal.evidence, [{ activity_type: 'inflection-production', item_id: lesson.morphology_practice[0].item, mode: 'supported_production' }]);
    const graded = lesson.activities.find(a => a.type === 'inflection-production' && a.item === goal.evidence[0].item_id);
    assert.ok(graded);
    assert.ok(graded.grammar_concept_ids.includes(grammar.id));
    assert.equal(graded.expected_fi, expected[index]);
    assert.ok(graded.accepted_answers.includes(expected[index]));
    assert.ok(graded.frame_fi.includes('_____'));
    assert.deepEqual(goal.examples, [{ fi: section.items[graded.item].surface_form, fa: section.items[graded.item].translation_fa }]);
    assert.equal(lesson.activities.length, 15);
    assert.ok(lesson.grammar_fa);
  });
});

test('lexical review statuses reflect earlier surface-form teaching, not source rank', () => {
  for (const lesson of lessons.slice(0, 3)) {
    assert.deepEqual(lesson.learning_objectives.lexical.map(x => x.target_id), lesson.new_targets);
  }
  const l7=lessons[0], l8=lessons[1], l9=lessons[2];
  assert.ok(l7.learning_objectives.lexical.every(x => x.status === 'introduced'));
  const byId = lesson => new Map(lesson.learning_objectives.lexical.map(x => [x.target_id, x.status]));
  assert.equal(byId(l8).get('a21s1-t-066'), 'reviewed');
  assert.equal(byId(l9).get('a21s1-t-074'), 'reviewed');
  assert.equal(byId(l9).get('a21s1-t-076'), 'reviewed');
  for(const lesson of [l8,l9]) assert.ok(lesson.learning_objectives.lexical.every(x => (
    x.status === 'reviewed' || x.status === 'introduced'
  )));
  assert.ok(earlierA13.lessons.some(l => (l.curriculum_target_refs?.high_frequency || []).some(id => earlierA13.items[id]?.surface_form === 'ensin')));
  const saturday = earlierA12.items['a12s3-topic-21'];
  const sunday = earlierA12.items['a12s3-topic-22'];
  assert.equal(saturday.surface_form, 'lauantaina');
  assert.equal(sunday.surface_form, 'sunnuntaina');
  assert.ok(earlierA12.lessons.some(l => l.new_targets.includes(saturday.id) && l.new_targets.includes(sunday.id)));
});

test('checkpoint reuses its complete authored assessment target set without new words', () => {
  const checkpoint=lessons[3];
  assert.deepEqual(checkpoint.new_targets, []);
  assert.equal(checkpoint.checkpoint_targets.length,15);
  assert.deepEqual(checkpoint.learning_objectives.lexical.map(x=>x.target_id), checkpoint.checkpoint_targets);
  assert.ok(checkpoint.learning_objectives.lexical.every(x=>x.status==='reviewed'));
  assert.equal(checkpoint.learning_objectives.grammar[0].status, 'reviewed');
});

test('unsupported grammar claims and unlinked graded evidence are rejected', () => {
  for (const lesson of lessons) {
    const missing = structuredClone(lesson);
    missing.activities.find(x=>x.type==='inflection-production').grammar_concept_ids=[];
    assert.throws(()=>course.validateLessonObjectives(missing,section,curriculum.grammar_concepts),/explicit evidence concept link/);
    const unsupported = structuredClone(lesson);
    unsupported.learning_objectives.grammar[0].evidence[0].mode='independent_production';
    assert.throws(()=>course.validateLessonObjectives(unsupported,section,curriculum.grammar_concepts),/independent production cannot use a scaffold/);
  }
  const invalid=structuredClone(lessons[1]);
  invalid.learning_objectives.grammar[0].concept_id='a21-sequencing';
  invalid.learning_objectives.grammar[0].prerequisite_concept_ids=['a21-imperfect'];
  assert.throws(()=>course.validateLessonObjectives(invalid,section,curriculum.grammar_concepts),/explicit evidence concept link/);
});
