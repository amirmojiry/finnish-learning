#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const composition = require('./audit-lesson-composition.cjs');
const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'data/course/a1.1-section-1-acceptance.json');
const MD_PATH = path.join(ROOT, 'docs/A11-SECTION1-ACCEPTANCE.md');

function evaluate(raw, curriculum, sidecar, preceding = []) {
  const section = course.validateSectionAgainstCurriculum(course.validateSection(raw), curriculum);
  const previous = preceding.map(data => course.validateSectionAgainstCurriculum(course.validateSection(data), curriculum));
  const composed = composition.evaluate([section], sidecar);
  const known = new Map(sidecar.records.map(row => [row.id, row]));
  const introductions = new Map(), grammarIntroductions = new Map(), rows = [], errors = [];
  for (const prior of previous) for (const lesson of prior.lessons) {
    for (const target of composition.targets(lesson)) {
      const identity = composition.identity(prior, target, known);
      if (!introductions.has(identity.id)) introductions.set(identity.id, { target_id: target, surface_form: prior.items[target].surface_form, lesson_id: lesson.id, index: -1 });
    }
    for (const goal of lesson.learning_objectives?.grammar || []) {
      if (goal.status === 'introduced') grammarIntroductions.set(goal.concept_id, { lesson_id: lesson.id, index: -1 });
    }
  }
  for (const [target, ref] of Object.entries(raw.prior_target_refs || {})) {
    const prior = previous.find(data => data.id === ref.section_id);
    if (!prior?.items[ref.item_id] || !section.items[target]
      || !prior.lessons.some(lesson => composition.targets(lesson).includes(ref.item_id))
      || !course.gradeTypedAnswer(prior.items[ref.item_id], section.items[target].surface_form).exact) {
      throw Error('Invalid prior exact-answer reference: ' + target);
    }
    introductions.set(composition.identity(section, target, known).id, { target_id: target,
      surface_form: section.items[target].surface_form, lesson_id: prior.lessons.find(lesson => composition.targets(lesson).includes(ref.item_id)).id, index: -1 });
  }
  const currentGrammar = new Map();
  const positive = section.lessons.map(lesson => composition.positiveEvidence(section, lesson, known));
  for (const [index, lesson] of section.lessons.entries()) {
    course.validateLessonObjectives(lesson, section, curriculum.grammar_concepts);
    const objectives = lesson.learning_objectives;
    if (!objectives?.communicative?.length || !objectives.lexical?.length) throw Error('Missing section objectives: ' + lesson.id);
    if (!['formulaic', 'assessed'].includes(objectives.grammar_scope)) throw Error('Missing explicit grammar scope: ' + lesson.id);
    const targets = composition.targets(lesson);
    if (JSON.stringify([...objectives.lexical.map(goal => goal.target_id)].sort()) !== JSON.stringify([...targets].sort())) {
      errors.push(lesson.id + ': lexical overview must match all declared targets');
    }
    const newlyIntroduced = [];
    for (const target of targets) {
      const identity = composition.identity(section, target, known);
      const status = introductions.has(identity.id) ? 'reviewed' : 'introduced';
      if (objectives.lexical.find(goal => goal.target_id === target)?.status !== status) errors.push(lesson.id + ': incorrect lexical status: ' + target);
      if (!positive[index].has(identity.id)) errors.push(lesson.id + ': target lacks positive answer: ' + target);
      if (status === 'introduced') newlyIntroduced.push(identity.id);
    }
    const authoredNew = lesson.new_targets.map(target => composition.identity(section, target, known).id);
    if (JSON.stringify([...new Set(authoredNew)].sort()) !== JSON.stringify([...new Set(newlyIntroduced)].sort())) {
      errors.push(lesson.id + ': introduction list differs from first authored target exposure');
    }
    if (lesson.order >= 9 && authoredNew.length) errors.push(lesson.id + ': review lesson introduces new targets');
    for (const target of targets) {
      const identity = composition.identity(section, target, known);
      if (!introductions.has(identity.id)) introductions.set(identity.id, { target_id: target, surface_form: section.items[target].surface_form, lesson_id: lesson.id, index });
    }
    const availablePrerequisites = new Set(grammarIntroductions.keys());
    for (const goal of objectives.grammar) {
      if (!currentGrammar.has(goal.concept_id)) currentGrammar.set(goal.concept_id, { lesson_id: lesson.id, index });
      for (const prerequisite of goal.prerequisite_concept_ids) if (!availablePrerequisites.has(prerequisite)) errors.push(lesson.id + ': prerequisite not introduced earlier: ' + prerequisite);
      if (goal.status === 'reviewed' && !grammarIntroductions.has(goal.concept_id)) errors.push(lesson.id + ': grammar review before introduction');
      if (goal.status === 'introduced') {
        if (grammarIntroductions.has(goal.concept_id)) errors.push(lesson.id + ': repeated grammar introduction');
        grammarIntroductions.set(goal.concept_id, { lesson_id: lesson.id, index });
      }
    }
    rows.push({ lesson_id: lesson.id, order: lesson.order, title_fa: lesson.title_fa,
      activities: lesson.activities.length, declared_targets: targets.length,
      introduced_surfaces: newlyIntroduced.length, positively_assessed_targets: composed.lessons[index].correct_answer_target_count,
      grammar_scope: objectives.grammar_scope, grammar_concepts: objectives.grammar.map(goal => goal.concept_id) });
  }
  const lexicalReview = [...introductions.entries()].filter(([, first]) => first.index >= 0).map(([id, first]) => {
    const later = section.lessons.filter((lesson, index) => index > first.index && positive[index].has(id)).map(lesson => lesson.id);
    if (!later.length) errors.push(first.lesson_id + ': no later positive review: ' + first.target_id);
    return { form_id: id, target_id: first.target_id, surface_form: first.surface_form, introduced_in: first.lesson_id, later_positive_lessons: later };
  });
  const grammarReview = [...currentGrammar.entries()].map(([concept_id, first]) => {
    const later = section.lessons.filter((lesson, index) => index > first.index && lesson.learning_objectives.grammar.some(goal => goal.concept_id === concept_id && goal.status === 'reviewed')).map(lesson => lesson.id);
    if (!later.length) errors.push(first.lesson_id + ': no later grammar review: ' + concept_id);
    return { concept_id, introduced_in: first.lesson_id, later_review_lessons: later };
  });
  if (composed.summary.declared_missing_positive || composed.summary.duplicate_new_labels) errors.push('Composition gaps remain');
  return { schema_version: 1, section_id: section.id,
    scope: 'Authored assessment and review opportunities, not learner mastery, complete paradigms or CEFR/YKI certification.',
    summary: { lessons: rows.length, activities: rows.reduce((sum, row) => sum + row.activities, 0),
      introduced_surface_forms_and_expressions: lexicalReview.length, surfaces_with_later_positive_review: lexicalReview.filter(row => row.later_positive_lessons.length).length,
      grammar_concepts_with_later_review: grammarReview.filter(row => row.later_review_lessons.length).length,
      missing_positive_targets: composed.summary.declared_missing_positive, repeated_new_labels: composed.summary.duplicate_new_labels,
      formulaic_lessons: rows.filter(row => row.grammar_scope === 'formulaic').map(row => row.lesson_id), errors: errors.length },
    boundaries: section.id === 'a1.1-section-2' ? [
      'Prerequisites and exact surface review status carry forward from Section 1; the explicit Hei/Hei! answer-equivalence reference does not merge lexical identities.',
      'City, origin, language and possession examples are limited authored frames, not complete case or possessive paradigms.',
      'Every number from 0 to 20 is positively assessed and retrieved later; the reference grid itself is not an assessment.',
      'Only previously introduced targets appear in profile review and the checkpoint. Original item records, IDs and checkpoint targets remain intact.',
      'Surface-level Suomi/suomi review does not assert that country/language senses are editorially merged; P2 semantic work remains open.'
    ] : ['Greetings and politeness are formulaic lexical outcomes, without invented grammar IDs.',
      'Present and negative frames assess reviewed chunks, not free conjugation or unrestricted negation.',
      'Person/object questions and pronouns assess specified basic contexts; locative endings and full case paradigms are not claimed.',
      'Only previously introduced targets appear in dialogue review and the checkpoint. Stable lesson IDs and historical scores are retained.',
      `${lexicalReview.length} surface targets are not ${lexicalReview.length} verified lexemes or senses; P2 editorial identity work remains separate.`],
    lessons: rows, lexical_review: lexicalReview, grammar_review: grammarReview, errors };
}

