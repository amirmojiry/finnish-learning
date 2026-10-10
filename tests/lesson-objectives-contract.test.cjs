'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course.js');
const curriculum = require('../data/course/a2.1-curriculum.json');
const raw = require('../data/course/a2.1-section-2.json');
const section = course.validateSection(raw);
const lesson = section.lessons[2];
const concepts = curriculum.grammar_concepts;
const verify = (l) => course.validateLessonObjectives(l, section, concepts);
test('authored A2.1 simple past objective has positively graded evidence', () => {
  assert.doesNotThrow(() => verify(lesson));
});
test('rejects missing graded grammar evidence', () => {
  const broken = structuredClone(lesson);
  broken.learning_objectives.grammar[0].evidence = [];
  assert.throws(() => verify(broken), /positive assessment/);
});
test('rejects unlinked or distractor-only grammar evidence', () => {
  const broken = structuredClone(lesson);
  broken.activities.find(a => a.type === 'inflection-production' && a.item === 'a21s2-e-028').grammar_concept_ids = [];
  assert.throws(() => verify(broken), /explicit evidence concept link/);
});
test('rejects unsupported independent production claims', () => {
  const broken = structuredClone(lesson);
  broken.learning_objectives.grammar[0].evidence[0].mode = 'independent_production';
  assert.throws(() => verify(broken), /independent production cannot use a scaffold/);
});
test('rejects mismatched prerequisites', () => {
  const broken = structuredClone(lesson);
  broken.learning_objectives.grammar[0].prerequisite_concept_ids = [];
  assert.throws(() => verify(broken), /prerequisites differ/);
});
test('legacy lessons without explicit objective metadata remain valid', () => {
  assert.doesNotThrow(() => verify(section.lessons[0]));
});
