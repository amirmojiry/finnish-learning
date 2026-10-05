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

test('all forty A1.1 lessons contain one listening-recognition activity and one dictation activity', () => {
  const lessons = sections.flatMap((section) => section.lessons);
  assert.equal(lessons.length, 40);

  for (const lesson of lessons) {
    assert.equal(lesson.activities.length, 15, lesson.id);
    assert.equal(lesson.listening_targets.length, 2, lesson.id);

    const listening = lesson.activities.filter((activity) => activity.type === 'choice' && activity.mode === 'listen');
    const dictation = lesson.activities.filter((activity) => activity.type === 'dictation');

    assert.equal(listening.length, 1, lesson.id);
    assert.equal(dictation.length, 1, lesson.id);
    assert.equal(listening[0].item, lesson.listening_targets[0], lesson.id);
    assert.equal(dictation[0].item, lesson.listening_targets[1], lesson.id);
    assert.ok(listening[0].options.includes(listening[0].item), lesson.id);
  }
});

test('auditory targets are explicit, answerable, and belong to reviewed lesson scope', () => {
  sections.forEach((section, sectionIndex) => {
    const raw = rawSections[sectionIndex];
    section.lessons.forEach((lesson, lessonIndex) => {
      const rawLesson = raw.lessons[lessonIndex];
      const scope = rawLessonScope(rawLesson);

      for (const targetId of rawLesson.listening_targets) {
        const item = section.items[targetId];
        assert.ok(item, `${lesson.id}: missing auditory target`);
        assert.ok(item.surface_form && item.surface_form.trim(), `${lesson.id}: missing Finnish form`);
        assert.ok(course.acceptedAnswers(item).length, `${lesson.id}: missing accepted answer`);
        assert.ok(scope.has(targetId), `${lesson.id}: auditory target is outside declared/reviewed lesson scope`);
      }
    });
  });
});

test('every section checkpoint including the final A1.1 checkpoint contains listening and dictation', () => {
  for (const section of sections) {
    const checkpoint = section.lessons[section.lessons.length - 1];
    assert.equal(checkpoint.order, 10);
    assert.ok(checkpoint.activities.some((activity) => activity.type === 'choice' && activity.mode === 'listen'), checkpoint.id);
    assert.ok(checkpoint.activities.some((activity) => activity.type === 'dictation'), checkpoint.id);
  }
});

test('auditory injection preserves every checkpoint target and avoids the production slot', () => {
  sections.forEach((section, sectionIndex) => {
    const checkpoint = section.lessons.at(-1);
    const rawCheckpoint = rawSections[sectionIndex].lessons.at(-1);
    const practiced = new Set();

    for (const activity of checkpoint.activities) {
      for (const key of ['item', 'answer_item', 'question_item', 'negative_item', 'affirmative_item', 'event_item', 'time_item']) {
        if (activity[key]) practiced.add(activity[key]);
      }
      for (const key of ['items', 'turns', 'expected_items']) {
        for (const itemId of activity[key] || []) practiced.add(itemId);
      }
    }

    for (const targetId of rawCheckpoint.checkpoint_targets || []) {
      assert.ok(practiced.has(targetId), `${checkpoint.id}: checkpoint target was displaced: ${targetId}`);
    }
    for (const targetId of checkpoint.listening_targets) {
      assert.notEqual(targetId, checkpoint.production_targets[0], `${checkpoint.id}: auditory target collides with production`);
    }
  });
});

