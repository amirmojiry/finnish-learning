'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression } = require('../scripts/audit-a13-section1.cjs');
const raw = require('../data/course/a1.3-section-1.json'), curriculum = require('../data/course/a1.3-curriculum.json');
const prior = ['a1.1', 'a1.2'].flatMap(level => [1, 2, 3, 4].map(n => require(`../data/course/${level}-section-${n}.json`)));
const precedingCurricula = { 'A1.1': require('../data/course/a1.1-curriculum.json'), 'A1.2': require('../data/course/a1.2-curriculum.json') };
const sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = r => evaluate(r, curriculum, sidecar, prior, precedingCurricula);
test('social section has canonical objectives and complete later lexical and grammar retrieval', () => {
  const r = verify(raw); assert.deepEqual(r.errors, []);
  assert.equal(r.summary.activities, 300);
  assert.equal(r.summary.introduced_surface_forms_and_expressions, 60);
  assert.equal(r.summary.surfaces_with_later_positive_review, 60);
  assert.equal(r.summary.grammar_concepts_with_later_review, 7);
  const path = course.validateImplementedPath([{ level: 'A1.1', curriculum: precedingCurricula['A1.1'], sections: prior.slice(0, 4) }, { level: 'A1.2', curriculum: precedingCurricula['A1.2'], sections: prior.slice(4) }, { level: 'A1.3', curriculum, sections: [raw] }]);
  assert.equal(path.flatMap(s => s.lessons).length, 90);
  for (const l of path.at(-1).lessons) {
    assert.equal(course.lessonObjectiveDisplay(l, raw.items).structured, true);
    assert.equal(l.activities.length, l.activity_count);
    const p = course.recordLessonCompletion(course.emptyProgress(), l.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(p).lessonScores[l.id], { correct: 8, graded: 10, completedAt: 123 });
  }
  for (const l of raw.lessons.slice(8)) { assert.deepEqual(l.new_targets, []); assert.ok(l.learning_objectives.lexical.every(g => g.status === 'reviewed')); }
});
test('A1.3 registry carries canonical prerequisites and bounds new concept introductions', () => {
  const { registryFor } = require('../scripts/sync-grammar-registry.cjs');
  assert.deepEqual(curriculum.grammar_concepts, registryFor(require('../data/course/master-curriculum.json'), 'A1.3'));
  const introduced = raw.lessons.flatMap(l => l.learning_objectives.grammar.filter(g => g.status === 'introduced').map(g => [g.concept_id, l.order]));
  assert.deepEqual(introduced, [['a13-necessity', 3], ['a13-local-expansion', 4], ['a13-present-paradigm', 4], ['a13-partitive-patterns', 6]]);
  const bad = structuredClone(raw); bad.lessons[2].learning_objectives.grammar[0].prerequisite_concept_ids = [];
  assert.throws(() => verify(bad), /prerequisites differ/);
});
test('social acceptance rejects missing positives, later review and repeated introductions', () => {
  const target = 'a13s1-t-006', missing = structuredClone(raw);
  missing.lessons[0].activities = missing.lessons[0].activities.map(a => a.item === target && ['choice', 'type'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: ' + target)));
  const unreviewed = structuredClone(raw);
  for (const l of unreviewed.lessons.slice(1)) l.activities = l.activities.map(a => a.item === target && ['choice', 'type'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(unreviewed).errors.some(e => e.includes('no later positive review: ' + target)));
  const vacuous = structuredClone(raw), a = vacuous.lessons[0].activities.find(a => a.type === 'choice' && a.mode !== 'listen' && !vacuous.lessons[0].production_targets.includes(a.item));
  a.options = [a.item]; assert.ok(verify(vacuous).errors.some(e => e.includes('meaningful alternatives')));
  const repeat = structuredClone(raw); repeat.lessons[3].new_targets.push('a13s1-h-002');
  assert.ok(verify(repeat).errors.some(e => e.includes('introduction list differs')));
});
test('three formerly review-only social frames are taught earlier and all expressions precede assessment', () => {
  for (const [index, target] of [[0, 'a13s1-e-073'], [6, 'a13s1-e-074'], [7, 'a13s1-e-075']]) assert.ok(raw.lessons[index].activities.some(a => a.type === 'teach' && a.item === target));
  for (const l of course.validateSection(raw).lessons) for (const target of l.new_targets) {
    if (raw.items[target].item_type !== 'expression') continue;
    const taught = l.activities.findIndex(a => a.type === 'teach' && a.item === target), tested = l.activities.findIndex(a => assessesExpression(a, target, raw.items));
    assert.ok(taught >= 0 && taught < tested, target);
  }
  const broken = structuredClone(raw), l = broken.lessons[3], target = 'a13s1-e-tulet-pian', old = [...l.activities];
  // This fixture tests original authoring order independently of the editorial
  // revision's saved source indices, which intentionally reject reordered data.
  delete l.editorial_revision;
  const evidence = l.learning_objectives.grammar.flatMap(g => g.evidence).map(e => [e, old[e.activity_index]]);
  const [card] = l.activities.splice(l.activities.findIndex(a => a.type === 'teach' && a.item === target), 1); l.activities.push(card);
  for (const [entry, a] of evidence) entry.activity_index = l.activities.indexOf(a);
  assert.ok(verify(broken).errors.some(e => e.includes('new expression must be taught before assessment: ' + target)));
});
test('supported person, necessity, recipient and object answers reject wrong grammatical forms', () => {
  const s = course.validateSection(raw);
  for (const [fi, wrong] of [['Tulen pian.', 'Tulet pian.'], ['Tulet pian.', 'Tulen pian.'], ['Minun täytyy lähteä.', 'Minä täytyy lähteä.'], ['Minun täytyy perua tapaaminen.', 'Minun täytyy perun tapaaminen.'], ['Lähetä minulle viesti.', 'Lähetän minulle viesti.'], ['Voinko puhua Amirille?', 'Voinko puhua Amirilla?'], ['Pidän enemmän teestä.', 'Pidän enemmän teetä.'], ['Juon mieluummin kahvia.', 'Juon mieluummin kahvi.'], ['Hän ei ole nyt täällä.', 'Hän ei on nyt täällä.'], ['En tule, koska olen väsynyt.', 'En tulen, koska olen väsynyt.']]) {
    const a = s.lessons.flatMap(l => l.activities).find(a => a.type === 'controlled-production' && a.expected_fi === fi && a.grammar_concept_ids?.length); assert.ok(a, fi);
    const item = { surface_form: a.expected_fi, accepted_answers: a.accepted_answers };
    assert.equal(course.gradeActivityAnswer(a, item, fi).accepted, true);
    assert.equal(course.gradeActivityAnswer(a, item, wrong).accepted, false, wrong);
  }
  const weak = structuredClone(raw), l = weak.lessons[3], a = l.activities.find(a => a.type === 'controlled-production');
  delete a.answer_policy; delete l.structured_practice.find(sp => sp.type === a.type && sp.item === a.item).answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('grammar production lacks morphology policy')));
});
test('strict typing and runtime production/dictation retain exact-word grading and keyboard tolerance', () => {
  const s = course.validateSection(raw);
  for (const l of s.lessons) for (const a of l.activities) if (['type', 'production', 'dictation', 'controlled-production', 'expression-completion', 'guided-writing'].includes(a.type)) assert.equal(a.answer_policy, 'morphology');
  const a = s.lessons.flatMap(l => l.activities).find(a => a.type === 'type' && raw.items[a.item]?.surface_form === 'minulle');
  assert.ok(a); assert.equal(course.gradeActivityAnswer(a, raw.items[a.item], 'minulla').accepted, false);
  const expression = s.lessons[0].activities.find(a => a.type === 'controlled-production');
  assert.equal(course.gradeActivityAnswer(expression, raw.items[expression.item], 'Mita teet tanaan?').accepted, true);
  const weak = structuredClone(raw), b = weak.lessons[0].activities.find(a => a.type === 'type' && !weak.lessons[0].production_targets.includes(a.item) && !weak.lessons[0].listening_targets.includes(a.item)); delete b.answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('productive recall lacks strict morphology policy')));
});
test('social readings cover both facts each and integrated writing uses taught message sentences', () => {
  for (const passage of ['a13s1-reading-1', 'a13s1-reading-2']) {
    const activities = raw.lessons[8].activities.filter(a => a.type === 'short-reading' && a.item === passage); assert.equal(activities.length, 2);
    assert.equal(new Set(activities.map(a => a.question_item)).size, 2);
    for (const a of activities) assert.deepEqual(a.options.filter(t => raw.items[passage].surface_form.includes(raw.items[t].surface_form)), [a.question_item]);
  }
  const writing = raw.lessons[8].activities.find(a => a.type === 'guided-writing'); assert.equal(writing.expected_items.length, 4); assert.equal(writing.answer_policy, 'morphology');
  for (const t of writing.expected_items) assert.ok(raw.lessons.slice(0, 8).some(l => l.activities.some(a => a.type === 'teach' && a.item === t)));
  assert.equal(raw.lessons[7].learning_objectives.grammar_scope, 'formulaic'); assert.deepEqual(raw.lessons[7].learning_objectives.grammar, []);
  for (const l of raw.lessons) assert.ok(l.learning_objectives.grammar.every(g => !/passive|conditional|verb-classes|kpt|past-recognition/.test(g.concept_id)));
});
test('social checkpoint retains all original targets, mixed structures and eighty percent threshold', () => {
  assert.deepEqual(raw.lessons[9].checkpoint_targets, ORIGINAL_CHECKPOINT_TARGETS);
  const cp = course.validateSection(raw).lessons[9]; assert.equal(cp.activities.length, 25);
  assert.equal(course.passesLessonRequirement(cp, 20, 25), true); assert.equal(course.passesLessonRequirement(cp, 19, 25), false);
  const weak = structuredClone(raw); weak.lessons[9].passing_score = 0.7; assert.ok(verify(weak).errors.some(e => e.includes('80% threshold')));
  const changed = structuredClone(raw); changed.lessons[9].checkpoint_targets.pop(); assert.ok(verify(changed).errors.some(e => e.includes('Checkpoint target contract changed')));
});
test('A1.3 social backfill preserves every original item and stable lesson contracts', () => {
  const hash = value => require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const added = new Set(['a13s1-e-tulet-pian', 'a13s1-e-minun-taytyy-lahtea']);
  assert.equal(hash(Object.fromEntries(Object.entries(raw.items).filter(([id]) => !added.has(id)))), '2a50d958355c1635028f69b92d406df73def3c6df6ee245ccab663aa62cb5cad');
  const core = raw.lessons.map(l => Object.fromEntries(['id', 'curriculum_id', 'production_targets', 'listening_targets', 'checkpoint_targets', 'passing_score', 'curriculum_target_refs'].map(k => [k, l[k] ?? null])));
  assert.equal(hash(core), '7e28e76f01850463cecbece7a3d878fee574e2c958586f651d8a3c34abe95e91');
});
