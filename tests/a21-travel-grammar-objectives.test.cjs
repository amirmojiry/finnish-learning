'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course.js');
const curriculum = require('../data/course/a2.1-curriculum.json');
const raw = require('../data/course/a2.1-section-1.json');
const section = course.validateSection(raw);
test('A2.1 travel lessons 1–3 assess simple past in positive productive answers', () => {
  for (const [index, lesson] of section.lessons.slice(0, 3).entries()) {
    assert.doesNotThrow(() => course.validateLessonObjectives(lesson, section, curriculum.grammar_concepts));
    const goal = lesson.learning_objectives.grammar[0];
    assert.equal(goal.concept_id, 'a21-imperfect');
    assert.equal(goal.status, index === 0 ? 'introduced' : 'reviewed');
    assert.equal(goal.evidence[0].mode, 'supported_production');
    const activity = lesson.activities.find(a => a.type === goal.evidence[0].activity_type && a.item === goal.evidence[0].item_id);
    assert.ok(activity);
    assert.ok(activity.grammar_concept_ids.includes(goal.concept_id));
    assert.ok(section.items[activity.item]);
    assert.ok(goal.examples[0].fi && goal.examples[0].fa);
  }
});
test('A2.1 travel lessons reject missing positive grammar evidence', () => {
  const lesson = structuredClone(section.lessons[0]);
  lesson.activities.find(a => a.type === 'inflection-production').grammar_concept_ids = [];
  assert.throws(() => course.validateLessonObjectives(lesson, section, curriculum.grammar_concepts), /explicit evidence concept link/);
});
