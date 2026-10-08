'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdown(full);
    return entry.isFile() && entry.name.endsWith('.md') ? [full] : [];
  });
}

function localMarkdownLinks(source) {
  const links = [];
  const linkPattern = /\]\(([^)\n]+)\)/g;
  for (const match of source.matchAll(linkPattern)) {
    // Unwrap angle-bracket URLs and strip optional Markdown titles.
    const expression = match[1].trim();
    const destination = expression.startsWith('<')
      ? expression.slice(1, expression.indexOf('>'))
      : expression.split(/\s+["']/)[0];
    if (!destination || destination.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(destination)
      || destination.startsWith('//')) continue;
    const pathname = destination.split(/[?#]/)[0];
    if (pathname) links.push(pathname);
  }
  return links;
}

test('all local Markdown links in documentation resolve inside the repository', () => {
  const documents = [
    ...['README.md', 'README.fa.md', 'AGENTS.md', 'CHANGELOG.md']
      .map(file => path.join(ROOT, file)),
    ...['docs', 'data/vocabulary-details', 'tools/ud-import', 'ud-import-2.18', '.github']
      .flatMap(dir => walkMarkdown(path.join(ROOT, dir))),
  ];
  assert.ok(documents.length >= 20, 'Documentation inventory unexpectedly shrank');

  const broken = [];
  for (const file of documents) {
    const relative = path.relative(ROOT, file);
    for (const href of localMarkdownLinks(fs.readFileSync(file, 'utf8'))) {
      let decoded = href;
      try { decoded = decodeURIComponent(href); } catch { /* Invalid percent escape is checked below. */ }
      const target = path.resolve(path.dirname(file), decoded);
      if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target)) {
        broken.push(`${relative}: ${href}`);
      }
    }
  }
  assert.deepEqual(broken, [], `Broken local documentation links:\n${broken.join('\n')}`);
});

test('the documentation hub links all active canonical sources', () => {
  const hub = read('docs/README.md');
  for (const link of [
    'ROADMAP.md', 'ROADMAP.fa.md',
    'MASTER-CURRICULUM.md', 'MASTER-CURRICULUM.fa.md',
    'A1.1-CURRICULUM.md', 'A1.1-CURRICULUM.fa.md',
    'GRAMMAR-ROADMAP.md', 'VOCABULARY-ROADMAP.md',
    'CURRICULUM-AUDIT.fa.md', 'LEARNING-DESIGN.md', 'LEARNING-DESIGN.fa.md',
    'SPACED_REPETITION.md', 'VERSIONING.md',
    '../tools/ud-import/README.md', '../AGENTS.md',
  ]) {
    assert.ok(hub.includes(`(${link})`), `Docs hub is missing ${link}`);
  }
  assert.match(hub, /canonical/i);
  assert.match(hub, /بایگانی/);
});

test('root READMEs and Learning Design use the canonical bilingual delivery roadmap', () => {
  const files = [
    ['README.md', 'docs/ROADMAP.md'],
    ['README.fa.md', 'docs/ROADMAP.fa.md'],
    ['docs/LEARNING-DESIGN.md', 'ROADMAP.md'],
    ['docs/LEARNING-DESIGN.fa.md', 'ROADMAP.fa.md'],
  ];
  for (const [file, roadmap] of files) {
    const content = read(file);
    assert.ok(content.includes(`(${roadmap})`), `${file} should refer to the canonical roadmap`);
    assert.doesNotMatch(content, /^### (Phase [1-6]|مرحله [۱-۶])\b/m, `${file} duplicates the delivery-phase checklist`);
  }
  assert.match(read('docs/ROADMAP.md'), /A1\.2/);
  assert.match(read('docs/ROADMAP.fa.md'), /A1\.3/);
  assert.match(read('AGENTS.md'), /docs\/README\.md/);
});

test('the obsolete UD integration plan is archived and current guidance is clear', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'docs/ud-integration-plan.md')), false);
  const history = read('docs/archive/ud-integration-plan-2026-07.md');
  assert.match(history, /Archived/);
  assert.match(history, /current/i);
  assert.match(history, /tools\/ud-import\/README\.md/);
  const importer = read('tools/ud-import/README.md');
  assert.match(importer, /implemented and reproducible/i);
  assert.match(importer, /checked in/);
  assert.match(importer, /extract-ud-data\.yml/);
  const sources = read('ud-import-2.18/README.md');
  assert.match(sources, /eight tracked/i);
  assert.match(sources, /license/i);
});