function markdown(report) {
  const number = report.section_id.endsWith('-2') ? 2 : 1;
  const command = number === 1 ? 'section:a11' : 'section:a11:s2';
  return [`# A1.1 Section ${number} acceptance`, '', `Generated by \`npm run ${command}:write\`; checked by \`npm run ${command}:check\`.`, '', report.scope, '',
    `[نسخهٔ فارسی](A11-SECTION${number}-ACCEPTANCE.fa.md) · [Documentation hub](README.md) · [Delivery roadmap](ROADMAP.md)`, '',
    `- ${report.summary.lessons} lessons / ${report.summary.activities} activities.`,
    `- ${report.summary.introduced_surface_forms_and_expressions} introduced surfaces/expressions with later positive review; ${report.summary.grammar_concepts_with_later_review} grammar concepts with later review.`,
    `- ${report.summary.missing_positive_targets} missing positive targets; ${report.summary.repeated_new_labels} repeated-new labels; ${report.summary.errors} acceptance errors.`, '',
    '| Lesson | Activities | Declared targets | New surfaces | Grammar scope |', '| --- | ---: | ---: | ---: | --- |',
    ...report.lessons.map(row => `| ${row.order}: ${row.title_fa} | ${row.activities} | ${row.declared_targets} | ${row.introduced_surfaces} | ${row.grammar_concepts.join(', ') || 'Formulaic only'} |`), '',
    '## Grammar review', '', ...report.grammar_review.map(row => `- ${row.concept_id}: ${row.introduced_in} → ${row.later_review_lessons.join(', ')}`), '',
    '## Boundaries', '', ...report.boundaries.map(text => '- ' + text), '',
    `Full per-target review evidence: [machine-readable report](../data/course/a1.1-section-${number}-acceptance.json).`, ''].join('\n');
}

