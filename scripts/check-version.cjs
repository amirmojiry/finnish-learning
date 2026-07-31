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

const localAssets = [...indexHtml.matchAll(
  /(?:href|src)="((?!https?:\/\/|\/\/|data:|#)[^"?]+\.(?:css|js))(?:\?v=([^"]+))?"/g,
)].map((match) => ({ path: match[1], cacheVersion: match[2] }));

assert.ok(localAssets.length > 0, 'index.html must reference local CSS or JavaScript assets.');
localAssets.forEach((asset) => {
  assert.equal(
    asset.cacheVersion,
    version,
    `${asset.path} must use the current version as its cache key.`,
  );
});

[
  'app.js',
  'dictionary-pos.js',
  'settings.js',
  'ud-analysis.js',
  'css/styles.css',
  'css/dictionary.css',
  'css/ud-analysis.css',
].forEach((requiredAsset) => {
  assert.ok(
    localAssets.some((asset) => asset.path === requiredAsset),
    `${requiredAsset} must be referenced by index.html.`,
  );
});

assert.ok(
  changelog.includes(`## [${version}]`),
  'CHANGELOG.md must include the current version.',
);

console.log(`Version contract validated for ${version}.`);
