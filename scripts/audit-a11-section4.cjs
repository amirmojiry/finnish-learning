#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const coverage = require('./audit-course-coverage.cjs');
const shared = require('./audit-a11-section1.cjs');

// Original prepared checkpoint answer scope includes its multi-answer tasks.
const ORIGINAL_CHECKPOINT_TARGETS = [
  's4-final-hei', 's4-final-name', 's4-final-origin', 's4-final-language', 's4-final-day',
  's4-final-clock', 's4-final-routine', 's4-final-negative', 's4-keittio', 's4-final-want',
  's4-koira', 's4-final-description', 's4-final-cafe-thanks', 's4-final-cafe-order',
  's4-final-cafe-give', 's4-final-live', 's4-tama-on-minun-kotini', 's4-world-5',
];

function evaluate(raw, curriculum, sidecar, preceding) {
  const report = shared.evaluate(raw, curriculum, sidecar, preceding);
  const section = course.validateSection(raw), checkpoint = section.lessons[9];
  if (checkpoint.passing_score !== 0.8) report.errors.push('Final checkpoint must retain 80% threshold');
  const answers = new Set(checkpoint.activities.flatMap(coverage.positives));
  for (const target of ORIGINAL_CHECKPOINT_TARGETS) if (!answers.has(target)) report.errors.push('Final checkpoint lost original positive target: ' + target);
  for (const type of ['dialogue-order', 'guided-writing', 'short-reading']) {
    if (!checkpoint.activities.some(a => a.type === type)) report.errors.push('Final checkpoint lost cumulative task: ' + type);
  }
  if (section.lessons[4].learning_objectives.grammar_scope !== 'formulaic') report.errors.push('Cafe lesson must remain formulaic');
  for (const current of section.lessons) {
    for (const goal of current.learning_objectives.grammar) for (const evidence of goal.evidence) {
      const a = current.activities[evidence.activity_index];
      if (evidence.mode !== 'recognition' && a.type !== 'inflection-production' && a.answer_policy !== 'morphology') report.errors.push(current.id + ': grammar production lacks morphology policy');
    }
    for (const a of current.activities) {

      if (!['type', 'production', 'dictation', 'controlled-production', 'guided-writing'].includes(a.type)) continue;
      if ((a.expected_items || [a.item]).some(t => /…/u.test(section.items[t]?.surface_form || ''))) report.errors.push(current.id + ': literal reference-frame typing');
    }
  }
  report.summary.errors = report.errors.length;
  return report;
}

function main(args = process.argv.slice(2)) {
  const root = path.resolve(__dirname, '..');
  const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  const report = evaluate(read('data/course/a1.1-section-4.json'), read('data/course/a1.1-curriculum.json'),
    read('data/course/lexical-identity-sidecar.json'), [1, 2, 3].map(n => read(`data/course/a1.1-section-${n}.json`)));
  if (report.errors.length) throw Error('Section 4 acceptance failed: ' + report.errors.join('; '));
  shared.main([...args, '--section=4']);
}
if (require.main === module) main();
module.exports = { evaluate, main, ORIGINAL_CHECKPOINT_TARGETS };