test('Finnish speech requires an installed fi voice and never falls back to another language', () => {
  const finnishVoice = { name: 'Finnish Test Voice', lang: 'fi-FI', localService: true };
  const englishVoice = { name: 'English Test Voice', lang: 'en-US', localService: true };
  let spoken = null;
  function SpeechSynthesisUtterance(text) {
    this.text = text;
  }
  const windowObject = {
    navigator: { userAgent: 'Windows NT 10.0' },
    speechSynthesis: {
      getVoices: () => [englishVoice, finnishVoice],
      cancel() {},
      speak(utterance) {
        spoken = utterance;
      },
      addEventListener() {},
    },
    SpeechSynthesisUtterance,
  };

  assert.equal(course.speechApiAvailable(windowObject), true);
  assert.equal(course.findFinnishVoice(windowObject), finnishVoice);
  assert.equal(course.finnishSpeechStatus(windowObject).state, 'ready');
  assert.equal(course.supportsSpeech(windowObject), true);
  assert.equal(course.playSpeech(windowObject, 'Hyvää huomenta'), true);
  assert.equal(spoken.voice, finnishVoice);
  assert.equal(spoken.lang, 'fi-FI');

  const missing = {
    ...windowObject,
    speechSynthesis: {
      ...windowObject.speechSynthesis,
      getVoices: () => [englishVoice],
    },
  };
  assert.equal(course.finnishSpeechStatus(missing).state, 'missing');
  assert.equal(course.supportsSpeech(missing), false);
  assert.equal(course.playSpeech(missing, 'Hyvää huomenta'), false);

  const loading = {
    ...windowObject,
    speechSynthesis: {
      ...windowObject.speechSynthesis,
      getVoices: () => [],
    },
  };
  assert.equal(course.finnishSpeechStatus(loading).state, 'loading');

  assert.match(course.speechSettingsGuide(windowObject), /Settings.*Time & language.*Finnish/s);
  assert.equal(course.activityNeedsFinnishSpeech({ type: 'choice', mode: 'listen' }), true);
  assert.equal(course.activityNeedsFinnishSpeech({ type: 'dictation' }), true);
  assert.equal(course.activityNeedsFinnishSpeech({ type: 'choice', mode: 'meaning' }), false);
  assert.equal(course.shouldRefreshSpeechActivity({ type: 'dictation' }, false), true);
  assert.equal(course.shouldRefreshSpeechActivity({ type: 'choice', mode: 'listen' }, false), true);
  assert.equal(course.shouldRefreshSpeechActivity({ type: 'dictation' }, true), false);
  assert.equal(course.shouldRefreshSpeechActivity({ type: 'choice', mode: 'meaning' }, false), false);

  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /speechSynthesis\.addEventListener\('voiceschanged'/);
  assert.match(source, /صدای فنلاندی روی این دستگاه پیدا نشد/);
  assert.match(source, /اگر این وضعیت ادامه پیدا کرد، احتمالاً voice فنلاندی نصب نیست/);
  assert.match(source, /speechSettingsGuide\(windowObject\)/);
  assert.match(source, /shouldRefreshSpeechActivity\(currentActivity, answered\)/);
  assert.match(source, /Text-to-speech/);
  assert.match(source, /ادامه بدون تمرین شنیداری/);
  assert.match(source, /ادامه بدون دیکته/);
  assert.match(source, /input\.disabled = speechUnavailable/);
  assert.match(source, /button\.disabled = speechUnavailable/);
  assert.match(source, /no matching slot for listening target/);
  assert.match(source, /no matching slot for dictation target/);
});

test('dictation reuses typed grading without exposing the Finnish answer before submission', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /activity\.type === 'dictation'/);
  assert.match(source, /گوش کن و چیزی را که می‌شنوی به فنلاندی بنویس/);
  assert.match(source, /playSpeech\(windowObject, item\.surface_form\)/);
  assert.match(source, /gradeTypedAnswer\(item, input\.value\)/);
  assert.match(source, /showFeedback\(feedback, correct, item, grading\)/);

  const clozeBranchIndex = source.indexOf("} else if (activity.mode === 'cloze')");
  const dictationRenderIndex = source.lastIndexOf("if (activity.type === 'dictation')", clozeBranchIndex);
  const dictationBranch = source.slice(dictationRenderIndex, clozeBranchIndex);
  assert.ok(dictationRenderIndex >= 0);
  assert.doesNotMatch(dictationBranch, /textContent\s*=\s*item\.surface_form/);
});
