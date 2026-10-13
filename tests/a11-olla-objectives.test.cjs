'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const course = require('../course.js');
const { registryFor, synchronize } = require('../scripts/sync-grammar-registry.cjs');
const master = require('../data/course/master-curriculum.json');
const curriculum = require('../data/course/a1.1-curriculum.json');
const raw = require('../data/course/a1.1-section-1.json');
const section = course.validateSection(raw);
const intro = section.lessons[1], review = section.lessons[8];
const goal = lesson => lesson.learning_objectives.grammar[0];
const typed = lesson => lesson.activities.filter(a => ['expression-completion', 'inflection-production'].includes(a.type));

test('olla introduction positively assesses both people and reuses the existing olen completion', () => {
  assert.equal(goal(intro).concept_id, 'a11-olla');
  assert.equal(goal(intro).status, 'introduced');
  assert.deepEqual(goal(intro).prerequisite_concept_ids, []);
  assert.deepEqual(goal(intro).evidence.map(e => e.mode), ['recognition', 'recognition', 'supported_production', 'supported_production']);
  const decisions = intro.activities.filter(a => a.type === 'morphology-choice');
  assert.deepEqual(decisions.map(a => a.expected_fi), ['olen', 'olet']);
  assert.ok(decisions.every(a => a.options_fi.filter(x => x === a.expected_fi).length === 1));
  assert.equal(typed(intro).filter(a => (a.prompt_fi || a.frame_fi) === 'Minä _____ Suomessa.').length, 1);
  assert.ok(goal(intro).evidence.some(e => e.activity_type === 'expression-completion' && e.item_id === 'olen'));
  for (const lesson of [intro, review]) for (const activity of typed(lesson)) {
    const answer = { surface_form: activity.accepted_answers[0], accepted_answers: activity.accepted_answers };
    assert.equal(course.gradeMorphologyAnswer(answer, activity.item).accepted, true);
    for (const wrong of ['olen', 'olet', 'on', 'olla'].filter(word => word !== activity.item)) {
      assert.equal(course.gradeMorphologyAnswer(answer, wrong).accepted, false);
    }
  }
});

test('later dialogue practice reviews both forms in fresh contexts without new words', () => {
  assert.equal(goal(review).status, 'reviewed');
  assert.ok(review.order > intro.order);
  assert.ok(review.recycle_from.includes(intro.curriculum_id));
  assert.deepEqual(review.new_targets, []);
  assert.ok(review.learning_objectives.lexical.every(g => g.status === 'reviewed'));
  for (const form of ['olen', 'olet']) {
    assert.ok(review.practice_targets.includes(form));
    assert.ok(review.review_targets.includes(form));
  }
  const earlierFrames = new Set(typed(intro).map(a => a.prompt_fi || a.frame_fi));
  assert.ok(typed(review).every(a => !earlierFrames.has(a.frame_fi)));
  for (const lesson of [intro, review]) {
    assert.doesNotThrow(() => course.validateLessonObjectives(lesson, section, curriculum.grammar_concepts));
    const display = course.lessonObjectiveDisplay(lesson, section.items);
    assert.equal(display.structured, true);
    assert.ok(display.communicative.length && display.lexical.length && display.grammarGoals.length);
    for (const example of goal(lesson).examples) assert.ok(example.fi && example.fa);
    const broken = structuredClone(lesson);
    typed(broken)[0].grammar_concept_ids = [];
    assert.throws(() => course.validateLessonObjectives(broken, section, curriculum.grammar_concepts), /explicit evidence concept link/);
    const unsupported = structuredClone(lesson);
    goal(unsupported).evidence.at(-1).mode = 'independent_production';
    assert.throws(() => course.validateLessonObjectives(unsupported, section, curriculum.grammar_concepts), /independent production cannot use a scaffold/);
    const badPrerequisite = structuredClone(lesson);
    goal(badPrerequisite).prerequisite_concept_ids = ['a11-questions'];
    assert.throws(() => course.validateLessonObjectives(badPrerequisite, section, curriculum.grammar_concepts), /prerequisites differ/);
  }
  for (const index of [0, 2, 5]) {
    assert.equal(course.lessonObjectiveDisplay(section.lessons[index], section.items).structured, false);
  }
});

test('appended authored morphology preserves original prepared positions and saved scores', () => {
  for (const [lesson, count, hash] of [
    [intro, 18, '2395628f5a5e49b2d68e0d86dd9e6ff14d3d61c3502dd0a2472e987701ec6429'],
    [review, 17, 'fa9bc078b1d71f0b94bc52a57c0a334b6a9061b3eb18dd142b50fee3d2d62161'],
  ]) {
    assert.equal(lesson.activities.length, count);
    const previous = structuredClone(lesson.activities.slice(0, 15));
    if (lesson === intro) delete previous.find(a => a.type === 'expression-completion').grammar_concept_ids;
    assert.equal(createHash('sha256').update(JSON.stringify(previous)).digest('hex'), hash);
    assert.equal(lesson.activities.filter(a => course.MORPHOLOGY_PRACTICE_TYPES.includes(a.type)).length, lesson.morphology_practice.length);
    const stored = course.recordLessonCompletion(course.emptyProgress(), lesson.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(stored).lessonScores[lesson.id], { correct: 8, graded: 10, completedAt: 123 });
    for (const type of ['production', 'dictation']) assert.equal(lesson.activities.filter(a => a.type === type).length, 1);
  }
  assert.equal(section.lessons[9].activities.length, 15);
  assert.equal(section.lessons[9].checkpoint_targets.length, 15);
  assert.deepEqual(section.lessons[9].new_targets, []);
});

test('canonical registry synchronization detects drift and writes deterministically without changing A2.1', () => {
  assert.deepEqual(curriculum.grammar_concepts, registryFor(master, 'A1.1'));
  assert.deepEqual(registryFor(master, 'A2.1'), require('../data/course/a2.1-curriculum.json').grammar_concepts);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'olla-registry-'));
  const directory = path.join(root, 'data/course');
  fs.mkdirSync(directory, { recursive: true });
  try {
    fs.writeFileSync(path.join(directory, 'master-curriculum.json'), JSON.stringify(master));
    for (const level of ['a1.1', 'a2.1']) fs.copyFileSync(path.join(__dirname, '../data/course/' + level + '-curriculum.json'), path.join(directory, level + '-curriculum.json'));
    const filename = path.join(directory, 'a1.1-curriculum.json');
    const broken = structuredClone(curriculum);
    broken.grammar_concepts[1].prerequisites = ['fabricated'];
    fs.writeFileSync(filename, JSON.stringify(broken));
    assert.throws(() => synchronize(root, '--check'), /A1.1 grammar registry differs/);
    synchronize(root, '--write');
    const first = fs.readFileSync(filename, 'utf8');
    synchronize(root, '--write');
    assert.equal(fs.readFileSync(filename, 'utf8'), first);
    assert.doesNotThrow(() => synchronize(root, '--check'));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
