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
const vocabulary = readJson('data/common-words.json');

test('course stage configuration exposes playable A1.1 and A1.2 only', () => {
  assert.deepEqual(course.COURSE_STAGES.map((stage) => stage.level), ['A1.1', 'A1.2']);
  assert.equal(course.COURSE_STAGES[0].sectionUrls.length, 4);
  assert.deepEqual(course.COURSE_STAGES[1].sectionUrls, ['./data/course/a1.2-section-1.json']);
  assert.doesNotMatch(JSON.stringify(course.COURSE_STAGES), /A1\.3/);
});

test('A1.2 Section 1 maps all ten reviewed curriculum lessons', () => {
  assert.equal(a12Section1.level, 'A1.2');
  assert.equal(a12Section1.curriculum_section_id, 'a1.2-s1');
  assert.equal(a12Section1.lessons.length, 10);
  assert.equal(a12Section1.activity_count_per_lesson, 15);
  assert.deepEqual(
    a12Section1.lessons.map((lesson) => lesson.curriculum_id),
    a12Curriculum.sections[0].lessons.map((lesson) => lesson.id),
  );

  for (const lesson of a12Section1.lessons) {
    assert.match(lesson.id, /^a1\.2-section-1-lesson-\d+$/);
    assert.ok(lesson.summary_fa);
    assert.ok(lesson.grammar_fa);
    assert.equal(lesson.production_targets.length, 1);
    assert.equal(lesson.listening_targets.length, 2);
    assert.ok(lesson.structured_practice.length >= 1);
  }
});

test('multi-level validation prepares 50 globally unique A1 lessons and 150 A1.2 activities', () => {
  const sections = course.validateImplementedPath([
    { level: 'A1.1', curriculum: a11Curriculum, sections: a11Sections },
    { level: 'A1.2', curriculum: a12Curriculum, sections: [a12Section1] },
  ]);

  assert.equal(sections.length, 5);
  assert.deepEqual(sections.map((section) => section.level), ['A1.1','A1.1','A1.1','A1.1','A1.2']);

  const lessonIds = sections.flatMap((section) => section.lessons.map((lesson) => lesson.id));
  assert.equal(lessonIds.length, 50);
  assert.equal(new Set(lessonIds).size, 50);

  const a12 = sections.at(-1);
  assert.equal(a12.lessons.reduce((sum, lesson) => sum + lesson.activities.length, 0), 150);
  for (const lesson of a12.lessons) {
    assert.equal(lesson.activities.length, 15, lesson.id);
    assert.equal(lesson.activities.filter((activity) => activity.type === 'production').length, 1, lesson.id);
    assert.equal(lesson.activities.filter((activity) => activity.type === 'choice' && activity.mode === 'listen').length, 1, lesson.id);
    assert.equal(lesson.activities.filter((activity) => activity.type === 'dictation').length, 1, lesson.id);
  }
});

test('A1.2 Section 1 remains locked until all four A1.1 sections are complete', () => {
  const sections = course.validateImplementedPath([
    { level: 'A1.1', curriculum: a11Curriculum, sections: a11Sections },
    { level: 'A1.2', curriculum: a12Curriculum, sections: [a12Section1] },
  ]);
  const a12Index = 4;
  let progress = course.emptyProgress();

  assert.equal(course.isSectionUnlocked(sections, progress, a12Index), false);
  assert.equal(course.isCourseLessonAccessible(sections, progress, a12Index, 0), false);
  for (const section of sections.slice(0,4)) {
    for (const lesson of section.lessons) {
      progress = course.recordLessonCompletion(progress, lesson.id, 8, 10, 1000);
    }
  }
  assert.equal(course.isSectionUnlocked(sections, progress, a12Index), true);
  assert.equal(course.isCourseLessonAccessible(sections, progress, a12Index, 0), true);
});

test('already-started A1.2 remains accessible for backfill-safe existing progress', () => {
  const sections = course.validateImplementedPath([
    { level: 'A1.1', curriculum: a11Curriculum, sections: a11Sections },
    { level: 'A1.2', curriculum: a12Curriculum, sections: [a12Section1] },
  ]);
  let progress = course.emptyProgress();
  progress = course.recordLessonCompletion(progress, a12Section1.lessons[0].id, 8, 10, 1000);

  assert.equal(course.isSectionStarted(sections[4], progress), true);
  assert.equal(course.isSectionAccessible(sections, progress, 4), true);
  assert.equal(course.isCourseLessonAccessible(sections, progress, 4, 0), true);
});

