#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const coverage = require('./audit-course-coverage.cjs');
const shared = require('./audit-a11-section1.cjs');
const ORIGINAL_CHECKPOINT_TARGETS = ["a13s3-e-036", "a13s3-e-026", "a13s3-e-054", "a13s3-e-007", "a13s3-e-045", "a13s3-e-063", "a13s3-e-018", "a13s3-e-009", "a13s3-e-019", "a13s3-e-028", "a13s3-e-034", "a13s3-e-044", "a13s3-e-056", "a13s3-e-075", "a13s3-e-073"];
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
  for (const lesson of section.lessons) for (const goal of lesson.learning_objectives.grammar) {
    if (goal.concept_id === 'a13-past-recognition' && goal.evidence.some(e => e.mode !== 'recognition')) report.errors.push(lesson.id + ': past recognition must not claim productive grammar evidence');
    for (const evidence of goal.evidence) if (lesson.activities[evidence.activity_index].item === 'a13s3-e-018') report.errors.push(lesson.id + ': formulaic passive question must not establish a grammar paradigm');
  }
  report.boundaries = [
    'Exact prior knowledge and grammar prerequisites carry forward from all ten preceding A1.1/A1.2/A1.3 sections; lexical senses and SRS histories remain separate.',
    'Verb-class evidence is bounded to tehdä/Teen and lähettää/Lähetän; KPT evidence covers only the explicit tt/t pair. No general suffix generator or full paradigm is claimed.',
    'Pitää and voin take explicit infinitives; apua/suomea, ryhmässä and minulle/sinulle use reviewed complete sentences, not unrestricted object/case rules.',
    'Miten tämä tehdään stays formulaic. Meidän opettajamme and hänen kanssaan do not establish full possessive-suffix paradigms; että is lexical recognition here.',
    'Olin is assessed as past recognition against olen in a stated previous-week context; whole-phrase lexical retrieval does not claim free imperfect production.',
    'Three explicit singular commands have supported sentence production and an ordered instruction task. Temporal deadlines keep perjantaina/tällä viikolla/ensi viikolla distinct.',
    'Both original readings assess two facts; four-sentence study/work message writing uses previously taught complete phrases and remains supported practice.',
    'All 56 introductions and twelve bounded grammar concepts have later review. Strict productive recall, original records/core mappings, fifteen checkpoint targets and the 80% threshold are preserved; wider P2/P5/R3 and final gates remain open.'
  ];
  report.summary.errors = report.errors.length;
  return report;
}
function main(action = process.argv[2] || '--check') {
  if (!['--check', '--write', '--markdown'].includes(action)) throw Error('Usage: audit-a13-section3.cjs --check|--write|--markdown');
  const root = path.resolve(__dirname, '..'), read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const report = evaluate(read('data/course/a1.3-section-3.json'), read('data/course/a1.3-curriculum.json'), read('data/course/lexical-identity-sidecar.json'), [...['a1.1', 'a1.2'].flatMap(level => [1, 2, 3, 4].map(n => read(`data/course/${level}-section-${n}.json`))), ...[1, 2].map(n => read(`data/course/a1.3-section-${n}.json`))], { 'A1.1': read('data/course/a1.1-curriculum.json'), 'A1.2': read('data/course/a1.2-curriculum.json'), 'A1.3': read('data/course/a1.3-curriculum.json') });
  if (report.errors.length) throw Error('A1.3 Section 3 acceptance failed: ' + report.errors.join('; '));
  const outputs = { 'data/course/a1.3-section-3-acceptance.json': JSON.stringify(report, null, 2) + '\n', 'docs/A13-SECTION3-ACCEPTANCE.md': shared.markdown(report).replaceAll('A12-', 'A13-').replaceAll('section:a12:', 'section:a13:') };
  if (action === '--markdown') process.stdout.write(outputs['docs/A13-SECTION3-ACCEPTANCE.md']);
  else for (const [name, content] of Object.entries(outputs)) {
    if (action === '--write') fs.writeFileSync(path.join(root, name), content);
    else if (fs.readFileSync(path.join(root, name), 'utf8') !== content) throw Error('A1.3 Section 3 acceptance snapshots stale; run npm run section:a13:s3:write');
  }
}
if (require.main === module) main();
module.exports = { evaluate, main, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression };
