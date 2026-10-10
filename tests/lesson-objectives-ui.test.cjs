'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { lessonObjectiveDisplay } = require('../course.js');
const section = require('../data/course/a2.1-section-2.json');

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
  const view = lessonObjectiveDisplay(section.lessons[0], section.items);
  assert.equal(view.structured, false);
  assert.ok(view.objective);
  assert.equal(view.summary, ''); // Duplicate authored summary is suppressed.
  assert.ok(view.grammar);
});
