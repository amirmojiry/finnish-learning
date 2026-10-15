#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const coverage = require('./audit-course-coverage.cjs');
const shared = require('./audit-a11-section1.cjs');
const { assessesExpression } = require('./audit-a13-section4.cjs');

const ORIGINAL_CHECKPOINT_TARGETS = ["a21s2-e-006","a21s2-e-017","a21s2-e-028","a21s2-e-034","a21s2-e-045","a21s2-e-055","a21s2-e-061","a21s2-e-070","a21s2-e-080","a21s2-e-009","a21s2-e-018","a21s2-e-025","a21s2-e-052","a21s2-e-073","a21s2-e-081"];

function evaluate(raw, curriculum, sidecar, preceding, precedingCurricula) {
  const report = shared.evaluate(raw, curriculum, sidecar, preceding, precedingCurricula);
  const section = course.validateSection(raw);
  const checkpoint = section.lessons[9];
  if (section.lessons.length !== 10) report.errors.push('Section must retain ten lessons');
  if (Object.keys(section.items).length !== 85) report.errors.push('Original 85 authored items must remain present');
  if (checkpoint.passing_score !== 0.8) report.errors.push('Checkpoint must retain 80% threshold');
  if (checkpoint.activities.length !== 15) report.errors.push('Checkpoint must retain 15 scored activities');
  if (JSON.stringify(checkpoint.checkpoint_targets) !== JSON.stringify(ORIGINAL_CHECKPOINT_TARGETS)) {
    report.errors.push('Checkpoint target contract changed');
  }
  const checkpointAnswers = new Set(checkpoint.activities.flatMap(coverage.positives));
  for (const itemId of ORIGINAL_CHECKPOINT_TARGETS) {
    if (!checkpointAnswers.has(itemId)) report.errors.push('Checkpoint lost positive target: ' + itemId);
  }
  for (const type of ['sentence-order', 'expression-completion', 'controlled-production']) {
    if (!checkpoint.activities.some(activity => activity.type === type)) {
      report.errors.push('Checkpoint lost structured activity: ' + type);
    }
  }

  for (const lesson of section.lessons) {
    if (lesson.order >= 9 && lesson.new_targets.length) {
      report.errors.push(lesson.id + ': review lesson introduces new targets');
    }
    const originalCore = {
      production: lesson.activities.filter(a => a.type === 'production'),
      dictation: lesson.activities.filter(a => a.type === 'dictation'),
      listening: lesson.activities.filter(a => a.type === 'choice' && a.mode === 'listen')
    };
    if (originalCore.production.length !== 1 || originalCore.dictation.length !== 1 || originalCore.listening.length !== 1) {
      report.errors.push(lesson.id + ': core productive or auditory assessment lost');
    }
    if (lesson.activities.filter(a => ['sentence-order', 'controlled-production', 'expression-completion'].includes(a.type)).length
      !== lesson.structured_practice.length) {
      report.errors.push(lesson.id + ': structured practice contract changed');
    }
    for (const itemId of lesson.new_targets) {
      if (section.items[itemId].item_type !== 'expression') continue;
      const teachIndex = lesson.activities.findIndex(a => a.type === 'teach' && a.item === itemId);
      const gradeIndex = lesson.activities.findIndex(a => assessesExpression(a, itemId, section.items));
      if (teachIndex < 0 || gradeIndex < 0 || teachIndex >= gradeIndex) {
        report.errors.push(lesson.id + ': complete expression assessed before teaching: ' + itemId);
      }
    }
    for (const goal of lesson.learning_objectives.grammar) {
      for (const entry of goal.evidence) {
        const activity = Number.isInteger(entry.activity_index) ? lesson.activities[entry.activity_index]
          : lesson.activities.find(a => a.type === entry.activity_type && a.item === entry.item_id);
        if (entry.mode !== 'recognition' && activity?.type !== 'inflection-production'
          && activity?.answer_policy !== 'morphology') {
          report.errors.push(lesson.id + ': grammar production requires strict morphology grading: ' + goal.concept_id);
        }
      }
    }
    for (const activity of lesson.activities) {
      if (['type', 'production', 'dictation', 'expression-completion', 'controlled-production',
        'negative-transform', 'guided-writing'].includes(activity.type) && activity.answer_policy !== 'morphology') {
        report.errors.push(lesson.id + ': typed answer lacks strict morphology grading: ' + activity.item);
      }
    }
  }
  for (const readingId of ['a21s2-reading-1', 'a21s2-reading-2']) {
    const passage = section.items[readingId].surface_form;
    const questions = section.lessons[8].activities.filter(a => a.type === 'short-reading' && a.item === readingId);
    if (questions.length !== 2 || new Set(questions.map(a => a.question_item)).size !== 2) {
      report.errors.push('Two distinct service reading questions required: ' + readingId);
    }
    for (const question of questions) {
      if (question.options.filter(id => passage.includes(section.items[id].surface_form)).length !== 1) {
        report.errors.push('Ambiguous answer for service reading: ' + question.question_item);
      }
    }
  }
  for (const index of [7, 8]) {
    const writing = section.lessons[index].activities.filter(a => a.type === 'guided-writing');
    if (writing.length !== 1 || writing[0].expected_items.length !== 4 || writing[0].answer_policy !== 'morphology') {
      report.errors.push('Missing four-sentence supported service writing in lesson ' + (index + 1));
      continue;
    }
    for (const itemId of writing[0].expected_items) {
      if (!section.lessons.slice(0, index + 1).some(lesson => lesson.activities.some(a => a.type === 'teach' && a.item === itemId))) {
        report.errors.push('Writing expression was not taught before use: ' + itemId);
      }
    }
  }
  const grammarIds = new Set(report.grammar_review.map(g => g.concept_id));
  for (const conceptId of ['a12-requests', 'a13-necessity', 'a12-negation-expand', 'a21-imperfect',
    'a12-quantities', 'a13-present-paradigm', 'a21-rections', 'a11-questions']) {
    if (!grammarIds.has(conceptId)) report.errors.push('Missing bounded grammar review: ' + conceptId);
  }
  report.boundaries = [
    'All twelve A1 sections and the completed A2.1 travel section establish prior exact-form knowledge and grammar prerequisites; no sense/SRS mastery is merged.',
    'Requests, appointment changes, necessity, connegative first-person present, symptom-onset imperfect, quantified partitive, question words, present forms and pharmacy elative are bounded, explicitly assessed examples.',
    'Inflection recognition and supported production do not certify productive conditional, passive or free paradigms; service phrases are reviewed without claiming CEFR/YKI competence.',
    'Medical examples teach requests and reporting only: no individualized diagnosis, dose, medicine regimen or treatment advice.',
    'Review-only lesson 9 and original fifteen-target checkpoint 10 introduce no new target identities; checkpoint score remains 80%.',
    'Each original short service reading assesses two independent factual answers; lessons 8 and 9 require supported four-sentence writing using already taught complete expressions.',
    'Every new exact word form and phrase has a later positive graded retrieval opportunity, distinct from vocabulary distractors or real learner spaced-repetition mastery.',
    'All existing 85 item records, core lesson/curriculum/progress IDs and the original checkpoint remain; P2/P5/R3, independent skills assessment and A2.1 Section 3 are outstanding.'
  ];
  report.summary.errors = report.errors.length;
  return report;
}

