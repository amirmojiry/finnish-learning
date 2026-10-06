const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const course = require('../course.js');
const ROOT = path.resolve(__dirname, '..');

test('legacy course progress gains an empty chronological answer history without losing data', () => {
  const legacy = {
    version: course.SCHEMA_VERSION,
    completedLessons: ['lesson-1'],
    lessonScores: {
      'lesson-1': { correct: 9, graded: 10, completedAt: 1000 },
    },
    targetPerformance: {
      'section-1::alpha': { attempts: 2, correct: 1, lastAttemptAt: 900 },
    },
    lastLessonId: 'lesson-1',
  };

  const clean = course.sanitizeProgress(legacy);
  assert.deepEqual(clean.answerHistory, []);
  assert.deepEqual(clean.completedLessons, ['lesson-1']);
  assert.equal(clean.lessonScores['lesson-1'].correct, 9);
  assert.equal(clean.targetPerformance['section-1::alpha'].attempts, 2);
});

test('answer history records stable sequence order and target queries stay chronological', () => {
  let progress = course.emptyProgress();

  progress = course.recordAnswerHistoryEvent(progress, {
    answeredAt: 2000,
    sessionId: 's1',
    sessionStartedAt: 1500,
    sessionType: 'lesson',
    sectionId: 'section-1',
    lessonId: 'lesson-1',
    sourceLessonId: 'lesson-1',
    targetId: 'alpha',
    activityType: 'choice',
    mode: 'meaning',
    correct: false,
    productive: false,
    firstAttempt: true,
    responseMs: 500,
  });

  progress = course.recordAnswerHistoryEvent(progress, {
    answeredAt: 3000,
    sessionId: 's2',
    sessionStartedAt: 2500,
    sessionType: 'lesson',
    sectionId: 'section-1',
    lessonId: 'lesson-2',
    sourceLessonId: 'lesson-2',
    targetId: 'alpha',
    activityType: 'type',
    mode: 'finnish',
    correct: true,
    productive: true,
    guided: false,
    direction: 'fa-to-fi',
    firstAttempt: true,
    responseMs: 450,
    exact: false,
    fuzzy: true,
    diacriticAdjusted: true,
  });

  assert.deepEqual(progress.answerHistory.map((entry) => entry.sequence), [1, 2]);
  const alpha = course.answerHistoryForTarget(progress, 'section-1', 'alpha');
  assert.deepEqual(alpha.map((entry) => entry.sessionId), ['s1', 's2']);
  assert.equal(alpha[1].productive, true);
  assert.equal(alpha[1].guided, false);
  assert.equal(alpha[1].direction, 'fa-to-fi');
  assert.equal(alpha[1].fuzzy, true);
  assert.equal(alpha[1].diacriticAdjusted, true);
});

test('sanitized answer history keeps stable sequence order even when stored input is unordered', () => {
  const progress = course.emptyProgress();
  progress.answerHistory = [
    {
      sequence: 3,
      answeredAt: 3000,
      sessionId: 's3',
      sectionId: 'section-1',
      activityType: 'choice',
      correct: true,
    },
    {
      sequence: 1,
      answeredAt: 1000,
      sessionId: 's1',
      sectionId: 'section-1',
      activityType: 'choice',
      correct: false,
    },
    {
      sequence: 2,
      answeredAt: 2000,
      sessionId: 's2',
      sectionId: 'section-1',
      activityType: 'type',
      correct: true,
    },
  ];

  const clean = course.sanitizeProgress(progress);
  assert.deepEqual(clean.answerHistory.map((entry) => entry.sequence), [1, 2, 3]);
  assert.deepEqual(clean.answerHistory.map((entry) => entry.answeredAt), [1000, 2000, 3000]);
});

test('answer history also stays within a serialized byte budget', () => {
  const progress = course.emptyProgress();
  progress.answerHistory = Array.from({ length: 80 }, (_, index) => ({
    sequence: index + 1,
    answeredAt: index + 1000,
    sessionId: `session-${index + 1}`,
    sectionId: 'section-1',
    activityType: 'type',
    mode: 'x'.repeat(25000),
    correct: true,
  }));

  const clean = course.sanitizeProgress(progress);
  assert.ok(clean.answerHistory.length < 80);
  assert.ok(course.utf8ByteLength(clean.answerHistory) <= course.ANSWER_HISTORY_MAX_BYTES);
  assert.equal(clean.answerHistory.at(-1).sequence, 80);
});

test('saveProgress evicts oldest answer history when storage rejects the full payload', () => {
  const progress = course.emptyProgress();
  progress.answerHistory = Array.from({ length: 20 }, (_, index) => ({
    sequence: index + 1,
    answeredAt: index + 1000,
    sessionId: `session-${index + 1}`,
    sectionId: 'section-1',
    activityType: 'type',
    mode: 'x'.repeat(1000),
    correct: true,
  }));

  let stored = null;
  const storage = {
    setItem(key, value) {
      assert.equal(key, course.STORAGE_KEY);
      if (course.utf8ByteLength(value) > 9000) {
        const error = new Error('quota');
        error.name = 'QuotaExceededError';
        throw error;
      }
      stored = value;
    },
  };

  const saved = course.saveProgress(storage, progress);
  assert.ok(saved.answerHistory.length > 0);
  assert.ok(saved.answerHistory.length < progress.answerHistory.length);
  assert.equal(saved.answerHistory.at(-1).sequence, 20);
  assert.ok(stored);
  assert.deepEqual(JSON.parse(stored).answerHistory, saved.answerHistory);
});

