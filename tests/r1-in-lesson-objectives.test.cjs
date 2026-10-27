const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'course.js'), 'utf8');

test('R1 offers canonical objectives in the exercise on every slide, including resumed lessons', () => {
  const activity = source.slice(source.indexOf('function renderActivity()'), source.indexOf('function renderActivity()') + 8500);
  assert.match(activity, /lessonObjectiveDisplay\(activeLesson, section\.items, p2Identity, section\.id\)/);
  assert.match(activity, /appendGrammarGoalDetails\(panel, detail\)/);
  assert.match(activity, /جزئیات و هدف‌های درس/);
  assert.doesNotMatch(activity, /activityIndex === 0\) \{\s*const intro/);
  assert.match(activity, /if \(!activeLesson\.focused_practice\)/);
  assert.match(activity, /document\.createElement\('ul'\)/);
});
