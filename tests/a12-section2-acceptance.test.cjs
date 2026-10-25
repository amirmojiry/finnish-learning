'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression } = require('../scripts/audit-a12-section2.cjs');
const raw = require('../data/course/a1.2-section-2.json'), curriculum = require('../data/course/a1.2-curriculum.json');
const prior = [...[1, 2, 3, 4].map(n => require(`../data/course/a1.1-section-${n}.json`)), require('../data/course/a1.2-section-1.json')];
const a11 = require('../data/course/a1.1-curriculum.json'), sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = r => evaluate(r, curriculum, sidecar, prior, a11);
test('transport objectives trace all introductions and later grammar retrieval across prior sections', () => {
  const report = verify(raw);
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.activities, 309);
  assert.equal(report.summary.introduced_surface_forms_and_expressions, 80);
  assert.equal(report.summary.surfaces_with_later_positive_review, 80);
  assert.equal(report.summary.grammar_concepts_with_later_review, 5);
  const path = course.validateImplementedPath([{ level: 'A1.1', curriculum: a11, sections: prior.slice(0, 4) }, { level: 'A1.2', curriculum, sections: [prior[4], raw] }]);
  assert.equal(path.flatMap(s => s.lessons).length, 60);
  for (const lesson of path.at(-1).lessons) {
    assert.equal(course.lessonObjectiveDisplay(lesson, raw.items).structured, true);
    assert.equal(lesson.activities.length, lesson.activity_count);
    const progress = course.recordLessonCompletion(course.emptyProgress(), lesson.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(progress).lessonScores[lesson.id], { correct: 8, graded: 10, completedAt: 123 });
  }
  for (const lesson of raw.lessons.slice(8)) {
    assert.deepEqual(lesson.new_targets, []);
    assert.ok(lesson.learning_objectives.lexical.every(g => g.status === 'reviewed'));
  }
  assert.equal(raw.lessons[0].learning_objectives.grammar.find(g => g.concept_id === 'a12-local-cases').status, 'reviewed');
  assert.equal(raw.lessons[1].learning_objectives.grammar.find(g => g.concept_id === 'a12-commands').status, 'introduced');
});
test('transport acceptance rejects missing answers, missing later review and vacuous recognition', () => {
  const target = 'a12s2-topic-pysakki', missing = structuredClone(raw);
  missing.lessons[0].activities = missing.lessons[0].activities.map(a => a.item === target && ['type', 'choice'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: ' + target)));
  const unreviewed = structuredClone(raw);
  for (const l of unreviewed.lessons.slice(1)) l.activities = l.activities.map(a => a.item === target && ['type', 'choice'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(unreviewed).errors.some(e => e.includes('no later positive review: ' + target)));
  const single = structuredClone(raw), choice = single.lessons[0].activities.find(a => a.type === 'choice' && a.mode !== 'listen');
  choice.options = [choice.item];
  assert.ok(verify(single).errors.some(e => e.includes('meaningful alternatives')));
  const repeat = structuredClone(raw); repeat.lessons[3].new_targets.push('a12s2-hf-tulee');
  assert.ok(verify(repeat).errors.some(e => e.includes('introduction list differs')));
});
test('new travel expressions precede full answers including filled inflection frames', () => {
  for (const lesson of course.validateSection(raw).lessons) for (const target of lesson.new_targets) {
    if (raw.items[target].item_type !== 'expression') continue;
    const taught = lesson.activities.findIndex(a => a.type === 'teach' && a.item === target);
    const tested = lesson.activities.findIndex(a => assessesExpression(a, target, raw.items));
    assert.ok(taught >= 0 && taught < tested, target);
  }
  const target = 'a12s2-expr-kaksi-lippua-kiitos-60';
  assert.equal(assessesExpression({ type: 'inflection-production', item: 'a12s2-topic-lippu', frame_fi: 'Kaksi _____, kiitos.', expected_fi: 'lippua' }, target, raw.items), true);
  const broken = structuredClone(raw), lesson = broken.lessons[5], old = [...lesson.activities];
  // The deliberately reordered authored sequence must be assessed without
  // treating its original editorial source indices as a separate failure.
  delete lesson.editorial_revision;
  const evidence = lesson.learning_objectives.grammar.flatMap(g => g.evidence).map(e => [e, old[e.activity_index]]);
  const [card] = lesson.activities.splice(lesson.activities.findIndex(a => a.type === 'teach' && a.item === target), 1);
  lesson.activities.push(card);
  for (const [entry, activity] of evidence) entry.activity_index = lesson.activities.indexOf(activity);
  assert.ok(verify(broken).errors.some(e => e.includes('new expression must be taught before assessment: ' + target)));
});
test('bounded direction, local-case, quantity and schedule answers reject incorrect grammar', () => {
  const section = course.validateSection(raw);
  for (const [fi, wrong] of [['Mene suoraan.', 'Menen suoraan.'], ['Käänny oikealle.', 'Käännyn oikealle.'], ['Olen asemalla.', 'Olen asemalle.'], ['Menen asemalle.', 'Menen asemalla.'], ['Tulen kaupasta.', 'Tulen kauppaan.'], ['Menen pyörällä.', 'Menen pyörä.'], ['Kaksi lippua, kiitos.', 'Kaksi lippu, kiitos.'], ['Noin kymmenen minuuttia.', 'Noin kymmenen minuutti.'], ['Se lähtee ennen kymmentä.', 'Se lähtee ennen kymmenen.'], ['Bussi lähtee kymmenen jälkeen.', 'Bussi lähtee kymmentä jälkeen.']]) {
    const a = section.lessons.flatMap(l => l.activities).find(a => a.type === 'controlled-production' && a.expected_fi === fi && a.grammar_concept_ids?.length);
    assert.ok(a, fi);
    const item = { surface_form: a.expected_fi, accepted_answers: a.accepted_answers };
    assert.equal(course.gradeActivityAnswer(a, item, fi).accepted, true);
    assert.equal(course.gradeActivityAnswer(a, item, wrong).accepted, false, wrong);
  }
  const weak = structuredClone(raw), lesson = weak.lessons[0], a = lesson.activities.find(a => a.type === 'controlled-production');
  delete a.answer_policy;
  delete lesson.structured_practice.find(sp => sp.type === a.type && sp.item === a.item).answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('grammar production lacks morphology policy')));
});
test('timetable questions have one passage answer and trip writing uses taught sentences', () => {
  const reading = raw.lessons[6].activities.filter(a => a.type === 'short-reading');
  assert.equal(reading.length, 2);
  for (const a of reading) {
    const matches = a.options.filter(t => raw.items[a.item].surface_form.includes(raw.items[t].surface_form));
    assert.deepEqual(matches, [a.question_item]);
  }
  const writing = raw.lessons[8].activities.find(a => a.type === 'guided-writing');
  assert.equal(writing.expected_items.length, 3);
  assert.equal(writing.answer_policy, 'morphology');
  for (const target of writing.expected_items) assert.ok(raw.lessons.slice(0, 8).some(l => l.activities.some(a => a.type === 'teach' && a.item === target)));
});
test('transport checkpoint preserves fifteen targets, structured tasks and 80 percent threshold', () => {
  assert.deepEqual(raw.lessons[9].checkpoint_targets, ORIGINAL_CHECKPOINT_TARGETS);
  const cp = course.validateSection(raw).lessons[9];
  assert.equal(course.passesLessonRequirement(cp, 20, 24), true);
  assert.equal(course.passesLessonRequirement(cp, 19, 24), false);
  const weak = structuredClone(raw); weak.lessons[9].passing_score = 0.7;
  assert.ok(verify(weak).errors.some(e => e.includes('80% threshold')));
  const changed = structuredClone(raw); changed.lessons[9].checkpoint_targets.pop();
  assert.ok(verify(changed).errors.some(e => e.includes('Checkpoint target contract changed')));
});
test('transport backfill preserves every original item record and stable core lesson contract', () => {
  const hash = value => require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const added = new Set(['a12s2-expr-olen-asemalla', 'a12s2-expr-menen-usein-bussilla', 'a12s2-expr-bussi-lahtee-kymmenen-jalkeen', 'a12s2-reading-timetable']);
  assert.equal(hash(Object.fromEntries(Object.entries(raw.items).filter(([id]) => !added.has(id)))), '18cd1e3f725706d77eab5f56a0d7252a7915bd3dfc4d6b009816b49326dfac28');
  const core = raw.lessons.map(l => Object.fromEntries(['id', 'curriculum_id', 'production_targets', 'listening_targets', 'checkpoint_targets', 'passing_score', 'curriculum_target_refs'].map(k => [k, l[k] ?? null])));
  assert.equal(hash(core), '23a59b33473a66c693bdb4dfb3523caa7f292327147b66e404afbe984da6e686');
});
