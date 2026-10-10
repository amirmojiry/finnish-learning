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

test('grammar details renderer creates bilingual text spans with language and direction', () => {
  class FakeNode {
    constructor(tagName) {
      this.tagName = tagName;
      this.children = [];
      this.textContent = '';
      this.lang = '';
      this.dir = '';
    }
    append(...children) { this.children.push(...children); }
  }
  const originalDocument = global.document;
  global.document = {
    createElement: (tagName) => new FakeNode(tagName),
    createTextNode: (value) => ({ nodeType: 3, textContent: value }),
  };
  try {
    const { appendGrammarGoalDetails } = require('../course.js');
    const view = lessonObjectiveDisplay(section.lessons[2], section.items);
    const root = new FakeNode('div');
    appendGrammarGoalDetails(root, view);
    assert.equal(root.children.length, 1);
    const group = root.children[0];
    const list = group.children[1];
    const row = list.children[0];
    const pair = row.children[1];
    assert.equal(pair.tagName, 'p');
    assert.equal(pair.className, 'course-lesson-grammar-example');
    const [fi, separator, fa] = pair.children;
    assert.equal(fi.tagName, 'span');
    assert.equal(fi.lang, 'fi');
    assert.equal(fi.dir, 'ltr');
    assert.equal(fi.textContent, view.grammarGoals[0].examples[0].fi);
    assert.equal(separator.textContent, ' — ');
    assert.equal(fa.tagName, 'span');
    assert.equal(fa.lang, 'fa');
    assert.equal(fa.dir, 'rtl');
    assert.equal(fa.textContent, view.grammarGoals[0].examples[0].fa);
  } finally {
    global.document = originalDocument;
  }
});
