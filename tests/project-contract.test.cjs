const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function extractStatus(text, versionPattern, countPattern) {
  const version = text.match(versionPattern)?.[1];
  const count = Number(text.match(countPattern)?.[1]);
  return { version, count };
}

function collectPythonCommentLines(source) {
  const comments = [];
  let openTripleQuote = null;

  source.split(/\r?\n/).forEach((line, index) => {
    let candidate = line;

    if (openTripleQuote) {
      const closeIndex = candidate.indexOf(openTripleQuote);
      if (closeIndex === -1) return;
      candidate = candidate.slice(closeIndex + 3);
      openTripleQuote = null;
    }

    while (candidate) {
      const doubleIndex = candidate.indexOf('"""');
      const singleIndex = candidate.indexOf("'''");
      const indexes = [doubleIndex, singleIndex].filter((value) => value >= 0);
      const tripleIndex = indexes.length ? Math.min(...indexes) : -1;
      const commentIndex = candidate.indexOf('#');

      if (commentIndex >= 0 && (tripleIndex === -1 || commentIndex < tripleIndex)) {
        comments.push({ text: candidate.slice(commentIndex), line: index + 1 });
        return;
      }
      if (tripleIndex === -1) return;

      const quote = candidate.slice(tripleIndex, tripleIndex + 3);
      const remainder = candidate.slice(tripleIndex + 3);
      const closingIndex = remainder.indexOf(quote);
      if (closingIndex === -1) {
        openTripleQuote = quote;
        return;
      }
      candidate = remainder.slice(closingIndex + 3);
    }
  });

  return comments;
}

test('dictionary POS integration loads after app state and before UD synchronization', () => {
  const html = read('index.html');
  const appIndex = html.indexOf('app.js?');
  const posIndex = html.indexOf('dictionary-pos.js?');
  const udIndex = html.indexOf('ud-analysis.js?');

  assert.ok(appIndex >= 0, 'app.js must be present.');
  assert.ok(posIndex > appIndex, 'dictionary-pos.js must load after app.js.');
  assert.ok(udIndex > posIndex, 'ud-analysis.js must load after dictionary-pos.js.');
  assert.equal((html.match(/dictionary-pos\.js/g) || []).length, 1);

  const udScript = read('ud-analysis.js');
  assert.match(udScript, /renderPosFilters\(\)/, 'UD synchronization must rebuild POS options.');
});

test('GitHub Pages deployment is blocked behind the complete validation job', () => {
  const workflow = read('.github/workflows/pages.yml');
  assert.match(workflow, /^\s{2}validate:\s*$/m);
  assert.match(workflow, /^\s{4}needs: validate\s*$/m);
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /git diff --exit-code/);
});

test('UD extraction derives vocabulary totals instead of hardcoding 200', () => {
  const workflow = read('.github/workflows/extract-ud-data.yml');
  assert.doesNotMatch(workflow, /word_count'\]\s*==\s*200/);
  assert.match(workflow, /common-words\.json/);
  assert.match(workflow, /len\(vocabulary\['words'\]\)/);
});

test('English and Persian README status blocks contain identical facts', () => {
  const english = extractStatus(
    read('README.md'),
    /Version: `([^`]+)`/,
    /Vocabulary entries: \*\*(\d+)\*\*/,
  );
  const persian = extractStatus(
    read('README.fa.md'),
    /نسخه: `([^`]+)`/,
    /تعداد واژه‌ها: \*\*(\d+)\*\*/,
  );
  const version = read('VERSION').trim();
  const vocabulary = JSON.parse(read('data/common-words.json'));

  assert.deepEqual(english, persian);
  assert.equal(english.version, version);
  assert.equal(english.count, vocabulary.words.length);
});

test('AI instruction adapters point to the canonical repository rules', () => {
  const agents = read('AGENTS.md');
  const copilot = read('.github/copilot-instructions.md');
  const cursor = read('.cursor/rules/finnish-learning.mdc');

  assert.match(agents, /npm test/);
  assert.match(agents, /Never hardcode a vocabulary total/);
  assert.match(agents, /README\.md.*README\.fa\.md/s);
  assert.match(copilot, /AGENTS\.md/);
  assert.match(cursor, /alwaysApply: true/);
  assert.match(cursor, /AGENTS\.md/);
});

test('source-code comments do not contain Persian characters', () => {
  const extensions = new Set(['.js', '.cjs', '.mjs', '.py']);
  const ignoredDirectories = new Set(['.git', 'node_modules']);
  const persianPattern = /[\u0600-\u06ff]/u;
  const violations = [];

  function walk(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      if (ignoredDirectories.has(entry.name)) return;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        return;
      }

      const extension = path.extname(entry.name);
      if (!extensions.has(extension)) return;

      const relative = path.relative(root, fullPath);
      const source = fs.readFileSync(fullPath, 'utf8');

      if (extension === '.py') {
        collectPythonCommentLines(source).forEach((comment) => {
          if (persianPattern.test(comment.text) && !comment.text.startsWith('#!')) {
            violations.push(`${relative}:${comment.line}`);
          }
        });
      } else {
        source.split(/\r?\n/).forEach((line, index) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') && persianPattern.test(trimmed)) {
            violations.push(`${relative}:${index + 1}`);
          }
        });

        for (const match of source.matchAll(/\/\*[\s\S]*?\*\//g)) {
          if (persianPattern.test(match[0])) {
            const line = source.slice(0, match.index).split(/\r?\n/).length;
            violations.push(`${relative}:${line}`);
          }
        }
      }
    });
  }

  walk(root);
  assert.deepEqual(violations, [], `Persian source comments found: ${violations.join(', ')}`);
});
