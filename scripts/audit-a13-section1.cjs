#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const coverage = require('./audit-course-coverage.cjs');
const shared = require('./audit-a11-section1.cjs');
const ORIGINAL_CHECKPOINT_TARGETS = ["a13s1-e-017", "a13s1-e-027", "a13s1-e-044", "a13s1-e-007", "a13s1-e-054", "a13s1-e-062", "a13s1-e-036", "a13s1-e-009", "a13s1-e-019", "a13s1-e-028", "a13s1-e-037", "a13s1-e-047", "a13s1-e-055", "a13s1-e-069", "a13s1-e-074"];
const { assessesExpression: matchesExpression } = require('./audit-a12-section1.cjs');
function assessesExpression(activity, target, items) {
  return matchesExpression(activity, target, items) || Boolean(activity.frame_fi && activity.expected_fi
    && matchesExpression({ ...activity, expected_fi: activity.frame_fi.replace(/_{2,}/g, activity.expected_fi) }, target, items));
}

function evaluate(raw, curriculum, sidecar, preceding, precedingCurricula) {
  const report = shared.evaluate(raw, curriculum, sidecar, preceding, precedingCurricula);
  const section = course.validateSection(raw), checkpoint = section.lessons[9];
  if (checkpoint.passing_score !== 0.8) report.errors.push('Checkpoint must retain 80% threshold');
  if (JSON.stringify(checkpoint.checkpoint_targets) !== JSON.stringify(ORIGINAL_CHECKPOINT_TARGETS)) report.errors.push('Checkpoint target contract changed');
  const answers = new Set(checkpoint.activities.flatMap(coverage.positives));
  for (const target of ORIGINAL_CHECKPOINT_TARGETS) if (!answers.has(target)) report.errors.push('Checkpoint lost original positive target: ' + target);
  for (const type of ['sentence-order', 'expression-completion', 'controlled-production']) if (!checkpoint.activities.some(a => a.type === type)) report.errors.push('Checkpoint lost structured task: ' + type);
  for (const lesson of section.lessons) for (const target of lesson.new_targets) {
    if (section.items[target].item_type !== 'expression') continue;
    const taught = lesson.activities.findIndex(a => a.type === 'teach' && a.item === target);
    const tested = lesson.activities.findIndex(a => assessesExpression(a, target, section.items));
    if (taught < 0 || taught >= tested) report.errors.push(lesson.id + ': new expression must be taught before assessment: ' + target);
  }
  for (const lesson of section.lessons) for (const goal of lesson.learning_objectives.grammar) {
    for (const evidence of goal.evidence) {
      const a = lesson.activities[evidence.activity_index];
      if (evidence.mode !== 'recognition' && a.type !== 'inflection-production' && a.answer_policy !== 'morphology') report.errors.push(lesson.id + ': grammar production lacks morphology policy');
    }
  }
  for (const lesson of section.lessons) for (const activity of lesson.activities) {
    if (['type', 'production', 'dictation', 'controlled-production', 'expression-completion', 'guided-writing'].includes(activity.type)
      && activity.answer_policy !== 'morphology') report.errors.push(lesson.id + ': productive recall lacks strict morphology policy');
  }
  report.boundaries = [
    'Exact prior knowledge and prerequisites carry forward from all eight A1.1/A1.2 sections. The A1.3 registry is synchronized from the existing master curriculum; identities and SRS remain separate.',
    'Tulen/Tulet pian introduce only a two-person present contrast, not six-person paradigms, all verb classes or KPT. Four new A1.3 concept applications have later supported review.',
    'Minun täytyy perua tapaaminen and Minun täytyy lähteä are explicit necessity/infinitive frames, not general object-case or modal conjugation mastery.',
    'Minulle/Amirille, tästä/teestä and kahvia are bounded recipient, liking-rection and partitive applications. No runtime suffix construction is used.',
    'Voidaan/Mennään/Sovitaan and Haluaisin remain fixed suggestion/request phrases. Kanssani/suosikkisi do not establish full possessive-suffix paradigms; koska/mutta/siksi appear in complete limited clauses.',
    'Three formerly review-only expressions are taught in lessons 1, 7 and 8. Both original readings assess two facts each; four-sentence message writing is supported, not independent CEFR/YKI evidence.',
    'Productive recall uses exact grammatical grading with Finnish keyboard tolerance. All introductions have later positive retrieval; lessons 9–10 introduce none.',
    'Original item records, core lesson mappings, fifteen checkpoint targets and the 80% threshold are preserved. Wider P2/P5/R3 and final integration gates remain open.'
  ];
  report.summary.errors = report.errors.length;
  return report;
}
function main(action = process.argv[2] || '--check') {
  if (!['--check', '--write', '--markdown'].includes(action)) throw Error('Usage: audit-a13-section1.cjs --check|--write|--markdown');
  const root = path.resolve(__dirname, '..'), read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const report = evaluate(read('data/course/a1.3-section-1.json'), read('data/course/a1.3-curriculum.json'), read('data/course/lexical-identity-sidecar.json'), ['a1.1', 'a1.2'].flatMap(level => [1, 2, 3, 4].map(n => read(`data/course/${level}-section-${n}.json`))), { 'A1.1': read('data/course/a1.1-curriculum.json'), 'A1.2': read('data/course/a1.2-curriculum.json') });
  if (report.errors.length) throw Error('A1.3 Section 1 acceptance failed: ' + report.errors.join('; '));
  const outputs = { 'data/course/a1.3-section-1-acceptance.json': JSON.stringify(report, null, 2) + '\n', 'docs/A13-SECTION1-ACCEPTANCE.md': shared.markdown(report).replaceAll('A12-', 'A13-').replaceAll('section:a12:', 'section:a13:') };
  if (action === '--markdown') process.stdout.write(outputs['docs/A13-SECTION1-ACCEPTANCE.md']);
  else for (const [name, content] of Object.entries(outputs)) {
    if (action === '--write') fs.writeFileSync(path.join(root, name), content);
    else if (fs.readFileSync(path.join(root, name), 'utf8') !== content) throw Error('A1.2 acceptance snapshots stale; run npm run section:a13:s1:write');
  }
}
if (require.main === module) main();
module.exports = { evaluate, main, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression };
