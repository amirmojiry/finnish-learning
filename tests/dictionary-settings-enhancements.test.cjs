const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const course = require('../course.js');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('dictionary curated examples expose Finnish sentence audio controls', () => {
  const source = read('app.js');
  assert.match(source, /function makeSentenceSpeakButton\(text/);
  assert.match(source, /fiRow\.append\(fi, makeSentenceSpeakButton\(example\.fi\)\)/);
  assert.match(source, /FinnishCourse\?\.playSpeech/);
});

test('UD corpus and morphology examples share an accessible Finnish audio control', () => {
  const source = read('ud-analysis.js');
  assert.match(source, /class="ud-speak-button"/);
  assert.match(source, /data-speech-text=/);
  assert.match(source, /window\.FinnishCourse\?\.playSpeech\?\.\(window, text\)/);
  assert.match(source, /item\.example \? renderUdExample\(item\.example, true\)/);
});

test('UD corpus rendering loads and displays local Persian translations', () => {
  const source = read('ud-analysis.js');
  assert.match(source, /EXAMPLE_TRANSLATIONS_URL = 'data\/corpus-example-translations-fa\.json'/);
  assert.ok(
    source.includes('udState.exampleTranslations = new Map(Object.entries(translations?.translations || {}));'),
  );
  assert.match(source, /class="ud-example-translation"/);
  assert.doesNotMatch(source, /translate\.googleapis|mymemory|libretranslate/i);
});

test('course reset lives in Settings and requires SweetAlert2 confirmation', () => {
  const html = read('index.html');
  const settings = read('settings.js');
  const courseSource = read('course.js');

  assert.match(html, /id="course-progress-reset"/);
  assert.match(html, /cdn\.jsdelivr\.net\/npm\/sweetalert2@11" async/);
  assert.ok(
    html.indexOf('app.js?v=1.24.0') < html.indexOf('cdn.jsdelivr.net/npm/sweetalert2@11'),
    'external SweetAlert must not gate local app scripts',
  );
  assert.doesNotMatch(courseSource, /course-reset-button/);
  assert.doesNotMatch(courseSource, /پاک‌کردن پیشرفت دوره/);

  assert.match(settings, /window\.Swal\?\.fire/);
  assert.match(settings, /showCancelButton: true/);
  assert.match(settings, /focusCancel: true/);
  assert.match(settings, /if \(!result\.isConfirmed\) return false/);
  assert.match(settings, /window\.confirm/);
  assert.match(settings, /courseApi\.resetProgress\(localStorage\)/);
  assert.match(settings, /finnish-course-progress-reset/);
});

test('resetProgress clears every course progress field through the normal storage contract', () => {
  const writes = [];
  const storage = {
    setItem(key, value) {
      writes.push([key, value]);
    },
  };

  const result = course.resetProgress(storage);
  assert.deepEqual(result, course.emptyProgress());
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], course.STORAGE_KEY);
  assert.deepEqual(JSON.parse(writes[0][1]), course.emptyProgress());
});
