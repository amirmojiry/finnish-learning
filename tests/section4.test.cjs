const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const course = require('../course.js');
const ROOT = path.resolve(__dirname, '..');
const curriculum = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-curriculum.json'), 'utf8'));
const raws = [1,2,3,4].map((n) => JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'course', `a1.1-section-${n}.json`), 'utf8'),
));
const sections = course.validateImplementedCourse(raws, curriculum);
const section4 = sections[3];

test('the complete A1.1 path has four sections and forty unique lessons', () => {
  assert.equal(sections.length, 4);
  assert.deepEqual(sections.map((entry) => entry.curriculum_section_id), ['a1.1-s1','a1.1-s2','a1.1-s3','a1.1-s4']);
  const ids = sections.flatMap((entry) => entry.lessons.map((lesson) => lesson.id));
  assert.equal(ids.length, 40);
  assert.equal(new Set(ids).size, 40);
});

test('A1.1 Section 4 contains ten deterministic fifteen-activity lessons', () => {
  assert.equal(section4.lessons.length, 10);
  assert.equal(section4.activity_count_per_lesson, 15);
  assert.equal(section4.lessons.reduce((sum, lesson) => sum + lesson.activities.length, 0), 150);
  assert.deepEqual(
    section4.lessons.map((lesson) => lesson.curriculum_id),
    curriculum.sections[3].lessons.map((lesson) => lesson.id),
  );
  for (const lesson of section4.lessons) {
    assert.ok(lesson.summary_fa, lesson.id);
    assert.ok(lesson.grammar_fa, lesson.id);
    assert.match(lesson.id, /^section-4-lesson-\d+$/);
  }
});

test('Section 4 unlocks only after all three prior sections are complete', () => {
  let progress = course.emptyProgress();
  for (const prior of sections.slice(0,3)) {
    for (const lesson of prior.lessons) progress = course.recordLessonCompletion(progress, lesson.id, 8, 10, 1000);
  }
  assert.equal(course.isSectionUnlocked(sections, progress, 3), true);

  let missing = course.emptyProgress();
  for (const prior of sections.slice(0,2)) {
    for (const lesson of prior.lessons) missing = course.recordLessonCompletion(missing, lesson.id, 8, 10, 1000);
  }
  for (const lesson of sections[2].lessons.slice(0,-1)) missing = course.recordLessonCompletion(missing, lesson.id, 8, 10, 1000);
  assert.equal(course.isSectionUnlocked(sections, missing, 3), false);
});

test('Section 4 target mappings and recycling match the curriculum contract', () => {
  const contract = curriculum.sections[3];
  for (const contractLesson of contract.lessons) {
    const lesson = section4.lessons.find((entry) => entry.curriculum_id === contractLesson.id);
    assert.ok(lesson, contractLesson.id);
    assert.deepEqual(lesson.recycle_from, contractLesson.recycle_from, contractLesson.id);
    const groups = [
      ['high_frequency', contractLesson.high_frequency_targets],
      ['topic', contractLesson.topic_targets],
      ['expressions', contractLesson.expressions],
    ];
    for (const [group, targets] of groups) {
      assert.equal(lesson.curriculum_target_refs[group].length, targets.length, contractLesson.id + ' / ' + group);
      for (const itemId of lesson.curriculum_target_refs[group]) assert.ok(section4.items[itemId], itemId);
    }
  }
});

