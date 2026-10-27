'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const gate = fs.readFileSync(path.join(root, 'docs/P4-PREREQUISITE-CANDIDATE-GATE.md'), 'utf8');
const roadmap = fs.readFileSync(path.join(root, 'docs/VOCABULARY-ROADMAP.md'), 'utf8');
const hub = fs.readFileSync(path.join(root, 'docs/README.md'), 'utf8');

test('P4 candidate approval gate remains discoverable and has required editorial safeguards', () => {
  assert.match(roadmap, /P4-PREREQUISITE-CANDIDATE-GATE\.md/);
  assert.match(hub, /P4-PREREQUISITE-CANDIDATE-GATE\.md/);
  assert.match(gate, /sole authoritative source/);
  assert.match(gate, /if the prose and JSON disagree/);
  for (const term of ['master-curriculum.json', 'defer:source', 'defer:prerequisite', 'defer:sense', 'Parole', 'npm test', 'original Parole source position']) {
    assert.ok(gate.includes(term), 'Missing P4 editorial safeguard: ' + term);
  }
  assert.match(gate, /no new dictionary entries|not an import/i);
  assert.match(gate, /human editorial sign-off/);
});
