#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const shared = require('./audit-a11-section1.cjs');

function evaluate(raw, curriculum, sidecar, preceding) {
  const report = shared.evaluate(raw, curriculum, sidecar, preceding);
  const section = course.validateSection(raw), lesson = section.lessons[6];
  const contract = curriculum.sections[2].lessons[6].connegative_pairs;
  if (JSON.stringify(lesson.connegative_pairs) !== JSON.stringify(contract)) throw Error('Section 3 negative mappings differ from curriculum');
  for (const pair of contract) {
    for (const index of [6, 9]) {
      const current = section.lessons[index];
      const transform = current.activities.find(a => a.type === 'negative-transform'
        && section.items[a.affirmative_item]?.surface_form === pair.affirmative
        && section.items[a.negative_item]?.surface_form === pair.negative);
      if (!transform) report.errors.push(current.id + ': missing mapped negative transform: ' + pair.affirmative);
      else {
        const expected = section.items[transform.negative_item];
        if (course.gradeActivityAnswer(transform, expected, 'En ' + pair.affirmative).accepted) {
          report.errors.push(current.id + ': accepts affirmative form after en: ' + pair.affirmative);
        }
      }
    }
  }
  for (const current of section.lessons) for (const goal of current.learning_objectives.grammar) {
    for (const evidence of goal.evidence) {
      const a = current.activities[evidence.activity_index];
      if (evidence.mode !== 'recognition' && !['inflection-production', 'negative-transform'].includes(a.type)
        && a.answer_policy !== 'morphology') report.errors.push(current.id + ': grammar production lacks morphology policy');
    }
  }
  for (const current of section.lessons) for (const a of current.activities) {
    const typed = ['type', 'production', 'dictation', 'controlled-production', 'guided-writing'].includes(a.type);
    const targets = a.expected_items || [a.item];
    if (typed && targets.some(t => /[→…]/u.test(section.items[t]?.surface_form || ''))) report.errors.push(current.id + ': literal reference-frame typing');
    if (typed && targets.some(t => /^s3-(negative|connegative)-/.test(t || '')) && a.answer_policy !== 'morphology') report.errors.push(current.id + ': negative answer lacks morphology policy');
  }
  report.summary.errors = report.errors.length;
  return report;
}

function main(args = process.argv.slice(2)) {
  const root = path.resolve(__dirname, '..');
  const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  const report = evaluate(read('data/course/a1.1-section-3.json'), read('data/course/a1.1-curriculum.json'),
    read('data/course/lexical-identity-sidecar.json'), [1, 2].map(n => read(`data/course/a1.1-section-${n}.json`)));
  if (report.errors.length) throw Error('Section 3 acceptance failed: ' + report.errors.join('; '));
  shared.main([...args, '--section=3']);
}
if (require.main === module) main();
module.exports = { evaluate, main };
