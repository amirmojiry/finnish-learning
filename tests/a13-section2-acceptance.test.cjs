'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression } = require('../scripts/audit-a13-section2.cjs');
const raw = require('../data/course/a1.3-section-2.json'), curriculum = require('../data/course/a1.3-curriculum.json');
const prior = [...['a1.1', 'a1.2'].flatMap(level => [1, 2, 3, 4].map(n => require(`../data/course/${level}-section-${n}.json`))), require('../data/course/a1.3-section-1.json')];
const curricula = { 'A1.1': require('../data/course/a1.1-curriculum.json'), 'A1.2': require('../data/course/a1.2-curriculum.json'), 'A1.3': curriculum };
const sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = r => evaluate(r, curriculum, sidecar, prior, curricula);
test('home section traces complete lexical and grammar retrieval across nine preceding sections', () => {
  const r = verify(raw); assert.deepEqual(r.errors, []);
  assert.equal(r.summary.activities, 305); assert.equal(r.summary.introduced_surface_forms_and_expressions, 59);
  assert.equal(r.summary.surfaces_with_later_positive_review, 59); assert.equal(r.summary.grammar_concepts_with_later_review, 9);
  const path = course.validateImplementedPath([{ level: 'A1.1', curriculum: curricula['A1.1'], sections: prior.slice(0, 4) }, { level: 'A1.2', curriculum: curricula['A1.2'], sections: prior.slice(4, 8) }, { level: 'A1.3', curriculum, sections: [prior[8], raw] }]);
  assert.equal(path.flatMap(s => s.lessons).length, 100);
  for (const l of path.at(-1).lessons) {
    assert.equal(course.lessonObjectiveDisplay(l, raw.items).structured, true); assert.equal(l.activities.length, l.activity_count);
    const p = course.recordLessonCompletion(course.emptyProgress(), l.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(p).lessonScores[l.id], { correct: 8, graded: 10, completedAt: 123 });
    assert.ok(l.learning_objectives.grammar.every(g => g.status === 'reviewed'));
  }
  for (const l of raw.lessons.slice(8)) { assert.deepEqual(l.new_targets, []); assert.ok(l.learning_objectives.lexical.every(g => g.status === 'reviewed')); }
});
test('home gate rejects missing positives, later review, repeated-new labels and vacuous choices', () => {
  const target = 'a13s2-h-003', missing = structuredClone(raw);
  missing.lessons[0].activities = missing.lessons[0].activities.map(a => a.item === target && ['choice', 'type'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: ' + target)));
  const unreviewed = structuredClone(raw);
  for (const l of unreviewed.lessons.slice(1)) l.activities = l.activities.map(a => a.item === target && ['choice', 'type'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(unreviewed).errors.some(e => e.includes('no later positive review: ' + target)));
  const vacuous = structuredClone(raw), a = vacuous.lessons[0].activities.find(a => a.type === 'choice' && a.mode !== 'listen' && !vacuous.lessons[0].production_targets.includes(a.item));
  a.options = [a.item]; assert.ok(verify(vacuous).errors.some(e => e.includes('meaningful alternatives')));
  const repeat = structuredClone(raw); repeat.lessons[1].new_targets.push('a13s2-h-001'); assert.ok(verify(repeat).errors.some(e => e.includes('introduction list differs')));
});
test('late help and opening-hour phrases move to teaching and all expressions precede assessment', () => {
  for (const [index, target] of [[4, 'a13s2-e-076'], [6, 'a13s2-e-075']]) assert.ok(raw.lessons[index].activities.some(a => a.type === 'teach' && a.item === target));
  for (const l of course.validateSection(raw).lessons) for (const t of l.new_targets) {
    if (raw.items[t].item_type !== 'expression') continue;
    const taught = l.activities.findIndex(a => a.type === 'teach' && a.item === t), tested = l.activities.findIndex(a => assessesExpression(a, t, raw.items)); assert.ok(taught >= 0 && taught < tested, t);
  }
  const broken = structuredClone(raw), l = broken.lessons[4], target = 'a13s2-e-concrete-address', old = [...l.activities];
  // This negative fixture intentionally reorders the original authored cards.
  // Remove its curated index selection so the old teaching-order validation
  // remains isolated; the real editorial edition is checked in separate tests.
  delete l.editorial_revision;
  const evidence = l.learning_objectives.grammar.flatMap(g => g.evidence).map(e => [e, old[e.activity_index]]);
  const [card] = l.activities.splice(l.activities.findIndex(a => a.type === 'teach' && a.item === target), 1); l.activities.push(card);
  for (const [entry, a] of evidence) entry.activity_index = l.activities.indexOf(a);
  assert.ok(verify(broken).errors.some(e => e.includes('new expression must be taught before assessment: ' + target)));
});
test('home grammar rejects agreement, local-case, infinitive and negative errors', () => {
  const s = course.validateSection(raw);
  for (const [fi, wrong] of [['Keittiö on tässä.', 'Keittiö ovat tässä.'], ['Kengät ovat lattialla.', 'Kengät on lattialla.'], ['Avain on pöydällä.', 'Avain on pöydälle.'], ['Lasi on kaapissa.', 'Lasi on kaappiin.'], ['Pitää siivota.', 'Pitää siivoan.'], ['Pitää pestä astiat.', 'Pitää pesen astiat.'], ['Hana ei toimi.', 'Hana ei toimii.'], ['Valo ei pala.', 'Valo ei palaa.'], ['Tarvitsen huoltoa.', 'Tarvitsen huolto.'], ['Se on auki viiden jälkeen.', 'Se on auki viisi jälkeen.'], ['Täällä ei saa tupakoida.', 'Täällä ei saa tupakoi.'], ['Täällä saa odottaa.', 'Täällä saa odotan.']]) {
    const a = s.lessons.flatMap(l => l.activities).find(a => a.type === 'controlled-production' && a.expected_fi === fi && a.grammar_concept_ids?.length); assert.ok(a, fi);
    const item = { surface_form: a.expected_fi, accepted_answers: a.accepted_answers };
    assert.equal(course.gradeActivityAnswer(a, item, fi).accepted, true); assert.equal(course.gradeActivityAnswer(a, item, wrong).accepted, false, wrong);
  }
  const weak = structuredClone(raw), l = weak.lessons[1], a = l.activities.find(a => a.type === 'controlled-production');
  delete a.answer_policy; delete l.structured_practice.find(sp => sp.type === a.type && sp.item === a.item).answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('grammar production lacks morphology policy')));
});
test('address template remains recognition while concrete address writing uses a taught example', () => {
  const template = 'a13s2-e-045', s = course.validateSection(raw);
  assert.ok(s.lessons[4].activities.some(a => a.type === 'choice' && a.item === template));
  assert.ok(!s.lessons.flatMap(l => l.activities).some(a => a.item === template && ['type', 'production', 'dictation', 'controlled-production', 'expression-completion'].includes(a.type)));
  const a = s.lessons[4].activities.find(a => a.item === 'a13s2-e-concrete-address' && a.type === 'controlled-production');
  assert.equal(course.gradeActivityAnswer(a, s.items[a.item], 'Osoite on Koulukatu 5.').accepted, true);
  assert.equal(course.gradeActivityAnswer(a, s.items[a.item], 'Osoite on Koulukatu 6.').accepted, false);
  const literal = structuredClone(raw); literal.lessons[4].activities.push({ type: 'type', mode: 'finnish', item: template, answer_policy: 'morphology' }); literal.lessons[4].activity_count++;
  assert.ok(verify(literal).errors.some(e => e.includes('address ellipsis must remain a recognition template')));
});
test('opening-hour and original readings each assess two facts and message writing uses taught sentences', () => {
  for (const [n, passage] of [[6, 'a13s2-reading-opening-hours'], [8, 'a13s2-reading-1'], [8, 'a13s2-reading-2']]) {
    const activities = raw.lessons[n].activities.filter(a => a.type === 'short-reading' && a.item === passage); assert.equal(activities.length, 2); assert.equal(new Set(activities.map(a => a.question_item)).size, 2);
    for (const a of activities) assert.deepEqual(a.options.filter(t => raw.items[passage].surface_form.includes(raw.items[t].surface_form)), [a.question_item]);
  }
  const writing = raw.lessons[8].activities.find(a => a.type === 'guided-writing'); assert.equal(writing.expected_items.length, 4); assert.equal(writing.answer_policy, 'morphology');
  for (const t of writing.expected_items) assert.ok(raw.lessons.slice(0, 8).some(l => l.activities.some(a => a.type === 'teach' && a.item === t)));
});
test('strict productive recall survives injection and formulaic repair status does not claim passive grammar', () => {
  const s = course.validateSection(raw);
  for (const l of s.lessons) for (const a of l.activities) if (['type', 'production', 'dictation', 'controlled-production', 'expression-completion', 'guided-writing'].includes(a.type)) assert.equal(a.answer_policy, 'morphology');
  const a = s.lessons.flatMap(l => l.activities).find(a => a.type === 'type' && raw.items[a.item]?.surface_form === 'pöydällä'); assert.ok(a);
  assert.equal(course.gradeActivityAnswer(a, raw.items[a.item], 'pöydälle').accepted, false);
  for (const l of raw.lessons) for (const a of l.activities) if (a.item === 'a13s2-e-036') assert.equal(a.grammar_concept_ids?.length || 0, 0);
  const weak = structuredClone(raw), l = weak.lessons[0], b = l.activities.find(a => a.type === 'type' && !l.production_targets.includes(a.item) && !l.listening_targets.includes(a.item)); assert.ok(b); delete b.answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('productive recall lacks strict morphology policy')));
});
test('home checkpoint preserves its original fifteen targets and eighty percent requirement', () => {
  assert.deepEqual(raw.lessons[9].checkpoint_targets, ORIGINAL_CHECKPOINT_TARGETS);
  const cp = course.validateSection(raw).lessons[9]; assert.equal(cp.activities.length, 25);
  assert.equal(course.passesLessonRequirement(cp, 20, 25), true); assert.equal(course.passesLessonRequirement(cp, 19, 25), false);
  const weak = structuredClone(raw); weak.lessons[9].passing_score = 0.7; assert.ok(verify(weak).errors.some(e => e.includes('80% threshold')));
  const changed = structuredClone(raw); changed.lessons[9].checkpoint_targets.pop(); assert.ok(verify(changed).errors.some(e => e.includes('Checkpoint target contract changed')));
});
test('home backfill preserves every original item and stable lesson progress contract', () => {
  const hash = value => require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const added = new Set(['a13s2-e-concrete-address', 'a13s2-reading-opening-hours']);
  assert.equal(hash(Object.fromEntries(Object.entries(raw.items).filter(([id]) => !added.has(id)))), '4c7f80b967c02f9f2e28acdd6342f9edc7296c620a1352aacaaac27ac7c4cd2c');
  const core = raw.lessons.map(l => Object.fromEntries(['id', 'curriculum_id', 'production_targets', 'listening_targets', 'checkpoint_targets', 'passing_score', 'curriculum_target_refs'].map(k => [k, l[k] ?? null])));
  assert.equal(hash(core), '832c08611022f97f7c771d6c36676773b45b65aa6afcd4f338b0eb558165b191');
});
