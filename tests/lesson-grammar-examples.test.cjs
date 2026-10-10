'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { lessonObjectiveDisplay } = require('../course.js');
const section = require('../data/course/a2.1-section-2.json');
test('structured grammar objectives retain reviewed bilingual examples for rendering', () => {
  const result = lessonObjectiveDisplay(section.lessons[2], section.items);
  assert.ok(result.structured);
  assert.ok(result.grammarGoals.length);
  assert.ok(result.grammarGoals.every(goal => goal.examples.length > 0));
  for (const example of result.grammarGoals.flatMap(goal => goal.examples)) {
    assert.equal(typeof example.fi, 'string');
    assert.equal(typeof example.fa, 'string');
    assert.ok(example.fi.trim());
    assert.ok(example.fa.trim());
  }
});
test('legacy lesson without structured goals remains unchanged', () => {
  const result = lessonObjectiveDisplay(section.lessons[0], section.items);
  assert.equal(result.structured, false);
  assert.deepEqual(result.grammarGoals, []);
});
