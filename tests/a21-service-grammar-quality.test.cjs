'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const course=require('../course.js');
const raw=require('../data/course/a2.1-section-2.json');
const section=course.validateSection(raw);
const curriculum=require('../data/course/a2.1-curriculum.json');
const [appointment,reschedule]=section.lessons;

test('service lessons assess polite questions, necessity and sentence-level negation',()=>{
  for(const lesson of [appointment,reschedule]) {
    assert.equal(lesson.activities.length,lesson.activity_count);
    assert.doesNotThrow(()=>course.validateLessonObjectives(lesson,section,curriculum.grammar_concepts));
  }
  const request=appointment.activities.find(a=>a.type==='controlled-production'&&a.item==='a21s2-e-007');
  assert.ok(request);
  assert.deepEqual(request.cues_fi,['Onko','teillä']);
  assert.equal(request.expected_fi,'Onko teillä vapaita aikoja tiistaina?');
  assert.ok(request.grammar_concept_ids.includes('a12-requests'));
  const necessity=reschedule.activities.find(a=>a.type==='controlled-production'&&a.item==='a21s2-e-016');
  assert.ok(necessity);
  assert.equal(necessity.expected_fi,'Minun pitää siirtää vastaanottoaikaani.');
  assert.ok(necessity.grammar_concept_ids.includes('a13-necessity'));
  const negative=reschedule.activities.find(a=>a.type==='negative-transform');
  assert.ok(negative);
  assert.equal(section.items[negative.affirmative_item].surface_form,'Pääsen vastaanotolle huomenna.');
  assert.equal(section.items[negative.negative_item].surface_form,'En pääse vastaanotolle huomenna.');
  assert.ok(negative.grammar_concept_ids.includes('a12-negation-expand'));
  assert.ok(reschedule.activities.some(a=>a.type==='inflection-production'&&a.expected_fi==='pääse'));
});

test('previously taught service verbs are reviewed, not presented as new',()=>{
 const targets=new Map(reschedule.learning_objectives.lexical.map(g=>[g.target_id,g.status]));
 assert.equal(targets.get('a21s2-t-013'),'reviewed');
 assert.equal(targets.get('a21s2-t-014'),'reviewed');
 assert.equal(targets.get('a21s2-t-015'),'introduced');
 const earlier=require('../data/course/a1.3-section-1.json');
 for(const target of ['siirtää','perua'])assert.ok(earlier.lessons.some(l=>l.new_targets.some(id=>earlier.items[id]?.surface_form===target)));
});

test('grammar evidence requires real linked graded decisions and canonical prerequisites',()=>{
 for(const lesson of [appointment,reschedule])for(const goal of lesson.learning_objectives.grammar){
  assert.equal(goal.status,'reviewed');
  const damaged=structuredClone(lesson);
  const evidence=goal.evidence[0];
  const activity=damaged.activities.find(a=>a.type===evidence.activity_type&&a.item===evidence.item_id);
  assert.ok(activity);
  activity.grammar_concept_ids=[];
  assert.throws(()=>course.validateLessonObjectives(damaged,section,curriculum.grammar_concepts),/explicit evidence concept link/);
  const badPrereq=structuredClone(lesson);
  badPrereq.learning_objectives.grammar.find(g=>g.concept_id===goal.concept_id).prerequisite_concept_ids=[];
  assert.throws(()=>course.validateLessonObjectives(badPrereq,section,curriculum.grammar_concepts),/prerequisites differ/);
 }
 assert.equal(section.lessons.length,10);
 assert.equal(section.lessons.reduce((total,l)=>total+l.activities.length,0),184);
});
