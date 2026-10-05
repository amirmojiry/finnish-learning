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
const MORPHOLOGY_TYPES = new Set(['morphology-choice', 'inflection-production']);

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

test('reviewed morphology practice is present in the intended A1.1 lessons', () => {
  const expectedCurriculumIds = new Set([
    'a1.1-s2-l02',
    'a1.1-s2-l03',
    'a1.1-s2-l04',
    'a1.1-s2-l06',
    'a1.1-s2-l10',
    'a1.1-s3-l04',
    'a1.1-s3-l05',
    'a1.1-s3-l06',
    'a1.1-s3-l07',
    'a1.1-s3-l10',
    'a1.1-s4-l10',
  ]);

  const affected = sections
    .flatMap((section) => section.lessons)
    .filter((lesson) => lesson.activities.some((activity) => MORPHOLOGY_TYPES.has(activity.type)));

  assert.equal(affected.length, expectedCurriculumIds.size);
  assert.deepEqual(new Set(affected.map((lesson) => lesson.curriculum_id)), expectedCurriculumIds);
  for (const lesson of affected) assert.equal(lesson.activities.length, 15, lesson.id);

  const counts = affected.flatMap((lesson) => lesson.activities)
    .filter((activity) => MORPHOLOGY_TYPES.has(activity.type))
    .reduce((result, activity) => {
      result[activity.type] = (result[activity.type] || 0) + 1;
      return result;
    }, {});
  assert.deepEqual(counts, {
    'morphology-choice': 6,
    'inflection-production': 5,
  });
});

test('morphology manifests are explicit, scoped, and reproduced exactly in prepared lessons', () => {
  sections.forEach((section, sectionIndex) => {
    const rawSection = rawSections[sectionIndex];
    section.lessons.forEach((lesson, lessonIndex) => {
      const rawLesson = rawSection.lessons[lessonIndex];
      const specs = rawLesson.morphology_practice || [];
      const scope = rawLessonScope(rawLesson);

      for (const spec of specs) {
        assert.ok(MORPHOLOGY_TYPES.has(spec.type), `${lesson.id}: ${spec.type}`);
        assert.ok(section.items[spec.item], `${lesson.id}: unknown target ${spec.item}`);
        assert.ok(scope.has(spec.item), `${lesson.id}: target outside reviewed scope: ${spec.item}`);
        assert.ok(spec.base_fi);
        assert.ok(spec.feature_fa);
        assert.ok(spec.prompt_fa);
        assert.ok(spec.frame_fi.includes('_____'));
        assert.ok(spec.explanation_fa);

        const prepared = lesson.activities.filter((activity) => activity.type === spec.type && activity.item === spec.item);
        assert.equal(prepared.length, 1, `${lesson.id}: ${spec.type} / ${spec.item}`);
        assert.deepEqual(prepared[0], spec);

        if (spec.type === 'morphology-choice') {
          assert.ok(spec.options_fi.length >= 3);
          assert.equal(new Set(spec.options_fi.map(course.normalizeAnswer)).size, spec.options_fi.length);
          assert.equal(
            spec.options_fi.filter((option) => course.normalizeAnswer(option) === course.normalizeAnswer(spec.expected_fi)).length,
            1,
          );
        } else {
          assert.ok(spec.accepted_answers.map(course.normalizeAnswer).includes(course.normalizeAnswer(spec.expected_fi)));
        }
      }
    });
  });
});

test('section checkpoints review explicit morphology without dropping the 15-activity contract', () => {
  const section2Checkpoint = sections[1].lessons.at(-1);
  const section3Checkpoint = sections[2].lessons.at(-1);
  const finalCheckpoint = sections[3].lessons.at(-1);

  assert.ok(section2Checkpoint.activities.some((activity) => activity.type === 'inflection-production' && activity.expected_fi === 'Vaasassa'));
  assert.ok(section3Checkpoint.activities.some((activity) => activity.type === 'inflection-production' && activity.expected_fi === 'syön'));
  assert.ok(finalCheckpoint.activities.some((activity) => activity.type === 'morphology-choice' && activity.expected_fi === 'nuku'));

  for (const checkpoint of [section2Checkpoint, section3Checkpoint, finalCheckpoint]) {
    assert.equal(checkpoint.order, 10);
    assert.equal(checkpoint.activities.length, 15);
  }
});

test('morphology injection refuses to replace an unrelated assessment', () => {
  const section = {
    items: {
      target: { surface_form: 'target', accepted_answers: ['target'] },
      unrelated: { surface_form: 'other', accepted_answers: ['other'] },
    },
  };
  const lesson = {
    id: 'safe-morphology',
    order: 1,
    new_targets: ['target', 'unrelated'],
    practice_targets: [],
    checkpoint_targets: [],
    review_targets: [],
    curriculum_target_refs: { high_frequency: [], topic: [], expressions: [] },
    activities: [{ type: 'choice', mode: 'meaning', item: 'unrelated', options: ['unrelated'] }],
    morphology_practice: [{
      type: 'morphology-choice',
      item: 'target',
      base_fi: 'target',
      feature_fa: 'ویژگی',
      prompt_fa: 'فرم را انتخاب کن.',
      frame_fi: '_____',
      options_fi: ['target', 'targeta', 'targetin'],
      expected_fi: 'target',
      explanation_fa: 'توضیح.',
    }],
  };

  assert.throws(
    () => course.injectMorphologyPractice(section, lesson),
    /no matching slot for morphology practice target target/,
  );
  assert.deepEqual(lesson.activities, [{ type: 'choice', mode: 'meaning', item: 'unrelated', options: ['unrelated'] }]);
});

