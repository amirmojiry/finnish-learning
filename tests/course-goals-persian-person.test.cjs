'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');

const root = path.resolve(__dirname, '..');
const sectionFiles = ['a1.1', 'a1.2', 'a1.3'].flatMap(level =>
  [1, 2, 3, 4].map(number => `data/course/${level}-section-${number}.json`)
);
const sections = sectionFiles.map(filename =>
  JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'))
);

test('A1 section overview uses one first-person Persian ability heading', () => {
  const source = fs.readFileSync(path.join(root, 'course.js'), 'utf8');
  assert.match(source, /outcomesTitle\.textContent = 'در پایان این بخش می‌توانم';/u);
  assert.doesNotMatch(source, /outcomesTitle\.textContent = 'در پایان این بخش می‌توانی';/u);
});

test('all 12 A1 section goals complete the heading with natural first-person subjunctive verbs', () => {
  assert.equal(sections.length, 12);
  const subjunctiveEnding = /(?:کنم|بگویم|بفهمم|بدهم|دهم|بخواهم|ببرم|بپرسم|بخوانم|بسازم|برسم|بنویسم|ببینم|بشناسم|بدانم|بمانم|بیابم)\.$/u;
  const thirdPersonEnding = /(?:کند|دهد|بگوید|بفهمد|بخواهد|بخواند|بنویسد)\.$/u;
  const indicativeEnding = /می‌(?:کنم|گویم|دهم|پرسم|فهمم|خواهم|خوانم|برم|سازم)\.$/u;

  for (const section of sections) {
    assert.ok(section.can_do_fa?.length >= 4, section.id);
    for (const goal of section.can_do_fa) {
      assert.ok(goal.length >= 20, section.id);
      assert.doesNotMatch(goal, /^می‌توانم(?:\s|$)/u, section.id);
      assert.doesNotMatch(goal, thirdPersonEnding, section.id);
      assert.doesNotMatch(goal, indicativeEnding, section.id);
      assert.match(goal, subjunctiveEnding, section.id + ': ' + goal);
    }
  }
  assert.equal(
    sections[4].can_do_fa[0],
    'قیمت یک کالای آشنا را بپرسم و پاسخ سادهٔ قیمت را بفهمم.'
  );
});

test('section validation rejects goals that repeat the first-person heading', () => {
  const invalidSection = structuredClone(sections[8]);
  invalidSection.can_do_fa[0] = 'می‌توانم دعوتی ساده را بپذیرم.';
  assert.throws(
    () => course.validateSection(invalidSection),
    /goals must not repeat the first-person ability heading/
  );
  assert.doesNotThrow(() => course.validateSection(sections[8]));
});
