const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const course = require('../course.js');
const ROOT = path.resolve(__dirname, '..');
const rawSection = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-section-1.json'), 'utf8'));
const rawSection2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-section-2.json'), 'utf8'));
const curriculum = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.1-curriculum.json'), 'utf8'));
const vocabulary = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'common-words.json'), 'utf8'));
const sections = course.validateImplementedCourse([rawSection, rawSection2], curriculum);
const section = sections[0];
const section2 = sections[1];

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
  assert.match(source, /به‌زودی/);
  assert.match(styles, /\.course-section-grid/);
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

test('English and Persian feature bullets agree that Section 1 is implemented', () => {
  const en = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const fa = fs.readFileSync(path.join(ROOT, 'README.fa.md'), 'utf8');
  assert.match(en, /real curriculum-driven A1\.1 Section 1/);
  assert.match(fa, /بخش اول واقعی و curriculum-driven سطح A1\.1/);
});


test('the application defaults to the course with icon-only accessible course navigation', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

  assert.match(html, /id="home-view" class="app-view home-view" hidden/);
  assert.match(html, /id="course-view" class="app-view course-view">/);
  assert.equal((html.match(/aria-label="دوره"/g) || []).length, 2);
  assert.equal((html.match(/course-view-link nav-icon-only active/g) || []).length, 2);
  assert.doesNotMatch(html, />دوره A1\.1</);
  assert.match(app, /if\(!location\.hash\)history\.replaceState\(null,'','#course'\)/);
  assert.match(app, /view:'course'/);
  assert.match(app, /h==='#course'\|\|h\.startsWith\('#course-'\)/);
});

test('course map hides explanatory copy behind accessible info disclosures', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');

  assert.match(source, /function createInfoDisclosure/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /panel\.hidden = true/);
  assert.match(source, /توضیحات و اهداف بخش/);
  assert.match(source, /توضیحات درس/);
  assert.match(source, /در پایان این بخش می‌توانی/);
  assert.doesNotMatch(source, /بخش اول آمادهٔ یادگیری است؛ بخش‌های بعدی به‌ترتیب رودمپ اضافه می‌شوند/);
  assert.doesNotMatch(source, /section\.description_fa/);
  assert.doesNotMatch(source, /بخش ۱ نخستین بخش پیاده‌شدهٔ A1\.1 است/);
});

test('desktop lesson and review actions use stable fixed action regions', () => {
  const courseStyles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');
  const reviewStyles = fs.readFileSync(path.join(ROOT, 'css', 'spaced-repetition.css'), 'utf8');

  assert.match(courseStyles, /\.course-lesson-action-area\s*\{[\s\S]*?width:\s*148px[\s\S]*?min-width:\s*148px/);
  assert.match(courseStyles, /\.course-lesson-action\s*\{[\s\S]*?min-height:\s*52px/);
  assert.match(reviewStyles, /\.spaced-review-start\s*\{[\s\S]*?width:\s*148px[\s\S]*?min-height:\s*52px/);
});

test('course navigation visually hides its label but retains an accessible name', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  assert.match(styles, /\.nav-icon-only > span/);
  assert.match(styles, /clip:\s*rect\(0, 0, 0, 0\)/);
  assert.match(html, /course-view-link nav-icon-only active[^>]+aria-label="دوره"/);
});


test('legacy home and dictionary hashes route before vocabulary fetch resolves', () => {
  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

  const initMatch = app.match(/async function init\(\)\{([^}]|\}(?!catch))*routeFromHash\(\);try\{const r=await fetch/);
  assert.ok(initMatch, 'init must route the current hash before awaiting vocabulary fetch');
  assert.match(app, /if\(h\.startsWith\('#word-'\)\)\{[\s\S]*?showView\('dictionary',\{updateHash:false\}\);return/);
  assert.match(app, /if\(state\.view==='dictionary'\)\{els\.dictionaryList\.replaceChildren\(\);els\.dictionaryEmpty\.hidden=false;els\.dictionaryEmpty\.textContent='بارگذاری واژه‌ها انجام نشد\.'/);
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

test('implemented course validates two ordered sections with globally unique lesson IDs', () => {
  assert.equal(sections.length, 2);
  assert.deepEqual(sections.map((entry) => entry.curriculum_section_id), ['a1.1-s1', 'a1.1-s2']);
  const lessonIds = sections.flatMap((entry) => entry.lessons.map((lesson) => lesson.id));
  assert.equal(new Set(lessonIds).size, 20);
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

test('course runtime loads both implemented section files and renders multi-section controls', () => {
  const source = fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'course.css'), 'utf8');

  assert.match(source, /SECTION_URLS/);
  assert.match(source, /a1\.1-section-1\.json/);
  assert.match(source, /a1\.1-section-2\.json/);
  assert.match(source, /isSectionUnlocked/);
  assert.match(source, /باز کردن بخش/);
  assert.match(source, /number-grid/);
  assert.match(styles, /\.course-section-open/);
  assert.match(styles, /\.course-number-grid/);
});
