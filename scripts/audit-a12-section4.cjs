#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const coverage = require('./audit-course-coverage.cjs');
const shared = require('./audit-a11-section1.cjs');
const ORIGINAL_CHECKPOINT_TARGETS = ["a12s4-extra-01", "a12s4-extra-02", "a12s4-extra-04", "a12s4-extra-03", "a12s4-extra-05", "a12s4-extra-06", "a12s4-extra-07", "a12s4-expr-01", "a12s4-expr-14", "a12s4-expr-17", "a12s4-expr-20", "a12s4-expr-23", "a12s4-expr-24", "a12s4-expr-28", "a12s4-expr-27"];
const { assessesExpression: matchesExpression } = require('./audit-a12-section1.cjs');
function assessesExpression(activity, target, items) {
  return matchesExpression(activity, target, items) || Boolean(activity.frame_fi && activity.expected_fi
    && matchesExpression({ ...activity, expected_fi: activity.frame_fi.replace(/_{2,}/g, activity.expected_fi) }, target, items));
}

function evaluate(raw, curriculum, sidecar, preceding, priorCurriculum) {
  const report = shared.evaluate(raw, curriculum, sidecar, preceding, { 'A1.1': priorCurriculum });
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
  const productive = new Set(['type', 'production', 'dictation', 'controlled-production', 'expression-completion']);
  const grammaticalForms = new Set(['ota', 'juo', 'lepää', 'sisällä', 'ulkona']);
  for (const lesson of section.lessons) for (const activity of lesson.activities) {
    const item = section.items[activity.item];
    if (productive.has(activity.type) && (item?.item_type === 'expression' || grammaticalForms.has(item?.surface_form))
      && activity.answer_policy !== 'morphology') report.errors.push(lesson.id + ': grammatical phrase/form lacks morphology policy: ' + activity.item);
  }
  report.boundaries = [
    'Exact prior knowledge and prerequisites carry forward from four A1.1 and three A1.2 sections. Explicit exact-answer clock references do not merge lexical identities or SRS histories.',
    'Weather, seasonal and symptom statements use bounded complete examples. Pain expressions remain fixed phrases without general possessive-suffix or impersonal-verb mastery claims.',
    'Takin, lääkettä, vettä and apua are restricted object/quantity examples, not complete object-case or partitive paradigms.',
    'Haluaisin varata ajan and the coffee request are fixed polite chunks, not a productive conditional paradigm. Help offers and medicine requests are taught before review-only lessons.',
    'Ota/Juo/Lepää/Pysy are explicitly authored singular commands. Grammatical phrases and command-form typing require exact morphology rather than fuzzy edit-distance acceptance.',
    'The four clock answers eight to eleven have positive practice and later retrieval. The first three retain exact-answer review references to Section 2 time records.',
    'Both original passages assess four stated facts each; four-sentence symptom/appointment writing is supported practice. Health content teaches communication, not medical advice.',
    'All introduced exact forms/expressions have later retrieval; lessons 9–10 introduce no targets. Original records, cumulative checkpoint targets and 80% threshold remain intact.',
    'Four A1.2 content packages now have scoped acceptance checks; wider P2/P5/R3 and final integration gates remain open. No CEFR/YKI proficiency is certified.'
  ];
  report.summary.errors = report.errors.length;
  return report;
}
function main(action = process.argv[2] || '--check') {
  if (!['--check', '--write', '--markdown'].includes(action)) throw Error('Usage: audit-a12-section4.cjs --check|--write|--markdown');
  const root = path.resolve(__dirname, '..'), read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const report = evaluate(read('data/course/a1.2-section-4.json'), read('data/course/a1.2-curriculum.json'), read('data/course/lexical-identity-sidecar.json'), [...[1, 2, 3, 4].map(n => read(`data/course/a1.1-section-${n}.json`)), read('data/course/a1.2-section-1.json'), read('data/course/a1.2-section-2.json'), read('data/course/a1.2-section-3.json')], read('data/course/a1.1-curriculum.json'));
  if (report.errors.length) throw Error('A1.2 Section 4 acceptance failed: ' + report.errors.join('; '));
  const outputs = { 'data/course/a1.2-section-4-acceptance.json': JSON.stringify(report, null, 2) + '\n', 'docs/A12-SECTION4-ACCEPTANCE.md': shared.markdown(report) };
  if (action === '--markdown') process.stdout.write(outputs['docs/A12-SECTION4-ACCEPTANCE.md']);
  else for (const [name, content] of Object.entries(outputs)) {
    if (action === '--write') fs.writeFileSync(path.join(root, name), content);
    else if (fs.readFileSync(path.join(root, name), 'utf8') !== content) throw Error('A1.2 acceptance snapshots stale; run npm run section:a12:s4:write');
  }
}
if (require.main === module) main();
module.exports = { evaluate, main, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression };
