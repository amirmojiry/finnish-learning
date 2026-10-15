'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const course = require('../course.js');
const { evaluate, ORIGINAL_CHECKPOINT_TARGETS, assessesExpression } = require('../scripts/audit-a13-section3.cjs');
const raw = require('../data/course/a1.3-section-3.json'), curriculum = require('../data/course/a1.3-curriculum.json');
const prior = [...['a1.1', 'a1.2'].flatMap(level => [1, 2, 3, 4].map(n => require(`../data/course/${level}-section-${n}.json`))), ...[1, 2].map(n => require(`../data/course/a1.3-section-${n}.json`))];
const curricula = { 'A1.1': require('../data/course/a1.1-curriculum.json'), 'A1.2': require('../data/course/a1.2-curriculum.json'), 'A1.3': curriculum };
const sidecar = require('../data/course/lexical-identity-sidecar.json');
const verify = r => evaluate(r, curriculum, sidecar, prior, curricula);
test('study and work traces all lexical and grammar retrieval across ten preceding sections', () => {
  const r = verify(raw); assert.deepEqual(r.errors, []);
  assert.equal(r.summary.activities, 303); assert.equal(r.summary.introduced_surface_forms_and_expressions, 56);
  assert.equal(r.summary.surfaces_with_later_positive_review, 56); assert.equal(r.summary.grammar_concepts_with_later_review, 12);
  const path = course.validateImplementedPath([{ level: 'A1.1', curriculum: curricula['A1.1'], sections: prior.slice(0, 4) }, { level: 'A1.2', curriculum: curricula['A1.2'], sections: prior.slice(4, 8) }, { level: 'A1.3', curriculum, sections: [...prior.slice(8), raw] }]);
  assert.equal(path.flatMap(s => s.lessons).length, 110);
  for (const l of path.at(-1).lessons) {
    assert.equal(course.lessonObjectiveDisplay(l, raw.items).structured, true); assert.equal(l.activities.length, l.activity_count);
    const p = course.recordLessonCompletion(course.emptyProgress(), l.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(p).lessonScores[l.id], { correct: 8, graded: 10, completedAt: 123 });
  }
  for (const l of raw.lessons.slice(8)) { assert.deepEqual(l.new_targets, []); assert.ok(l.learning_objectives.lexical.every(g => g.status === 'reviewed')); }
});
test('study gate rejects missing positives, later retrieval, repeated introductions and vacuous choices', () => {
  const target = 'a13s3-t-005', missing = structuredClone(raw);
  missing.lessons[0].activities = missing.lessons[0].activities.map(a => a.item === target && ['choice', 'type'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(missing).errors.some(e => e.includes('target lacks positive answer: ' + target)));
  const unreviewed = structuredClone(raw);
  for (const l of unreviewed.lessons.slice(1)) l.activities = l.activities.map(a => a.item === target && ['choice', 'type'].includes(a.type) ? { type: 'teach', item: target } : a);
  assert.ok(verify(unreviewed).errors.some(e => e.includes('no later positive review: ' + target)));
  const vacuous = structuredClone(raw), a = vacuous.lessons[0].activities.find(a => a.type === 'choice' && a.mode !== 'listen' && !vacuous.lessons[0].production_targets.includes(a.item));
  a.options = [a.item]; assert.ok(verify(vacuous).errors.some(e => e.includes('meaningful alternatives')));
  const repeat = structuredClone(raw); repeat.lessons[1].new_targets.push(target); assert.ok(verify(repeat).errors.some(e => e.includes('introduction list differs')));
});
test('complete new expressions are taught before any full-answer assessment', () => {
  for (const l of course.validateSection(raw).lessons) for (const t of l.new_targets) {
    if (raw.items[t].item_type !== 'expression') continue;
    const taught = l.activities.findIndex(a => a.type === 'teach' && a.item === t), tested = l.activities.findIndex(a => assessesExpression(a, t, raw.items)); assert.ok(taught >= 0 && taught < tested, t);
  }
  const broken = structuredClone(raw), l = broken.lessons[0], target = 'a13s3-e-present-task', old = [...l.activities];
  const evidence = l.learning_objectives.grammar.flatMap(g => g.evidence).map(e => [e, old[e.activity_index]]);
  const [card] = l.activities.splice(l.activities.findIndex(a => a.type === 'teach' && a.item === target), 1); l.activities.push(card);
  for (const [entry, a] of evidence) entry.activity_index = l.activities.indexOf(a);
  assert.ok(verify(broken).errors.some(e => e.includes('new expression must be taught before assessment: ' + target)));
});
test('verb class and KPT introductions respect master prerequisites and recur later', () => {
  for (const [id, index] of [['a13-verb-classes', 0], ['a13-kpt-preview', 5], ['a13-past-recognition', 6]]) {
    assert.equal(raw.lessons[index].learning_objectives.grammar.find(g => g.concept_id === id).status, 'introduced');
    for (const l of raw.lessons.slice(8)) assert.equal(l.learning_objectives.grammar.find(g => g.concept_id === id).status, 'reviewed');
  }
  const broken = structuredClone(raw), l = broken.lessons[0], g = l.learning_objectives.grammar.find(g => g.concept_id === 'a13-verb-classes');
  g.concept_id = 'a13-kpt-preview'; g.prerequisite_concept_ids = ['a13-verb-classes'];
  for (const e of g.evidence) { const a = l.activities[e.activity_index]; a.grammar_concept_ids = a.grammar_concept_ids.map(id => id === 'a13-verb-classes' ? 'a13-kpt-preview' : id); l.structured_practice.find(sp => sp.type === a.type && sp.item === a.item).grammar_concept_ids = [...a.grammar_concept_ids]; }
  assert.ok(verify(broken).errors.some(e => e.includes('prerequisite not introduced earlier: a13-verb-classes')));
});
test('study grammar rejects wrong stems, consonant grade, infinitives, commands, cases and temporal forms', () => {
  const s = course.validateSection(raw);
  for (const [fi, wrong] of [['Teen tämän tänään.', 'Teemme tämän tänään.'], ['Lähetän sinulle viestin.', 'Lähettän sinulle viestin.'], ['Minun pitää harjoitella.', 'Minä pitää harjoitella.'], ['Voin tehdä tämän.', 'Voin teen tämän.'], ['Voitko selittää?', 'Voitko selität?'], ['Avaa tiedosto ensin.', 'Avata tiedosto ensin.'], ['Kirjoita nimi.', 'Kirjoittaa nimi.'], ['Lähetä viesti sen jälkeen.', 'Lähettää viesti sen jälkeen.'], ['Tarvitsen apua.', 'Tarvitsen apu.'], ['Osaan vähän suomea.', 'Osaan vähän suomi.'], ['Opiskelen tässä ryhmässä.', 'Opiskelen tässä ryhmään.'], ['Voitko lähettää sen minulle?', 'Voitko lähettää sen minulla?'], ['Määräaika on perjantaina.', 'Määräaika on perjantai.'], ['Teen sen tällä viikolla.', 'Teen sen tämä viikko.'], ['Teemme tämän yhdessä.', 'Teen tämän yhdessä.']]) {
    const a = s.lessons.flatMap(l => l.activities).find(a => a.type === 'controlled-production' && a.expected_fi === fi && a.grammar_concept_ids?.length); assert.ok(a, fi);
    const item = { surface_form: a.expected_fi, accepted_answers: a.accepted_answers };
    assert.equal(course.gradeActivityAnswer(a, item, fi).accepted, true); assert.equal(course.gradeActivityAnswer(a, item, wrong).accepted, false, wrong);
  }
  const weak = structuredClone(raw), l = weak.lessons[0], a = l.activities.find(a => a.type === 'controlled-production');
  delete a.answer_policy; delete l.structured_practice.find(sp => sp.type === a.type && sp.item === a.item).answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('grammar production lacks morphology policy')));
});
test('past is recognized in a past context and the passive question remains formulaic', () => {
  for (const n of [6, 8, 9]) {
    const l = raw.lessons[n], g = l.learning_objectives.grammar.find(g => g.concept_id === 'a13-past-recognition'); assert.ok(g.evidence.every(e => e.mode === 'recognition'));
    const a = l.activities[g.evidence[0].activity_index]; assert.equal(a.expected_fi, 'olin'); assert.ok(a.options_fi.includes('olen')); assert.equal(a.frame_fi, 'Viime viikolla _____ poissa.');
  }
  for (const l of raw.lessons) for (const a of l.activities) if (a.item === 'a13s3-e-018') assert.equal(a.grammar_concept_ids?.length || 0, 0);
  const broken = structuredClone(raw); broken.lessons[6].learning_objectives.grammar.find(g => g.concept_id === 'a13-past-recognition').evidence[0].mode = 'supported_production';
  assert.throws(() => verify(broken), /production claim requires productive assessment/);
});
test('instruction sequence, four reading facts and supported message writing preserve taught scope', () => {
  const sequence = raw.lessons[2].activities.find(a => a.type === 'sequence-order');
  assert.deepEqual(sequence.answer_order.map(i => raw.items[sequence.items[i]].surface_form), ['Avaa tiedosto ensin.', 'Kirjoita nimi.', 'Lähetä viesti sen jälkeen.']);
  for (const passage of ['a13s3-reading-1', 'a13s3-reading-2']) {
    const activities = raw.lessons[8].activities.filter(a => a.type === 'short-reading' && a.item === passage); assert.equal(activities.length, 2); assert.equal(new Set(activities.map(a => a.question_item)).size, 2);
    for (const a of activities) assert.deepEqual(a.options.filter(t => raw.items[passage].surface_form.includes(raw.items[t].surface_form)), [a.question_item]);
  }
  const writing = raw.lessons[8].activities.find(a => a.type === 'guided-writing'); assert.equal(writing.expected_items.length, 4); assert.equal(writing.answer_policy, 'morphology');
  for (const t of writing.expected_items) assert.ok(raw.lessons.slice(0, 8).some(l => l.activities.some(a => a.type === 'teach' && a.item === t)));
});
test('strict productive recall survives runtime production and dictation injection', () => {
  const s = course.validateSection(raw);
  for (const l of s.lessons) for (const a of l.activities) if (['type', 'production', 'dictation', 'controlled-production', 'expression-completion', 'guided-writing'].includes(a.type)) assert.equal(a.answer_policy, 'morphology');
  const a = s.lessons.flatMap(l => l.activities).find(a => a.type === 'type' && raw.items[a.item]?.surface_form === 'viikolla'); assert.ok(a);
  assert.equal(course.gradeActivityAnswer(a, raw.items[a.item], 'viikolle').accepted, false);
  const weak = structuredClone(raw), l = weak.lessons[0], b = l.activities.find(a => a.type === 'type' && !l.production_targets.includes(a.item) && !l.listening_targets.includes(a.item)); assert.ok(b); delete b.answer_policy;
  assert.ok(verify(weak).errors.some(e => e.includes('productive recall lacks strict morphology policy')));
});
test('study checkpoint retains fifteen targets and eighty percent across its authored length', () => {
  assert.deepEqual(raw.lessons[9].checkpoint_targets, ORIGINAL_CHECKPOINT_TARGETS);
  const cp = course.validateSection(raw).lessons[9]; assert.equal(cp.activities.length, 29);
  assert.equal(course.passesLessonRequirement(cp, 24, 29), true); assert.equal(course.passesLessonRequirement(cp, 23, 29), false);
  const weak = structuredClone(raw); weak.lessons[9].passing_score = 0.7; assert.ok(verify(weak).errors.some(e => e.includes('80% threshold')));
  const changed = structuredClone(raw); changed.lessons[9].checkpoint_targets.pop(); assert.ok(verify(changed).errors.some(e => e.includes('Checkpoint target contract changed')));
});
test('study backfill preserves all original items and stable core progress mappings', () => {
  const hash = value => require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const added = new Set(['a13s3-e-present-task', 'a13s3-e-send-message']);
  assert.equal(hash(Object.fromEntries(Object.entries(raw.items).filter(([id]) => !added.has(id)))), 'dea9b2bcdf4583e8fca5d33d522fed132055e37f5c7e18ae3fa7548ab5bff3ac');
  const core = raw.lessons.map(l => Object.fromEntries(['id', 'curriculum_id', 'production_targets', 'listening_targets', 'checkpoint_targets', 'passing_score', 'curriculum_target_refs'].map(k => [k, l[k] ?? null])));
  assert.equal(hash(core), '17e85fe992296ef04bf7e581bb43cb6bcb830ae5592127d9806aa53c8cde2309');
});
