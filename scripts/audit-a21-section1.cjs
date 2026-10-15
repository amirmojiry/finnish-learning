#!/usr/bin/env node
'use strict';
const fs = require('node:fs'), path = require('node:path');
const course = require('../course.js');
const coverage = require('./audit-course-coverage.cjs');
const shared = require('./audit-a11-section1.cjs');
const { assessesExpression } = require('./audit-a13-section4.cjs');
const ORIGINAL_CHECKPOINT_TARGETS = ["a21s1-e-006","a21s1-e-016","a21s1-e-025","a21s1-e-034","a21s1-e-043","a21s1-e-054","a21s1-e-061","a21s1-e-070","a21s1-e-077","a21s1-e-027","a21s1-e-037","a21s1-e-044","a21s1-e-053","a21s1-e-062","a21s1-e-080"];

function evaluate(raw, curriculum, sidecar, preceding, precedingCurricula) {
  const report = shared.evaluate(raw, curriculum, sidecar, preceding, precedingCurricula);
  const section = course.validateSection(raw), checkpoint = section.lessons[9];
  if (checkpoint.passing_score !== 0.8) report.errors.push('Checkpoint must retain 80% threshold');
  if (JSON.stringify(checkpoint.checkpoint_targets) !== JSON.stringify(ORIGINAL_CHECKPOINT_TARGETS)) report.errors.push('Checkpoint target contract changed');
  const answers = new Set(checkpoint.activities.flatMap(coverage.positives));
  for (const id of ORIGINAL_CHECKPOINT_TARGETS) if (!answers.has(id)) report.errors.push('Checkpoint lost positive target: ' + id);
  for (const type of ['sentence-order', 'expression-completion', 'controlled-production']) {
    if (!checkpoint.activities.some(a => a.type === type)) report.errors.push('Checkpoint lost original structured task: ' + type);
  }
  for (const lesson of section.lessons) {
    if (lesson.order >= 9 && lesson.new_targets.length) report.errors.push(lesson.id + ': review-only lesson introduced targets');
    for (const id of lesson.new_targets) {
      if (section.items[id].item_type !== 'expression') continue;
      const taught = lesson.activities.findIndex(a => a.type === 'teach' && a.item === id);
      const graded = lesson.activities.findIndex(a => assessesExpression(a, id, section.items));
      if (taught < 0 || graded < 0 || taught >= graded) {
        report.errors.push(lesson.id + ': expression assessed before teaching: ' + id);
      }
    }
    for (const goal of lesson.learning_objectives.grammar) for (const entry of goal.evidence) {
      const a = Number.isInteger(entry.activity_index) ? lesson.activities[entry.activity_index]
        : lesson.activities.find(a => a.type === entry.activity_type && a.item === entry.item_id);
      if (entry.mode !== 'recognition' && a?.type !== 'inflection-production' && a?.answer_policy !== 'morphology') {
        report.errors.push(lesson.id + ': grammar production lacks exact morphology grading: ' + goal.concept_id);
      }
    }
    for (const a of lesson.activities) if (['type', 'production', 'dictation', 'controlled-production', 'expression-completion', 'guided-writing'].includes(a.type)
      && a.answer_policy !== 'morphology') {
      report.errors.push(lesson.id + ': typed recall lacks strict morphology grading: ' + a.item);
    }
  }
  for (const readingId of ['a21s1-reading-1', 'a21s1-reading-2']) {
    const questions = section.lessons[8].activities.filter(a => a.type === 'short-reading' && a.item === readingId);
    if (questions.length !== 2 || new Set(questions.map(a => a.question_item)).size !== 2) {
      report.errors.push('Missing two unique reading facts: ' + readingId);
    }
    for (const a of questions) if (a.options.filter(id => section.items[readingId].surface_form.includes(section.items[id].surface_form)).length !== 1) {
      report.errors.push('Ambiguous reading fact: ' + a.question_item);
    }
  }
  for (const index of [7, 8]) {
    const writing = section.lessons[index].activities.find(a => a.type === 'guided-writing');
    if (!writing || writing.expected_items.length !== 4 || writing.answer_policy !== 'morphology') {
      report.errors.push('Missing four-sentence supported writing in lesson ' + (index + 1));
    } else for (const id of writing.expected_items) {
      if (!section.lessons.slice(0, index + 1).some(l => l.activities.some(a => a.type === 'teach' && a.item === id))) {
        report.errors.push('Writing phrase not taught earlier: ' + id);
      }
    }
  }
  report.boundaries = [
    'Exact prior knowledge and grammar prerequisites include all twelve earlier A1 sections; surface identity never merges semantic senses or SRS evidence.',
    'Imperfect is practiced with explicit supplied inflection frames and constrained phrase recall, not as free conjugation or CEFR/YKI certification.',
    'Total/partitive objects, quantified singular partitive and plural valokuvia use distinct limited correct-answer decisions and later reviews.',
    'Destination kotiin contrasts with static kotona and source kotoa; verb rections and the -maan construction remain supported, bounded examples.',
    'Two four-sentence guided writing activities assess past-event sequencing; each original short reading has two distinct factual answers.',
    'All first exposures occur in teaching lessons 1-8, with complete expressions taught before assessment and all introductions retrieved positively later.',
    'Every original item, curriculum ID, core production/listening target, original fifteen checkpoint targets and 80 percent threshold are retained.',
    'P2 semantic identities, P5 integration, R3 structural gates, full proficiency evidence and playable A2.1 Section 3 remain outstanding.'
  ];
  report.summary.errors = report.errors.length;
  return report;
}

function main(action = process.argv[2] || '--check') {
  if (!['--check', '--write', '--markdown'].includes(action)) throw Error('Usage: audit-a21-section1.cjs --check|--write|--markdown');
  const root = path.resolve(__dirname, '..');
  const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const prior = ['a1.1', 'a1.2', 'a1.3'].flatMap(level => [1, 2, 3, 4].map(n => read('data/course/' + level + '-section-' + n + '.json')));
  const curricula = Object.fromEntries(['a1.1', 'a1.2', 'a1.3'].map(level => [level.toUpperCase(), read('data/course/' + level + '-curriculum.json')]));
  const report = evaluate(read('data/course/a2.1-section-1.json'), read('data/course/a2.1-curriculum.json'),
    read('data/course/lexical-identity-sidecar.json'), prior, curricula);
  if (report.errors.length) throw Error('A2.1 Section 1 acceptance failed: ' + report.errors.join('; '));
  const outputs = {
    'data/course/a2.1-section-1-acceptance.json': JSON.stringify(report, null, 2) + '\n',
    'docs/A21-SECTION1-ACCEPTANCE.md': shared.markdown(report).replaceAll('A12-', 'A21-').replaceAll('section:a12:', 'section:a21:')
  };
  if (action === '--markdown') process.stdout.write(outputs['docs/A21-SECTION1-ACCEPTANCE.md']);
  else for (const [name, content] of Object.entries(outputs)) {
    if (action === '--write') fs.writeFileSync(path.join(root, name), content);
    else if (!fs.existsSync(path.join(root, name)) || fs.readFileSync(path.join(root, name), 'utf8') !== content) {
      throw Error('A2.1 Section 1 acceptance snapshots stale; run npm run section:a21:s1:write');
    }
  }
}
if (require.main === module) main();
module.exports = { evaluate, main, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression };
