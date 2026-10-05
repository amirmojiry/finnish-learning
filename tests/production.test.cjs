const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const course = require('../course.js');
const ROOT = path.resolve(__dirname, '..');
const curriculum = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-curriculum.json'), 'utf8'));
const rawSections = [1, 2, 3, 4].map((number) => (
  JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course', `a1.1-section-${number}.json`), 'utf8'))
));
const sections = course.validateImplementedCourse(rawSections, curriculum);

function rawLessonScope(lesson) {
  const refs = new Set([
    ...(lesson.new_targets || []),
    ...(lesson.practice_targets || []),
    ...(lesson.checkpoint_targets || []),
    ...(lesson.review_targets || []),
    ...(lesson.curriculum_target_refs?.high_frequency || []),
    ...(lesson.curriculum_target_refs?.topic || []),
    ...(lesson.curriculum_target_refs?.expressions || []),
  ]);
  for (const activity of lesson.activities || []) {
    for (const key of ['item', 'answer_item', 'question_item', 'negative_item', 'affirmative_item', 'event_item', 'time_item']) {
      if (activity[key]) refs.add(activity[key]);
    }
    for (const key of ['items', 'turns', 'expected_items', 'options']) {
      for (const itemId of activity[key] || []) refs.add(itemId);
    }
  }
  return refs;
}

test('all forty A1.1 lessons contain exactly one Persian-to-Finnish production activity', () => {
  const lessons = sections.flatMap((section) => section.lessons);
  assert.equal(lessons.length, 40);

  for (const lesson of lessons) {
    assert.equal(lesson.activities.length, 15, lesson.id);
    assert.equal(lesson.production_targets.length, 1, lesson.id);
    const production = lesson.activities.filter((activity) => activity.type === 'production');
    assert.equal(production.length, 1, lesson.id);
    assert.equal(production[0].item, lesson.production_targets[0], lesson.id);
  }
});

test('every production target is explicit, Persian-prompted, and answerable without runtime morphology', () => {
  sections.forEach((section, sectionIndex) => {
    const raw = rawSections[sectionIndex];
    section.lessons.forEach((lesson, lessonIndex) => {
      const rawLesson = raw.lessons[lessonIndex];
      const targetId = lesson.production_targets[0];
      const item = section.items[targetId];

      assert.ok(item, `${lesson.id}: missing production item`);
      assert.ok(item.translation_fa && item.translation_fa.trim(), `${lesson.id}: missing Persian prompt`);
      assert.ok(course.acceptedAnswers(item).length, `${lesson.id}: missing accepted answer`);
      assert.ok(Array.isArray(item.accepted_answers) && item.accepted_answers.length, `${lesson.id}: answers must be explicit in data`);
      assert.ok(rawLessonScope(rawLesson).has(targetId), `${lesson.id}: production target is outside declared/reviewed lesson scope`);
      assert.doesNotMatch(item.surface_form, /…|\.\.\.|___+/);
      assert.doesNotMatch(item.translation_fa, /…|\.\.\./);
    });
  });
});

test('every section checkpoint and the final A1.1 checkpoint include productive recall', () => {
  for (const section of sections) {
    const checkpoint = section.lessons[section.lessons.length - 1];
    assert.equal(checkpoint.order, 10);
    assert.ok(checkpoint.activities.some((activity) => activity.type === 'production'), checkpoint.id);
  }
});

test('production activities use the shared fuzzy typed-answer feedback path', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /activity\.type === 'production'/);
  assert.match(source, /فارسی را به فنلاندی بنویس/);
  assert.match(source, /gradeTypedAnswer\(item, input\.value\)/);
  assert.match(source, /showFeedback\(feedback, correct, item, grading\)/);
  assert.doesNotMatch(source, /production[\s\S]{0,300}(?:slice|substring|\+\s*['"][a-zäö])/i);
});