test('complete shopping production evidence is attributed to the Haluaisin expression', () => {
  const lesson = a12Section1.lessons.find((entry) => entry.curriculum_id === 'a1.2-s1-l09');
  assert.ok(lesson);
  const requestId = lesson.curriculum_target_refs.expressions.find((itemId) => (
    a12Section1.items[itemId]?.surface_form === 'Haluaisin tämän, kiitos.'
  ));
  assert.ok(requestId);
  assert.deepEqual(lesson.production_targets, [requestId]);
  assert.equal(lesson.structured_practice[0].item, requestId);
  assert.equal(lesson.structured_practice[0].expected_fi, 'Haluaisin tämän, kiitos.');
  assert.ok(lesson.structured_practice[0].accepted_answers.includes('Haluaisin tämän, kiitos.'));
});

test('A1.2 manifest preserves Parole rank metadata for every source-backed form', () => {
  const sourceBySurface = new Map(
    vocabulary.words.map((entry) => [
      String(entry.word).normalize('NFC').toLocaleLowerCase('fi-FI'),
      entry,
    ]),
  );

  for (const item of Object.values(a12Section1.items)) {
    const sourceEntry = sourceBySurface.get(
      String(item.surface_form).normalize('NFC').toLocaleLowerCase('fi-FI'),
    );
    if (!sourceEntry) continue;
    assert.equal(item.frequency_status, 'ranked', item.id);
    assert.equal(item.frequency_rank, sourceEntry.frequency_rank, item.id);
  }
});

test('A1.2 Section 1 keeps curriculum target mappings exact', () => {
  const contract = a12Curriculum.sections[0];
  for (const contractLesson of contract.lessons) {
    const lesson = a12Section1.lessons.find((entry) => entry.curriculum_id === contractLesson.id);
    assert.ok(lesson, contractLesson.id);
    assert.equal(lesson.curriculum_target_refs.high_frequency.length, contractLesson.high_frequency_targets.length);
    assert.equal(lesson.curriculum_target_refs.topic.length, contractLesson.topic_targets.length);
    assert.equal(lesson.curriculum_target_refs.expressions.length, contractLesson.expressions.length);
    for (const itemId of [
      ...lesson.curriculum_target_refs.high_frequency,
      ...lesson.curriculum_target_refs.topic,
      ...lesson.curriculum_target_refs.expressions,
    ]) {
      assert.ok(a12Section1.items[itemId], `${contractLesson.id}: unknown item ${itemId}`);
    }
  }
});

test('A1.2 numeric dictation accepts the Finnish spelling spoken by fi-FI TTS', () => {
  const fifty = Object.values(a12Section1.items).find((item) => item.surface_form === '50');
  assert.ok(fifty);
  assert.equal(fifty.surface_form, '50');
  assert.ok(fifty.accepted_answers.includes('50'));
  assert.ok(fifty.accepted_answers.includes('viisikymmentä'));

  const prepared = course.validateSection(a12Section1);
  const lesson = prepared.lessons.find((entry) => entry.curriculum_id === 'a1.2-s1-l02');
  const dictation = lesson.activities.find((activity) => activity.type === 'dictation');
  assert.ok(dictation);
  assert.equal(prepared.items[dictation.item].surface_form, '50');
  assert.ok(prepared.items[dictation.item].accepted_answers.includes('viisikymmentä'));
});

test('A1.2 shopping dialogue order matches the reviewed passage sequence', () => {
  const lesson = a12Section1.lessons.find((entry) => entry.curriculum_id === 'a1.2-s1-l09');
  const dialogue = lesson.activities.find((activity) => activity.type === 'dialogue-order');
  assert.ok(dialogue);
  const orderedLines = dialogue.answer_order.map((index) => a12Section1.items[dialogue.turns[index]].surface_form);
  assert.deepEqual(orderedLines, [
    'Hei!',
    'Haluaisin tämän, kiitos.',
    'Paljonko tämä maksaa?',
    'Voinko maksaa kortilla?',
    'Kuitti, kiitos.',
  ]);
});