function main(action = process.argv[2] || '--check') {
  if (!['--check', '--write', '--markdown'].includes(action)) {
    throw Error('Usage: audit-a21-section2.cjs --check|--write|--markdown');
  }
  const root = path.resolve(__dirname, '..');
  const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const preceding = ['a1.1', 'a1.2', 'a1.3'].flatMap(level =>
    [1, 2, 3, 4].map(n => read('data/course/' + level + '-section-' + n + '.json')));
  preceding.push(read('data/course/a2.1-section-1.json'));
  const curricula = Object.fromEntries(['a1.1', 'a1.2', 'a1.3', 'a2.1'].map(level =>
    [level.toUpperCase(), read('data/course/' + level + '-curriculum.json')]));
  const report = evaluate(read('data/course/a2.1-section-2.json'), read('data/course/a2.1-curriculum.json'),
    read('data/course/lexical-identity-sidecar.json'), preceding, curricula);
  if (report.errors.length) throw Error('A2.1 Section 2 acceptance failed: ' + report.errors.join('; '));
  const outputs = {
    'data/course/a2.1-section-2-acceptance.json': JSON.stringify(report, null, 2) + '\n',
    'docs/A21-SECTION2-ACCEPTANCE.md': shared.markdown(report)
  };
  if (action === '--markdown') process.stdout.write(outputs['docs/A21-SECTION2-ACCEPTANCE.md']);
  else for (const [name, data] of Object.entries(outputs)) {
    if (action === '--write') fs.writeFileSync(path.join(root, name), data);
    else if (!fs.existsSync(path.join(root, name)) || fs.readFileSync(path.join(root, name), 'utf8') !== data) {
      throw Error('A2.1 Section 2 snapshots stale; run npm run section:a21:s2:write');
    }
  }
}
if (require.main === module) main();
module.exports = { evaluate, main, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression };
