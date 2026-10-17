'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course.js');
const original = require('../data/course/a1.1-section-2.json');
const clone = () => structuredClone(original);

test('R2 retains published lessons longer than 30 slides', () => {
  const section = clone();
  const long = section.lessons.find(l => l.activities.length > 30);
  assert.ok(long, 'fixture should include an existing over-budget lesson');
  assert.doesNotThrow(() => course.validateSection(section));
});

test('R2 enforces 30 visible slides on opted-in authored lessons', () => {
  const section = clone();
  const lesson = section.lessons[0];
  lesson.activity_budget_policy = 'enforced';
  const teaching = lesson.activities.find(a => a.type === 'teach');
  assert.ok(teaching);
  while (lesson.activities.length < 30) lesson.activities.push(structuredClone(teaching));
  lesson.activity_count = 30;
  assert.doesNotThrow(() => course.validateSection(section));
  lesson.activities.push(structuredClone(teaching));
  lesson.activity_count = 31;
  assert.throws(() => course.validateSection(section), /exceeds 30 visible slides/);
});

test('R2 rejects zero or dishonest authored activity counts', () => {
  const section = clone();
  section.lessons[0].activity_budget_policy = 'enforced';
  section.lessons[0].activity_count = 0;
  assert.throws(() => course.validateSection(section), /declared positive count/);
});
