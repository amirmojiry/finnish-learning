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
const a13 = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.3-curriculum.json'), 'utf8'),
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
const a13Lessons = a13.sections.flatMap((section) => section.lessons);

test('A1.2 and A1.3 curriculum contracts are reviewed', () => {
  assert.equal(a12.status, 'reviewed');
  assert.equal(a13.status, 'reviewed');
});

test('A1.3 curriculum defines four ordered ten-lesson sections', () => {
  assert.equal(a13.level, 'A1.3');
  assert.equal(a13.sections.length, 4);
  assert.deepEqual(a13.sections.map((section) => section.order), [1, 2, 3, 4]);
  assert.equal(a13Lessons.length, 40);
  assert.equal(new Set(a13Lessons.map((lesson) => lesson.id)).size, 40);

  for (const section of a13.sections) {
    assert.equal(section.lessons.length, 10);
    assert.deepEqual(section.lessons.map((lesson) => lesson.order), [1,2,3,4,5,6,7,8,9,10]);
  }
});

test('every A1.3 lesson has the same complete planning contract', () => {
  for (const section of a13.sections) {
    assert.ok(section.title_en);
    assert.ok(section.title_fa);
    assert.ok(section.goal_en);
    assert.ok(section.goal_fa);

    for (const lesson of section.lessons) {
      for (const field of requiredLessonFields) {
        assert.ok(Object.hasOwn(lesson, field), `${lesson.id} is missing ${field}`);
      }

      assert.match(lesson.id, /^a1\.3-s[1-4]-l\d{2}$/);
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

test('A1.3 is explicitly an implementation subdivision of CEFR A1', () => {
  assert.ok(Array.isArray(a13.source_basis) && a13.source_basis.length >= 2);
  assert.ok(a13.source_basis.some((source) => /oph\.fi/.test(source.url)));
  assert.ok(a13.source_basis.some((source) => /coe\.int|rm\.coe\.int/.test(source.url)));
  assert.ok(a13.design_principles.some((principle) => /subdivision of CEFR A1/i.test(principle)));
  assert.ok(a13.stage_outcomes.some((outcome) => /simple written text/i.test(outcome)));
  assert.ok(a13.stage_outcomes.some((outcome) => /simple messages/i.test(outcome)));
});

test('A1.3 high-frequency targets are source-backed and never fabricate source ranks', () => {
  const sourceBackedForms = new Set(
    vocabulary.words.map((row) => String(row.word).toLocaleLowerCase('fi-FI')),
  );
  assert.doesNotMatch(JSON.stringify(a13), /frequency_rank/);

  const targets = a13Lessons.flatMap((lesson) => lesson.high_frequency_targets);
  assert.ok(targets.length > 0);
  for (const target of targets) {
    assert.ok(
      sourceBackedForms.has(String(target).toLocaleLowerCase('fi-FI')),
      `Frequency target ${target} must exist in the source-backed common vocabulary dataset`,
    );
  }
});

test('A1.3 recycling points only to known earlier A1 lessons', () => {
  const ordered = [...a11Lessons, ...a12Lessons, ...a13Lessons];
  const position = new Map(ordered.map((lesson, index) => [lesson.id, index]));

  for (const lesson of a13Lessons) {
    for (const dependency of lesson.recycle_from) {
      assert.ok(position.has(dependency), `${lesson.id} references unknown lesson ${dependency}`);
      assert.ok(
        position.get(dependency) < position.get(lesson.id),
        `${lesson.id} must only recycle earlier lesson ${dependency}`,
      );
    }
  }
});

test('A1 lesson IDs remain unique across A1.1, A1.2, and A1.3', () => {
  const ids = [...a11Lessons, ...a12Lessons, ...a13Lessons].map((lesson) => lesson.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every A1.3 section deliberately recycles A1.2 material', () => {
  for (const section of a13.sections) {
    const dependencies = section.lessons.flatMap((lesson) => lesson.recycle_from);
    assert.ok(
      dependencies.some((dependency) => dependency.startsWith('a1.2-')),
      `${section.id} must deliberately recycle at least one A1.2 lesson`,
    );
  }
});

test('each A1.3 section ends with a mixed checkpoint and no new lexical targets', () => {
  for (const section of a13.sections) {
    const checkpoint = section.lessons[9];
    assert.match(checkpoint.title_en.toLowerCase(), /checkpoint/);
    assert.deepEqual(checkpoint.high_frequency_targets, []);
    assert.deepEqual(checkpoint.topic_targets, []);
    assert.deepEqual(checkpoint.expressions, []);
    assert.equal(checkpoint.lexical_target_count, 0);
    assert.ok(checkpoint.activity_families.includes('mixed-checkpoint'));
  }
});

test('A1.3 final checkpoint samples all earlier A1.3 section checkpoints', () => {
  const finalCheckpoint = a13.sections[3].lessons[9];
  for (const dependency of ['a1.3-s1-l10', 'a1.3-s2-l10', 'a1.3-s3-l10']) {
    assert.ok(finalCheckpoint.recycle_from.includes(dependency), `Final checkpoint must recycle ${dependency}`);
  }
  assert.match(finalCheckpoint.assessment.criterion_en, /complete A1\.3 path/i);
});

test('every A1.3 lesson declares an exact lexical target count', () => {
  assert.deepEqual(a13.lesson_defaults.recommended_new_lexical_target_range, [3, 6]);
  assert.match(a13.lesson_defaults.lexical_target_count_policy, /advisory/i);

  for (const lesson of a13Lessons) {
    const actual = lesson.high_frequency_targets.length + lesson.topic_targets.length;
    assert.equal(lesson.lexical_target_count, actual, `${lesson.id} has a stale lexical_target_count`);
  }
});

test('A1.3 expands familiar interaction without claiming A2-level independence', () => {
  assert.deepEqual(
    a13.sections.map((section) => section.title_en),
    [
      'Messages, invitations and social contact',
      'Home, neighborhood and everyday problems',
      'Study, work and everyday responsibilities',
      'Recent events, plans and integrated everyday language',
    ],
  );

  const serialized = JSON.stringify(a13).toLowerCase();
  assert.match(serialized, /predictable|familiar/);
  assert.doesNotMatch(serialized, /independent user|a2-level|a2 independence/);
});

test('A1.3 recent-event morphology is explicit instead of runtime-generated', () => {
  const lesson = a13Lessons.find((entry) => entry.id === 'a1.3-s4-l02');
  assert.ok(lesson);
  for (const form of ['teki','sai','sanoi','söin','join','ostin']) {
    const targets = [...lesson.high_frequency_targets, ...lesson.topic_targets];
    assert.ok(targets.includes(form), `Missing explicit reviewed past form: ${form}`);
  }
  assert.match(lesson.grammar_focus.join(' '), /explicit/i);
  assert.match(lesson.grammar_focus.join(' '), /no productive past-tense rule generation/i);
});


test('A1.3 Persian can-do outcomes avoid plural nouns after the singular numeral', () => {
  const serialized = JSON.stringify(a13);
  assert.doesNotMatch(serialized, /یک جزئیات/);
  assert.doesNotMatch(serialized, /یک اطلاعات/);
});