function main(args = process.argv.slice(2)) {
  const number = args.includes('--section=2') ? 2 : 1;
  const jsonPath = number === 1 ? JSON_PATH : JSON_PATH.replace('-1-', '-2-');
  const mdPath = number === 1 ? MD_PATH : MD_PATH.replace('SECTION1', 'SECTION2');
  const action = args[0] || '--check';
  if (!['--check', '--write', '--markdown'].includes(action)) throw Error('Usage: audit-a11-section1.cjs --check|--write|--markdown');
  const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
  const report = evaluate(read(`data/course/a1.1-section-${number}.json`), read('data/course/a1.1-curriculum.json'), read('data/course/lexical-identity-sidecar.json'), number === 2 ? [read('data/course/a1.1-section-1.json')] : []);
  if (report.errors.length) throw Error('Section acceptance failed: ' + report.errors.join('; '));
  const json = JSON.stringify(report, null, 2) + '\n', md = markdown(report);
  if (action === '--write') { fs.writeFileSync(jsonPath, json); fs.writeFileSync(mdPath, md); }
  else if (action === '--markdown') process.stdout.write(md);
  else if (fs.readFileSync(jsonPath, 'utf8') !== json || fs.readFileSync(mdPath, 'utf8') !== md) throw Error('Section acceptance snapshots stale; run npm run section:a11:write');
}
if (require.main === module) main();
module.exports = { evaluate, markdown, main };
