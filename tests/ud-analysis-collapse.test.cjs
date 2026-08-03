const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('corpus analysis uses a native disclosure that is closed by default', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'ud-analysis-collapse.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'css', 'ud-analysis-collapse.css'), 'utf8');

  assert.equal((html.match(/css\/ud-analysis-collapse\.css/g) || []).length, 1);
  assert.equal((html.match(/ud-analysis-collapse\.js/g) || []).length, 1);
  assert.match(script, /document\.createElement\('details'\)/);
  assert.match(script, /details\.className = CONTAINER_CLASS/);
  assert.doesNotMatch(script, /details\.open\s*=|setAttribute\(['"]open/);
  assert.match(script, /while \(section\.firstChild\) content\.appendChild\(section\.firstChild\)/);
  assert.match(styles, /\.ud-analysis-container\[open\] > \.ud-analysis-summary::after/);
});
