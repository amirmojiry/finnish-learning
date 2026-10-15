'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const course = require('../course.js');
const section = course.validateSection(require('../data/course/a2.1-section-1.json'));
const concepts = require('../data/course/a2.1-curriculum.json').grammar_concepts;
const target = 'a21s1-t-058';
const concept = 'a21-plural-partitive';
const introduction = section.lessons[6];
const review = section.lessons[8];
const goal = (lesson) => lesson.learning_objectives.grammar.find(g => g.concept_id === concept);
const production = (lesson) => lesson.activities.find(a => ['expression-completion', 'inflection-production'].includes(a.type) && a.item === target);

test('plural partitive has recognition, supported production and later contextual review', () => {
  assert.deepEqual(goal(introduction).evidence.map(e => e.mode), ['recognition', 'supported_production']);
  assert.equal(goal(introduction).status, 'introduced');
  assert.equal(goal(review).status, 'reviewed');
  assert.deepEqual(goal(review).evidence.map(e => e.mode), ['supported_production']);
  assert.ok(review.order > introduction.order);
  assert.ok(review.recycle_from.includes(introduction.curriculum_id));
  assert.ok(review.practice_targets.includes(target));
  assert.ok(review.learning_objectives.lexical.some(g => g.target_id === target && g.status === 'reviewed'));
  assert.ok(!review.new_targets.includes(target));
  assert.equal(production(introduction).prompt_fi, 'Otin _____.');
  assert.equal(production(review).frame_fi, 'Näin _____ museossa.');
  assert.equal(production(review).frame_fi.replace('_____', 'valokuvia'), goal(review).examples[0].fi);
  assert.equal(goal(review).examples[0].fa, 'در موزه عکس‌هایی دیدم.');
});

test('typed grammar application accepts the plural form and rejects singular or other cases', () => {
  for (const lesson of [introduction, review]) {
    const activity = production(lesson);
    assert.ok(activity);
    const answer = { surface_form: activity.accepted_answers[0], accepted_answers: activity.accepted_answers };
    assert.equal(course.gradeMorphologyAnswer(answer, 'valokuvia').accepted, true);
    for (const wrong of ['valokuva', 'valokuvan', 'valokuvat', 'valokuvassa', '']) {
      assert.equal(course.gradeMorphologyAnswer(answer, wrong).accepted, false, wrong);
    }
    assert.deepEqual(goal(lesson).prerequisite_concept_ids, ['a12-quantities']);
    assert.doesNotThrow(() => course.validateLessonObjectives(lesson, section, concepts));
    const broken = structuredClone(lesson);
    production(broken).grammar_concept_ids = [];
    assert.throws(() => course.validateLessonObjectives(broken, section, concepts), /explicit evidence concept link/);
    const unsupported = structuredClone(lesson);
    goal(unsupported).evidence.at(-1).mode = 'independent_production';
    assert.throws(() => course.validateLessonObjectives(unsupported, section, concepts), /independent production cannot use a scaffold/);
  }
});

test('expanded practice keeps grammar target evidence and saved scores', () => {
 for (const lesson of [introduction, review]) {
   assert.equal(lesson.activities.length, lesson.activity_count);
   assert.ok(lesson.activities.some(a => a.type === 'inflection-production'));
   assert.ok(lesson.activities.some(a => ['choice','type','expression-completion'].includes(a.type) && a.item === target));
   const old = course.recordLessonCompletion(course.emptyProgress(), lesson.id, 12, 14, 123);
   assert.deepEqual(course.sanitizeProgress(old).lessonScores[lesson.id], { correct: 12, graded: 14, completedAt: 123 });
   const completed = course.recordLessonCompletion(old, lesson.id, 13, 15, 456);
   assert.deepEqual(completed.lessonScores[lesson.id], { correct: 13, graded: 15, completedAt: 456 });
 }
 assert.equal(section.lessons[9].activities.length,15);
 assert.deepEqual(section.lessons[9].new_targets,[]);
});

test('lesson 7 has exactly one typed Otin frame and evidence reuses its completion', () => {
  const duplicates = introduction.activities.filter(a => ['expression-completion', 'inflection-production'].includes(a.type) && (a.prompt_fi || a.frame_fi) === 'Otin _____.');
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].type, 'expression-completion');
  assert.equal(goal(introduction).evidence[1].activity_type, 'expression-completion');
  assert.ok(duplicates[0].grammar_concept_ids.includes(concept));
});
