'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const section3 = read('data/course/a1.1-section-3.json');
const section4 = read('data/course/a1.1-section-4.json');
const courseSource = fs.readFileSync(path.join(root, 'course.js'), 'utf8');
const courseCss = fs.readFileSync(path.join(root, 'css/course.css'), 'utf8');

test('A1.1 multi-sentence final meaning choice keeps all four selectable answers', () => {
  const lesson = section3.lessons.find(row => row.id === 'section-3-lesson-9');
  assert.ok(lesson);
  const last = lesson.activities.at(-1);
  assert.equal(last.type, 'choice');
  assert.equal(last.mode, 'meaning');
  assert.equal(last.item, 's3-routine-reading');
  assert.equal(last.options.length, 4);
  assert.ok(last.options.includes(last.item));
  assert.ok(section3.items[last.item].surface_form.length > 85);
});

test('long prompts receive compact reading typography and an independently scrollable card', () => {
  assert.match(courseSource, /item\.item_type === 'reading' \|\| item\.surface_form\.length > 85/);
  assert.match(courseSource, /focus\.classList\.add\('is-long-text'\)/);
  assert.match(courseSource, /card\.classList\.add\('is-long-content'\)/);
  assert.match(courseCss, /\.course-focus-word\.is-long-text,\s*\.course-focus-word\.is-contextual-prompt\s*\{/);
  assert.match(courseCss, /body\.course-lesson-active \.course-question-card\s*\{[^}]*overflow-y: auto/s);
  assert.match(courseCss, /\.course-question-card\.is-long-content\s*\{\s*justify-content: flex-start;/);
  assert.match(courseCss, /\.course-question-card\.is-long-content \.course-options\s*\{\s*flex: 0 0 auto;/);
});

test('each location question has a Finnish scene clue and the matching bilingual answer', () => {
  const lesson = section4.lessons.find(row => row.id === 'section-4-lesson-2');
  const expected = {
    's4-location-q-phone': ['pöydällä', 'روی میز', 's4-se-on-poydalla'],
    's4-location-q-book': ['tuolilla', 'روی صندلی', 's4-se-on-tuolilla'],
    's4-location-q-cat': ['sängyllä', 'روی تخت', 's4-se-on-sangylla'],
    's4-location-q-home': ['kotona', 'در خانه', 's4-location-a-home'],
  };
  for (const [promptId, [clue, persianClue, answerId]] of Object.entries(expected)) {
    const activity = lesson.activities.find(row => row.type === 'prompt-choice' && row.prompt_item === promptId);
    const prompt = section4.items[promptId];
    assert.ok(activity, promptId);
    assert.equal(activity.answer_item, answerId);
    assert.equal(activity.options.length, 4);
    assert.ok(activity.options.includes(answerId));
    assert.ok(prompt.surface_form.toLowerCase().includes(clue), promptId + ' lacks a contextual clue');
    assert.ok(prompt.translation_fa.includes(persianClue), promptId + ' lacks a Persian clue');
    assert.equal(prompt.example_fi, prompt.surface_form);
    assert.equal(prompt.example_fa, prompt.translation_fa);
    assert.deepEqual(prompt.accepted_answers, [prompt.surface_form]);
  }
  assert.equal(lesson.activities.length, 15);
});