test('A1.2 number grid describes its actual 10 to 100 range', () => {
  const lesson = a12Section1.lessons.find((entry) => entry.curriculum_id === 'a1.2-s1-l02');
  const numberGrid = lesson.activities.find((activity) => activity.type === 'number-grid');
  assert.ok(numberGrid);
  assert.match(numberGrid.label_fa, /۱۰ تا ۱۰۰/);

  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /activity\.label_fa \|\| 'اعداد این درس/);
  assert.doesNotMatch(source, /اعداد ۰ تا ۲۰ را یک‌بار از ابتدا تا انتها مرور کن/);
});

test('A1.2 shopping reading options contain exactly one sentence from the passage', () => {
  const lesson = a12Section1.lessons.find((entry) => entry.curriculum_id === 'a1.2-s1-l09');
  const readings = lesson.activities.filter((activity) => activity.type === 'short-reading');
  assert.equal(readings.length, 2);

  for (const activity of readings) {
    const passage = a12Section1.items[activity.item].surface_form;
    let matchingOptions = 0;
    for (const optionId of activity.options) {
      const optionText = a12Section1.items[optionId].surface_form;
      const appears = passage.includes(optionText);
      if (appears) matchingOptions += 1;
      if (optionId === activity.question_item) assert.equal(appears, true, optionText);
      else assert.equal(appears, false, `Distractor appears in passage: ${optionText}`);
    }
    assert.equal(matchingOptions, 1);
  }
});

test('A1.2 shopping morphology uses explicit reviewed forms rather than runtime suffix construction', () => {
  const prepared = course.validateSection(a12Section1);
  const quantity = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s1-l04');
  const payment = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s1-l07');
  const problem = prepared.lessons.find((lesson) => lesson.curriculum_id === 'a1.2-s1-l08');

  assert.ok(quantity.activities.some((activity) => (
    activity.type === 'inflection-production'
    && activity.expected_fi === 'litraa'
    && activity.accepted_answers.includes('litraa')
  )));
  assert.ok(payment.activities.some((activity) => (
    activity.type === 'morphology-choice'
    && activity.expected_fi === 'kortilla'
    && activity.options_fi.includes('kortilla')
  )));
  assert.ok(problem.activities.some((activity) => (
    activity.type === 'morphology-choice'
    && activity.expected_fi === 'toimi'
  )));
});

test('A1.2 checkpoint assesses all structured practice families and requires 80 percent', () => {
  const prepared = course.validateSection(a12Section1);
  const checkpoint = prepared.lessons.at(-1);
  const types = new Set(checkpoint.activities.map((activity) => activity.type));
  for (const type of ['sentence-order','expression-completion','controlled-production']) {
    assert.ok(types.has(type), `checkpoint missing ${type}`);
  }
  assert.equal(checkpoint.passing_score, 0.8);
});

test('course UI contains compact A1.1/A1.2 level tabs and no A1.3 tab', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');

  assert.match(source, /course-level-tabs/);
  assert.match(source, /COURSE_STAGES/);
  assert.match(source, /preferredSectionForLevel/);
  assert.match(source, /currentCurriculum = curricula\.get\(section\.level\)/);
  assert.match(source, /tab\.tabIndex = current \? 0 : -1/);
  assert.match(source, /const restoreFocus = document\.activeElement === tab/);
  assert.match(source, /root\.querySelector\('\.course-level-tab\.is-current'\)\?\.focus\(\)/);
  assert.match(source, /tab\.disabled = !stageSections\.length \|\| \(!accessible && !current\)/);
  assert.match(source, /levelTabs\.addEventListener\('keydown'/);
  assert.match(source, /event\.key === 'ArrowRight'/);
  assert.match(source, /event\.key === 'ArrowLeft'/);
  assert.match(source, /event\.key === 'Home'/);
  assert.match(source, /event\.key === 'End'/);
  assert.match(styles, /\.course-level-tabs/);
  assert.match(styles, /\.course-level-tab\.is-current/);
});
