'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression } = require('../scripts/audit-a12-section4.cjs');
const raw = require('../data/course/a1.2-section-4.json'), curriculum = require('../data/course/a1.2-curriculum.json');
const prior = [...[1, 2, 3, 4].map(n => require(`../data/course/a1.1-section-${n}.json`)), ...[1, 2, 3].map(n => require(`../data/course/a1.2-section-${n}.json`))];
const a11 = require('../data/course/a1.1-curriculum.json'), sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = r => evaluate(r, curriculum, sidecar, prior, a11);
test('weather health and help acceptance completes all forty A1.2 canonical overviews', () => {
  const report = verify(raw);
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.activities, 338);
  assert.equal(report.summary.introduced_surface_forms_and_expressions, 72);
  assert.equal(report.summary.surfaces_with_later_positive_review, 72);
  assert.equal(report.summary.grammar_concepts_with_later_review, 8);
  const path = course.validateImplementedPath([{ level: 'A1.1', curriculum: a11, sections: prior.slice(0, 4) }, { level: 'A1.2', curriculum, sections: [...prior.slice(4), raw] }]);
  assert.equal(path.flatMap(s => s.lessons).length, 80);
  assert.equal(path.slice(4).flatMap(s => s.lessons).reduce((n, l) => n + l.activities.length, 0), 1267);
  for (const section of path.slice(4)) for (const l of section.lessons) assert.equal(course.lessonObjectiveDisplay(l, section.items).structured, true);
  for (const l of path.at(-1).lessons) {
    assert.equal(l.activities.length, l.activity_count);
    const progress = course.recordLessonCompletion(course.emptyProgress(), l.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(progress).lessonScores[l.id], { correct: 8, graded: 10, completedAt: 123 });
  }
  for (const l of raw.lessons.slice(8)) {
    assert.deepEqual(l.new_targets, []);
    assert.ok(l.learning_objectives.lexical.every(g => g.status === 'reviewed'));
  }
  assert.ok(raw.lessons.every(l => l.learning_objectives.grammar.every(g => g.status === 'reviewed')));
});
test('Section 4 acceptance rejects missing positives, missing later review and vacuous choices', () => {
  const target = 'a12s4-topic-01', missing = structuredClone(raw);
  missing.lessons[0].activities = missing.lessons[0].activities.map(a => a.item === target && a.type === 'type' ? { type: 'teach', item: target } : a);
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: ' + target)));
  const unreviewed = structuredClone(raw);
  for (const l of unreviewed.lessons.slice(1)) l.activities = l.activities.map(a => a.item === target && a.type === 'type' ? { type: 'teach', item: target } : a);
  assert.ok(verify(unreviewed).errors.some(e => e.includes('no later positive review: ' + target)));
  const single = structuredClone(raw), choice = single.lessons.flatMap(l => l.activities).find(a => a.type === 'choice' && a.mode !== 'listen');
  choice.options = [choice.item];
  assert.ok(verify(single).errors.some(e => e.includes('meaningful alternatives')));
  const repeat = structuredClone(raw); repeat.lessons[1].new_targets.push('a12s4-hf-02');
  assert.ok(verify(repeat).errors.some(e => e.includes('introduction list differs')));
});
test('all new Section 4 expressions are taught before full answers and review expressions appear earlier', () => {
  for (const l of course.validateSection(raw).lessons) for (const target of l.new_targets) {
    if (raw.items[target].item_type !== 'expression') continue;
    const taught = l.activities.findIndex(a => a.type === 'teach' && a.item === target);
    const tested = l.activities.findIndex(a => assessesExpression(a, target, raw.items));
    assert.ok(taught >= 0 && taught < tested, target);
  }
  for (const [i, target] of [[4, 'a12s4-expr-31'], [6, 'a12s4-extra-08']]) assert.ok(raw.lessons[i].activities.some(a => a.type === 'teach' && a.item === target));
  const target = 'a12s4-expr-31', broken = structuredClone(raw), l = broken.lessons[4], old = [...l.activities];
  // This negative test isolates the expression-order acceptance gate. The curated
  // index plan would separately reject moving its first teaching card.
  delete l.editorial_revision;
  const evidence = l.learning_objectives.grammar.flatMap(g => g.evidence).map(e => [e, old[e.activity_index]]);
  const [card] = l.activities.splice(l.activities.findIndex(a => a.type === 'teach' && a.item === target), 1); l.activities.push(card);
  for (const [entry, a] of evidence) entry.activity_index = l.activities.indexOf(a);
  assert.ok(verify(broken).errors.some(e => e.includes('new expression must be taught before assessment: ' + target)));
});
test('grammatical phrase and command grading rejects wrong case and person forms', () => {
  const section = course.validateSection(raw);
  for (const [fi, wrong] of [['Tänään on kylmä.', 'Tänään olen kylmä.'], ['Tarvitsen takin.', 'Tarvitsen takki.'], ['Minulla on kuumetta.', 'Minä on kuumetta.'], ['En voi hyvin.', 'En voin hyvin.'], ['Tarvitsen lääkettä kipuun.', 'Tarvitsen lääke kipuun.'], ['Tarvitsen apua.', 'Tarvitsen apu.'], ['Ota takki.', 'Otan takki.'], ['Juo vettä.', 'Juon vettä.'], ['Lepää kotona.', 'Lepään kotona.'], ['Pysy sisällä.', 'Pysyn sisällä.']]) {
    const a = section.lessons.flatMap(l => l.activities).find(a => a.type === 'controlled-production' && a.expected_fi === fi && a.grammar_concept_ids?.length);
    assert.ok(a, fi);
    const item = { surface_form: a.expected_fi, accepted_answers: a.accepted_answers };
    assert.equal(course.gradeActivityAnswer(a, item, fi).accepted, true);
    assert.equal(course.gradeActivityAnswer(a, item, wrong).accepted, false, wrong);
  }
  const weak = structuredClone(raw), l = weak.lessons[0], a = l.activities.find(a => a.type === 'controlled-production');
  delete a.answer_policy; delete l.structured_practice.find(sp => sp.type === a.type && sp.item === a.item).answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('grammar production lacks morphology policy')));
  for (const [fi, wrong] of [['ota', 'otan'], ['juo', 'juon'], ['lepää', 'lepään']]) {
    const a = section.lessons[7].activities.find(a => a.type === 'type' && raw.items[a.item]?.surface_form === fi);
    assert.ok(a, fi);
    assert.equal(course.gradeActivityAnswer(a, raw.items[a.item], wrong).accepted, false, wrong);
  }
  const fuzzy = structuredClone(raw), cmd = fuzzy.lessons[7].activities.find(a => a.type === 'type' && raw.items[a.item]?.surface_form === 'juo');
  delete cmd.answer_policy;
  assert.ok(verify(fuzzy).errors.some(e => e.includes('grammatical phrase/form lacks morphology policy')));
});
test('clock answers eight to eleven have positive practice and later retrieval with validated exact references', () => {
  const positive = require('../scripts/audit-course-coverage.cjs').positives;
  for (const n of [10, 11, 12, 13]) {
    const t = 'a12s4-extra-' + n;
    assert.ok(raw.lessons[5].activities.flatMap(positive).includes(t));
    assert.ok(raw.lessons.slice(6).some(l => l.activities.flatMap(positive).includes(t)));
    const goal = raw.lessons[5].learning_objectives.lexical.find(g => g.target_id === t);
    assert.equal(goal.status, n === 13 ? 'introduced' : 'reviewed');
  }
  const bad = structuredClone(raw); bad.prior_target_refs['a12s4-extra-12'].item_id = 'a12s2-time-9';
  assert.throws(() => verify(bad), /Invalid prior exact-answer reference/);
});
test('both health passages assess four unique facts and writing uses already taught sentences', () => {
  for (const passage of ['a12s4-extra-14', 'a12s4-extra-15']) {
    const activities = raw.lessons[8].activities.filter(a => a.type === 'short-reading' && a.item === passage);
    assert.equal(activities.length, 4);
    assert.equal(new Set(activities.map(a => a.question_item)).size, 4);
    for (const a of activities) assert.deepEqual(a.options.filter(t => raw.items[passage].surface_form.includes(raw.items[t].surface_form)), [a.question_item]);
  }
  const writing = raw.lessons[8].activities.find(a => a.type === 'guided-writing');
  assert.equal(writing.expected_items.length, 4); assert.equal(writing.answer_policy, 'morphology');
  for (const t of writing.expected_items) assert.ok(raw.lessons.slice(0, 8).some(l => l.activities.some(a => a.type === 'teach' && a.item === t)));
});
test('pain and polite appointment phrases do not claim productive suffix or conditional grammar', () => {
  const pain = ['a12s4-expr-11', 'a12s4-expr-12'];
  for (const l of raw.lessons) for (const a of l.activities) if (pain.includes(a.item)) assert.equal(a.grammar_concept_ids?.length || 0, 0);
  for (const l of raw.lessons) assert.ok(l.learning_objectives.grammar.every(g => !g.concept_id.includes('conditional') && !g.concept_id.includes('passive')));
  assert.match(raw.lessons[2].grammar_fa, /عبارت‌های آماده/);
});
test('cumulative A1.2 checkpoint preserves original fifteen targets and eighty percent threshold', () => {
  assert.deepEqual(raw.lessons[9].checkpoint_targets, ORIGINAL_CHECKPOINT_TARGETS);
  const cp = course.validateSection(raw).lessons[9]; assert.equal(cp.activities.length, 26);
  assert.equal(course.passesLessonRequirement(cp, 21, 26), true); assert.equal(course.passesLessonRequirement(cp, 20, 26), false);
  const weak = structuredClone(raw); weak.lessons[9].passing_score = 0.7;
  assert.ok(verify(weak).errors.some(e => e.includes('80% threshold')));
  const changed = structuredClone(raw); changed.lessons[9].checkpoint_targets.pop();
  assert.ok(verify(changed).errors.some(e => e.includes('Checkpoint target contract changed')));
});
test('Section 4 retains every original item and stable core progress contracts', () => {
  const hash = value => require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash(Object.fromEntries(Object.entries(raw.items).filter(([id]) => id !== 'a12s4-expr-apteekki-on-lahella'))), 'c33e597e4b5b5ea7f9f423ba6dfce08eb6c4772a77c53e631b4bf448ae7fe11b');
  const core = raw.lessons.map(l => Object.fromEntries(['id', 'curriculum_id', 'production_targets', 'listening_targets', 'checkpoint_targets', 'passing_score', 'curriculum_target_refs'].map(k => [k, l[k] ?? null])));
  assert.equal(hash(core), 'd4f4517421fd08207976abb3f841fbfc7ef976b0f197dae4ca47c74cbd842597');
});

test('kuume teaching and later retrieval reject the different word kuuma', () => {
  const section = course.validateSection(raw);
  const hits = [];
  for (const lesson of section.lessons) for (const activity of lesson.activities) {
    const item = section.items[activity.item];
    if (item?.surface_form !== 'kuume' || !['type', 'production', 'dictation'].includes(activity.type)) continue;
    hits.push(lesson.order);
    assert.equal(activity.answer_policy, 'morphology');
    assert.equal(course.gradeActivityAnswer(activity, item, 'kuume').accepted, true);
    assert.equal(course.gradeActivityAnswer(activity, item, 'kuuma').accepted, false, lesson.id);
  }
  assert.ok(hits.includes(4));
  assert.ok(hits.some(order => order > 4));
  const weak = structuredClone(raw);
  const activity = weak.lessons[3].activities.find(a => a.type === 'type' && raw.items[a.item]?.surface_form === 'kuume');
  assert.ok(activity);
  delete activity.answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('grammatical phrase/form lacks morphology policy')));
});