test('required Section 4 Finnish forms are explicit', () => {
  const surfaces = new Set(Object.values(section4.items).map((item) => item.surface_form));
  for (const required of [
    'Olen kotona.','Se on pöydällä.','Se on huoneessa.','Se on tuolilla.','Se on sängyllä.',
    'Tämä on kahvia.','Haluan vettä.','Keittiössä on pöytä.',
  ]) assert.ok(surfaces.has(required), required);

  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.doesNotMatch(source, /\+\s*['"](?:ssa|ssä|lla|llä|a|ä|ta|tä)['"]/);
});

test('visual recognition is learner-facing for home food needs and animals', () => {
  const visualActivities = section4.lessons.flatMap((lesson) => lesson.activities)
    .filter((activity) => activity.type === 'visual-choice');
  assert.ok(visualActivities.length >= 15);
  for (const activity of visualActivities) {
    assert.ok(section4.items[activity.item].visual, activity.item);
    assert.ok(activity.options.includes(activity.item));
  }
});

test('location lesson asks four supported location questions', () => {
  const lesson = section4.lessons.find((entry) => entry.curriculum_id === 'a1.1-s4-l02');
  const matches = lesson.activities.filter((activity) => activity.type === 'prompt-choice');
  assert.equal(matches.length, 4);
  for (const activity of matches) {
    assert.ok(section4.items[activity.prompt_item]);
    assert.ok(section4.items[activity.answer_item]);
    assert.ok(activity.options.includes(activity.answer_item));
  }
  const answers = matches.map((activity) => section4.items[activity.answer_item].surface_form);
  assert.ok(answers.includes('Se on pöydällä.'));
  assert.ok(answers.includes('Se on sängyllä.'));
  assert.ok(answers.includes('Olen kotona.'));
});

test('cafe lesson contains real three-turn dialogues', () => {
  const lesson = section4.lessons.find((entry) => entry.curriculum_id === 'a1.1-s4-l05');
  const dialogues = lesson.activities.filter((activity) => activity.type === 'dialogue-order');
  assert.ok(dialogues.length >= 2);
  for (const activity of dialogues) {
    assert.equal(activity.turns.length, 3);
    assert.deepEqual([...activity.answer_order].sort(), [0,1,2]);
  }
});

test('animal categorization and four supported adjective sentences are learner-facing', () => {
  const animalLesson = section4.lessons.find((entry) => entry.curriculum_id === 'a1.1-s4-l07');
  assert.ok(animalLesson.activities.filter((activity) => activity.type === 'category-match').length >= 3);
  const descriptionLesson = section4.lessons.find((entry) => entry.curriculum_id === 'a1.1-s4-l08');
  const writing = descriptionLesson.activities.find((activity) => activity.type === 'guided-writing');
  assert.ok(writing);
  assert.equal(writing.expected_items.length, 4);
  assert.deepEqual(
    writing.expected_items.map((itemId) => section4.items[itemId].surface_form),
    ['Koira on iso.','Kissa on pieni.','Hevonen on iso.','Lintu on pieni.'],
  );
});

test('familiar-world lesson uses a five-sentence reading and four-sentence output', () => {
  const lesson = section4.lessons.find((entry) => entry.curriculum_id === 'a1.1-s4-l09');
  const reading = section4.items['s4-world-reading'];
  assert.equal(reading.surface_form.split('.').filter((part) => part.trim()).length, 5);
  assert.ok(lesson.activities.filter((activity) => activity.type === 'short-reading').length >= 2);
  const writing = lesson.activities.find((activity) => activity.type === 'guided-writing');
  assert.equal(writing.expected_items.length, 4);
});

test('final A1.1 checkpoint requires 80 percent and samples the whole path', () => {
  const lesson = section4.lessons.find((entry) => entry.curriculum_id === 'a1.1-s4-l10');
  assert.equal(lesson.passing_score, 0.8);
  assert.equal(lesson.activities.length, 15);
  assert.equal(course.passesLessonRequirement(lesson, 12, 15), true);
  assert.equal(course.passesLessonRequirement(lesson, 11, 15), false);
  assert.equal(course.passesLessonRequirement(lesson, 0, 0), false);
  assert.ok(lesson.activities.some((activity) => activity.type === 'dialogue-order' && activity.turns.length === 3));
  assert.ok(lesson.activities.some((activity) => activity.type === 'guided-writing' && activity.expected_items.length === 4));
  assert.ok(lesson.activities.some((activity) => activity.type === 'short-reading'));

  const surfaces = new Set();
  for (const activity of lesson.activities) {
    if (activity.item && section4.items[activity.item]) surfaces.add(section4.items[activity.item].surface_form);
    for (const id of activity.expected_items || []) surfaces.add(section4.items[id].surface_form);
    for (const id of activity.turns || []) surfaces.add(section4.items[id].surface_form);
  }
  for (const expected of ['Hei!','Minun nimeni on Sara.','Tänään on maanantai.','Aamulla syön.','Haluan vettä.','Koira on iso.']) {
    assert.ok(surfaces.has(expected), expected);
  }
});

test('every mapped Section 4 expression appears in meaningful activity data', () => {
  for (const lesson of section4.lessons) {
    const practiced = new Set();
    for (const activity of lesson.activities) {
      if (activity.item) practiced.add(activity.item);
      if (activity.answer_item) practiced.add(activity.answer_item);
      if (activity.question_item) practiced.add(activity.question_item);
      for (const id of activity.expected_items || []) practiced.add(id);
      for (const id of activity.turns || []) practiced.add(id);
    }
    for (const itemId of lesson.curriculum_target_refs.expressions) {
      assert.ok(practiced.has(itemId), lesson.curriculum_id + ' unpracticed expression ' + itemId);
    }
  }
});

test('Section 4 custom activity references are complete', () => {
  for (const lesson of section4.lessons) {
    for (const activity of lesson.activities) {
      if (activity.type === 'visual-choice') {
        assert.ok(section4.items[activity.item].visual);
        for (const id of activity.options) assert.ok(section4.items[id]);
      } else if (activity.type === 'prompt-choice') {
        assert.ok(section4.items[activity.prompt_item]);
        assert.ok(section4.items[activity.answer_item]);
        for (const id of activity.options) assert.ok(section4.items[id]);
      } else if (activity.type === 'category-match') {
        assert.ok(section4.items[activity.item]);
        assert.ok(activity.options.includes(activity.answer));
      } else if (activity.type === 'short-reading') {
        assert.equal(section4.items[activity.item].item_type, 'reading');
        assert.ok(section4.items[activity.question_item]);
        for (const id of activity.options) assert.ok(section4.items[id]);
      } else if (activity.type === 'guided-writing') {
        assert.ok(activity.expected_items.length >= 2 && activity.expected_items.length <= 4);
        for (const id of activity.expected_items) assert.ok(course.acceptedAnswers(section4.items[id]).length);
      } else if (activity.type === 'dialogue-order') {
        assert.ok(activity.turns.length >= 3 && activity.turns.length <= 5);
        assert.equal(activity.turns.length, activity.answer_order.length);
        for (const id of activity.turns) assert.ok(section4.items[id]);
      }
    }
  }
});


test('Section 4 hirvi uses the correct Persian meaning consistently', () => {
  assert.equal(section4.items['s4-hirvi'].translation_fa, 'گوزن بزرگ / موس');
  assert.equal(section4.items['s4-hirvi'].example_fa, 'گوزن بزرگ / موس حیوان است.');
  const lesson = section4.lessons.find((entry) => entry.id === 'section-4-lesson-7');
  assert.match(lesson.summary_fa, /گوزن بزرگ \/ موس/);
  assert.doesNotMatch(JSON.stringify(section4), /گوزن شمالی/);
});

test('cat location prompt agrees with the taught bed example', () => {
  const lesson = section4.lessons.find((entry) => entry.id === 'section-4-lesson-2');
  const activity = lesson.activities.find((entry) => entry.type === 'prompt-choice' && entry.prompt_item === 's4-location-q-cat');
  assert.equal(activity.answer_item, 's4-se-on-sangylla');
});

test('short-reading distractors are absent from the source passage', () => {
  const passage = section4.items['s4-world-reading'].surface_form;
  for (const lesson of section4.lessons) {
    for (const activity of lesson.activities || []) {
      if (activity.type !== 'short-reading' || activity.item !== 's4-world-reading') continue;
      assert.ok(passage.includes(section4.items[activity.question_item].surface_form));
      for (const optionId of activity.options) {
        if (optionId === activity.question_item) continue;
        assert.ok(!passage.includes(section4.items[optionId].surface_form), `${optionId} unexpectedly appears in the reading`);
      }
    }
  }
});
