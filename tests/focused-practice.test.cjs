const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const course = require('../course.js');
const ROOT = path.resolve(__dirname, '..');

function makeSection() {
  return {
    id: 'section-test',
    items: {
      alpha: { surface_form: 'alpha' },
      beta: { surface_form: 'beta' },
      gamma: { surface_form: 'gamma' },
    },
    lessons: [
      {
        id: 'lesson-1',
        order: 1,
        activities: [
          { type: 'teach', item: 'alpha' },
          { type: 'choice', mode: 'meaning', item: 'alpha', options: ['alpha', 'beta'] },
          { type: 'type', mode: 'finnish', item: 'alpha' },
          { type: 'type', mode: 'finnish', item: 'beta' },
        ],
      },
      {
        id: 'lesson-2',
        order: 2,
        activities: [
          { type: 'production', item: 'alpha' },
          { type: 'type', mode: 'finnish', item: 'gamma' },
        ],
      },
    ],
  };
}

test('legacy course progress remains valid without target performance data', () => {
  const legacy = {
    version: course.SCHEMA_VERSION,
    completedLessons: ['lesson-1'],
    lessonScores: {
      'lesson-1': { correct: 8, graded: 10, completedAt: 1000 },
    },
    lastLessonId: 'lesson-1',
  };

  const clean = course.sanitizeProgress(legacy);
  assert.deepEqual(clean.targetPerformance, {});
  assert.deepEqual(clean.completedLessons, ['lesson-1']);
  assert.equal(clean.lessonScores['lesson-1'].correct, 8);
});

test('course target attempts aggregate by section and target', () => {
  let progress = course.emptyProgress();
  progress = course.recordTargetAttempt(progress, 'section-test', 'alpha', false, 1000);
  progress = course.recordTargetAttempt(progress, 'section-test', 'alpha', true, 2000);
  progress = course.recordTargetAttempt(progress, 'section-test', 'beta', true, 3000);

  assert.deepEqual(progress.targetPerformance['section-test::alpha'], {
    attempts: 2,
    correct: 1,
    lastAttemptAt: 2000,
    consecutiveCorrect: 1,
    retryRecovered: false,
  });
  assert.deepEqual(progress.targetPerformance['section-test::beta'], {
    attempts: 1,
    correct: 1,
    lastAttemptAt: 3000,
    consecutiveCorrect: 1,
    retryRecovered: false,
  });
});

test('weak targets require at least one miss and accuracy below eighty percent', () => {
  const section = makeSection();
  let progress = course.emptyProgress();

  progress = course.recordTargetAttempt(progress, section.id, 'alpha', false, 1000);
  progress = course.recordTargetAttempt(progress, section.id, 'alpha', true, 2000);

  progress = course.recordTargetAttempt(progress, section.id, 'beta', false, 1000);
  progress = course.recordTargetAttempt(progress, section.id, 'beta', true, 2000);
  progress = course.recordTargetAttempt(progress, section.id, 'beta', true, 3000);
  progress = course.recordTargetAttempt(progress, section.id, 'beta', true, 4000);
  progress = course.recordTargetAttempt(progress, section.id, 'beta', true, 5000);

  progress = course.recordTargetAttempt(progress, section.id, 'gamma', false, 6000);

  const weak = course.weakTargetsForSection(section, progress);
  assert.deepEqual(weak.map((entry) => entry.itemId), ['gamma', 'alpha']);
  assert.equal(weak[0].accuracy, 0);
  assert.equal(weak[1].accuracy, 0.5);
  assert.equal(weak.some((entry) => entry.itemId === 'beta'), false);
});

test('focused practice reuses only graded activities from completed lessons', () => {
  const section = makeSection();
  let progress = course.emptyProgress();
  progress.completedLessons = ['lesson-1'];
  progress = course.recordTargetAttempt(progress, section.id, 'alpha', false, 1000);

  const focused = course.buildFocusedPracticeActivities(section, progress, 10);

  assert.equal(focused.length, 2);
  assert.equal(focused[0].type, 'type');
  assert.equal(focused[0].item, 'alpha');
  assert.equal(focused[1].type, 'choice');
  assert.equal(focused.some((activity) => activity.type === 'teach'), false);
  assert.equal(focused.some((activity) => activity.type === 'production'), false);
});

