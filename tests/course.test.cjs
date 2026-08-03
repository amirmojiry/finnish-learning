const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const course = require('../course.js');
const ROOT = path.resolve(__dirname, '..');
const rawSection = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-section-1.json'), 'utf8'));
const vocabulary = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'common-words.json'), 'utf8'));
const section = course.validateSection(rawSection);

test('the sample A1.1 section contains ten deterministic fifteen-activity lessons', () => {
  const rebuiltSection = course.validateSection(rawSection);
  assert.notEqual(section, rawSection);
  assert.equal(section.level, 'A1.1');
  assert.equal(section.lessons.length, 10);
  assert.equal(section.activity_count_per_lesson, 15);
  assert.equal(section.lessons.reduce((sum, lesson) => sum + lesson.activities.length, 0), 150);
  assert.equal(Object.keys(section.items).length, 45);
  assert.deepEqual(rebuiltSection.lessons.map((lesson) => lesson.activities), section.lessons.map((lesson) => lesson.activities));
});

test('the section combines curriculum topics with source-aware frequency metadata', () => {
  const animals = Object.values(section.items).filter((item) => item.topics.includes('animals'));
  const rankBySurface = new Map(
    vocabulary.words.map((entry) => [entry.word.normalize('NFC').toLocaleLowerCase('fi-FI'), entry.frequency_rank]),
  );
  assert.equal(animals.length, 10);
  for (const item of Object.values(section.items)) {
    const key = item.surface_form.normalize('NFC').toLocaleLowerCase('fi-FI');
    const expectedRank = rankBySurface.get(key);
    if (expectedRank === undefined) {
      assert.equal(item.frequency_status, 'unranked', item.id);
      assert.equal(item.frequency_rank, null, item.id);
    } else {
      assert.ok(Number.isInteger(expectedRank) && expectedRank > 0, item.id);
      assert.equal(item.frequency_status, 'ranked', item.id);
      assert.equal(item.frequency_rank, expectedRank, item.id);
    }
  }
  assert.equal(section.items.mina.frequency_rank, 54);
  assert.equal(section.items.tama.frequency_rank, 49);
  assert.equal(section.items.sina.frequency_rank, 202);
  assert.equal(section.items.han.frequency_rank, 7);
  assert.equal(section.items.ei.frequency_rank, 3);
  assert.equal(section.items.hirvi.frequency_status, 'unranked');
  assert.ok(Object.values(section.items).some((item) => item.item_type === 'expression'));
  assert.ok(Object.values(section.items).some((item) => item.item_type === 'sentence_frame'));
});

test('every activity references existing items and uses unique answer options', () => {
  for (const lesson of section.lessons) {
    for (const activity of lesson.activities) {
      assert.ok(section.items[activity.item], `${lesson.id} references ${activity.item}`);
      const options = activity.options || [];
      assert.equal(new Set(options).size, options.length, `${lesson.id} has duplicate options`);
      for (const option of options) assert.ok(section.items[option], `${lesson.id} option ${option} is missing`);
    }
  }
});

test('answer normalization accepts Finnish casing, spacing, and trailing punctuation', () => {
  assert.equal(course.normalizeAnswer('  HYVÄÄ   HUOMENTA!  '), 'hyvää huomenta');
  assert.equal(course.isTypedAnswerCorrect(section.items['hyvaa-huomenta'], 'hyvää huomenta'), true);
  assert.equal(course.isTypedAnswerCorrect(section.items['hyvaa-huomenta'], 'hyvää iltaa'), false);
});

test('cloze generation replaces a known surface form without changing the source example', () => {
  const item = section.items.kissa;
  const cloze = course.makeCloze(item.example_fi, item.surface_form);
  assert.match(cloze, /_____/);
  assert.doesNotMatch(cloze.toLocaleLowerCase('fi-FI'), /kissa/);
  assert.equal(item.example_fi, 'Kissa nukkuu sohvalla.');
});

test('course progression unlocks lessons sequentially and preserves best scores', () => {
  let progress = course.emptyProgress();
  assert.equal(course.isLessonUnlocked(section, progress, 0), true);
  assert.equal(course.isLessonUnlocked(section, progress, 1), false);
  progress = course.recordLessonCompletion(progress, 'lesson-1', 7, 10, 1000);
  assert.equal(course.isLessonUnlocked(section, progress, 1), true);
  progress = course.recordLessonCompletion(progress, 'lesson-1', 6, 10, 2000);
  assert.equal(progress.lessonScores['lesson-1'].correct, 7);
  progress = course.recordLessonCompletion(progress, 'lesson-1', 9, 10, 3000);
  assert.equal(progress.lessonScores['lesson-1'].correct, 9);
  assert.deepEqual(progress.completedLessons, ['lesson-1']);
});

test('invalid stored course data falls back to a safe empty progress schema', () => {
  const storage = { getItem: () => '{bad json', setItem: () => {} };
  assert.deepEqual(course.loadProgress(storage), course.emptyProgress());
});

test('the new course view and assets are integrated exactly once', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const bottomNav = html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.equal((html.match(/css\/course\.css/g) || []).length, 1);
  assert.equal((html.match(/course\.js/g) || []).length, 1);
  assert.equal((html.match(/id="course-view"/g) || []).length, 1);
  assert.equal((html.match(/id="course-root"/g) || []).length, 1);
  assert.equal((html.match(/desktop-view-link course-view-link/g) || []).length, 1);
  assert.equal((bottomNav.match(/bottom-nav-item/g) || []).length, 5);
  assert.match(bottomNav, /course-view-link/);
  assert.ok(html.indexOf('settings.js') < html.indexOf('course.js'));
});


test('desktop and mobile navigation stay contained and focused', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const coreStyles = fs.readFileSync(path.join(ROOT, 'css', 'styles.css'), 'utf8');
  const courseStyles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');
  const desktopHeader = html.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';
  assert.doesNotMatch(desktopHeader, /data\/common-words\.json/);
  assert.match(coreStyles, /\/\* Desktop navigation polish \*\/[\s\S]*\.site-header nav/);
  assert.match(courseStyles, /\/\* Five-item mobile navigation fit \*\/[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(courseStyles, /\.bottom-nav-item\s*\{[\s\S]*?max-width:\s*none/);
});
