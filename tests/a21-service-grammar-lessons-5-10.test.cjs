'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const course=require('../course.js');
const section=course.validateSection(require('../data/course/a2.1-section-2.json'));
const curriculum=require('../data/course/a2.1-curriculum.json');
const lessons=section.lessons.slice(4);
const expected=[
 ['a12-requests','a13-present-paradigm'],
 ['a13-necessity','a11-questions'],
 ['a13-present-paradigm','a13-necessity'],
 ['a12-requests'],
 ['a12-requests','a13-present-paradigm'],
 ['a13-necessity','a13-present-paradigm']
];
test('all six service lessons declare separately assessed communicative, lexical and grammar goals',()=>{
 assert.equal(lessons.length,6);
 for(const [i,lesson] of lessons.entries()){
  assert.doesNotThrow(()=>course.validateLessonObjectives(lesson,section,curriculum.grammar_concepts));
  assert.deepEqual(lesson.learning_objectives.communicative,[{id:lesson.id+'-can-do',can_do_fa:lesson.objective_fa}]);
  assert.deepEqual(lesson.learning_objectives.grammar.map(g=>g.concept_id),expected[i]);
  assert.deepEqual(lesson.learning_objectives.lexical.map(g=>g.target_id),i===5?lesson.checkpoint_targets:lesson.new_targets);
  assert.equal(lesson.activities.length,15);
  for(const goal of lesson.learning_objectives.grammar){
   const canonical=curriculum.grammar_concepts.find(g=>g.id===goal.concept_id);
   assert.deepEqual(goal.prerequisite_concept_ids,canonical.prerequisites);
   assert.equal(goal.status,'reviewed');
   const link=goal.evidence[0];
   assert.equal(link.mode,'supported_production');
   const activity=lesson.activities.find(a=>a.type===link.activity_type&&a.item===link.item_id);
   assert.ok(activity,'positive graded evidence is missing: '+lesson.id+' '+goal.concept_id);
   assert.ok(activity.grammar_concept_ids.includes(goal.concept_id));
   const broken=structuredClone(lesson);
   broken.activities.find(a=>a.type===link.activity_type&&a.item===link.item_id).grammar_concept_ids=[];
   assert.throws(()=>course.validateLessonObjectives(broken,section,curriculum.grammar_concepts),/explicit evidence concept link/);
   const bad=structuredClone(lesson);
   bad.learning_objectives.grammar.find(g=>g.concept_id===goal.concept_id).prerequisite_concept_ids=[];
   assert.throws(()=>course.validateLessonObjectives(bad,section,curriculum.grammar_concepts),/prerequisites differ/);
  }
 }
});
test('each of five service lessons requires real Finnish guided response and typed inflection',()=>{
 const targets=['a21s2-e-044','a21s2-e-052','a21s2-e-065','a21s2-e-073','a21s2-e-079'];
 for(const [i,lesson] of lessons.slice(0,5).entries()){
  const guided=lesson.activities.find(a=>a.type==='controlled-production'&&a.item===targets[i]);
  assert.ok(guided);
  assert.equal(guided.expected_fi,section.items[targets[i]].surface_form);
  assert.ok(guided.cues_fi.length);
  assert.ok(lesson.activities.some(a=>a.type==='inflection-production'));
  assert.equal(lesson.activities.filter(a=>a.type==='production').length,1);
  assert.equal(lesson.activities.filter(a=>a.type==='dictation').length,1);
  assert.equal(lesson.activities.filter(a=>a.type==='choice'&&a.mode==='listen').length,1);
 }
});
test('authored lexical recurrence and cumulative checkpoint have no fabricated new vocabulary',()=>{
 const [pharmacy,,,,integrated,checkpoint]=lessons;
 assert.equal(new Map(pharmacy.learning_objectives.lexical.map(g=>[g.target_id,g.status])).get('a21s2-t-040'),'reviewed');
 const prior=require('../data/course/a1.2-section-2.json');
 assert.ok(prior.lessons.some(l=>l.new_targets.some(id=>prior.items[id]?.surface_form==='apteekki')));
 const statuses=new Map(integrated.learning_objectives.lexical.map(g=>[g.target_id,g.status]));
 assert.equal(statuses.get('a21s2-t-069'),'reviewed');
 assert.equal(statuses.get('a21s2-t-076'),'reviewed');
 assert.deepEqual(checkpoint.new_targets,[]);
 assert.equal(checkpoint.checkpoint_targets.length,15);
 assert.deepEqual(checkpoint.learning_objectives.lexical.map(g=>g.target_id),checkpoint.checkpoint_targets);
 assert.ok(checkpoint.learning_objectives.lexical.every(g=>g.status==='reviewed'));
 assert.deepEqual(checkpoint.activities.filter(a=>a.type==='controlled-production').map(a=>a.item),['a21s2-e-055']);
 assert.ok(checkpoint.activities.some(a=>a.type==='inflection-production'&&a.item==='a21s2-e-061'));
});
