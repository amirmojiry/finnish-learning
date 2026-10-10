#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const master = JSON.parse(fs.readFileSync(path.join(root, 'data/course/master-curriculum.json'), 'utf8'));
const expected = master.levels.flatMap(level => level.grammar.map(concept => ({
  id: concept.id, prerequisites: concept.prerequisites || [], title_fa: concept.title_fa,
})));
const filepath = path.join(root, 'data/course/a2.1-curriculum.json');
const curriculum = JSON.parse(fs.readFileSync(filepath, 'utf8'));
const matches = JSON.stringify(curriculum.grammar_concepts) === JSON.stringify(expected);
if (process.argv.includes('--check')) {
  if (!matches) { console.error('A2.1 grammar registry differs from master curriculum; run node scripts/sync-grammar-registry.cjs --write'); process.exitCode = 1; }
  else console.log('Grammar registry matches canonical master curriculum.');
} else if (process.argv.includes('--write')) {
  curriculum.grammar_concepts = expected;
  fs.writeFileSync(filepath, JSON.stringify(curriculum, null, 2) + '\n');
  console.log('Synchronized A2.1 grammar registry.');
} else {
  console.error('Usage: node scripts/sync-grammar-registry.cjs --check|--write');
  process.exitCode = 2;
}
