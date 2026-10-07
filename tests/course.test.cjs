const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const course = require('../course.js');
const ROOT = path.resolve(__dirname, '..');
const rawSection = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-section-1.json'), 'utf8'));
const rawSection2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-section-2.json'), 'utf8'));
const rawSection3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-section-3.json'), 'utf8'));
const curriculum = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-curriculum.json'), 'utf8'));
const vocabulary = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'common-words.json'), 'utf8'));
const sections = course.validateImplementedCourse([rawSection, rawSection2, rawSection3], curriculum);
const section = sections[0];
const section2 = sections[1];
const section3 = sections[2];

test('A1.1 Section 1 contains ten deterministic curriculum-driven fifteen-activity lessons', () => {
  const rebuiltSection = course.validateSectionAgainstCurriculum(course.validateSection(rawSection), curriculum);
  assert.notEqual(section, rawSection);
  assert.equal(section.level, 'A1.1');
  assert.equal(section.curriculum_section_id, 'a1.1-s1');
  assert.equal(section.lessons.length, 10);
  assert.equal(section.activity_count_per_lesson, 15);
  assert.equal(section.lessons.reduce((sum, lesson) => sum + lesson.activities.length, 0), 150);
  assert.equal(Object.keys(section.items).length, 74);
  assert.deepEqual(
    section.lessons.map((lesson) => lesson.curriculum_id),
    curriculum.sections[0].lessons.map((lesson) => lesson.id),
  );
  assert.deepEqual(rebuiltSection.lessons.map((lesson) => lesson.activities), section.lessons.map((lesson) => lesson.activities));
});

test('the implemented section combines course content with source-aware frequency metadata', () => {
  const rankBySurface = new Map(
    vocabulary.words.map((entry) => [entry.word.normalize('NFC').toLocaleLowerCase('fi-FI'), entry.frequency_rank]),
  );
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
  assert.ok(section.items['en-ymmarra']);
  assert.ok(section.items['mika-tama-on']);
  assert.ok(section.items.anteeksi);
  assert.ok(Object.values(section.items).some((item) => item.item_type === 'expression'));
  assert.ok(Object.values(section.items).some((item) => item.item_type === 'sentence_frame'));
});