test('focused practice UI is section-scoped and does not complete lessons', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');

  assert.match(source, /function startFocusedPractice\(\)/);
  assert.match(source, /focused_practice: true/);
  assert.match(source, /course-focused-practice-card/);
  assert.match(source, /buildFocusedPracticeActivities\(section, progress\)/);
  assert.match(
    source,
    /if \(activeLesson\.focused_practice\) \{[\s\S]*?return;[\s\S]*?const passingScore = Number\(activeLesson\.passing_score/,
  );
  assert.match(styles, /\.course-focused-practice-card/);
});


test('weak-target totals are independent from the focused-session activity cap', () => {
  const itemIds = Array.from({ length: 12 }, (_, index) => `target-${index + 1}`);
  const section = {
    id: 'large-weak-section',
    items: Object.fromEntries(itemIds.map((itemId) => [itemId, { surface_form: itemId }])),
    lessons: [
      {
        id: 'large-lesson',
        order: 1,
        activities: itemIds.map((itemId) => ({ type: 'type', mode: 'finnish', item: itemId })),
      },
    ],
  };

  let progress = course.emptyProgress();
  progress.completedLessons = ['large-lesson'];
  for (let index = 0; index < itemIds.length; index += 1) {
    progress = course.recordTargetAttempt(progress, section.id, itemIds[index], false, 1000 + index);
  }

  const allWeak = course.weakTargetsForSection(section, progress, Number.POSITIVE_INFINITY);
  const focused = course.buildFocusedPracticeActivities(section, progress);

  assert.equal(allWeak.length, 12);
  assert.equal(focused.length, course.FOCUSED_PRACTICE_LIMIT);

  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(
    source,
    /const weakTargets = weakTargetsForSection\(section, progress, Number\.POSITIVE_INFINITY\);[\s\S]*?const focusedTargetIds = weakTargets\.map/,
  );
  assert.match(
    source,
    /const remainingTargets = weakTargetsForSection\(section, progress, Number\.POSITIVE_INFINITY\)/,
  );
});

test('three consecutive correct answers resolve historical weak targets', () => {
  const section = makeSection();
  let progress = course.emptyProgress();
  progress = course.recordTargetAttempt(progress, section.id, 'alpha', false, 1000);
  for (let i = 0; i < 2; i++) progress = course.recordTargetAttempt(progress, section.id, 'alpha', true, 2000 + i);
  assert.equal(course.weakTargetsForSection(section, progress).some((entry) => entry.itemId === 'alpha'), true);
  progress = course.recordTargetAttempt(progress, section.id, 'alpha', true, 3000);
  assert.equal(course.weakTargetsForSection(section, progress).some((entry) => entry.itemId === 'alpha'), false);
  progress = course.recordTargetAttempt(progress, section.id, 'alpha', false, 4000);
  assert.equal(course.weakTargetsForSection(section, progress).some((entry) => entry.itemId === 'alpha'), true);
});

test('successful end-of-lesson retry resolves a fresh weak target', () => {
  const section = makeSection();
  let progress = course.emptyProgress();
  progress = course.recordTargetAttempt(progress, section.id, 'alpha', false, 1000);
  progress = course.recordTargetAttempt(progress, section.id, 'alpha', true, 2000, true);
  assert.equal(course.weakTargetsForSection(section, progress).some((entry) => entry.itemId === 'alpha'), false);
  progress = course.recordTargetAttempt(progress, section.id, 'alpha', false, 3000);
  assert.equal(course.weakTargetsForSection(section, progress).some((entry) => entry.itemId === 'alpha'), true);
});

test('lesson retries preserve first-attempt scoring and history', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /retryActivities\.push\(activity\)/);
  assert.match(source, /firstAttempt: !lessonRetryPhase/);
  assert.match(source, /recordTargetAttempt\(progress, section\.id, targetId, correct, answeredAt, lessonRetryPhase\)/);
  assert.match(source, /const initialGraded = sessionGraded - \(lessonRetryPhase \? retryActivities\.length : 0\)/);
});
