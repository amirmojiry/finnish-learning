const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const version = read('VERSION').trim();
const packageJson = JSON.parse(read('package.json'));
const indexHtml = read('index.html');
const changelog = read('CHANGELOG.md');

assert.match(version, /^\d+\.\d+\.\d+$/, 'VERSION must use semantic versioning.');
assert.equal(packageJson.version, version, 'VERSION and package.json must match.');
assert.match(
  indexHtml,
  new RegExp(`<meta name="app-version" content="${version.replaceAll('.', '\\.')}"`),
  'index.html must expose the current application version.',
);

[
  'app.js',
  'dictionary-pos.js',
  'dictionary.js',
  'settings.js',
  'ud-analysis.js',
  'css/styles.css',
  'css/dictionary.css',
  'css/ud-analysis.css',
].forEach((asset) => {
  assert.ok(
    indexHtml.includes(`${asset}?v=${version}`),
    `${asset} must use the current version as its cache key.`,
  );
});

assert.ok(
  changelog.includes(`## [${version}]`),
  'CHANGELOG.md must include the current version.',
);

console.log(`Version contract validated for ${version}.`);
