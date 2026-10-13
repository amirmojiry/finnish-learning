#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

function registryFor(master, level) {
  // Preserve A2.1's existing full registry while backfilling A1.1's own concepts.
  const levels = level === 'A2.1' ? master.levels : master.levels.filter(entry => entry.level === level);
  if (!levels.length) throw new Error('Unknown grammar registry level: ' + level);
  return levels.flatMap(entry => entry.grammar.map(concept => ({
    id: concept.id, prerequisites: concept.prerequisites || [], title_fa: concept.title_fa,
  })));
}

function synchronize(root, action) {
  if (!['--check', '--write'].includes(action)) throw new Error('Usage: sync-grammar-registry.cjs --check|--write');
  const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const master = read('data/course/master-curriculum.json');
  for (const level of ['A1.1', 'A2.1']) {
    const filename = 'data/course/' + level.toLowerCase() + '-curriculum.json';
    const curriculum = read(filename);
    const expected = registryFor(master, level);
    if (action === '--check') {
      if (JSON.stringify(curriculum.grammar_concepts) !== JSON.stringify(expected)) {
        throw new Error(level + ' grammar registry differs from master curriculum; run node scripts/sync-grammar-registry.cjs --write');
      }
    } else {
      curriculum.grammar_concepts = expected;
      fs.writeFileSync(path.join(root, filename), JSON.stringify(curriculum, null, 2) + '\n');
    }
  }
}

if (require.main === module) {
  try {
    synchronize(ROOT, process.argv[2]);
    console.log('A1.1 and A2.1 grammar registries match canonical master curriculum.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { registryFor, synchronize };
