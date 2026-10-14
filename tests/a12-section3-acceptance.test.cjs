'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression } = require('../scripts/audit-a12-section3.cjs');
const raw = require('../data/course/a1.2-section-3.json'), curriculum = require('../data/course/a1.2-curriculum.json');
const prior = [...[1, 2, 3, 4].map(n => require(`../data/course/a1.1-section-${n}.json`)), ...[1, 2].map(n => require(`../data/course/a1.2-section-${n}.json`))];
const a11 = require('../data/course/a1.1-curriculum.json'), sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = r => evaluate(r, curriculum, sidecar, prior, a11);
test('daily-life acceptance traces all lexical and bounded grammar retrieval across six preceding sections', () => {
  const report = verify(raw);
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.activities, 329);
  assert.equal(report.summary.introduced_surface_forms_and_expressions, 79);
  assert.equal(report.summary.surfaces_with_later_positive_review, 79);
  assert.equal(report.summary.grammar_concepts_with_later_review, 6);
  const path = course.validateImplementedPath([{ level: 'A1.1', curriculum: a11, sections: prior.slice(0, 4) }, { level: 'A1.2', curriculum, sections: [...prior.slice(4), raw] }]);
  assert.equal(path.flatMap(s => s.lessons).length, 70);
  for (const lesson of path.at(-1).lessons) {
    assert.equal(course.lessonObjectiveDisplay(lesson, raw.items).structured, true);
    assert.equal(lesson.activities.length, lesson.activity_count);
    const progress = course.recordLessonCompletion(course.emptyProgress(), lesson.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(progress).lessonScores[lesson.id], { correct: 8, graded: 10, completedAt: 123 });
  }
  for (const l of raw.lessons.slice(8)) {
    assert.deepEqual(l.new_targets, []);
    assert.ok(l.learning_objectives.lexical.every(g => g.status === 'reviewed'));
  }
  assert.ok(raw.lessons.every(l => l.learning_objectives.grammar.every(g => g.status === 'reviewed')));
});
test('daily-life gate detects missing positive assessment and missing later retrieval', () => {
  const target = 'a12s3-topic-03', missing = structuredClone(raw);
  missing.lessons[0].activities = missing.lessons[0].activities.map(a => a.item === target && a.type === 'type' ? { type: 'teach', item: target } : a);
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: ' + target)));
  const unreviewed = structuredClone(raw);
  for (const l of unreviewed.lessons.slice(1)) l.activities = l.activities.map(a => a.item === target && a.type === 'type' ? { type: 'teach', item: target } : a);
  assert.ok(verify(unreviewed).errors.some(e => e.includes('no later positive review: ' + target)));
  const single = structuredClone(raw), choice = single.lessons[0].activities.find(a => a.type === 'choice' && a.mode !== 'listen');
  choice.options = [choice.item];
  assert.ok(verify(single).errors.some(e => e.includes('meaningful alternatives')));
  const repeat = structuredClone(raw); repeat.lessons[6].new_targets.push('a12s3-hf-11');
  assert.ok(verify(repeat).errors.some(e => e.includes('introduction list differs')));
});
test('daily-life gate requires expression teaching before any full-answer assessment', () => {
  for (const lesson of course.validateSection(raw).lessons) for (const target of lesson.new_targets) {
    if (raw.items[target].item_type !== 'expression') continue;
    const taught = lesson.activities.findIndex(a => a.type === 'teach' && a.item === target);
    const tested = lesson.activities.findIndex(a => assessesExpression(a, target, raw.items));
    assert.ok(taught >= 0 && taught < tested, target);
  }
  const target = 'a12s3-expr-03';
  assert.equal(assessesExpression({ type: 'controlled-production', item: 'a12s3-topic-03', expected_fi: raw.items[target].surface_form }, target, raw.items), true);
  const broken = structuredClone(raw), lesson = broken.lessons[0], old = [...lesson.activities];
  const evidence = lesson.learning_objectives.grammar.flatMap(g => g.evidence).map(e => [e, old[e.activity_index]]);
  const [card] = lesson.activities.splice(lesson.activities.findIndex(a => a.type === 'teach' && a.item === target), 1);
  lesson.activities.push(card);
  for (const [entry, activity] of evidence) entry.activity_index = lesson.activities.indexOf(activity);
  assert.ok(verify(broken).errors.some(e => e.includes('new expression must be taught before assessment: ' + target)));
});
test('restricted routine, location, liking, weekday and negative answers reject wrong grammar', () => {
  const section = course.validateSection(raw);
  for (const [fi, wrong] of [['Herään aamulla.', 'Herää aamulla.'], ['Lähden kotoa.', 'Lähden kotona.'], ['Palaan kotiin.', 'Palaan kotona.'], ['Illalla käytän puhelinta.', 'Illalla käytän puhelin.'], ['Opiskelen yliopistossa.', 'Opiskelen yliopistosta.'], ['Työskentelen toimistossa.', 'Työskentelen toimistoon.'], ['Pidän musiikista.', 'Pidän musiikkia.'], ['Pidän liikunnasta.', 'Pidän liikuntaa.'], ['Katson elokuvia.', 'Katson elokuva.'], ['Tavataan maanantaina.', 'Tavataan maanantai.'], ['En käy siellä koskaan.', 'En käyn siellä koskaan.'], ['Anteeksi, en voi.', 'Anteeksi, en voin.']]) {
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
test('all seven temporal weekdays have positive practice and later retrieval', () => {
  const positive = require('../scripts/audit-course-coverage.cjs').positives;
  const days = ['maanantaina', 'tiistaina', 'keskiviikkona', 'torstaina', 'perjantaina', 'lauantaina', 'sunnuntaina'];
  for (const fi of days) {
    const id = Object.keys(raw.items).find(t => raw.items[t].surface_form === fi);
    assert.ok(raw.lessons[5].activities.flatMap(positive).includes(id), fi);
    assert.ok(raw.lessons.slice(6).some(l => l.activities.flatMap(positive).includes(id)), fi);
  }
  assert.ok(raw.lessons[5].new_targets.includes('a12s3-expr-32'));
  assert.ok(raw.lessons[5].activities.some(a => a.type === 'teach' && a.item === 'a12s3-expr-32'));
  const late = structuredClone(raw); late.lessons[8].new_targets.push('a12s3-expr-32');
  assert.ok(verify(late).errors.some(e => e.includes('review lesson introduces new targets')));
});
test('original week and appointment passages assess all four facts with unique answers', () => {
  for (const passage of ['a12s3-reading-week', 'a12s3-reading-time']) {
    const activities = raw.lessons[8].activities.filter(a => a.type === 'short-reading' && a.item === passage);
    assert.equal(activities.length, 4);
    assert.equal(new Set(activities.map(a => a.question_item)).size, 4);
    for (const a of activities) assert.deepEqual(a.options.filter(t => raw.items[passage].surface_form.includes(raw.items[t].surface_form)), [a.question_item]);
  }
  for (const n of [0, 8]) {
    const writing = raw.lessons[n].activities.find(a => a.type === 'guided-writing');
    assert.equal(writing.expected_items.length, 4);
    assert.equal(writing.answer_policy, 'morphology');
    for (const target of writing.expected_items) {
      assert.ok(raw.lessons.slice(0, n + 1).some(l => l.activities.some(a => a.type === 'teach' && a.item === target)));
      if (n === 8) assert.ok(raw.lessons.slice(0, 8).some(l => l.activities.some(a => a.type === 'teach' && a.item === target)));
    }
  }
});
test('messages remain formulaic and invitations do not claim passive or conditional paradigms', () => {
  assert.equal(raw.lessons[7].learning_objectives.grammar_scope, 'formulaic');
  assert.deepEqual(raw.lessons[7].learning_objectives.grammar, []);
  for (const l of raw.lessons) assert.ok(l.learning_objectives.grammar.every(g => !g.concept_id.includes('passive') && !g.concept_id.includes('conditional')));
  assert.ok(raw.lessons[6].learning_objectives.grammar.every(g => g.concept_id === 'a12-negation-expand'));
});
test('daily-life checkpoint retains target contract, structural tasks and 80 percent threshold', () => {
  assert.deepEqual(raw.lessons[9].checkpoint_targets, ORIGINAL_CHECKPOINT_TARGETS);
  const cp = course.validateSection(raw).lessons[9];
  assert.equal(cp.activities.length, 26);
  assert.equal(course.passesLessonRequirement(cp, 21, 26), true);
  assert.equal(course.passesLessonRequirement(cp, 20, 26), false);
  const weak = structuredClone(raw); weak.lessons[9].passing_score = 0.7;
  assert.ok(verify(weak).errors.some(e => e.includes('80% threshold')));
  const changed = structuredClone(raw); changed.lessons[9].checkpoint_targets.pop();
  assert.ok(verify(changed).errors.some(e => e.includes('Checkpoint target contract changed')));
});
test('daily-life backfill preserves every original item record and core progress contract', () => {
  const hash = value => require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash(raw.items), '5934641576cefe987c1a21b69590fc02a7cd4803bd3b451085cb4e821078cd95');
  const core = raw.lessons.map(l => Object.fromEntries(['id', 'curriculum_id', 'production_targets', 'listening_targets', 'checkpoint_targets', 'passing_score', 'curriculum_target_refs'].map(k => [k, l[k] ?? null])));
  assert.equal(hash(core), 'e9234a6ed47b247f4f9505223f4a40b807b53dc9010f567b1af91e164f39e987');
});

test('temporal weekday typing and dictation reject nominatives in teaching and later review', () => {
  const section = course.validateSection(raw);
  const pairs = new Map([['maanantaina', 'maanantai'], ['tiistaina', 'tiistai'], ['keskiviikkona', 'keskiviikko'], ['torstaina', 'torstai'], ['perjantaina', 'perjantai'], ['lauantaina', 'lauantai'], ['sunnuntaina', 'sunnuntai']]);
  const tested = new Set();
  for (const l of section.lessons) for (const a of l.activities) {
    const item = section.items[a.item], wrong = pairs.get(item?.surface_form);
    if (!wrong || !['type', 'production', 'dictation'].includes(a.type)) continue;
    tested.add(item.surface_form);
    assert.equal(a.answer_policy, 'morphology');
    assert.equal(course.gradeActivityAnswer(a, item, item.surface_form).accepted, true);
    assert.equal(course.gradeActivityAnswer(a, item, wrong).accepted, false, l.id + '/' + wrong);
  }
  assert.deepEqual([...tested].sort(), [...pairs.keys()].sort());
  const weak = structuredClone(raw), a = weak.lessons[8].activities.find(a => a.type === 'type' && raw.items[a.item]?.surface_form === 'keskiviikkona');
  assert.ok(a);
  delete a.answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('temporal weekday production lacks morphology policy')));
});
