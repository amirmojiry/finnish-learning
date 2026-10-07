const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const course = require('../course.js');

const ROOT = path.resolve(__dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

const a11Curriculum = readJson('data/course/a1.1-curriculum.json');
const a12Curriculum = readJson('data/course/a1.2-curriculum.json');
const a11Sections = [1,2,3,4].map((number) => readJson(`data/course/a1.1-section-${number}.json`));
const a12Section1 = readJson('data/course/a1.2-section-1.json');
const a12Section2 = readJson('data/course/a1.2-section-2.json');
const vocabulary = readJson('data/common-words.json');

test('A1.2 stage loads both implemented sections in curriculum order', () => {
  const stage = course.COURSE_STAGES.find((entry) => entry.level === 'A1.2');
  assert.ok(stage);
  assert.deepEqual(stage.sectionUrls, [
    './data/course/a1.2-section-1.json',
    './data/course/a1.2-section-2.json',
  ]);
});

test('A1.2 Section 2 maps all ten reviewed travel lessons', () => {
  assert.equal(a12Section2.level, 'A1.2');
  assert.equal(a12Section2.curriculum_section_id, 'a1.2-s2');
  assert.equal(a12Section2.lessons.length, 10);
  assert.equal(a12Section2.activity_count_per_lesson, 15);
  assert.deepEqual(
    a12Section2.lessons.map((lesson) => lesson.curriculum_id),
    a12Curriculum.sections[1].lessons.map((lesson) => lesson.id),
  );

  for (const lesson of a12Section2.lessons) {
    assert.match(lesson.id, /^a1\.2-section-2-lesson-\d+$/);
    assert.ok(lesson.title_fa);
    assert.ok(lesson.objective_fa);
    assert.ok(lesson.summary_fa);
    assert.ok(lesson.grammar_fa);
    assert.equal(lesson.production_targets.length, 1);
    assert.equal(lesson.listening_targets.length, 2);
    assert.ok(lesson.structured_practice.length >= 1);
  }
});

test('multi-level validation prepares 60 unique A1 lessons and 150 Section 2 activities', () => {
  const sections = course.validateImplementedPath([
    { level: 'A1.1', curriculum: a11Curriculum, sections: a11Sections },
    { level: 'A1.2', curriculum: a12Curriculum, sections: [a12Section1, a12Section2] },
  ]);

  assert.equal(sections.length, 6);
  assert.deepEqual(
    sections.map((section) => section.level),
    ['A1.1','A1.1','A1.1','A1.1','A1.2','A1.2'],
  );

  const lessonIds = sections.flatMap((section) => section.lessons.map((lesson) => lesson.id));
  assert.equal(lessonIds.length, 60);
  assert.equal(new Set(lessonIds).size, 60);

  const travel = sections.at(-1);
  assert.equal(travel.lessons.reduce((sum, lesson) => sum + lesson.activities.length, 0), 150);
  for (const lesson of travel.lessons) {
    assert.equal(lesson.activities.length, 15, lesson.id);
    assert.equal(lesson.activities.filter((activity) => activity.type === 'production').length, 1, lesson.id);
    assert.equal(lesson.activities.filter((activity) => activity.type === 'choice' && activity.mode === 'listen').length, 1, lesson.id);
    assert.equal(lesson.activities.filter((activity) => activity.type === 'dictation').length, 1, lesson.id);
  }
});

test('A1.2 Section 2 remains browseable and its first lesson is a jump entry point', () => {
  const sections = course.validateImplementedPath([
    { level: 'A1.1', curriculum: a11Curriculum, sections: a11Sections },
    { level: 'A1.2', curriculum: a12Curriculum, sections: [a12Section1, a12Section2] },
  ]);
  const section2Index = 5;
  const progress = course.emptyProgress();

  assert.equal(course.isSectionAccessible(sections, progress, section2Index), false);
  assert.equal(course.isCourseLessonAccessible(sections, progress, section2Index, 0), true);
  assert.equal(course.isCourseLessonAccessible(sections, progress, section2Index, 1), false);

  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /option\.disabled = !implemented \|\| current/);
  assert.match(source, /optionStatus\.textContent = current \? 'بخش فعلی' : unlocked \? 'باز کردن' : 'مشاهده \(قفل\)'/);
});

test('A1.2 Section 2 keeps exact curriculum target mappings', () => {
  const contract = a12Curriculum.sections[1];
  for (const contractLesson of contract.lessons) {
    const lesson = a12Section2.lessons.find((entry) => entry.curriculum_id === contractLesson.id);
    assert.ok(lesson, contractLesson.id);
    assert.equal(lesson.curriculum_target_refs.high_frequency.length, contractLesson.high_frequency_targets.length);
    assert.equal(lesson.curriculum_target_refs.topic.length, contractLesson.topic_targets.length);
    assert.equal(lesson.curriculum_target_refs.expressions.length, contractLesson.expressions.length);

    for (const itemId of [
      ...lesson.curriculum_target_refs.high_frequency,
      ...lesson.curriculum_target_refs.topic,
      ...lesson.curriculum_target_refs.expressions,
    ]) {
      assert.ok(a12Section2.items[itemId], `${contractLesson.id}: unknown item ${itemId}`);
    }
  }
});

