#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const coverage = require('./audit-course-coverage.cjs');
const shared = require('./audit-a11-section1.cjs');
const ORIGINAL_CHECKPOINT_TARGETS = ['a12s1-hf-paljon', 'a12s1-topic-euro', 'a12s1-topic-kolmekymmenta', 'a12s1-topic-haluaisin', 'a12s1-topic-kilo', 'a12s1-hf-missa', 'a12s1-topic-kassa', 'a12s1-topic-sopiva', 'a12s1-topic-kortti', 'a12s1-topic-kuitti', 'a12s1-topic-rikki', 'a12s1-topic-toimi', 'a12s1-expr-paljonko-tama-maksaa-6', 'a12s1-expr-voinko-maksaa-kortilla-63', 'a12s1-expr-tarvitsen-apua-77'];
function evaluate(raw, curriculum, sidecar, preceding, priorCurriculum) {
  const report = shared.evaluate(raw, curriculum, sidecar, preceding, { 'A1.1': priorCurriculum });
  const section = course.validateSection(raw), checkpoint = section.lessons[9];
  if (checkpoint.passing_score !== 0.8) report.errors.push('Checkpoint must retain 80% threshold');
  if (JSON.stringify(checkpoint.checkpoint_targets) !== JSON.stringify(ORIGINAL_CHECKPOINT_TARGETS)) report.errors.push('Checkpoint target contract changed');
  const answers = new Set(checkpoint.activities.flatMap(coverage.positives));
  for (const target of ORIGINAL_CHECKPOINT_TARGETS) if (!answers.has(target)) report.errors.push('Checkpoint lost original positive target: ' + target);
  for (const type of ['sentence-order', 'expression-completion', 'controlled-production']) if (!checkpoint.activities.some(a => a.type === type)) report.errors.push('Checkpoint lost structured task: ' + type);
  for (const lesson of section.lessons) for (const goal of lesson.learning_objectives.grammar) {
    for (const evidence of goal.evidence) {
      const a = lesson.activities[evidence.activity_index];
      if (evidence.mode !== 'recognition' && a.type !== 'inflection-production' && a.answer_policy !== 'morphology') report.errors.push(lesson.id + ': grammar production lacks morphology policy');
    }
  }
  report.summary.errors = report.errors.length;
  return report;
}
function main(action = process.argv[2] || '--check') {
  if (!['--check', '--write', '--markdown'].includes(action)) throw Error('Usage: audit-a12-section1.cjs --check|--write|--markdown');
  const root = path.resolve(__dirname, '..'), read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const report = evaluate(read('data/course/a1.2-section-1.json'), read('data/course/a1.2-curriculum.json'), read('data/course/lexical-identity-sidecar.json'), [1, 2, 3, 4].map(n => read(`data/course/a1.1-section-${n}.json`)), read('data/course/a1.1-curriculum.json'));
  if (report.errors.length) throw Error('A1.2 Section 1 acceptance failed: ' + report.errors.join('; '));
  const outputs = { 'data/course/a1.2-section-1-acceptance.json': JSON.stringify(report, null, 2) + '\n', 'docs/A12-SECTION1-ACCEPTANCE.md': shared.markdown(report) };
  if (action === '--markdown') process.stdout.write(outputs['docs/A12-SECTION1-ACCEPTANCE.md']);
  else for (const [name, content] of Object.entries(outputs)) {
    if (action === '--write') fs.writeFileSync(path.join(root, name), content);
    else if (fs.readFileSync(path.join(root, name), 'utf8') !== content) throw Error('A1.2 acceptance snapshots stale; run npm run section:a12:s1:write');
  }
}
if (require.main === module) main();
module.exports = { evaluate, main, ORIGINAL_CHECKPOINT_TARGETS };
