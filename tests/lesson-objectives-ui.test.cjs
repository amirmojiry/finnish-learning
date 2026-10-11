'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { lessonObjectiveDisplay } = require('../course.js');
const section = require('../data/course/a2.1-section-2.json');
const legacySection = require('../data/course/a1.2-section-1.json');

test('authored lesson objectives are presented by category', () => {
  const lesson = section.lessons[2];
  const view = lessonObjectiveDisplay(lesson, section.items);
  assert.equal(view.structured, true);
  assert.equal(view.communicative.length, 1);
  assert.equal(view.lexical.length, lesson.learning_objectives.lexical.length);
  assert.ok(view.lexical.every(goal => goal.label && !goal.label.startsWith('a21s2-')));
  assert.equal(view.grammarGoals[0].status, 'reviewed');
  assert.match(view.grammarGoals[0].label, /alkoivat/);
});
test('legacy lesson details retain objective summary and grammar', () => {
  const view = lessonObjectiveDisplay(legacySection.lessons[0], legacySection.items);
  assert.equal(view.structured, false);
  assert.ok(view.objective);
  assert.equal(view.summary, legacySection.lessons[0].summary_fa); // Legacy lessons retain their authored summary.
  assert.ok(view.grammar);
});
