const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const a11 = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-curriculum.json'), 'utf8'),
);
const a12 = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.2-curriculum.json'), 'utf8'),
);
const vocabulary = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'common-words.json'), 'utf8'),
);

const requiredLessonFields = [
  'can_do_en',
  'can_do_fa',
  'high_frequency_targets',
  'topic_targets',
  'expressions',
  'grammar_focus',
  'recycle_from',
  'activity_families',
  'skills',
  'assessment',
  'lexical_target_count',
];

const a11Lessons = a11.sections.flatMap((section) => section.lessons);
const a12Lessons = a12.sections.flatMap((section) => section.lessons);

test('A1.2 curriculum defines four ordered ten-lesson sections', () => {
  assert.equal(a12.level, 'A1.2');
  assert.equal(a12.status, 'planning');
  assert.equal(a12.sections.length, 4);
  assert.deepEqual(a12.sections.map((section) => section.order), [1, 2, 3, 4]);
  assert.equal(a12Lessons.length, 40);
  assert.equal(new Set(a12Lessons.map((lesson) => lesson.id)).size, 40);

  for (const section of a12.sections) {
    assert.equal(section.lessons.length, 10);
    assert.deepEqual(section.lessons.map((lesson) => lesson.order), [1,2,3,4,5,6,7,8,9,10]);
  }
});

test('every A1.2 lesson has the complete planning contract', () => {
  for (const section of a12.sections) {
    assert.ok(section.title_en);
    assert.ok(section.title_fa);
    assert.ok(section.goal_en);
    assert.ok(section.goal_fa);

    for (const lesson of section.lessons) {
      for (const field of requiredLessonFields) {
        assert.ok(Object.hasOwn(lesson, field), `${lesson.id} is missing ${field}`);
      }

      assert.match(lesson.id, /^a1\.2-s[1-4]-l\d{2}$/);
      assert.ok(lesson.title_en);
      assert.ok(lesson.title_fa);
      assert.ok(lesson.can_do_en);
      assert.ok(lesson.can_do_fa);
      assert.ok(Array.isArray(lesson.high_frequency_targets));
      assert.ok(Array.isArray(lesson.topic_targets));
      assert.ok(Array.isArray(lesson.expressions));
      assert.ok(Array.isArray(lesson.grammar_focus) && lesson.grammar_focus.length > 0);
      assert.ok(Array.isArray(lesson.recycle_from));
      assert.ok(Array.isArray(lesson.activity_families) && lesson.activity_families.length > 0);
      assert.deepEqual(Object.keys(lesson.skills).sort(), ['listening','reading','speaking','writing']);
      assert.ok(Object.values(lesson.skills).some(Boolean), `${lesson.id} must track at least one skill`);
      assert.ok(lesson.assessment.criterion_en);
    }
  }
});

test('A1.2 references official proficiency guidance without treating A1.2 as a separate CEFR level', () => {
  assert.ok(Array.isArray(a12.source_basis) && a12.source_basis.length >= 2);
  assert.ok(a12.source_basis.some((source) => /oph\.fi/.test(source.url)));
  assert.ok(a12.source_basis.some((source) => /coe\.int|rm\.coe\.int/.test(source.url)));
  assert.ok(a12.design_principles.some((principle) => /subdivision of CEFR A1/i.test(principle)));
  assert.ok(a12.stage_outcomes.some((outcome) => /routine communication/i.test(outcome)));
  assert.ok(a12.stage_outcomes.some((outcome) => /short practiced sentences/i.test(outcome)));
});

test('A1.2 high-frequency targets are source-backed and never fabricate source ranks', () => {
  const sourceBackedForms = new Set(
    vocabulary.words.map((row) => String(row.word).toLocaleLowerCase('fi-FI')),
  );
  const serialized = JSON.stringify(a12);
  assert.doesNotMatch(serialized, /frequency_rank/);

  const targets = a12Lessons.flatMap((lesson) => lesson.high_frequency_targets);
  assert.ok(targets.length > 0);
  for (const target of targets) {
    assert.ok(
      sourceBackedForms.has(String(target).toLocaleLowerCase('fi-FI')),
      `Frequency target ${target} must exist in the source-backed common vocabulary dataset`,
    );
  }
});

test('A1.2 recycling points only to known earlier A1.1 or A1.2 lessons', () => {
  const ordered = [...a11Lessons, ...a12Lessons];
  const position = new Map(ordered.map((lesson, index) => [lesson.id, index]));

  for (const lesson of a12Lessons) {
    for (const dependency of lesson.recycle_from) {
      assert.ok(position.has(dependency), `${lesson.id} references unknown lesson ${dependency}`);
      assert.ok(
        position.get(dependency) < position.get(lesson.id),
        `${lesson.id} must only recycle earlier lesson ${dependency}`,
      );
    }
  }
});

test('every A1.2 section deliberately recycles A1.1 material', () => {
  for (const section of a12.sections) {
    const dependencies = section.lessons.flatMap((lesson) => lesson.recycle_from);
    assert.ok(
      dependencies.some((dependency) => dependency.startsWith('a1.1-')),
      `${section.id} must deliberately recycle at least one A1.1 lesson`,
    );
  }
});

test('each A1.2 section ends with a mixed checkpoint and no new lexical targets', () => {
  for (const section of a12.sections) {
    const checkpoint = section.lessons[9];
    assert.match(checkpoint.title_en.toLowerCase(), /checkpoint/);
    assert.deepEqual(checkpoint.high_frequency_targets, []);
    assert.deepEqual(checkpoint.topic_targets, []);
    assert.deepEqual(checkpoint.expressions, []);
    assert.equal(checkpoint.lexical_target_count, 0);
    assert.ok(checkpoint.activity_families.includes('mixed-checkpoint'));
  }
});

test('complete shopping exchange explicitly recycles and exposes the greeting frame', () => {
  const lesson = a12Lessons.find((entry) => entry.id === 'a1.2-s1-l09');
  assert.ok(lesson, 'Missing complete shopping exchange lesson');
  assert.ok(lesson.recycle_from.includes('a1.1-s1-l01'));
  assert.ok(lesson.expressions.includes('Hei!'));
  assert.match(lesson.can_do_en, /greeting/i);
});

test('A1.2 final checkpoint samples all earlier section checkpoints', () => {
  const finalCheckpoint = a12.sections[3].lessons[9];
  for (const dependency of ['a1.2-s1-l10', 'a1.2-s2-l10', 'a1.2-s3-l10']) {
    assert.ok(finalCheckpoint.recycle_from.includes(dependency), `Final checkpoint must recycle ${dependency}`);
  }
  assert.match(finalCheckpoint.assessment.criterion_en, /complete A1\.2 path/i);
});

test('every A1.2 lesson declares an exact lexical target count', () => {
  assert.deepEqual(a12.lesson_defaults.recommended_new_lexical_target_range, [3, 6]);
  assert.match(a12.lesson_defaults.lexical_target_count_policy, /advisory/i);

  for (const lesson of a12Lessons) {
    const actual = lesson.high_frequency_targets.length + lesson.topic_targets.length;
    assert.equal(lesson.lexical_target_count, actual, `${lesson.id} has a stale lexical_target_count`);
  }
});

test('A1.2 covers the four planned practical domains', () => {
  assert.deepEqual(
    a12.sections.map((section) => section.title_en),
    [
      'Shopping and everyday services',
      'Getting around and finding places',
      'Daily life, study, work and simple arrangements',
      'Weather, health and routine help',
    ],
  );
});