test('every activity references existing items and uses unique answer options', () => {
  for (const lesson of section.lessons) {
    for (const activity of lesson.activities) {
      if (activity.type === 'dialogue-order') {
        assert.equal(activity.turns.length, 4, `${lesson.id} dialogue must have four turns`);
        assert.equal(new Set(activity.turns).size, activity.turns.length, `${lesson.id} dialogue has duplicate turns`);
        for (const itemId of activity.turns) assert.ok(section.items[itemId], `${lesson.id} dialogue item ${itemId} is missing`);
        continue;
      }
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

test('typed grading accepts answers at 80 percent similarity and distinguishes exact from fuzzy matches', () => {
  const item = { surface_form: 'abcde', accepted_answers: ['abcde'] };
  const exact = course.gradeTypedAnswer(item, 'ABCDE!');
  const fuzzy = course.gradeTypedAnswer(item, 'abcdf');
  const wrong = course.gradeTypedAnswer(item, 'abxyz');

  assert.equal(exact.accepted, true);
  assert.equal(exact.exact, true);
  assert.equal(exact.fuzzy, false);

  assert.equal(fuzzy.similarity, 0.8);
  assert.equal(fuzzy.accepted, true);
  assert.equal(fuzzy.exact, false);
  assert.equal(fuzzy.fuzzy, true);

  assert.equal(wrong.accepted, false);
  assert.ok(wrong.similarity < 0.8);
});

test('typed grading accepts a/ä and o/ö substitutions while preserving canonical feedback', () => {
  const aa = course.gradeTypedAnswer({ surface_form: 'hyvää' }, 'hyvaa');
  assert.equal(aa.accepted, true);
  assert.equal(aa.exact, false);
  assert.equal(aa.fuzzy, true);
  assert.equal(aa.diacriticAdjusted, true);
  assert.equal(aa.similarity, 1);
  assert.ok(aa.operations.some((operation) => operation.type === 'replace' && operation.entered === 'a' && operation.expected === 'ä'));

  const oo = course.gradeTypedAnswer({ surface_form: 'pöytä' }, 'poyta');
  assert.equal(oo.accepted, true);
  assert.equal(oo.diacriticAdjusted, true);
  assert.ok(oo.operations.some((operation) => operation.type === 'replace' && operation.entered === 'o' && operation.expected === 'ö'));

  const reverse = course.gradeTypedAnswer({ surface_form: 'sana' }, 'sänä');
  assert.equal(reverse.accepted, true);
  assert.equal(reverse.diacriticAdjusted, true);

  const unrelated = course.gradeTypedAnswer({ surface_form: 'kissa' }, 'koira');
  assert.equal(unrelated.accepted, false);
  assert.equal(unrelated.diacriticAdjusted, false);
});

test('typed grading returns character-level alignment for substitutions omissions and extras', () => {
  const substitution = course.gradeTypedAnswer({ surface_form: 'hyvää' }, 'hyvaa');
  assert.ok(substitution.operations.some((operation) => operation.type === 'replace'));

  const missing = course.alignAnswers('kisa', 'kissa');
  assert.ok(missing.operations.some((operation) => operation.type === 'insert' && operation.expected === 's'));

  const extra = course.alignAnswers('kisssa', 'kissa');
  assert.ok(extra.operations.some((operation) => operation.type === 'delete' && operation.entered === 's'));
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

test('each section exposes its first lesson as a jump and later-section entry unlocks backfill', () => {
  let progress = course.emptyProgress();

  assert.equal(course.isCourseLessonAccessible(sections, progress, 0, 0), true);
  assert.equal(course.isCourseLessonAccessible(sections, progress, 1, 0), true);
  assert.equal(course.isSectionAccessible(sections, progress, 1), false);
  assert.equal(course.isCourseLessonAccessible(sections, progress, 1, 1), false);
  assert.equal(course.isCourseLessonAccessible(sections, progress, 0, 5), false);

  progress = course.recordLessonCompletion(progress, sections[1].lessons[0].id, 8, 10, 1000);

  assert.equal(course.isSectionStarted(sections[1], progress), true);
  assert.equal(course.isSectionAccessible(sections, progress, 1), true);
  assert.equal(course.isCourseLessonAccessible(sections, progress, 1, 1), true);
  assert.equal(course.isBackfillSectionUnlocked(sections, progress, 0), true);
  assert.equal(course.isSectionAccessible(sections, progress, 0), true);
  assert.equal(course.isCourseLessonAccessible(sections, progress, 0, 5), true);
  assert.equal(progress.completedLessons.includes(sections[0].lessons[5].id), false);
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
  assert.equal((bottomNav.match(/bottom-nav-item/g) || []).length, 4);
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
  assert.match(courseStyles, /\/\* Four-item icon-only mobile navigation fit \*\/[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(courseStyles, /\.bottom-nav-item\s*\{[\s\S]*?max-width:\s*none/);
});


test('each implemented lesson carries learner-facing summary and grammar content', () => {
  for (const lesson of section.lessons) {
    assert.ok(lesson.summary_fa, lesson.id);
    assert.ok(lesson.grammar_fa, lesson.id);
    assert.match(lesson.curriculum_id, /^a1\.1-s1-l\d{2}$/);
  }
});

test('six-target lessons expose every declared target in deterministic activities', () => {
  for (const lesson of section.lessons.filter((entry) => entry.new_targets.length === 6)) {
    const practiced = new Set(lesson.activities.map((activity) => activity.item));
    for (const target of lesson.new_targets) {
      assert.ok(practiced.has(target), `${lesson.id} never practices ${target}`);
    }
  }
});

test('review-only mini-dialogue lesson is deterministic and introduces no fake new target', () => {
  const lesson = section.lessons.find((entry) => entry.curriculum_id === 'a1.1-s1-l09');
  assert.deepEqual(lesson.new_targets, []);
  assert.equal(lesson.practice_targets.length, 5);
  assert.equal(lesson.activities.length, 15);
});

test('course UI is wired to both curriculum and implemented section data', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');
  assert.match(source, /CURRICULUM_URL/);
  assert.match(source, /validateSectionAgainstCurriculum/);
  assert.match(source, /course-section-catalog/);
  assert.match(source, /course-section-selector-toggle/);
  assert.match(source, /قفل است/);
  assert.match(styles, /\.course-section-selector/);
  assert.match(styles, /\.course-lesson-intro/);
});


test('every curriculum target group is explicitly mapped to real section items', () => {
  const contract = curriculum.sections.find((entry) => entry.id === section.curriculum_section_id);
  for (const contractLesson of contract.lessons) {
    const lesson = section.lessons.find((entry) => entry.curriculum_id === contractLesson.id);
    assert.ok(lesson, contractLesson.id);
    const refs = lesson.curriculum_target_refs;
    assert.equal(refs.high_frequency.length, contractLesson.high_frequency_targets.length);
    assert.equal(refs.topic.length, contractLesson.topic_targets.length);
    assert.equal(refs.expressions.length, contractLesson.expressions.length);
    for (const itemId of [...refs.high_frequency, ...refs.topic, ...refs.expressions]) {
      assert.ok(section.items[itemId], `${contractLesson.id} maps to missing item ${itemId}`);
    }
  }
});


test('standard activity generation teaches only declared new targets', () => {
  const generated = course.buildStandardActivities(['a','b','c'], ['old-1','old-2']);
  const taught = generated.filter((activity) => activity.type === 'teach').map((activity) => activity.item);
  assert.deepEqual(taught, ['a','b','c']);
  assert.ok(generated.some((activity) => activity.item === 'old-2'));
  assert.ok(generated.every((activity) => activity.type !== 'teach' || ['a','b','c'].includes(activity.item)));
});

test('six-target standard lessons teach every declared target exactly once', () => {
  const generated = course.buildStandardActivities(['a','b','c','d','e','f'], ['old']);
  const taught = generated.filter((activity) => activity.type === 'teach').map((activity) => activity.item);
  assert.deepEqual(taught, ['a','b','c','d','e','f']);
});

test('mini-dialogue lesson implements dialogue ordering and two four-turn assessments', () => {
  const lesson = section.lessons.find((entry) => entry.curriculum_id === 'a1.1-s1-l09');
  const dialogues = lesson.activities.filter((activity) => activity.type === 'dialogue-order');
  assert.ok(dialogues.length >= 2);
  for (const activity of dialogues) {
    assert.equal(activity.turns.length, 4);
    assert.equal(activity.answer_order.length, 4);
  }
  assert.ok(lesson.activities.some((activity) => activity.type === 'choice' && activity.mode === 'listen'));
  assert.ok(lesson.activities.some((activity) => activity.type === 'type'));
});


test('generated choice activities rotate the correct option position', () => {
  const generated = course.buildStandardActivities(['a','b','c','d'], ['old-1','old-2']);
  const choiceActivities = generated.filter((activity) => activity.type === 'choice');
  const positions = choiceActivities.map((activity) => activity.options.indexOf(activity.item));
  assert.ok(new Set(positions).size > 1, 'correct answer should not always occupy the same option position');
});

test('six-target lessons retain typed production practice', () => {
  const generated = course.buildStandardActivities(['a','b','c','d','e','f'], ['old']);
  assert.ok(generated.some((activity) => activity.type === 'type' && activity.mode === 'finnish'));
  assert.ok(generated.some((activity) => activity.type === 'type' && activity.mode === 'cloze'));
});

test('dialogue ordering activities are presented scrambled', () => {
  const lesson = section.lessons.find((entry) => entry.curriculum_id === 'a1.1-s1-l09');
  for (const activity of lesson.activities.filter((entry) => entry.type === 'dialogue-order')) {
    assert.notDeepEqual(activity.answer_order, [0,1,2,3]);
  }
});

test('English and Persian project status agree on the current release', () => {
  const en = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const fa = fs.readFileSync(path.join(ROOT, 'README.fa.md'), 'utf8');
  const version = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();
  assert.ok(en.includes(`Version: \`${version}\``));
  assert.ok(fa.includes(`نسخه: \`${version}\``));
  assert.match(en, /complete 40-lesson A1\.1 path/);
});


test('the application defaults to the course with icon-only accessible course navigation', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

  assert.match(html, /id="practice-view" class="app-view practice-view" hidden/);
  assert.doesNotMatch(html, /id="home-view"/);
  assert.doesNotMatch(html, /id="profile-view"/);
  assert.match(html, /id="course-view" class="app-view course-view">/);
  assert.equal((html.match(/aria-label="دوره"/g) || []).length, 2);
  const desktopHeader = html.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';
  assert.equal((desktopHeader.match(/nav-icon-only nav-tooltip/g) || []).length, 4);
  assert.equal((desktopHeader.match(/data-tooltip=/g) || []).length, 4);
  assert.equal((html.match(/course-view-link/g) || []).length, 2);
  assert.doesNotMatch(html, />دوره A1\.1</);
  assert.match(app, /if \(!location\.hash\) history\.replaceState\(null, '', '#course'\)/);
  assert.match(app, /view: 'course'/);
  assert.match(app, /hash === '#course' \|\| hash\.startsWith\('#course-'\)/);
});


test('active lessons use distraction-free chrome and viewport feedback', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');

  assert.match(source, /classList\.toggle\('course-lesson-active'/);
  assert.match(source, /createButton\('×', 'course-lesson-close', renderSectionMap\)/);
  assert.match(source, /aria-label', 'بستن درس و بازگشت به فهرست درس‌ها'/);
  assert.match(source, /course-activity-progress-count/);
  assert.doesNotMatch(source, /createButton\('بازگشت به درس‌ها'/);
  assert.doesNotMatch(source, /shell\.append\(top, track, lessonHeader, card\)/);
  assert.match(source, /course-primary-feedback/);
  assert.match(styles, /body\.course-lesson-active \.site-header/);
  assert.match(styles, /body\.course-lesson-active \.mobile-app-bar/);
  assert.match(styles, /body\.course-lesson-active \.bottom-nav/);
  assert.match(styles, /\.course-primary-feedback:not\(\[hidden\]\)\s*\{[\s\S]*position:\s*fixed/);
  assert.match(styles, /\.course-activity-progress-count/);
});

test('course map hides explanatory copy behind accessible info disclosures', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');

  assert.match(source, /function createInfoDisclosure/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /panel\.hidden = true/);
  assert.match(source, /توضیحات و اهداف بخش/);
  assert.match(source, /جزئیات درس/);
  assert.match(source, /course-lesson-popover-details/);
  assert.match(source, /در پایان این بخش می‌توانی/);
  assert.doesNotMatch(source, /بخش اول آمادهٔ یادگیری است؛ بخش‌های بعدی به‌ترتیب رودمپ اضافه می‌شوند/);
  assert.doesNotMatch(source, /section\.description_fa/);
  assert.doesNotMatch(source, /بخش ۱ نخستین بخش پیاده‌شدهٔ A1\.1 است/);
});

test('desktop lesson popover keeps a stable large width with equal full-width actions', () => {
  const courseStyles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');

  assert.match(courseStyles, /\.course-lesson-popover\s*\{[\s\S]*?width:\s*520px[\s\S]*?max-width:\s*100%/);
  assert.match(courseStyles, /\.course-lesson-popover-actions\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(courseStyles, /\.course-lesson-continue,[\s\S]*?\.course-lesson-details-toggle\s*\{[\s\S]*?width:\s*100%[\s\S]*?min-height:\s*54px/);
});

test('desktop navigation is icon-only and exposes labels through accessible tooltips', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'styles.css'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const desktopHeader = html.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';

  assert.equal((desktopHeader.match(/nav-icon-only nav-tooltip/g) || []).length, 4);
  for (const label of ['تمرین واژه','واژه‌نامه','دوره','تنظیمات']) {
    assert.match(desktopHeader, new RegExp('aria-label="' + label + '"'));
    assert.match(desktopHeader, new RegExp('data-tooltip="' + label + '"'));
  }
  assert.doesNotMatch(desktopHeader, /پروفایل|تمرین‌ها/);
  assert.match(styles, /\.site-header nav \.nav-tooltip::after/);
  assert.match(styles, /content:\s*attr\(data-tooltip\)/);
  assert.match(styles, /\.nav-tooltip:hover::after/);
  assert.match(styles, /\.nav-tooltip:focus::after/);
});


test('word-practice and dictionary hashes route before vocabulary fetch resolves', () => {
  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

  assert.match(app, /async function init\(\)\s*\{[\s\S]*?routeFromHash\(\);[\s\S]*?await fetch/);
  assert.match(app, /if \(hash\.startsWith\('#word-'\)\)[\s\S]*?showView\('dictionary', \{ updateHash: false \}\)/);
  assert.match(app, /showView\(hash === '#dictionary' \? 'dictionary' : 'practice', \{ updateHash: false \}\)/);
  assert.match(app, /els\.practiceError\.textContent = 'بارگذاری واژه‌ها انجام نشد\.'/);
});


test('A1.1 Section 2 contains ten deterministic learner-facing lessons', () => {
  assert.equal(section2.level, 'A1.1');
  assert.equal(section2.curriculum_section_id, 'a1.1-s2');
  assert.equal(section2.lessons.length, 10);
  assert.equal(section2.activity_count_per_lesson, 15);
  assert.equal(section2.lessons.reduce((sum, lesson) => sum + lesson.activities.length, 0), 150);
  assert.deepEqual(
    section2.lessons.map((lesson) => lesson.curriculum_id),
    curriculum.sections[1].lessons.map((lesson) => lesson.id),
  );
  for (const lesson of section2.lessons) {
    assert.ok(lesson.summary_fa, lesson.id);
    assert.ok(lesson.grammar_fa, lesson.id);
    assert.match(lesson.id, /^section-2-lesson-\d+$/);
  }
});

test('implemented course validates three ordered sections with globally unique lesson IDs', () => {
  assert.equal(sections.length, 3);
  assert.deepEqual(sections.map((entry) => entry.curriculum_section_id), ['a1.1-s1', 'a1.1-s2', 'a1.1-s3']);
  const lessonIds = sections.flatMap((entry) => entry.lessons.map((lesson) => lesson.id));
  assert.equal(new Set(lessonIds).size, 30);
});

test('Section 2 unlocks only after all legacy Section 1 lesson IDs are complete', () => {
  let progress = course.emptyProgress();
  assert.equal(course.isSectionUnlocked(sections, progress, 0), true);
  assert.equal(course.isSectionUnlocked(sections, progress, 1), false);

  for (const lesson of section.lessons.slice(0, -1)) {
    progress = course.recordLessonCompletion(progress, lesson.id, 8, 10, 1000);
  }
  assert.equal(course.isSectionUnlocked(sections, progress, 1), false);

  progress = course.recordLessonCompletion(progress, section.lessons.at(-1).id, 8, 10, 1000);
  assert.equal(course.isSectionComplete(section, progress), true);
  assert.equal(course.isSectionUnlocked(sections, progress, 1), true);
  assert.ok(progress.completedLessons.includes('lesson-1'));
  assert.ok(progress.completedLessons.includes('lesson-10'));
});

test('Section 2 declares exact cross-section recycling dependencies from the curriculum', () => {
  const contract = curriculum.sections[1];
  for (const contractLesson of contract.lessons) {
    const lesson = section2.lessons.find((entry) => entry.curriculum_id === contractLesson.id);
    assert.deepEqual(lesson.recycle_from, contractLesson.recycle_from, contractLesson.id);
  }
  assert.ok(section2.lessons[0].recycle_from.includes('a1.1-s1-l02'));
  assert.ok(section2.lessons[4].recycle_from.includes('a1.1-s1-l08'));
});

test('every Section 2 curriculum target maps to a real local course item', () => {
  const contract = curriculum.sections[1];
  for (const contractLesson of contract.lessons) {
    const lesson = section2.lessons.find((entry) => entry.curriculum_id === contractLesson.id);
    for (const group of ['high_frequency', 'topic', 'expressions']) {
      const contractTargets = group === 'high_frequency'
        ? contractLesson.high_frequency_targets
        : group === 'topic'
          ? contractLesson.topic_targets
          : contractLesson.expressions;
      assert.equal(
        lesson.curriculum_target_refs[group].length,
        contractTargets.length,
        contractLesson.id + ' / ' + group,
      );
      for (const itemId of lesson.curriculum_target_refs[group]) {
        assert.ok(section2.items[itemId], contractLesson.id + ' maps to missing ' + itemId);
      }
    }
  }
});

test('Section 2 keeps Finnish inflection explicit instead of synthesizing forms at runtime', () => {
  const surfaces = new Set(Object.values(section2.items).map((item) => item.surface_form));
  for (const required of [
    'Olen Suomesta.',
    'Olen Iranista.',
    'Puhun suomea.',
    'Puhun persiaa.',
    'Puhun englantia.',
    'Asun Vaasassa.',
    'Asun Helsingissä.',
    'Tämä on minun äitini.',
    'minun nimeni',
    'sinun nimesi',
    'Olen 12-vuotias.',
  ]) {
    assert.ok(surfaces.has(required), 'Missing explicit Finnish form: ' + required);
  }

  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.doesNotMatch(source, /\+\s*['"](?:sta|stä|ssa|ssä|a|ä)['"]/);
});

test('number lesson exposes the complete 0–20 reference grid and deterministic practice', () => {
  const lesson = section2.lessons.find((entry) => entry.curriculum_id === 'a1.1-s2-l07');
  const grid = lesson.activities.find((activity) => activity.type === 'number-grid');
  assert.ok(grid);
  assert.equal(grid.items.length, 21);
  assert.equal(new Set(grid.items).size, 21);
  assert.equal(section2.items[grid.items[0]].surface_form, 'nolla');
  assert.equal(section2.items[grid.items.at(-1)].surface_form, 'kaksikymmentä');
  assert.ok(lesson.activities.some((activity) => activity.type === 'type'));
  assert.ok(lesson.activities.some((activity) => activity.mode === 'listen'));
});

test('Section 2 family and age answers use learner-friendly reviewed forms', () => {
  assert.equal(section2.items['s2-sisar'].translation_fa, 'خواهر');

  const lesson = section2.lessons.find((entry) => entry.curriculum_id === 'a1.1-s2-l07');
  const grid = lesson.activities.find((activity) => activity.type === 'number-grid');
  grid.items.forEach((itemId, number) => {
    const item = section2.items[itemId];
    assert.equal(course.isTypedAnswerCorrect(item, item.surface_form), true, itemId);
    assert.equal(course.isTypedAnswerCorrect(item, String(number)), true, itemId);
  });

  const age = section2.items['s2-olen-12-vuotias'];
  assert.equal(course.isTypedAnswerCorrect(age, 'Olen 12-vuotias.'), true);
  assert.equal(course.isTypedAnswerCorrect(age, 'Olen kaksitoistavuotias.'), true);
  assert.equal(course.isTypedAnswerCorrect(age, 'Olen kaksitoista vuotta vanha.'), true);
});

test('all Section 2 activity references and typed answers are explicit', () => {
  for (const lesson of section2.lessons) {
    for (const activity of lesson.activities) {
      if (activity.type === 'number-grid') {
        for (const itemId of activity.items) assert.ok(section2.items[itemId], lesson.id + ': ' + itemId);
        continue;
      }
      if (activity.type === 'dialogue-order') {
        for (const itemId of activity.turns) assert.ok(section2.items[itemId], lesson.id + ': ' + itemId);
        continue;
      }
      assert.ok(section2.items[activity.item], lesson.id + ': ' + activity.item);
      for (const option of activity.options || []) assert.ok(section2.items[option], lesson.id + ': ' + option);
      if (activity.type === 'type') {
        assert.ok(course.acceptedAnswers(section2.items[activity.item]).length > 0, lesson.id + ': ' + activity.item);
      }
    }
  }
});

test('course runtime loads implemented sections and renders the full-width expandable section selector', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');

  assert.match(source, /SECTION_URLS/);
  assert.match(source, /a1\.1-section-1\.json/);
  assert.match(source, /a1\.1-section-2\.json/);
  assert.match(source, /a1\.1-section-3\.json/);
  assert.match(source, /isSectionUnlocked/);
  assert.match(source, /course-section-selector-toggle/);
  assert.match(source, /course-section-selector-list/);
  assert.match(source, /aria-controls/);
  assert.match(source, /number-grid/);
  assert.match(source, /sequence-order/);
  assert.match(source, /clock-choice/);
  assert.match(source, /negative-transform/);
  assert.match(source, /guided-writing/);
  assert.match(source, /event-time-match/);
  assert.match(styles, /\.course-section-selector-toggle/);
  assert.match(styles, /\.course-section-selector-option/);
  assert.match(styles, /\.course-number-grid/);
  assert.match(styles, /\.course-clock-face/);
  assert.match(styles, /\.course-guided-writing/);
});


test('language lesson practices every declared curriculum expression', () => {
  const lesson = section2.lessons.find((entry) => entry.curriculum_id === 'a1.1-s2-l03');
  const practiced = new Set();
  for (const activity of lesson.activities) {
    if (activity.item) practiced.add(activity.item);
    for (const itemId of activity.turns || []) practiced.add(itemId);
    for (const itemId of activity.items || []) practiced.add(itemId);
  }
  for (const itemId of lesson.curriculum_target_refs.expressions) {
    assert.ok(practiced.has(itemId), 'unpracticed language expression: ' + itemId);
  }
  assert.ok(lesson.activities.some((activity) => activity.item === 's2-puhun-englantia' && activity.type === 'type'));
  assert.ok(lesson.activities.some((activity) => activity.item === 's2-puhun-vahan-suomea' && activity.type !== 'teach'));
});


test('A1.1 Section 3 contains ten deterministic learner-facing lessons', () => {
  assert.equal(section3.level, 'A1.1');
  assert.equal(section3.curriculum_section_id, 'a1.1-s3');
  assert.equal(section3.lessons.length, 10);
  assert.equal(section3.activity_count_per_lesson, 15);
  assert.equal(section3.lessons.reduce((sum, lesson) => sum + lesson.activities.length, 0), 150);
  assert.deepEqual(
    section3.lessons.map((lesson) => lesson.curriculum_id),
    curriculum.sections[2].lessons.map((lesson) => lesson.id),
  );
  for (const lesson of section3.lessons) {
    assert.ok(lesson.summary_fa, lesson.id);
    assert.ok(lesson.grammar_fa, lesson.id);
    assert.match(lesson.id, /^section-3-lesson-\d+$/);
  }
});

test('Section 3 requires both earlier sections and all of Section 2 to be complete', () => {
  let progress = course.emptyProgress();
  for (const lesson of section2.lessons) {
    progress = course.recordLessonCompletion(progress, lesson.id, 8, 10, 1000);
  }
  assert.equal(course.isSectionUnlocked(sections, progress, 2), false, 'Section 1 cannot be skipped');

  for (const lesson of section.lessons) {
    progress = course.recordLessonCompletion(progress, lesson.id, 8, 10, 1000);
  }
  assert.equal(course.isSectionUnlocked(sections, progress, 2), true);

  const incomplete = course.emptyProgress();
  let almost = incomplete;
  for (const lesson of section.lessons) almost = course.recordLessonCompletion(almost, lesson.id, 8, 10, 1000);
  for (const lesson of section2.lessons.slice(0, -1)) almost = course.recordLessonCompletion(almost, lesson.id, 8, 10, 1000);
  assert.equal(course.isSectionUnlocked(sections, almost, 2), false);
});

test('Section 3 target mappings and recycling dependencies match the curriculum contract', () => {
  const contract = curriculum.sections[2];
  for (const contractLesson of contract.lessons) {
    const lesson = section3.lessons.find((entry) => entry.curriculum_id === contractLesson.id);
    assert.ok(lesson, contractLesson.id);
    assert.deepEqual(lesson.recycle_from, contractLesson.recycle_from, contractLesson.id);
    for (const group of ['high_frequency', 'topic', 'expressions']) {
      const contractTargets = group === 'high_frequency'
        ? contractLesson.high_frequency_targets
        : group === 'topic'
          ? contractLesson.topic_targets
          : contractLesson.expressions;
      assert.equal(lesson.curriculum_target_refs[group].length, contractTargets.length, contractLesson.id + ' / ' + group);
      for (const itemId of lesson.curriculum_target_refs[group]) {
        assert.ok(section3.items[itemId], contractLesson.id + ' maps to missing ' + itemId);
      }
    }
  }
});

test('weekday lesson orders all seven weekdays and assesses listening plus typing', () => {
  const lesson = section3.lessons.find((entry) => entry.curriculum_id === 'a1.1-s3-l02');
  const ordering = lesson.activities.find((activity) => activity.type === 'sequence-order');
  assert.ok(ordering);
  assert.equal(ordering.items.length, 7);
  assert.equal(new Set(ordering.items).size, 7);
  assert.equal(ordering.answer_order.length, 7);
  const orderedSurfaces = ordering.answer_order.map((index) => section3.items[ordering.items[index]].surface_form);
  assert.deepEqual(orderedSurfaces, ['maanantai','tiistai','keskiviikko','torstai','perjantai','lauantai','sunnuntai']);
  assert.ok(lesson.activities.some((activity) => activity.mode === 'listen'));
  assert.ok(lesson.activities.some((activity) => activity.type === 'type'));
});

test('whole-hour lesson contains multiple real clock-choice activities', () => {
  const lesson = section3.lessons.find((entry) => entry.curriculum_id === 'a1.1-s3-l03');
  const clocks = lesson.activities.filter((activity) => activity.type === 'clock-choice');
  assert.ok(clocks.length >= 4);
  assert.deepEqual([...new Set(clocks.map((activity) => activity.hour))].slice(0, 4), [1,2,3,4]);
  for (const activity of clocks) {
    assert.ok(activity.options.includes(activity.item));
    assert.ok(section3.items[activity.item]);
  }
});

test('all five curriculum connegative pairs are explicit and learner-facing', () => {
  const lesson = section3.lessons.find((entry) => entry.curriculum_id === 'a1.1-s3-l07');
  const contractLesson = curriculum.sections[2].lessons.find((entry) => entry.id === 'a1.1-s3-l07');
  assert.deepEqual(lesson.connegative_pairs, contractLesson.connegative_pairs);

  const transforms = lesson.activities.filter((activity) => activity.type === 'negative-transform');
  assert.equal(transforms.length, 5);
  const negativeSurfaces = transforms.map((activity) => section3.items[activity.negative_item].surface_form);
  assert.deepEqual(negativeSurfaces, ['En syö.','En juo.','En nuku.','En opiskele.','En työskentele.']);

  for (const pair of contractLesson.connegative_pairs) {
    assert.ok(Object.values(section3.items).some((item) => item.surface_form === pair.connegative), pair.connegative);
    assert.ok(Object.values(section3.items).some((item) => item.surface_form === pair.negative), pair.negative);
  }

  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.doesNotMatch(source, /\+\s*['"](?:o|ö|e)['"]/);
});

test('routine-day lesson uses real ordering and guided writing', () => {
  const lesson = section3.lessons.find((entry) => entry.curriculum_id === 'a1.1-s3-l09');
  const ordering = lesson.activities.filter((activity) => activity.type === 'sequence-order');
  const writing = lesson.activities.find((activity) => activity.type === 'guided-writing');
  assert.ok(ordering.length >= 2);
  assert.ok(ordering.every((activity) => activity.items.length === 5));
  assert.ok(writing);
  assert.equal(writing.expected_items.length, 3);
  assert.deepEqual(
    writing.expected_items.map((itemId) => section3.items[itemId].surface_form),
    ['Aamulla syön.','Päivällä opiskelen.','Illalla tulen kotiin.'],
  );
});

test('every mapped Section 3 expression appears in learner-facing activity data', () => {
  for (const lesson of section3.lessons) {
    const practiced = new Set();
    for (const activity of lesson.activities) {
      if (activity.item) practiced.add(activity.item);
      for (const itemId of activity.items || []) practiced.add(itemId);
      for (const itemId of activity.turns || []) practiced.add(itemId);
      for (const itemId of activity.expected_items || []) practiced.add(itemId);
      if (activity.affirmative_item) practiced.add(activity.affirmative_item);
      if (activity.negative_item) practiced.add(activity.negative_item);
    }
    for (const itemId of lesson.curriculum_target_refs.expressions) {
      assert.ok(practiced.has(itemId), lesson.curriculum_id + ' unpracticed expression ' + itemId);
    }
  }
});

test('Section 3 checkpoint covers weekdays, whole hours, routine, negation and when', () => {
  const lesson = section3.lessons.find((entry) => entry.curriculum_id === 'a1.1-s3-l10');
  const surfaces = lesson.checkpoint_targets.map((itemId) => section3.items[itemId].surface_form);
  assert.ok(surfaces.includes('maanantai'));
  assert.ok(surfaces.includes('Kello on kaksi.'));
  assert.ok(surfaces.includes('syön'));
  assert.ok(surfaces.includes('En syö.'));
  assert.ok(surfaces.includes('Milloin?'));
  assert.equal(lesson.activities.length, 15);
});

test('all Section 3 custom activity references and accepted answers are explicit', () => {
  for (const lesson of section3.lessons) {
    for (const activity of lesson.activities) {
      if (activity.type === 'sequence-order') {
        assert.equal(activity.items.length, activity.answer_order.length);
        for (const itemId of activity.items) assert.ok(section3.items[itemId], lesson.id + ': ' + itemId);
        continue;
      }
      if (activity.type === 'negative-transform') {
        assert.ok(section3.items[activity.affirmative_item]);
        assert.ok(section3.items[activity.negative_item]);
        assert.ok(course.acceptedAnswers(section3.items[activity.negative_item]).length);
        continue;
      }
      if (activity.type === 'guided-writing') {
        assert.equal(activity.expected_items.length, 3);
        for (const itemId of activity.expected_items) assert.ok(course.acceptedAnswers(section3.items[itemId]).length);
        continue;
      }
      if (activity.type === 'clock-choice') {
        assert.ok(section3.items[activity.item]);
        for (const option of activity.options) assert.ok(section3.items[option]);
        continue;
      }
      if (activity.type === 'event-time-match') {
        assert.ok(section3.items[activity.event_item]);
        assert.ok(section3.items[activity.time_item]);
        assert.ok(activity.options.includes(activity.time_item));
        for (const option of activity.options) assert.ok(section3.items[option]);
        continue;
      }
      if (activity.type === 'number-grid' || activity.type === 'dialogue-order') continue;
      assert.ok(section3.items[activity.item], lesson.id + ': ' + activity.item);
      for (const option of activity.options || []) assert.ok(section3.items[option], lesson.id + ': ' + option);
      if (activity.type === 'type') assert.ok(course.acceptedAnswers(section3.items[activity.item]).length);
    }
  }
});


test('day-reference sentence frames are taught without grading the ellipsis placeholder', () => {
  const lesson = section3.lessons.find((entry) => entry.curriculum_id === 'a1.1-s3-l01');
  const frameIds = new Set(['s3-tanaan-on-frame', 's3-huomenna-on-frame']);

  assert.equal(lesson.activities.length, 15);
  assert.ok(lesson.activities.some((activity) => activity.type === 'teach' && frameIds.has(activity.item)));
  assert.ok(lesson.activities.some((activity) => activity.type === 'choice' && frameIds.has(activity.item)));
  assert.ok(
    lesson.activities.every((activity) => !(activity.type === 'type' && frameIds.has(activity.item))),
    'ellipsis sentence frames must not be typed as literal answers',
  );
  assert.ok(lesson.activities.some((activity) => activity.type === 'type' && activity.item === 's3-tanaan'));
  assert.ok(lesson.activities.some((activity) => activity.type === 'type' && activity.item === 's3-huomenna'));
});

test('when lesson contains five deterministic event-to-time matching assessments', () => {
  const lesson = section3.lessons.find((entry) => entry.curriculum_id === 'a1.1-s3-l08');
  const matches = lesson.activities.filter((activity) => activity.type === 'event-time-match');

  assert.equal(matches.length, 5);
  const pairs = matches.map((activity) => [
    section3.items[activity.event_item].surface_form,
    section3.items[activity.time_item].surface_form,
  ]);
  assert.deepEqual(pairs, [
    ['Aamulla syön.', 'Aamulla.'],
    ['Päivällä opiskelen.', 'Päivällä.'],
    ['Illalla tulen kotiin.', 'Illalla.'],
    ['Yöllä nukun.', 'Yöllä.'],
    ['Syön kello kolme.', 'Kello kolme.'],
  ]);
  for (const activity of matches) {
    assert.ok(activity.options.includes(activity.time_item));
    assert.equal(new Set(activity.options).size, activity.options.length);
  }
});


test('section map uses circular numbered lesson nodes and a focused lesson popover', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /course-node-path/);
  assert.match(source, /course-path-step/);
  assert.match(source, /course-lesson-node/);
  assert.match(source, /course-lesson-popover/);
  assert.match(source, /جزئیات درس/);
  assert.match(source, /ادامه درس/);
  assert.match(source, /نکتهٔ زبان:/);
  assert.doesNotMatch(source, /card\.className = `course-lesson-card/);
});

test('lesson path styling uses circular nodes and thick dashed connectors', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');
  assert.match(styles, /\.course-lesson-node\s*\{/);
  assert.match(styles, /border-radius:\s*50%/);
  assert.match(styles, /\.course-path-connector/);
  assert.match(styles, /\.course-path-connector\s*\{[\s\S]*?border-left:\s*8px dashed/);
  assert.match(styles, /\.course-path-step::after\s*\{[\s\S]*?content:\s*none\s*!important/);
  assert.match(styles, /\.course-lesson-popover::before/);
  assert.match(styles, /\.course-lesson-popover/);
  assert.match(styles, /\.course-lesson-popover-details/);
});

test('lesson path preserves completed current and locked visual states', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');
  assert.match(source, /is-complete/);
  assert.match(source, /is-current/);
  assert.match(source, /is-locked/);
  assert.match(styles, /\.course-lesson-node\.is-complete/);
  assert.match(styles, /\.course-lesson-node\.is-locked/);
});


test('section navigation uses one expandable full-width selector with per-section progress', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');
  assert.match(source, /course-section-selector-current/);
  assert.match(source, /selectorList\.hidden = expanded/);
  assert.match(source, /course-section-selector-progress/);
  assert.match(source, /aria-valuenow/);
  assert.match(styles, /\.course-section-selector\s*\{[\s\S]*?width:\s*100%/);
  assert.match(styles, /\.course-section-selector-progress/);
  assert.doesNotMatch(source, /catalogGrid\.append/);
});


test('section map exposes a visibility-aware jump button for the current learnable lesson', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');

  assert.match(source, /course-current-lesson-jump/);
  assert.match(source, /scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/);
  assert.match(source, /targetVisible/);
  assert.match(source, /targetRect\.bottom < visibleTop \? 'up' : 'down'/);
  assert.match(source, /completed === 0\s*\? 0/);
  assert.match(styles, /\.course-current-lesson-jump\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(styles, /bottom:\s*calc\(68px \+ env\(safe-area-inset-bottom\)\)/);
});

test('opened lesson cards use explicit connectors that never continue through the card', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');
  assert.match(source, /connector\.className = 'course-path-connector'/);
  assert.match(source, /step\.append\(actionPanel\)/);
  assert.match(styles, /\.course-path-step::after\s*\{[\s\S]*?content:\s*none\s*!important/);
  assert.match(styles, /\.course-path-step\.has-open-popover \.course-lesson-popover::before/);
});

test('typed-answer feedback renders differing characters and fuzzy-accepted state', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');
  assert.match(source, /function createTypedDifference/);
  assert.match(source, /course-answer-diff-char/);
  assert.match(source, /شباهت/);
  assert.match(source, /پاسخ پذیرفته شد/);
  assert.match(styles, /\.course-answer-diff-char/);
  assert.match(styles, /text-decoration-line:\s*underline/);
  assert.match(styles, /\.course-answer-feedback\.is-near-correct/);
});

test('completion screen no longer promises a future review-algorithm connection', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.doesNotMatch(source, /در نسخه‌های بعدی نتیجهٔ هر نوع تمرین به الگوریتم مرور متصل خواهد شد/);
  assert.match(source, /فعالیت‌های معرفی در امتیاز حساب نمی‌شوند\./);
});


test('locked sections remain previewable while their first lesson is a jump entry point', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');

  const selectSectionBlock = source.match(/function selectSection\([\s\S]*?return true;\n\s*\}/)?.[0] || '';
  assert.match(selectSectionBlock, /if \(index < 0\) return false;/);
  assert.doesNotMatch(selectSectionBlock, /isSectionUnlocked/);

  assert.match(source, /option\.disabled = !implemented \|\| current;/);
  assert.match(source, /مشاهده \(قفل\)/);
  assert.match(source, /const unlocked = implemented \? isSectionAccessible\(sections, progress, implementedIndex\) : false;/);
  assert.match(source, /isCourseLessonAccessible\(sections, progress, sectionIndex, index\)/);
  assert.match(source, /jumpAvailable = index === 0/);
  assert.match(source, /پرش به این درس/);
  assert.match(source, /if \(!isCourseLessonAccessible\(sections, progress, sectionIndex, index\)\) return;/);
  assert.match(source, /targetSection && selectSection\(targetSection, \{ updateHash: false \}\)/);
});

test('locked lesson previews keep details available while unavailable lessons disable Continue', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  assert.match(source, /jumpAvailable \? 'پرش به این درس' : unlocked \? 'ادامه درس' : 'قفل است'/);
  assert.match(source, /continueButton\.disabled = !unlocked/);
  assert.match(source, /createButton\('جزئیات درس'/);
});


test('sequence-order uses reversible selection and explicit submission', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const sequenceBranch = source.match(/else if \(activity\.type === 'sequence-order'\) \{[\s\S]*?\n      \} else if \(activity\.type === 'clock-choice'\)/)?.[0] || '';

  assert.match(sequenceBranch, /course-sentence-answer-box/);
  assert.match(sequenceBranch, /course-sentence-token-pool/);
  assert.match(sequenceBranch, /ordered\.splice\(selectedPosition, 1\)/);
  assert.match(sequenceBranch, /course-sentence-submit/);
  assert.match(sequenceBranch, /submit\.disabled = answered \|\| ordered\.length !== activity\.items\.length/);
  assert.doesNotMatch(sequenceBranch, /if \(ordered\.length === activity\.items\.length\) \{/);
});

test('lesson popover dismisses when the learner clicks outside it', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');

  assert.match(source, /const closeLessonPopover = \(\) => \{/);
  assert.match(source, /document\.addEventListener\('click', onPageClick\)/);
  assert.match(source, /target\.closest\('\.course-lesson-node, \.course-lesson-popover'\)/);
  assert.match(source, /closeLessonPopover\(\)/);
  assert.match(source, /document\.removeEventListener\('click', onPageClick\)/);
});

test('long mobile lesson content starts at the top of its scrollable card', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');

  assert.match(source, /activity\.type === 'number-grid'[\s\S]*?card\.classList\.add\('is-long-content'\)/);
  assert.match(
    styles,
    /body\.course-lesson-active \.course-question-card\.is-long-content\s*\{[\s\S]*?justify-content:\s*flex-start/,
  );
});