test('saveProgress does not block grading when storage cannot persist even empty history', () => {
  const progress = course.recordAnswerHistoryEvent(course.emptyProgress(), {
    answeredAt: 1000,
    sessionId: 's1',
    sectionId: 'section-1',
    activityType: 'choice',
    correct: true,
  });
  const storage = {
    setItem() {
      throw new Error('storage unavailable');
    },
  };

  assert.doesNotThrow(() => course.saveProgress(storage, progress));
  assert.equal(course.saveProgress(storage, progress).answerHistory.length, 1);
});

test('answer history is bounded and retains the newest chronological evidence', () => {
  const compact = course.trimAnswerHistoryToBudget(
    Array.from({ length: course.ANSWER_HISTORY_LIMIT + 3 }, (_, index) => index + 1),
  );
  assert.equal(compact.length, course.ANSWER_HISTORY_LIMIT);
  assert.equal(compact[0], 4);

  const progress = course.emptyProgress();
  progress.answerHistory = Array.from({ length: course.ANSWER_HISTORY_LIMIT + 3 }, (_, index) => ({
    sequence: index + 1,
    answeredAt: index + 1000,
    sessionId: `session-${index + 1}`,
    sectionId: 'section-1',
    activityType: 'choice',
    correct: index % 2 === 0,
  }));

  const clean = course.sanitizeProgress(progress);
  assert.ok(clean.answerHistory.length <= course.ANSWER_HISTORY_LIMIT);
  assert.ok(course.utf8ByteLength(clean.answerHistory) <= course.ANSWER_HISTORY_MAX_BYTES);
  assert.equal(clean.answerHistory.at(-1).sequence, course.ANSWER_HISTORY_LIMIT + 3);
});

test('course session IDs distinguish lesson and focused-practice sessions', () => {
  const lesson = course.courseSessionId('section-1', 'lesson', 'lesson-2', 1000, 1);
  const focused = course.courseSessionId('section-1', 'focused', 'focused-practice-section-1', 1000, 2);

  assert.notEqual(lesson, focused);
  assert.match(lesson, /:lesson:/);
  assert.match(focused, /:focused:/);
});

test('course activity evidence records direction and built-in guidance separately', () => {
  assert.equal(course.courseActivityDirection({ type: 'choice', mode: 'meaning' }), 'fi-to-fa');
  assert.equal(course.courseActivityDirection({ type: 'choice', mode: 'listen' }), 'audio-to-fa');
  assert.equal(course.courseActivityDirection({ type: 'type', mode: 'finnish' }), 'fa-to-fi');
  assert.equal(course.courseActivityDirection({ type: 'type', mode: 'cloze' }), 'context-to-fi');
  assert.equal(course.courseActivityDirection({ type: 'dictation' }), 'audio-to-fi');
  assert.equal(course.courseActivityDirection({ type: 'negative-transform' }), 'fi-transform');
  assert.equal(course.isGuidedCourseActivity({ type: 'controlled-production' }), true);
  assert.equal(course.isGuidedCourseActivity({ type: 'guided-writing' }), true);
  assert.equal(course.isGuidedCourseActivity({ type: 'type' }), false);
});

test('productive evidence is limited to activities that require Finnish production', () => {
  assert.equal(course.isProductiveCourseActivity({ type: 'type' }), true);
  assert.equal(course.isProductiveCourseActivity({ type: 'production' }), true);
  assert.equal(course.isProductiveCourseActivity({ type: 'dictation' }), true);
  assert.equal(course.isProductiveCourseActivity({ type: 'inflection-production' }), true);
  assert.equal(course.isProductiveCourseActivity({ type: 'choice', mode: 'meaning' }), false);
  assert.equal(course.isProductiveCourseActivity({ type: 'sentence-order' }), false);
});

test('focused practice retains source lesson provenance for answer history', () => {
  const section = {
    id: 'section-1',
    items: {
      alpha: { surface_form: 'alpha' },
    },
    lessons: [
      {
        id: 'lesson-source',
        activities: [
          { type: 'type', mode: 'finnish', item: 'alpha' },
        ],
      },
    ],
  };

  let progress = course.emptyProgress();
  progress.completedLessons = ['lesson-source'];
  progress = course.recordTargetAttempt(progress, section.id, 'alpha', false, 1000);

  const focused = course.buildFocusedPracticeActivities(section, progress);
  assert.equal(focused.length, 1);
  assert.equal(focused[0].source_lesson_id, 'lesson-source');
});

test('browser course wiring records session, timing, target, and typed-grading evidence once per graded result', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');

  assert.match(source, /function beginCourseSession\(sessionType, lessonId\)/);
  assert.match(source, /beginCourseSession\('lesson', lesson\.id\)/);
  assert.match(source, /beginCourseSession\('focused', activeLesson\.id\)/);
  assert.match(source, /activityTimingIndex !== activityIndex/);
  assert.match(source, /responseMs: activityStartedAt \? Math\.max\(0, answeredAt - activityStartedAt\) : 0/);
  assert.match(source, /progress = recordAnswerHistoryEvent\(progress, \{/);
  assert.match(source, /sourceLessonId: activity\.source_lesson_id/);
  assert.match(source, /direction: courseActivityDirection\(activity\)/);
  assert.match(source, /guided: isGuidedCourseActivity\(activity\)/);
  assert.match(source, /recordActivityResult\(activity, correct, grading\)/);
});