test('A1.2 Section 2 preserves Parole metadata for every source-backed surface', () => {
  const sourceBySurface = new Map(
    vocabulary.words.map((entry) => [
      String(entry.word).normalize('NFC').toLocaleLowerCase('fi-FI'),
      entry,
    ]),
  );

  for (const item of Object.values(a12Section2.items)) {
    const sourceEntry = sourceBySurface.get(
      String(item.surface_form).normalize('NFC').toLocaleLowerCase('fi-FI'),
    );
    if (!sourceEntry) continue;
    assert.equal(item.frequency_status, 'ranked', item.id);
    assert.equal(item.frequency_rank, sourceEntry.frequency_rank, item.id);
  }
});

test('travel morphology uses explicit reviewed Finnish forms without runtime suffix generation', () => {
  const prepared = course.validateSection(a12Section2);
  const destination = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s2-l03');
  const source = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s2-l04');
  const transport = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s2-l05');
  const tickets = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s2-l06');
  const duration = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s2-l08');

  assert.ok(destination.activities.some((activity) => activity.type === 'morphology-choice' && activity.expected_fi === 'asemalle'));
  assert.ok(source.activities.some((activity) => activity.type === 'morphology-choice' && activity.expected_fi === 'asemalta'));
  assert.ok(transport.activities.some((activity) => activity.type === 'morphology-choice' && activity.expected_fi === 'bussilla'));
  assert.ok(tickets.activities.some((activity) => (
    activity.type === 'inflection-production'
    && activity.expected_fi === 'lippua'
    && activity.accepted_answers.includes('lippua')
  )));
  assert.ok(duration.activities.some((activity) => (
    activity.type === 'inflection-production'
    && activity.expected_fi === 'minuuttia'
    && activity.accepted_answers.includes('minuuttia')
  )));

  const serialized = JSON.stringify(a12Section2);
  assert.doesNotMatch(serialized, /suffix|concat|substring/i);
});

test('Section 2 includes visual travel cues, a timetable clock task, and an integrated trip dialogue', () => {
  const prepared = course.validateSection(a12Section2);
  const places = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s2-l01');
  const directions = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s2-l02');
  const transport = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s2-l05');
  const timetable = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s2-l07');
  const trip = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s2-l09');

  assert.ok(places.activities.some((activity) => activity.type === 'visual-choice'));
  assert.ok(directions.activities.some((activity) => activity.type === 'visual-choice'));
  assert.ok(transport.activities.some((activity) => activity.type === 'visual-choice'));
  assert.ok(timetable.activities.some((activity) => activity.type === 'clock-choice' && activity.hour === 8));
  assert.ok(trip.activities.some((activity) => activity.type === 'dialogue-order'));
  assert.equal(trip.activities.filter((activity) => activity.type === 'short-reading').length, 2);
});

test('integrated short-trip readings have exactly one passage-matching option', () => {
  const lesson = a12Section2.lessons.find((entry) => entry.curriculum_id === 'a1.2-s2-l09');
  const readings = lesson.activities.filter((activity) => activity.type === 'short-reading');
  assert.equal(readings.length, 2);

  for (const activity of readings) {
    const passage = a12Section2.items[activity.item].surface_form;
    let matchingOptions = 0;
    for (const optionId of activity.options) {
      const optionText = a12Section2.items[optionId].surface_form;
      const appears = passage.includes(optionText);
      if (appears) matchingOptions += 1;
      if (optionId === activity.question_item) assert.equal(appears, true, optionText);
      else assert.equal(appears, false, `Distractor appears in passage: ${optionText}`);
    }
    assert.equal(matchingOptions, 1);
  }
});

test('integrated short-trip dialogue follows the reviewed journey sequence', () => {
  const lesson = a12Section2.lessons.find((entry) => entry.curriculum_id === 'a1.2-s2-l09');
  const dialogue = lesson.activities.find((activity) => activity.type === 'dialogue-order');
  assert.ok(dialogue);
  const ordered = dialogue.answer_order.map((index) => a12Section2.items[dialogue.turns[index]].surface_form);
  assert.deepEqual(ordered, [
    'Missä asema on?',
    'Mene suoraan.',
    'Menen bussilla.',
    'Yksi lippu Helsinkiin, kiitos.',
    'Bussi lähtee kello kahdeksan.',
  ]);
});

test('Section 2 checkpoint requires 80 percent and covers mixed travel structures', () => {
  const prepared = course.validateSection(a12Section2);
  const checkpoint = prepared.lessons.at(-1);
  const types = new Set(checkpoint.activities.map((activity) => activity.type));

  for (const type of ['sentence-order','expression-completion','controlled-production','morphology-choice']) {
    assert.ok(types.has(type), `checkpoint missing ${type}`);
  }
  assert.equal(checkpoint.passing_score, 0.8);
  assert.equal(checkpoint.activities.length, 15);
});
