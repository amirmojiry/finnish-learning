'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');

test('long teaching cards are sized for mobile and aligned from the top', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/course.css'), 'utf8');
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /item\.surface_form\.length > 65/);
  assert.match(css, /\.course-teach-word\.is-long-text strong/);
  assert.match(css, /\.course-question-card:has\(\.course-teach-word\.is-long-text\)/);
});

test('completion exercises include a Persian semantic hint', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /activity\.prompt_fa \|\| item\?\.translation_fa/);
  assert.match(source, /card\.append\(sentence, translation, form, feedback\)/);
});

test('negation exercise displays only the target negative meaning', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /negative\.translation_fa/);
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/course/a1.1-section-3.json'), 'utf8'));
  for (const [id, item] of Object.entries(data.items)) {
    if (!id.startsWith('s3-negative-')) continue;
    assert.equal(item.translation_fa.includes('→'), false, id);
    assert.equal(item.example_fa.includes('→'), false, id);
  }
});

test('audio is cancelled and pending autoplay invalidated when navigating slides', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /function stopSpeech\(windowObject\)/);
  assert.match(source, /windowObject\.speechSynthesis\?\.cancel\(\)/);
  assert.match(source, /const currentAudioToken = \+\+audioSlideToken/);
  assert.match(source, /currentAudioToken === audioSlideToken/);
  assert.match(source, /function nextActivity\(\) \{[\s\S]*?stopSpeech\(windowObject\)/);
});

test('section map offers a gated next-section action', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /const nextSection = sections\[sections\.indexOf\(section\) \+ 1\]/);
  assert.match(source, /nextLink\.disabled = !unlocked/);
  assert.match(source, /root\.append\(nextLink\)/);
});
