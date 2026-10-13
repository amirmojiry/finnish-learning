'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate, ORIGINAL_CHECKPOINT_TARGETS } = require('../scripts/audit-a11-section4.cjs');
const coverage = require('../scripts/audit-course-coverage.cjs');
const raw = require('../data/course/a1.1-section-4.json');
const prior = [1, 2, 3].map(n => require(`../data/course/a1.1-section-${n}.json`));
const curriculum = require('../data/course/a1.1-curriculum.json');
const sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = section => evaluate(section, curriculum, sidecar, prior);

test('Section 4 completes all forty A1.1 overviews while preserving core targets and historical scores', () => {
  const report = verify(raw);
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.activities, 245);
  assert.equal(report.summary.introduced_surface_forms_and_expressions, 65);
  assert.equal(report.summary.surfaces_with_later_positive_review, 65);
  assert.equal(report.summary.grammar_concepts_with_later_review, 6);
  assert.deepEqual(report.summary.formulaic_lessons, ['section-4-lesson-5']);
  const sections = course.validateImplementedCourse([...prior, raw], curriculum);
  assert.equal(sections.flatMap(s => s.lessons).length, 40);
  for (const section of sections) for (const l of section.lessons) {
    assert.equal(course.lessonObjectiveDisplay(l, section.items).structured, true);
    assert.equal(l.activities.length, l.activity_count);
    for (const type of ['production', 'dictation']) assert.equal(l.activities.filter(a => a.type === type).length, 1);
    assert.equal(l.activities.filter(a => a.type === 'choice' && a.mode === 'listen').length, 1);
    const p = course.recordLessonCompletion(course.emptyProgress(), l.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(p).lessonScores[l.id], { correct: 8, graded: 10, completedAt: 123 });
  }
  for (const l of sections[3].lessons.slice(8)) {
    assert.deepEqual(l.new_targets, []);
    assert.ok(l.learning_objectives.lexical.every(g => g.status === 'reviewed'));
  }
  for (const l of sections[3].lessons) {
    const sentences = l.grammar_fa.split(/(?<=[.!؟])\s+/);
    assert.equal(new Set(sentences).size, sentences.length, l.id);
    assert.doesNotMatch(l.grammar_fa, /runtime|UI|ذخیره/);
  }
});

test('all ten animals have later retrieval and missing positive assessment or review is rejected', () => {
  const report = verify(raw);
  for (const t of ['koira', 'kissa', 'lintu', 'kala', 'hevonen', 'lehma', 'lammas', 'karhu', 'susi', 'hirvi']) {
    assert.ok(report.lexical_review.find(r => r.target_id === 's4-' + t)?.later_positive_lessons.length, t);
  }
  const missing = structuredClone(raw);
  missing.lessons[6].activities = missing.lessons[6].activities.map(a => a.item === 's4-susi' && a.type === 'type' ? { type: 'teach', item: a.item } : a);
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: s4-susi')));
  const unreviewed = structuredClone(raw);
  for (const l of unreviewed.lessons.slice(7)) l.activities = l.activities.map(a => a.item === 's4-susi' && a.type === 'type' ? { type: 'teach', item: a.item } : a);
  assert.ok(verify(unreviewed).errors.some(e => e.includes('no later positive review: s4-susi')));
});

test('cafe is formulaic and verified politeness review does not merge identities', () => {
  const cafe = raw.lessons[4];
  assert.equal(cafe.learning_objectives.grammar_scope, 'formulaic');
  assert.deepEqual(cafe.learning_objectives.grammar, []);
  for (const target of ['s4-kiitos', 's4-ole-hyva']) {
    assert.equal(cafe.learning_objectives.lexical.find(g => g.target_id === target).status, 'reviewed');
  }
  assert.equal(cafe.activities.filter(a => a.type === 'dialogue-order').length, 2);
  const invented = structuredClone(raw);
  invented.lessons[4].learning_objectives.grammar_scope = 'assessed';
  assert.throws(() => verify(invented), /requires grammar objectives/);
  const falseRef = structuredClone(raw);
  falseRef.prior_target_refs['s4-kiitos'].item_id = 'kirja';
  assert.throws(() => verify(falseRef), /Invalid prior exact-answer reference/);
});

test('final checkpoint keeps its original answer scope, cumulative tasks and actual 80% threshold', () => {
  const section = course.validateSection(raw), cp = section.lessons[9];
  assert.equal(cp.passing_score, 0.8);
  assert.equal(course.passesLessonRequirement(cp, 20, 25), true);
  assert.equal(course.passesLessonRequirement(cp, 19, 25), false);
  const answers = new Set(cp.activities.flatMap(coverage.positives));
  for (const t of ORIGINAL_CHECKPOINT_TARGETS) assert.ok(answers.has(t), t);
  assert.ok(cp.activities.some(a => a.type === 'dialogue-order' && a.turns.includes('s4-final-cafe-order')));
  assert.equal(cp.activities.find(a => a.type === 'guided-writing').expected_items.length, 4);
  const lost = structuredClone(raw);
  lost.lessons[9].activities.find(a => a.type === 'guided-writing').expected_items = ['s4-final-name', 's4-final-routine', 's4-tama-on-minun-kotini'];
  assert.ok(verify(lost).errors.some(e => e.includes('lost original positive target: s4-final-live')));
  const threshold = structuredClone(raw);
  threshold.lessons[9].passing_score = 0.7;
  assert.ok(verify(threshold).errors.some(e => e.includes('retain 80% threshold')));
});

test('grammatical decisions reject incorrect Finnish forms and reference frames are never typed literally', () => {
  const section = course.validateSection(raw);
  for (const [index, target, wrong] of [[0, 's4-olen-kotona', 'koti'], [1, 's4-se-on-poydalla', 'pöytä'], [2, 's4-kahvia', 'kahvi'], [3, 's4-vetta', 'vesi'], [8, 's4-final-negative', 'nukun']]) {
    const a = section.lessons[index].activities.find(a => a.type === 'expression-completion' && a.item === target);
    const expected = { surface_form: a.accepted_answers[0], accepted_answers: a.accepted_answers };
    assert.equal(course.gradeActivityAnswer(a, expected, wrong).accepted, false, wrong);
    assert.equal(course.gradeActivityAnswer(a, expected, course.foldFinnishDiacritics(a.accepted_answers[0])).accepted, true);
  }
  for (const l of section.lessons) for (const a of l.activities) if (['type', 'production', 'dictation'].includes(a.type)) assert.doesNotMatch(section.items[a.item].surface_form, /…/u);
  assert.equal(section.lessons[8].activities.filter(a => a.type === 'short-reading').length, 5);
  const missingPolicy = structuredClone(raw);
  for (const key of ['activities', 'structured_practice']) {
    const a = missingPolicy.lessons[3][key].find(a => a.type === 'expression-completion' && a.item === 's4-vetta');
    delete a.answer_policy;
  }
  assert.ok(verify(missingPolicy).errors.some(e => e.includes('grammar production lacks morphology policy')));
});
