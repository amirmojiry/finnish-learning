#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const coverage = require('./audit-course-coverage.cjs');
const shared = require('./audit-a11-section1.cjs');
const ORIGINAL_CHECKPOINT_TARGETS = ["a12s3-expr-01", "a12s3-expr-07", "a12s3-expr-09", "a12s3-expr-12", "a12s3-expr-16", "a12s3-expr-17", "a12s3-expr-20", "a12s3-expr-21", "a12s3-expr-24", "a12s3-expr-25", "a12s3-expr-28", "a12s3-expr-31", "a12s3-expr-02", "a12s3-expr-29", "a12s3-expr-04"];
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
  const temporalWeekdays = new Set(['maanantaina', 'tiistaina', 'keskiviikkona', 'torstaina', 'perjantaina', 'lauantaina', 'sunnuntaina']);
  for (const lesson of section.lessons) for (const activity of lesson.activities) {
    if (['type', 'production', 'dictation'].includes(activity.type)
      && temporalWeekdays.has(section.items[activity.item]?.surface_form)
      && activity.answer_policy !== 'morphology') {
      report.errors.push(lesson.id + ': temporal weekday production lacks morphology policy: ' + activity.item);
    }
  }
  report.boundaries = [
    'Exact-form prior knowledge and grammar prerequisites carry forward from all four A1.1 sections and A1.2 Sections 1–2; senses and SRS histories remain separate.',
    'First-person routine sentences are supported chunks, not full verb-class conjugation. Routine writing contains four explicitly taught sentences.',
    'Kotoa/kotiin, yliopistossa/toimistossa, puhelinta/elokuvia and Pidän musiikista/liikunnasta are bounded case/rection applications; spatial source and liking rection are distinguished.',
    'All seven temporal weekdays are assessed and later retrieved; essive paradigms are not claimed. Tavataan perjantaina is introduced in lesson 6 before review-only lesson 9.',
    'En käy siellä koskaan and Anteeksi, en voi assess restricted negative chunks, not free negation or all modal conjugations.',
    'Viime viikolla is a time phrase, not assessed past tense. Invitations, Nähdään/Mennään and cancellation messages remain fixed phrases; no productive passive, conditional or object-case paradigm is inferred.',
    'Both original reading passages assess all four stated facts. Four-sentence week writing is supported practice, not independent CEFR/YKI evidence.',
    'Every introduction has later positive retrieval. Lessons 9–10 introduce no targets; original records, checkpoint targets and 80% threshold are preserved.'
  ];
  report.summary.errors = report.errors.length;
  return report;
}
function main(action = process.argv[2] || '--check') {
  if (!['--check', '--write', '--markdown'].includes(action)) throw Error('Usage: audit-a12-section3.cjs --check|--write|--markdown');
  const root = path.resolve(__dirname, '..'), read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const report = evaluate(read('data/course/a1.2-section-3.json'), read('data/course/a1.2-curriculum.json'), read('data/course/lexical-identity-sidecar.json'), [...[1, 2, 3, 4].map(n => read(`data/course/a1.1-section-${n}.json`)), read('data/course/a1.2-section-1.json'), read('data/course/a1.2-section-2.json')], read('data/course/a1.1-curriculum.json'));
  if (report.errors.length) throw Error('A1.2 Section 3 acceptance failed: ' + report.errors.join('; '));
  const outputs = { 'data/course/a1.2-section-3-acceptance.json': JSON.stringify(report, null, 2) + '\n', 'docs/A12-SECTION3-ACCEPTANCE.md': shared.markdown(report) };
  if (action === '--markdown') process.stdout.write(outputs['docs/A12-SECTION3-ACCEPTANCE.md']);
  else for (const [name, content] of Object.entries(outputs)) {
    if (action === '--write') fs.writeFileSync(path.join(root, name), content);
    else if (fs.readFileSync(path.join(root, name), 'utf8') !== content) throw Error('A1.2 acceptance snapshots stale; run npm run section:a12:s3:write');
  }
}
if (require.main === module) main();
module.exports = { evaluate, main, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression };
