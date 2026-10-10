'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { lessonDetailParagraphs } = require('../course.js');

test('repeated objective and summary are displayed only once', () => {
  const text = 'باجهٔ درست را پیدا کنم، نیاز اداری ساده‌ای را بیان کنم و دربارهٔ نوبت بپرسم.';
  const result = lessonDetailParagraphs({ objective_fa: text, summary_fa: text, grammar_fa: 'نمونهٔ گرامر' });
  assert.equal(result.objective, text);
  assert.equal(result.summary, '');
  assert.equal(result.grammar, 'نمونهٔ گرامر');
});
test('spacing, punctuation and Persian zero-width marks do not create duplicate detail paragraphs', () => {
  const result = lessonDetailParagraphs({ objective_fa: 'من  امروز می‌روم.', summary_fa: 'من امروز میروم!' });
  assert.equal(result.summary, '');
});
test('distinct objective and summary remain visible', () => {
  const result = lessonDetailParagraphs({ objective_fa: 'نام خود را بگو.', summary_fa: 'با minä و sinä خودت را معرفی کن.' });
  assert.equal(result.summary, 'با minä و sinä خودت را معرفی کن.');
});
