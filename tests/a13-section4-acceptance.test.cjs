'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression } = require('../scripts/audit-a13-section4.cjs');
const raw = require('../data/course/a1.3-section-4.json'), curriculum = require('../data/course/a1.3-curriculum.json');
const prior = [...['a1.1', 'a1.2'].flatMap(level => [1, 2, 3, 4].map(n => require(`../data/course/${level}-section-${n}.json`))), ...[1, 2, 3].map(n => require(`../data/course/a1.3-section-${n}.json`))];
const curricula = { 'A1.1': require('../data/course/a1.1-curriculum.json'), 'A1.2': require('../data/course/a1.2-curriculum.json'), 'A1.3': curriculum };
const sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = r => evaluate(r, curriculum, sidecar, prior, curricula);
test('final A1 section traces complete retrieval with all 120 canonical learner overviews', () => {
  const r = verify(raw); assert.deepEqual(r.errors, []);
  assert.equal(r.summary.activities, 307); assert.equal(r.summary.introduced_surface_forms_and_expressions, 54);
  assert.equal(r.summary.surfaces_with_later_positive_review, 54); assert.equal(r.summary.grammar_concepts_with_later_review, 8);
  const path = course.validateImplementedPath([{ level: 'A1.1', curriculum: curricula['A1.1'], sections: prior.slice(0, 4) }, { level: 'A1.2', curriculum: curricula['A1.2'], sections: prior.slice(4, 8) }, { level: 'A1.3', curriculum, sections: [...prior.slice(8), raw] }]);
  const lessons = path.flatMap(s => s.lessons); assert.equal(lessons.length, 120); assert.equal(lessons.reduce((n, l) => n + l.activities.length, 0), 3512);
  for (const s of path) for (const l of s.lessons) assert.equal(course.lessonObjectiveDisplay(l, s.items).structured, true);
  for (const l of path.at(-1).lessons) {
    assert.equal(l.activities.length, l.activity_count);
    const p = course.recordLessonCompletion(course.emptyProgress(), l.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(p).lessonScores[l.id], { correct: 8, graded: 10, completedAt: 123 });
    assert.ok(l.learning_objectives.grammar.every(g => g.status === 'reviewed'));
  }
  for (const l of raw.lessons.slice(8)) { assert.deepEqual(l.new_targets, []); assert.ok(l.learning_objectives.lexical.every(g => g.status === 'reviewed')); }
});
test('final section rejects missing positives, later retrieval, repeated introductions and vacuous choices', () => {
  const target = 'a13s4-t-056', missing = structuredClone(raw);
  missing.lessons[5].activities = missing.lessons[5].activities.map(a => a.item === target && ['choice', 'type'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: ' + target)));
  const unreviewed = structuredClone(raw);
  for (const l of unreviewed.lessons.slice(6)) l.activities = l.activities.map(a => a.item === target && ['choice', 'type'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(unreviewed).errors.some(e => e.includes('no later positive review: ' + target)));
  const vacuous = structuredClone(raw), a = vacuous.lessons[0].activities.find(a => a.type === 'choice' && a.mode !== 'listen' && !vacuous.lessons[0].production_targets.includes(a.item));
  a.options = [a.item]; assert.ok(verify(vacuous).errors.some(e => e.includes('meaningful alternatives')));
  const repeat = structuredClone(raw); repeat.lessons[6].new_targets.push(target); assert.ok(verify(repeat).errors.some(e => e.includes('introduction list differs')));
});
test('new full expressions precede assessment including filled past-recognition frames', () => {
  for (const l of course.validateSection(raw).lessons) for (const t of l.new_targets) {
    if (raw.items[t].item_type !== 'expression') continue;
    const taught = l.activities.findIndex(a => a.type === 'teach' && a.item === t), tested = l.activities.findIndex(a => assessesExpression(a, t, raw.items)); assert.ok(taught >= 0 && taught < tested, t);
  }
  const broken = structuredClone(raw), l = broken.lessons[0], target = 'a13s4-e-010', old = [...l.activities];
  const evidence = l.learning_objectives.grammar.flatMap(g => g.evidence).map(e => [e, old[e.activity_index]]);
  const [card] = l.activities.splice(l.activities.findIndex(a => a.type === 'teach' && a.item === target), 1); l.activities.push(card);
  for (const [entry, a] of evidence) entry.activity_index = l.activities.indexOf(a);
  assert.ok(verify(broken).errors.some(e => e.includes('new expression must be taught before assessment: ' + target)));
});
test('all ten selected past forms have explicit recognition and later checkpoint recognition', () => {
  for (const [id, expected, present] of [['007', 'olin', 'olen'], ['010', 'oli', 'on'], ['009', 'tuli', 'tulee'], ['017', 'Tein', 'Teen'], ['018', 'Söin', 'Syön'], ['019', 'Join', 'Juon'], ['020', 'Ostin', 'Ostan'], ['021', 'sanoi', 'sanoo'], ['028', 'menin', 'menen'], ['037', 'olit', 'olet']]) {
    for (const lessons of [raw.lessons.slice(0, 4), raw.lessons.slice(9)]) {
      const a = lessons.flatMap(l => l.activities).find(a => a.type === 'morphology-choice' && a.item === 'a13s4-e-' + id); assert.ok(a, id);
      assert.equal(a.expected_fi, expected); assert.ok(a.options_fi.includes(present)); assert.equal(new Set(a.options_fi).size, a.options_fi.length);
      assert.ok(a.grammar_concept_ids.includes('a13-past-recognition'));
      assert.equal(a.frame_fi.replace(/_{2,}/g, expected), raw.items[a.item].surface_form);
    }
  }
  for (const l of raw.lessons) for (const g of l.learning_objectives.grammar) if (g.concept_id === 'a13-past-recognition') assert.ok(g.evidence.every(e => e.mode === 'recognition'));
  const broken = structuredClone(raw); broken.lessons[0].learning_objectives.grammar[0].evidence[0].mode = 'supported_production';
  assert.throws(() => verify(broken), /production claim requires productive assessment/);
});
test('location, destination, partitive, person and future-plan answers remain strict', () => {
  const s = course.validateSection(raw);
  for (const [fi, wrong] of [['Tein ruokaa.', 'Tein ruoka.'], ['Join kahvia.', 'Join kahvi.'], ['Sitten menin kauppaan.', 'Sitten menin kaupassa.'], ['Sen jälkeen menin kotiin.', 'Sen jälkeen menin kotona.'], ['Olin koulussa.', 'Olin kouluun.'], ['Olin kaupassa.', 'Olin kauppaan.'], ['Missä olit eilen?', 'Missä olin eilen?'], ['Huomenna menen töihin.', 'Huomenna menen töissä.'], ['Ensi viikolla tapaan ystävän.', 'Ensi viikko tapaan ystävän.'], ['Viikonloppuna olen kotona.', 'Viikonloppu olen kotona.'], ['Se on mielenkiintoinen.', 'Se ovat mielenkiintoinen.'], ['Minun pitää harjoitella.', 'Minä pitää harjoitella.']]) {
    const a = s.lessons.flatMap(l => l.activities).find(a => a.type === 'controlled-production' && a.expected_fi === fi && a.grammar_concept_ids?.length); assert.ok(a, fi);
    const item = { surface_form: a.expected_fi, accepted_answers: a.accepted_answers };
    assert.equal(course.gradeActivityAnswer(a, item, fi).accepted, true); assert.equal(course.gradeActivityAnswer(a, item, wrong).accepted, false, wrong);
  }
  const weak = structuredClone(raw), l = weak.lessons[1], a = l.activities.find(a => a.type === 'controlled-production');
  delete a.answer_policy; delete l.structured_practice.find(sp => sp.type === a.type && sp.item === a.item).answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('grammar production lacks morphology policy')));
});
test('comparatives and possessive opinion remain bounded lexical phrases', () => {
  const l = raw.lessons[5]; assert.equal(l.learning_objectives.grammar_scope, 'formulaic'); assert.deepEqual(l.learning_objectives.grammar, []);
  for (const fi of ['parempi', 'halvempi', 'kalliimpi']) {
    const id = Object.keys(raw.items).find(id => raw.items[id].surface_form === fi), r = verify(raw).lexical_review.find(r => r.target_id === id);
    assert.ok(r?.later_positive_lessons.length, fi);
  }
  for (const l of raw.lessons) for (const a of l.activities) if (['a13s4-e-057', 'a13s4-e-058', 'a13s4-e-059', 'a13s4-e-060', 'a13s4-e-067'].includes(a.item)) assert.equal(a.grammar_concept_ids?.length || 0, 0);
});
test('event ordering, four original reading facts and both writing tasks use taught phrases', () => {
  const sequence = raw.lessons[2].activities.find(a => a.type === 'sequence-order');
  assert.deepEqual(sequence.answer_order.map(i => raw.items[sequence.items[i]].surface_form), ['Ensin olin töissä.', 'Sitten menin kauppaan.', 'Sen jälkeen menin kotiin.']);
  for (const passage of ['a13s4-reading-1', 'a13s4-reading-2']) {
    const activities = raw.lessons[8].activities.filter(a => a.type === 'short-reading' && a.item === passage); assert.equal(activities.length, 2); assert.equal(new Set(activities.map(a => a.question_item)).size, 2);
    for (const a of activities) assert.deepEqual(a.options.filter(t => raw.items[passage].surface_form.includes(raw.items[t].surface_form)), [a.question_item]);
  }
  for (const index of [7, 8]) {
    const writing = raw.lessons[index].activities.find(a => a.type === 'guided-writing'); assert.equal(writing.expected_items.length, 4); assert.equal(writing.answer_policy, 'morphology');
    for (const t of writing.expected_items) assert.ok(raw.lessons.slice(0, index + 1).some(l => l.activities.some(a => a.type === 'teach' && a.item === t)));
  }
});
test('productive recall stays exact after runtime production and dictation injection', () => {
  const s = course.validateSection(raw);
  for (const l of s.lessons) for (const a of l.activities) if (['type', 'production', 'dictation', 'controlled-production', 'expression-completion', 'guided-writing'].includes(a.type)) assert.equal(a.answer_policy, 'morphology');
  const a = s.lessons.flatMap(l => l.activities).find(a => a.type === 'type' && raw.items[a.item]?.surface_form === 'olin'); assert.ok(a);
  assert.equal(course.gradeActivityAnswer(a, raw.items[a.item], 'olit').accepted, false);
  const weak = structuredClone(raw), l = weak.lessons.find(l => l.activities.some(a => a.type === 'type' && !l.production_targets.includes(a.item) && !l.listening_targets.includes(a.item))), b = l.activities.find(a => a.type === 'type' && !l.production_targets.includes(a.item) && !l.listening_targets.includes(a.item)); assert.ok(b); delete b.answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('productive recall lacks strict morphology policy')));
});
test('cumulative final checkpoint retains original targets and eighty percent requirement', () => {
  assert.deepEqual(raw.lessons[9].checkpoint_targets, ORIGINAL_CHECKPOINT_TARGETS);
  const cp = course.validateSection(raw).lessons[9]; assert.equal(cp.activities.length, 32);
  assert.equal(course.passesLessonRequirement(cp, 26, 32), true); assert.equal(course.passesLessonRequirement(cp, 25, 32), false);
  for (const id of ['a13s4-cross-1', 'a13s4-cross-2', 'a13s4-e-079', 'a13s4-cross-4']) assert.ok(cp.activities.flatMap(require('../scripts/audit-course-coverage.cjs').positives).includes(id));
  const weak = structuredClone(raw); weak.lessons[9].passing_score = 0.7; assert.ok(verify(weak).errors.some(e => e.includes('80% threshold')));
  const changed = structuredClone(raw); changed.lessons[9].checkpoint_targets.pop(); assert.ok(verify(changed).errors.some(e => e.includes('Checkpoint target contract changed')));
});
test('final A1 backfill preserves every original item and stable core progress mapping', () => {
  const hash = value => require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash(raw.items), 'c7249c9f5050771c09be847b26844b7c41d80966273d5efac1273c22acd62810');
  const core = raw.lessons.map(l => Object.fromEntries(['id', 'curriculum_id', 'production_targets', 'listening_targets', 'checkpoint_targets', 'passing_score', 'curriculum_target_refs'].map(k => [k, l[k] ?? null])));
  assert.equal(hash(core), '59fb2de9d66d0097e573f42d0a2fd356c696783afba711ee82e927bb702e2984');
});
