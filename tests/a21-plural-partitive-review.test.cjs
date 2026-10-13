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
const production = (lesson) => lesson.activities.find(a => a.type === 'inflection-production' && a.item === target);

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
  assert.equal(production(introduction).frame_fi, 'Otin _____.');
  assert.equal(production(review).frame_fi, 'Näin _____ museossa.');
  assert.equal(production(review).frame_fi.replace('_____', 'valokuvia'), goal(review).examples[0].fi);
  assert.equal(goal(review).examples[0].fa, 'در موزه عکس‌هایی دیدم.');
});

test('typed grammar application accepts the plural form and rejects singular or other cases', () => {
  for (const lesson of [introduction, review]) {
    const activity = production(lesson);
    assert.ok(activity);
    const answer = { surface_form: activity.expected_fi, accepted_answers: activity.accepted_answers };
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

test('appending practice preserves all previous prepared activity positions and stored scores', () => {
  // Hashes freeze the complete prepared activity sequences from the 1.36.0 baseline.
  for (const [lesson, hash] of [
    [introduction, '4bd26fa8df660be8724a99f56385a771926a4045c9f72495a7c5b0ed9045b923'],
    [review, '0e9e881f47badb7a527bec01c3695cf9ab622470498a5d0e3468f16068e08d97'],
  ]) {
    assert.equal(lesson.activities.length, 20);
    assert.equal(createHash('sha256').update(JSON.stringify(lesson.activities.slice(0, 19))).digest('hex'), hash);
    assert.equal(lesson.activities.at(-1).type, 'inflection-production');
    const old = course.recordLessonCompletion(course.emptyProgress(), lesson.id, 12, 14, 123);
    assert.deepEqual(course.sanitizeProgress(old).lessonScores[lesson.id], { correct: 12, graded: 14, completedAt: 123 });
    const completed = course.recordLessonCompletion(old, lesson.id, 13, 15, 456);
    assert.deepEqual(completed.lessonScores[lesson.id], { correct: 13, graded: 15, completedAt: 456 });
  }
  assert.equal(section.lessons[9].activities.length, 15);
  assert.equal(section.lessons[9].checkpoint_targets.length, 15);
  assert.deepEqual(section.lessons[9].new_targets, []);
});