test('malformed morphology manifests are rejected deterministically', () => {
  const duplicateChoice = structuredClone(rawSections[1]);
  duplicateChoice.lessons[1].morphology_practice[0].options_fi = ['Iranista', 'Iranista', 'Iranissa'];
  assert.throws(() => course.validateSection(duplicateChoice), /options must be unique/);

  const missingExpected = structuredClone(rawSections[1]);
  missingExpected.lessons[1].morphology_practice[0].expected_fi = 'Iranille';
  assert.throws(() => course.validateSection(missingExpected), /exactly one explicit expected form/);

  const badTyped = structuredClone(rawSections[1]);
  badTyped.lessons[2].morphology_practice[0].accepted_answers = ['englanti'];
  assert.throws(() => course.validateSection(badTyped), /accepted answers must include expected Finnish/);
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.lang = '';
    this.dir = '';
    this.type = '';
    this.classList = {
      values: new Set(),
      add: (...names) => names.forEach((name) => this.classList.values.add(name)),
      contains: (name) => this.classList.values.has(name),
    };
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    this.children = [...nodes];
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  click() {
    this.listeners.click?.({ preventDefault() {} });
  }

  submit() {
    this.listeners.submit?.({ preventDefault() {} });
  }

  focus() {
    this.focused = true;
  }

  querySelectorAll(selector) {
    if (selector !== 'button') return [];
    return this.children.filter((child) => child.tagName === 'button');
  }
}

function fakeDomHarness() {
  const document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  const windowObject = {
    setTimeout(callback) {
      callback();
      return 1;
    },
  };
  const createButton = (label, className, onClick) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = className;
    button.addEventListener('click', onClick);
    return button;
  };
  const createTypedDifference = (grading) => {
    const block = document.createElement('div');
    block.className = 'typed-difference';
    block.textContent = `${grading.entered} → ${grading.expected}`;
    return block;
  };
  return { document, windowObject, createButton, createTypedDifference };
}

test('morphology-choice interaction grades only the explicit expected form', () => {
  const { document, windowObject, createButton, createTypedDifference } = fakeDomHarness();
  const card = document.createElement('div');
  const feedback = document.createElement('div');
  const results = [];

  const handled = course.renderMorphologyPracticeActivity({
    document,
    windowObject,
    activity: {
      type: 'morphology-choice',
      item: 'city',
      base_fi: 'Helsinki',
      feature_fa: 'inessiivi',
      prompt_fa: 'شکل درست را انتخاب کن.',
      frame_fi: 'Asun _____.',
      options_fi: ['Helsingissä', 'Helsingistä', 'Helsinkiin', 'Helsinki'],
      expected_fi: 'Helsingissä',
      explanation_fa: 'Helsinki → Helsingissä.',
    },
    card,
    feedback,
    createButton,
    nextActivity() {},
    createTypedDifference,
    recordResult(correct) {
      results.push(correct);
    },
  });

  assert.equal(handled, true);
  const options = card.children[1];
  options.children[1].click();
  assert.deepEqual(results, [false]);
  assert.equal(options.children[0].classList.contains('correct'), true);
  assert.equal(options.children[1].classList.contains('wrong'), true);
  assert.equal(feedback.hidden, false);
  assert.equal(feedback.children[1].textContent, 'Asun Helsingissä.');
});

test('inflection-production reuses fuzzy grading and keeps canonical morphology visible', () => {
  const { document, windowObject, createButton, createTypedDifference } = fakeDomHarness();
  const card = document.createElement('div');
  const feedback = document.createElement('div');
  const results = [];

  course.renderMorphologyPracticeActivity({
    document,
    windowObject,
    activity: {
      type: 'inflection-production',
      item: 'work',
      base_fi: 'työskennellä',
      feature_fa: 'حال ساده، اول‌شخص مفرد',
      prompt_fa: 'فعل را برای من بنویس.',
      frame_fi: 'Minä _____.',
      expected_fi: 'työskentelen',
      accepted_answers: ['työskentelen'],
      explanation_fa: 'työskennellä → työskentelen.',
    },
    card,
    feedback,
    createButton,
    nextActivity() {},
    createTypedDifference,
    recordResult(correct) {
      results.push(correct);
    },
  });

  const form = card.children[1];
  const input = form.children[0];
  input.value = 'tyoskentelen';
  form.submit();

  assert.deepEqual(results, [true]);
  assert.equal(input.disabled, true);
  assert.equal(input.focused, true);
  assert.equal(input.classList.contains('near-correct'), true);
  assert.equal(feedback.hidden, false);
  assert.match(feedback.children[0].textContent, /قبول شد/);
  assert.equal(feedback.children[2].textContent, 'Minä työskentelen.');
  assert.match(feedback.children[3].textContent, /työskennellä/);
});
