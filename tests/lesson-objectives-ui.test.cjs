'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { lessonObjectiveDisplay } = require('../course.js');
const section = require('../data/course/a2.1-section-2.json');
const legacySection = structuredClone(require('../data/course/a1.2-section-1.json'));
for (const lesson of legacySection.lessons) delete lesson.learning_objectives;

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

test('R1 lexical objectives show authored meaning and lemma without inventing a reviewed sense', () => {
  const view = lessonObjectiveDisplay(section.lessons[2], section.items);
  const targets = section.lessons[2].learning_objectives.lexical;
  for (let i = 0; i < targets.length; i++) {
    const item = section.items[targets[i].target_id];
    assert.ok(view.lexical[i].label.includes(item.surface_form));
    if (item.translation_fa) assert.ok(view.lexical[i].label.includes(item.translation_fa));
    if (item.item_type === 'word' && item.lemma && item.lemma !== item.surface_form)
      assert.ok(view.lexical[i].label.includes('ریشه: ' + item.lemma));
  }
});
