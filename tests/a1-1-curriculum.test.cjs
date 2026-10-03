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
  'lexical_target_count',
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


test('language lesson supplies explicit partitive forms for assessed production', () => {
  const lessons = curriculum.sections.flatMap((section) => section.lessons);
  const lesson = lessons.find((item) => item.id === 'a1.1-s2-l03');
  for (const expression of ['Puhun suomea.','Puhun persiaa.','Puhun englantia.']) {
    assert.ok(lesson.expressions.includes(expression), `Missing explicit language expression: ${expression}`);
  }
});

test('personal profile uses complete reviewed forms instead of suffix concatenation', () => {
  const lessons = curriculum.sections.flatMap((section) => section.lessons);
  const lesson = lessons.find((item) => item.id === 'a1.1-s2-l09');
  const serialized = JSON.stringify(lesson);
  assert.doesNotMatch(serialized, /…sta\.|…ssa\.|…a\./);
  for (const expression of ['Olen Suomesta.','Olen Iranista.','Asun Vaasassa.','Asun Helsingissä.','Puhun persiaa.']) {
    assert.ok(lesson.expressions.includes(expression), `Missing complete profile expression: ${expression}`);
  }
});

test('prototype mapping agrees with per-lesson prototype sources', () => {
  const lessons = curriculum.sections.flatMap((section) => section.lessons);
  const reverse = new Map();

  for (const lesson of lessons) {
    for (const source of lesson.prototype_sources) {
      if (!reverse.has(source)) reverse.set(source, []);
      reverse.get(source).push(lesson.id);
    }
  }

  for (const mapping of curriculum.prototype_mapping.mappings) {
    assert.deepEqual(
      [...mapping.destinations].sort(),
      [...(reverse.get(mapping.prototype_lesson) || [])].sort(),
      `${mapping.prototype_lesson} has inconsistent prototype lineage`,
    );
  }
});


test('prototype targets called out by review remain represented in the curriculum', () => {
  const lessons = curriculum.sections.flatMap((section) => section.lessons);
  const greetings = lessons.find((lesson) => lesson.id === 'a1.1-s1-l01');
  const people = lessons.find((lesson) => lesson.id === 'a1.1-s2-l01');

  assert.ok(greetings.expressions.includes('Hyvää huomenta!'));
  assert.ok(people.topic_targets.includes('te') || people.high_frequency_targets.includes('te'));
  assert.ok(people.expressions.includes('Te olette …'));
});

test('each lesson declares an exact lexical target count', () => {
  const lessons = curriculum.sections.flatMap((section) => section.lessons);
  assert.deepEqual(curriculum.lesson_defaults.recommended_new_lexical_target_range, [3, 6]);
  assert.match(curriculum.lesson_defaults.lexical_target_count_policy, /advisory/i);

  for (const lesson of lessons) {
    const actual = lesson.high_frequency_targets.length + lesson.topic_targets.length;
    assert.equal(lesson.lexical_target_count, actual, `${lesson.id} has a stale lexical_target_count`);
  }
});


test('parts-of-day assessment does not depend on future routine verbs', () => {
  const lessons = curriculum.sections.flatMap((section) => section.lessons);
  const lesson = lessons.find((item) => item.id === 'a1.1-s3-l04');
  assert.deepEqual(lesson.recycle_from, ['a1.1-s3-l03']);
  assert.doesNotMatch(lesson.assessment.criterion_en, /routine event/i);
  for (const expression of ['Aamulla.','Päivällä.','Illalla.','Yöllä.']) {
    assert.ok(lesson.expressions.includes(expression), `Missing time-of-day expression: ${expression}`);
  }
});

test('negation lesson encodes explicit connegative mappings for assessed verbs', () => {
  const lessons = curriculum.sections.flatMap((section) => section.lessons);
  const lesson = lessons.find((item) => item.id === 'a1.1-s3-l07');
  assert.ok(Array.isArray(lesson.connegative_pairs));
  assert.ok(lesson.connegative_pairs.length >= 4);

  const expected = new Map([
    ['syön', 'syö'],
    ['juon', 'juo'],
    ['nukun', 'nuku'],
    ['opiskelen', 'opiskele'],
    ['työskentelen', 'työskentele'],
  ]);

  for (const [affirmative, connegative] of expected) {
    const pair = lesson.connegative_pairs.find((item) => item.affirmative === affirmative);
    assert.ok(pair, `Missing connegative pair for ${affirmative}`);
    assert.equal(pair.connegative, connegative);
    assert.equal(pair.negative, `En ${connegative}.`);
  }
});
