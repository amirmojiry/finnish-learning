'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const course = require('../course.js');
const section = course.validateSection(require('../data/course/a1.1-section-1.json'));
const concepts = require('../data/course/a1.1-curriculum.json').grammar_concepts;
const intro = section.lessons[4], later = section.lessons[7], checkpoint = section.lessons[9];
const goal = lesson => lesson.learning_objectives.grammar.find(g => g.concept_id === 'a11-questions');

test('question-word decisions assess person identity versus object type rather than translation', () => {
  assert.equal(goal(intro).status, 'introduced');
  const decisions = intro.activities.filter(a => a.type === 'morphology-choice');
  assert.deepEqual(decisions.map(a => a.expected_fi), ['Kuka', 'Mikä']);
  assert.ok(decisions.every(a => a.prompt_fa && a.options_fi.includes('Kuka') && a.options_fi.includes('Mikä')));
  assert.deepEqual(goal(intro).evidence.map(e => e.mode), ['recognition', 'recognition', 'supported_production', 'supported_production']);
  for (const lesson of [intro, later]) {
    const completions = lesson.activities.filter(a => a.type === 'expression-completion' && a.grammar_concept_ids?.includes('a11-questions'));
    assert.ok(completions.length);
    for (const activity of completions) {
      const answer = { surface_form: activity.accepted_answers[0], accepted_answers: activity.accepted_answers };
      assert.equal(course.gradeTypedAnswer(answer, activity.accepted_answers[0]).accepted, true);
      assert.equal(course.gradeTypedAnswer(answer, activity.accepted_answers[0] === 'Kuka' ? 'Mikä' : 'Kuka').accepted, false);
      assert.equal(activity.prompt_fi.replace('_____', activity.accepted_answers[0]), activity.expected_fi);
    }
  }
  const prompts = intro.activities.filter(a => a.type === 'expression-completion').map(a => a.prompt_fi);
  assert.equal(new Set(prompts).size, prompts.length);
});

test('later and checkpoint grammar evidence is reviewed with no new checkpoint targets', () => {
  assert.equal(section.lessons[1].learning_objectives.grammar[0].concept_id, 'a11-olla');
  for (const lesson of [intro, later, checkpoint]) {
    assert.deepEqual(goal(lesson).prerequisite_concept_ids, ['a11-olla']);
    assert.doesNotThrow(() => course.validateLessonObjectives(lesson, section, concepts));
    assert.ok(goal(lesson).examples.every(example => example.fi && example.fa));
    const broken = structuredClone(lesson), evidence = goal(broken).evidence[0];
    broken.activities.find(a => a.type === evidence.activity_type && a.item === evidence.item_id).grammar_concept_ids = [];
    assert.throws(() => course.validateLessonObjectives(broken, section, concepts), /explicit evidence concept link/);
    const badPrerequisite = structuredClone(lesson);
    goal(badPrerequisite).prerequisite_concept_ids = [];
    assert.throws(() => course.validateLessonObjectives(badPrerequisite, section, concepts), /prerequisites differ/);
  }
  assert.ok(later.recycle_from.includes(intro.curriculum_id));
  assert.equal(goal(later).status, 'reviewed');
  assert.ok(later.learning_objectives.lexical.some(g => g.target_id === 'mika-tama-on' && g.status === 'reviewed'));
  assert.equal(goal(checkpoint).status, 'reviewed');
  assert.deepEqual(checkpoint.new_targets, []);
  assert.equal(checkpoint.checkpoint_targets.length, 15);
  assert.equal(checkpoint.activities.length, 24);
  assert.ok(checkpoint.learning_objectives.lexical.every(g => g.status === 'reviewed'));
  const unsupported = structuredClone(later);
  goal(unsupported).evidence[0].mode = 'independent_production';
  assert.throws(() => course.validateLessonObjectives(unsupported, section, concepts), /independent production cannot use a scaffold/);
});

test('appended structured practice preserves earlier positions, audio and saved progress', () => {
  for (const [lesson, length, hash] of [
    [intro, 29, '7e6148f26c610aec4a835a52805487c1d038d2ded3dc7524a7c15a08b20449f4'],
    [later, 25, 'aee3df6134d03b36832a358b54182003eb4e17f9261e607066c9a4a021eb6c80'],
  ]) {
    assert.equal(lesson.activities.length, length);
    const previous = structuredClone(lesson.activities.slice(0, 15));
    for (const activity of previous) {
      if (activity.type === 'expression-completion') { delete activity.grammar_concept_ids; delete activity.prompt_fa; }
      if (lesson === later && activity.type === 'choice' && activity.mode === 'listen') activity.options = ['tama', 'kirja', 'puhelin', 'se'];
    }
    assert.equal(createHash('sha256').update(JSON.stringify(previous)).digest('hex'), hash);
    const prepared = structuredClone(lesson);
    course.injectStructuredPractice(section, prepared);
    assert.deepEqual(prepared.activities, lesson.activities);
  }
  for (const lesson of [intro, later, checkpoint]) {
    for (const type of ['production', 'dictation']) assert.equal(lesson.activities.filter(a => a.type === type).length, 1);
    assert.equal(lesson.activities.filter(a => a.type === 'choice' && a.mode === 'listen').length, 1);
    const old = course.recordLessonCompletion(course.emptyProgress(), lesson.id, 8, 10, 123);
    assert.deepEqual(course.sanitizeProgress(old).lessonScores[lesson.id], { correct: 8, graded: 10, completedAt: 123 });
  }
  for (const [index, item] of [[8, 'kuka-han-on'], [9, 'mika-tama-on']]) {
    assert.equal(checkpoint.activities[index].type, 'morphology-choice');
    assert.equal(checkpoint.activities[index].item, item);
  }
});
