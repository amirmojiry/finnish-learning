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
const STRUCTURED_TYPES = new Set(['sentence-order', 'expression-completion', 'controlled-production']);

function lessonScope(lesson) {
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

function activityRefs(lesson) {
  const refs = new Set();
  for (const activity of lesson.activities) {
    for (const key of ['item', 'answer_item', 'question_item', 'negative_item', 'affirmative_item', 'event_item', 'time_item']) {
      if (activity[key]) refs.add(activity[key]);
    }
    for (const key of ['items', 'turns', 'expected_items']) {
      for (const itemId of activity[key] || []) refs.add(itemId);
    }
  }
  return refs;
}

test('all forty A1.1 lessons contain reviewed structured sentence-building practice', () => {
  const lessons = sections.flatMap((section) => section.lessons);
  assert.equal(lessons.length, 40);

  const counts = new Map();
  for (const lesson of lessons) {
    assert.equal(lesson.activities.length, 15, lesson.id);
    const structured = lesson.activities.filter((activity) => STRUCTURED_TYPES.has(activity.type));
    assert.ok(structured.length >= 1, lesson.id);
    assert.equal(structured.length, lesson.structured_practice.length, lesson.id);
    for (const activity of structured) {
      counts.set(activity.type, (counts.get(activity.type) || 0) + 1);
    }
  }

  assert.deepEqual(Object.fromEntries(counts), {
    'sentence-order': 16,
    'expression-completion': 16,
    'controlled-production': 16,
  });
});

test('structured-practice manifests are explicit and stay inside reviewed lesson scope', () => {
  sections.forEach((section, sectionIndex) => {
    const rawSection = rawSections[sectionIndex];
    section.lessons.forEach((lesson, lessonIndex) => {
      const rawLesson = rawSection.lessons[lessonIndex];
      const scope = lessonScope(rawLesson);
      assert.ok(Array.isArray(rawLesson.structured_practice) && rawLesson.structured_practice.length, lesson.id);

      for (const spec of rawLesson.structured_practice) {
        assert.ok(STRUCTURED_TYPES.has(spec.type), `${lesson.id}: ${spec.type}`);
        assert.ok(section.items[spec.item], `${lesson.id}: ${spec.item}`);
        assert.ok(scope.has(spec.item), `${lesson.id}: structured target outside lesson scope: ${spec.item}`);

        const prepared = lesson.activities.filter((activity) => activity.type === spec.type && activity.item === spec.item);
        assert.equal(prepared.length, 1, `${lesson.id}: ${spec.type} / ${spec.item}`);
        assert.deepEqual(prepared[0], spec);
      }
    });
  });
});

test('sentence ordering, expression completion, and controlled production keep explicit answer contracts', () => {
  for (const lesson of sections.flatMap((section) => section.lessons)) {
    for (const activity of lesson.activities.filter((entry) => STRUCTURED_TYPES.has(entry.type))) {
      if (activity.type === 'sentence-order') {
        assert.ok(activity.tokens.length >= 2, lesson.id);
        assert.equal(activity.tokens.length, activity.answer_order.length, lesson.id);
        assert.deepEqual(
          [...activity.answer_order].sort((a, b) => a - b),
          Array.from({ length: activity.tokens.length }, (_, index) => index),
          lesson.id,
        );
        assert.equal(
          activity.answer_order.map((index) => activity.tokens[index]).join(' '),
          activity.expected_fi,
          lesson.id,
        );
      } else if (activity.type === 'expression-completion') {
        assert.ok(activity.prompt_fi.includes('_____'), lesson.id);
        assert.ok(activity.accepted_answers.length >= 1, lesson.id);
        assert.equal(
          course.normalizeAnswer(activity.prompt_fi.replace('_____', activity.accepted_answers[0])),
          course.normalizeAnswer(activity.expected_fi),
          lesson.id,
        );
      } else {
        assert.ok(activity.prompt_fa, lesson.id);
        assert.ok(activity.cues_fi.length >= 1, lesson.id);
        assert.ok(activity.expected_fi, lesson.id);
        assert.ok(activity.accepted_answers.map(course.normalizeAnswer).includes(course.normalizeAnswer(activity.expected_fi)), lesson.id);
      }
    }
  }
});

test('every section checkpoint assesses all three structured families without dropping checkpoint targets', () => {
  sections.forEach((section, sectionIndex) => {
    const checkpoint = section.lessons.at(-1);
    const rawCheckpoint = rawSections[sectionIndex].lessons.at(-1);
    const structured = checkpoint.activities.filter((activity) => STRUCTURED_TYPES.has(activity.type));
    assert.deepEqual(new Set(structured.map((activity) => activity.type)), STRUCTURED_TYPES, checkpoint.id);

    const practiced = activityRefs(checkpoint);
    for (const itemId of rawCheckpoint.checkpoint_targets || []) {
      assert.ok(practiced.has(itemId), `${checkpoint.id}: displaced checkpoint target ${itemId}`);
    }
  });
});

test('structured injection refuses to replace an unrelated target', () => {
  const section = {
    items: {
      target: {
        surface_form: 'tavoite',
        translation_fa: 'هدف',
        example_fi: 'Tämä on tavoite.',
        example_fa: 'این هدف است.',
      },
      unrelated: {
        surface_form: 'muu',
        translation_fa: 'دیگر',
        example_fi: 'Tämä on muu.',
        example_fa: 'این چیز دیگری است.',
      },
    },
  };
  const lesson = {
    id: 'safe-replacement',
    order: 1,
    new_targets: ['target', 'unrelated'],
    practice_targets: [],
    checkpoint_targets: [],
    review_targets: [],
    curriculum_target_refs: { high_frequency: [], topic: [], expressions: [] },
    activities: [{ type: 'choice', mode: 'meaning', item: 'unrelated', options: ['unrelated'] }],
    structured_practice: [{
      type: 'sentence-order',
      item: 'target',
      tokens: ['on', 'tavoite.', 'Tämä'],
      answer_order: [2, 0, 1],
      expected_fi: 'Tämä on tavoite.',
    }],
  };

  assert.throws(
    () => course.injectStructuredPractice(section, lesson),
    /no matching slot for structured practice target target/,
  );
  assert.deepEqual(lesson.activities, [{ type: 'choice', mode: 'meaning', item: 'unrelated', options: ['unrelated'] }]);
});

test('malformed structured-practice data is rejected deterministically', () => {
  const badOrder = structuredClone(rawSections[0]);
  badOrder.lessons[0].structured_practice[0].answer_order = [0, 0, 0, 0];
  assert.throws(() => course.validateSection(badOrder), /Sentence-order answer must be a permutation/);

  const badCompletion = structuredClone(rawSections[0]);
  const completion = badCompletion.lessons[1].structured_practice[0];
  completion.prompt_fi = completion.prompt_fi.replace('_____', completion.accepted_answers[0]);
  assert.throws(() => course.validateSection(badCompletion), /explicit blank prompt/);

  const badControlled = structuredClone(rawSections[0]);
  badControlled.lessons[2].structured_practice[0].accepted_answers = ['väärä vastaus'];
  assert.throws(() => course.validateSection(badControlled), /accepted answers must include expected Finnish/);
});

test('typed structured practice reuses fuzzy grading and character-level feedback', () => {
  const completion = course.gradeTypedAnswer(
    { surface_form: 'nimesi', accepted_answers: ['nimesi'] },
    'nimes',
  );
  assert.equal(completion.accepted, true);
  assert.equal(completion.fuzzy, true);
  assert.ok(completion.operations.length > 0);

  const production = course.gradeTypedAnswer(
    { surface_form: 'Minun nimeni on Sara.', accepted_answers: ['Minun nimeni on Sara.'] },
    'Minun nimeni on Sara',
  );
  assert.equal(production.accepted, true);

  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /kلمات|کلمات/);
  assert.match(source, /بخش حذف‌شدهٔ عبارت را کامل کن/);
  assert.match(source, /با راهنماها جملهٔ فنلاندی را بنویس/);
  assert.match(source, /gradeTypedAnswer\(expected, input\.value\)/);
  assert.match(source, /createTypedDifference/);
});
