const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const curriculum = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-curriculum.json'), 'utf8'),
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
];

test('A1.1 curriculum defines four ordered ten-lesson sections', () => {
  assert.equal(curriculum.level, 'A1.1');
  assert.equal(curriculum.sections.length, 4);
  assert.deepEqual(curriculum.sections.map((section) => section.order), [1, 2, 3, 4]);

  const lessons = curriculum.sections.flatMap((section) => section.lessons);
  assert.equal(lessons.length, 40);
  assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, 40);

  for (const section of curriculum.sections) {
    assert.equal(section.lessons.length, 10);
    assert.deepEqual(section.lessons.map((lesson) => lesson.order), [1,2,3,4,5,6,7,8,9,10]);
  }
});

test('every A1.1 lesson has the complete planning contract', () => {
  for (const section of curriculum.sections) {
    for (const lesson of section.lessons) {
      for (const field of requiredLessonFields) {
        assert.ok(Object.hasOwn(lesson, field), `${lesson.id} is missing ${field}`);
      }

      assert.match(lesson.id, /^a1\.1-s[1-4]-l\d{2}$/);
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

test('recycling references only earlier curriculum lessons', () => {
  const ordered = curriculum.sections.flatMap((section) => section.lessons);
  const position = new Map(ordered.map((lesson, index) => [lesson.id, index]));

  for (const lesson of ordered) {
    for (const dependency of lesson.recycle_from) {
      assert.ok(position.has(dependency), `${lesson.id} references unknown lesson ${dependency}`);
      assert.ok(
        position.get(dependency) < position.get(lesson.id),
        `${lesson.id} must only recycle earlier lesson ${dependency}`,
      );
    }
  }
});

test('each section ends with a checkpoint that introduces no required new targets', () => {
  for (const section of curriculum.sections) {
    const checkpoint = section.lessons[9];
    assert.match(checkpoint.title_en.toLowerCase(), /checkpoint/);
    assert.deepEqual(checkpoint.high_frequency_targets, []);
    assert.deepEqual(checkpoint.topic_targets, []);
    assert.deepEqual(checkpoint.expressions, []);
    assert.ok(checkpoint.activity_families.includes('mixed-checkpoint'));
  }
});

test('prototype mapping preserves all ten existing prototype lessons', () => {
  const mappings = curriculum.prototype_mapping.mappings;
  assert.deepEqual(
    mappings.map((mapping) => mapping.prototype_lesson),
    Array.from({ length: 10 }, (_, index) => `lesson-${index + 1}`),
  );
  for (const mapping of mappings) {
    assert.ok(mapping.destinations.length > 0);
  }
});

test('curriculum tracks frequency and topic vocabulary separately without fake ranks', () => {
  const serialized = JSON.stringify(curriculum);
  assert.doesNotMatch(serialized, /frequency_rank/);

  const vocabulary = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'data', 'common-words.json'), 'utf8'),
  );
  const sourceBackedForms = new Set(
    vocabulary.words.map((row) => String(row.word).toLocaleLowerCase('fi')),
  );

  const lessons = curriculum.sections.flatMap((section) => section.lessons);
  const frequencyTargets = lessons.flatMap((lesson) => lesson.high_frequency_targets);

  assert.ok(frequencyTargets.length > 0);
  for (const target of frequencyTargets) {
    assert.ok(
      sourceBackedForms.has(target.toLocaleLowerCase('fi')),
      `Frequency target ${target} must exist in the source-backed common vocabulary dataset`,
    );
  }

  assert.ok(lessons.some((lesson) => lesson.topic_targets.includes('koira')));
  assert.ok(lessons.some((lesson) => lesson.expressions.includes('Mitä kuuluu?')));
});


test('age lesson supplies the complete 0–20 number contract and a correct age frame', () => {
  const lessons = curriculum.sections.flatMap((section) => section.lessons);
  const lesson = lessons.find((item) => item.id === 'a1.1-s2-l07');
  const numbers = [
    'nolla','yksi','kaksi','kolme','neljä','viisi','kuusi','seitsemän','kahdeksan','yhdeksän',
    'kymmenen','yksitoista','kaksitoista','kolmetoista','neljätoista','viisitoista',
    'kuusitoista','seitsemäntoista','kahdeksantoista','yhdeksäntoista','kaksikymmentä',
  ];
  const targets = new Set([...lesson.high_frequency_targets, ...lesson.topic_targets]);
  for (const number of numbers) assert.ok(targets.has(number), `Missing number target: ${number}`);
  assert.ok(lesson.expressions.includes('Olen …-vuotias.'));
  assert.doesNotMatch(JSON.stringify(lesson), /Olen … vuotta\./);
});

test('topic vocabulary contains only learnable Finnish lexical targets', () => {
  const lessons = curriculum.sections.flatMap((section) => section.lessons);
  for (const lesson of lessons) {
    assert.ok(!lesson.topic_targets.includes('negation'), `${lesson.id} leaks a grammar label into topic vocabulary`);
  }
});
