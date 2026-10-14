#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const coverage = require('./audit-course-coverage.cjs');
const shared = require('./audit-a11-section1.cjs');
const ORIGINAL_CHECKPOINT_TARGETS = ["a12s2-expr-missa-asema-on-8", "a12s2-expr-mene-suoraan-17", "a12s2-expr-mihin-menet-28", "a12s2-expr-menen-asemalle-31", "a12s2-expr-mista-tulet-38", "a12s2-expr-tulen-asemalta-39", "a12s2-expr-menen-bussilla-48", "a12s2-expr-yksi-lippu-helsinkiin-kiitos-59", "a12s2-expr-bussi-lahtee-kello-kahdeksan-70", "a12s2-expr-bussi-on-myohassa-73", "a12s2-expr-kuinka-kauan-matka-kestaa-81", "a12s2-expr-noin-kymmenen-minuuttia-82", "a12s2-expr-se-on-lahella-83", "a12s2-expr-kaanny-oikealle-19", "a12s2-expr-meno-paluu-kiitos-61"];
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
  report.boundaries = [
    'Prerequisites and exact-form review carry forward from four A1.1 sections and A1.2 Section 1; lexical senses and SRS histories remain separate.',
    'Location, destination, source and transport use explicit examples such as asemalla/asemalle/asemalta and bussilla, not full local-case paradigms.',
    'Mene and Käänny are bounded singular direction commands, not unrestricted imperative conjugation.',
    'Usein, departure/arrival times, ennen kymmentä and kymmenen jälkeen are limited scheduling applications; välillä remains lexical exposure.',
    'Kaksi lippua and kymmenen minuuttia require exact grammatical forms; ticket requests remain supported phrases.',
    'Timetable reading and three-sentence trip writing are supported tasks, not independent CEFR/YKI proficiency assessments.',
    'All introductions have later retrieval. Review-only lessons introduce no targets; original checkpoint targets and the 80% threshold are retained.'
  ];
  report.summary.errors = report.errors.length;
  return report;
}
function main(action = process.argv[2] || '--check') {
  if (!['--check', '--write', '--markdown'].includes(action)) throw Error('Usage: audit-a12-section2.cjs --check|--write|--markdown');
  const root = path.resolve(__dirname, '..'), read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const report = evaluate(read('data/course/a1.2-section-2.json'), read('data/course/a1.2-curriculum.json'), read('data/course/lexical-identity-sidecar.json'), [...[1, 2, 3, 4].map(n => read(`data/course/a1.1-section-${n}.json`)), read('data/course/a1.2-section-1.json')], read('data/course/a1.1-curriculum.json'));
  if (report.errors.length) throw Error('A1.2 Section 2 acceptance failed: ' + report.errors.join('; '));
  const outputs = { 'data/course/a1.2-section-2-acceptance.json': JSON.stringify(report, null, 2) + '\n', 'docs/A12-SECTION2-ACCEPTANCE.md': shared.markdown(report) };
  if (action === '--markdown') process.stdout.write(outputs['docs/A12-SECTION2-ACCEPTANCE.md']);
  else for (const [name, content] of Object.entries(outputs)) {
    if (action === '--write') fs.writeFileSync(path.join(root, name), content);
    else if (fs.readFileSync(path.join(root, name), 'utf8') !== content) throw Error('A1.2 acceptance snapshots stale; run npm run section:a12:s2:write');
  }
}
if (require.main === module) main();
module.exports = { evaluate, main, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression };
