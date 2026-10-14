#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const coverage = require('./audit-course-coverage.cjs');
const shared = require('./audit-a11-section1.cjs');
const ORIGINAL_CHECKPOINT_TARGETS = ["a13s2-e-043", "a13s2-e-014", "a13s2-e-033", "a13s2-e-024", "a13s2-e-055", "a13s2-e-063", "a13s2-e-007", "a13s2-e-008", "a13s2-e-015", "a13s2-e-025", "a13s2-e-035", "a13s2-e-044", "a13s2-e-054", "a13s2-e-071", "a13s2-e-076"];
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
  for (const lesson of section.lessons) for (const activity of lesson.activities) {
    if (activity.item === 'a13s2-e-045' && ['type', 'production', 'dictation', 'controlled-production', 'expression-completion'].includes(activity.type)) {
      report.errors.push(lesson.id + ': address ellipsis must remain a recognition template');
    }
  }
  report.boundaries = [
    'Exact prior knowledge and prerequisites carry forward from eight A1.1/A1.2 sections and A1.3 Section 1; lexical senses and SRS histories remain separate.',
    'Home location, Avain on/Kengät ovat, pitää + infinitive and negative fault reports are limited explicit examples, not unrestricted paradigms or suffix generation.',
    'Tarvitsen huoltoa is a bounded partitive application. Voitteko requests remain complete polite chunks without general object-case/conjugation claims.',
    'The unrepaired-problem sentence is formulaic, not an assessed passive/perfect paradigm. Saa/ei saa notice language is limited to two explicit infinitive frames, not real-world legal advice.',
    'The address ellipsis is recognized, never typed literally. Concrete address writing uses an explicitly taught fictional Koulukatu 5 example.',
    'Opening-hours reading assesses two stated times; each original passage assesses two facts. Four-sentence maintenance writing is supported practice, not independent CEFR/YKI proficiency.',
    'Two formerly review-only phrases are taught in lessons 5 and 7. All 59 introductions have later positive retrieval; review-only lessons introduce none.',
    'Productive recall requires strict morphology grading with Finnish keyboard tolerance. Original records/core mappings, fifteen checkpoint targets and 80% threshold are retained; wider P2/P5/R3 and final gates remain open.'
  ];
  report.summary.errors = report.errors.length;
  return report;
}
function main(action = process.argv[2] || '--check') {
  if (!['--check', '--write', '--markdown'].includes(action)) throw Error('Usage: audit-a13-section2.cjs --check|--write|--markdown');
  const root = path.resolve(__dirname, '..'), read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const report = evaluate(read('data/course/a1.3-section-2.json'), read('data/course/a1.3-curriculum.json'), read('data/course/lexical-identity-sidecar.json'), [...['a1.1', 'a1.2'].flatMap(level => [1, 2, 3, 4].map(n => read(`data/course/${level}-section-${n}.json`))), read('data/course/a1.3-section-1.json')], { 'A1.1': read('data/course/a1.1-curriculum.json'), 'A1.2': read('data/course/a1.2-curriculum.json'), 'A1.3': read('data/course/a1.3-curriculum.json') });
  if (report.errors.length) throw Error('A1.3 Section 2 acceptance failed: ' + report.errors.join('; '));
  const outputs = { 'data/course/a1.3-section-2-acceptance.json': JSON.stringify(report, null, 2) + '\n', 'docs/A13-SECTION2-ACCEPTANCE.md': shared.markdown(report).replaceAll('A12-', 'A13-').replaceAll('section:a12:', 'section:a13:') };
  if (action === '--markdown') process.stdout.write(outputs['docs/A13-SECTION2-ACCEPTANCE.md']);
  else for (const [name, content] of Object.entries(outputs)) {
    if (action === '--write') fs.writeFileSync(path.join(root, name), content);
    else if (fs.readFileSync(path.join(root, name), 'utf8') !== content) throw Error('A1.2 acceptance snapshots stale; run npm run section:a13:s2:write');
  }
}
if (require.main === module) main();
module.exports = { evaluate, main, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression };
