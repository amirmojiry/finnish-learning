#!/usr/bin/env bash
set -euo pipefail

mkdir -p css data/course tests
(base64 -di .course-payload/course.js.gz.b64 2>/dev/null || true) | gzip -d > course.js
(base64 -di .course-payload/course.css.gz.b64 2>/dev/null || true) | gzip -d > css/course.css
(base64 -di .course-payload/a1.1-section-1.json.gz.b64 2>/dev/null || true) | gzip -d > data/course/a1.1-section-1.json
(base64 -di .course-payload/course.test.cjs.gz.b64 2>/dev/null || true) | gzip -d > tests/course.test.cjs

python3 - <<'PY'
from pathlib import Path

path = Path('course.js')
source = path.read_text(encoding='utf-8')
old = ".toLocaleLowerCase('fi-FI')\n      .replace(/[?.!,;:،؛؟]+$/u, '')"
new = ".toLocaleLowerCase('fi-FI')\n      .trim()\n      .replace(/[?.!,;:،؛؟]+$/u, '')"
if old not in source:
    raise SystemExit('Answer normalization anchor not found')
path.write_text(source.replace(old, new, 1), encoding='utf-8')

path = Path('index.html')
html = path.read_text(encoding='utf-8')
css_anchor = '  <link rel="stylesheet" href="css/spaced-repetition.css?v=1.3.0">'
css_tag = '  <link rel="stylesheet" href="css/course.css?v=1.3.0">'
if 'css/course.css' not in html:
    if css_anchor not in html:
        raise SystemExit('Course CSS anchor not found')
    html = html.replace(css_anchor, f'{css_anchor}\n{css_tag}', 1)

desktop_anchor = '      <a class="desktop-view-link" href="#dictionary" data-view-link="dictionary">واژه‌نامه</a>'
desktop_link = '      <a class="desktop-view-link course-view-link" href="#course">دوره A1.1</a>'
if 'desktop-view-link course-view-link' not in html:
    if desktop_anchor not in html:
        raise SystemExit('Desktop navigation anchor not found')
    html = html.replace(desktop_anchor, f'{desktop_anchor}\n{desktop_link}', 1)

course_view = '''    <div id="course-view" class="app-view course-view" hidden>
      <div id="course-root" class="course-root" aria-live="polite">
        <div class="course-loading">در حال آماده‌کردن بخش آموزشی…</div>
      </div>
    </div>

'''
about_anchor = '    <div id="about-view" class="app-view about-view" hidden>'
if 'id="course-view"' not in html:
    if about_anchor not in html:
        raise SystemExit('Course view insertion anchor not found')
    html = html.replace(about_anchor, f'{course_view}{about_anchor}', 1)

bottom_anchor = '    <a class="bottom-nav-item" href="#dictionary" data-view-link="dictionary"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h6a4 4 0 0 1 4 4v14a4 4 0 0 0-4-4H4V3Zm16 0h-4a4 4 0 0 0-2 .54V21a4 4 0 0 1 4-4h2V3Z"/></svg><span>واژه‌نامه</span></a>'
bottom_link = '    <a class="bottom-nav-item course-view-link" href="#course"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v14H7a4 4 0 0 0-4 4V5a2 2 0 0 1 2-2Zm2 4v2h10V7H7Zm0 4v2h10v-2H7Z"/></svg><span>دوره</span></a>'
if 'bottom-nav-item course-view-link' not in html:
    if bottom_anchor not in html:
        raise SystemExit('Bottom navigation anchor not found')
    html = html.replace(bottom_anchor, f'{bottom_anchor}\n{bottom_link}', 1)

script_anchor = '  <script src="settings.js?v=1.3.0" defer></script>'
script_tag = '  <script src="course.js?v=1.3.0" defer></script>'
if 'src="course.js' not in html:
    if script_anchor not in html:
        raise SystemExit('Course script anchor not found')
    html = html.replace(script_anchor, f'{script_anchor}\n{script_tag}', 1)
path.write_text(html, encoding='utf-8')

path = Path('tests/spaced-repetition.test.cjs')
source = path.read_text(encoding='utf-8')
old = "  assert.equal((bottomNav.match(/bottom-nav-item/g) || []).length, 4);\n  assert.match(bottomNav, /profile-view-link/);"
new = "  assert.equal((bottomNav.match(/bottom-nav-item/g) || []).length, 5);\n  assert.match(bottomNav, /course-view-link/);\n  assert.match(bottomNav, /profile-view-link/);"
if old not in source:
    raise SystemExit('Bottom navigation test anchor not found')
path.write_text(source.replace(old, new, 1), encoding='utf-8')

path = Path('README.md')
source = path.read_text(encoding='utf-8')
source = source.replace('- 200 high-frequency written Finnish word forms with Persian translations', '- 300 high-frequency written Finnish word forms with Persian translations', 1)
anchor = '- three exercise modes: translation, multiple-choice cloze, and typed cloze'
feature = '- a complete prototype A1.1 section with 10 sequential lessons and 15 deterministic activities per lesson'
if feature not in source:
    if anchor not in source:
        raise SystemExit('English feature anchor not found')
    source = source.replace(anchor, f'{anchor}\n{feature}', 1)
data_anchor = '- `data/common-words.json`: generated vocabulary consumed by the app'
data_line = '- `data/course/a1.1-section-1.json`: reviewed manifest for the sample A1.1 section'
if data_line not in source:
    if data_anchor not in source:
        raise SystemExit('English data-path anchor not found')
    source = source.replace(data_anchor, f'{data_anchor}\n{data_line}', 1)
path.write_text(source, encoding='utf-8')

path = Path('README.fa.md')
source = path.read_text(encoding='utf-8')
source = source.replace('- ۲۰۰ صورت واژگانی پرتکرار در زبان نوشتاری فنلاندی با ترجمه فارسی', '- ۳۰۰ صورت واژگانی پرتکرار در زبان نوشتاری فنلاندی با ترجمه فارسی', 1)
anchor = '- سه تمرین ترجمه، جای‌خالی چهارگزینه‌ای و جای‌خالی تایپی'
feature = '- یک بخش نمونهٔ کامل A1.1 با ۱۰ درس پیوسته و ۱۵ فعالیت قطعی در هر درس'
if feature not in source:
    if anchor not in source:
        raise SystemExit('Persian feature anchor not found')
    source = source.replace(anchor, f'{anchor}\n{feature}', 1)
data_anchor = '- `data/common-words.json`: واژه‌نامه تولیدشده‌ای که اپ مصرف می‌کند'
data_line = '- `data/course/a1.1-section-1.json`: manifest بازبینی‌شدهٔ بخش نمونهٔ A1.1'
if data_line not in source:
    if data_anchor not in source:
        raise SystemExit('Persian data-path anchor not found')
    source = source.replace(data_anchor, f'{data_anchor}\n{data_line}', 1)
path.write_text(source, encoding='utf-8')
PY

npm run version:minor

python3 - <<'PY'
from pathlib import Path
import re
path = Path('CHANGELOG.md')
source = path.read_text(encoding='utf-8')
pattern = re.compile(r'## \[1\.4\.0\] - \d{4}-\d{2}-\d{2}\n\n- Describe the release changes here\.\n')
new = '''## [1.4.0] - 2026-08-03

### Added

- A new A1.1 course view with a complete ten-lesson sample section and fifteen deterministic activities per lesson.
- Sequential lesson unlocking, local course progress, lesson scores, listening prompts, typed production, and topic-aware curated content.
- A reviewed static lesson manifest combining introductory expressions, high-frequency forms, family vocabulary, and a ten-word animal collection.
- Regression coverage for course data, progression, answers, navigation, and asset integration.

### Changed

- Primary mobile navigation now exposes the course as a fifth destination.
'''
if not pattern.search(source):
    raise SystemExit('Version changelog placeholder not found')
path.write_text(pattern.sub(new, source, count=1), encoding='utf-8')
PY

npm run sync
npm test

rm -rf .course-payload
rm -f .github/workflows/finalize-sample-course.yml
rm -f .github/workflows/finalize-sample-course-v2.yml

git config user.name github-actions[bot]
git config user.email 41898282+github-actions[bot]@users.noreply.github.com
git add -A
git commit -m "Add sample A1.1 course section"
git push origin HEAD:agent/sample-a1-section
