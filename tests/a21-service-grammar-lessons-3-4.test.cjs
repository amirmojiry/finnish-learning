'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const course=require('../course.js');
const curriculum=require('../data/course/a2.1-curriculum.json');
const raw=require('../data/course/a2.1-section-2.json');
const section=course.validateSection(raw);
const [symptoms,clarification]=section.lessons.slice(2,4);
const validate=lesson=>course.validateLessonObjectives(lesson,section,curriculum.grammar_concepts);

test('symptoms include a genuine partitive decision and two assessed past-tense answers',()=>{
 assert.doesNotThrow(()=>validate(symptoms));
 const quantity=symptoms.activities.find(a=>a.type==='morphology-choice'&&a.item==='a21s2-e-026');
 assert.ok(quantity);
 assert.equal(quantity.frame_fi,'Minulla on vähän _____.');
 assert.deepEqual(quantity.options_fi,['kuume','kuumetta','kuumeen','kuumeeseen']);
 assert.equal(quantity.expected_fi,'kuumetta');
 assert.equal(quantity.options_fi.filter(x=>x===quantity.expected_fi).length,1);
 assert.ok(quantity.grammar_concept_ids.includes('a12-quantities'));
 const reported=symptoms.activities.find(a=>a.type==='controlled-production'&&a.item==='a21s2-e-029');
 assert.equal(reported.expected_fi,'Minulla oli kuumetta eilen.');
 assert.ok(reported.grammar_concept_ids.includes('a21-imperfect'));
 assert.ok(symptoms.activities.some(a=>a.type==='inflection-production'&&a.expected_fi==='alkoivat'));
 assert.equal(symptoms.learning_objectives.grammar.find(g=>g.concept_id==='a12-quantities').evidence[0].mode,'recognition');
 assert.equal(symptoms.learning_objectives.lexical.find(g=>g.target_id==='a21s2-e-026').status,'reviewed');
 const a12=require('../data/course/a1.2-section-4.json');
 assert.ok(a12.lessons.some(l=>l.activities.some(a=>a.type==='type'&&a.item&&a12.items[a.item]?.surface_form==='Minulla on kuumetta.')));
});

test('clarification assesses staff request and necessity rather than translation alone',()=>{
 assert.doesNotThrow(()=>validate(clarification));
 const request=clarification.activities.find(a=>a.type==='controlled-production'&&a.item==='a21s2-e-034');
 assert.equal(request.expected_fi,'Voitteko toistaa ohjeen?');
 assert.deepEqual(request.cues_fi,['Voitteko','toistaa']);
 assert.ok(request.grammar_concept_ids.includes('a12-requests'));
 const necessity=clarification.activities.find(a=>a.type==='inflection-production'&&a.item==='a21s2-e-036');
 assert.equal(necessity.frame_fi,'Mitä minun pitää _____ seuraavaksi?');
 assert.equal(necessity.expected_fi,'tehdä');
 assert.ok(necessity.grammar_concept_ids.includes('a13-necessity'));
 assert.ok(clarification.activities.some(a=>a.type==='sentence-order'&&a.item==='a21s2-e-036'));
 assert.equal(clarification.learning_objectives.grammar.length,2);
});

test('both lessons keep activity and progress contracts without padding',()=>{
 for(const lesson of [symptoms,clarification]){
  assert.equal(lesson.activities.length,lesson.activity_count);
  assert.equal(lesson.activities.filter(a=>a.type==='production').length,1);
  assert.equal(lesson.activities.filter(a=>a.type==='dictation').length,1);
  assert.equal(lesson.activities.filter(a=>a.type==='choice'&&a.mode==='listen').length,1);
  assert.equal(lesson.activities.filter(a=>['morphology-choice','inflection-production'].includes(a.type)).length,lesson.morphology_practice.length);
  assert.equal(lesson.activities.filter(a=>['sentence-order','controlled-production','expression-completion'].includes(a.type)).length,lesson.structured_practice.length);
  assert.deepEqual(lesson.learning_objectives.lexical.map(x=>x.target_id),lesson.new_targets);
 }
 assert.equal(section.lessons.reduce((total,l)=>total+l.activities.length,0),184);
});

test('missing evidence, unlinked correct answers and fabricated prereqs are rejected',()=>{
 for(const lesson of [symptoms,clarification]){
  for(const objective of lesson.learning_objectives.grammar){
   const damaged=structuredClone(lesson);
   const ev=objective.evidence[0];
   const actual=damaged.activities.find(a=>a.type===ev.activity_type&&a.item===ev.item_id);
   assert.ok(actual);
   actual.grammar_concept_ids=[];
   assert.throws(()=>validate(damaged),/explicit evidence concept link/);
   const wrongPrereq=structuredClone(lesson);
   wrongPrereq.learning_objectives.grammar.find(g=>g.concept_id===objective.concept_id).prerequisite_concept_ids=[];
   assert.throws(()=>validate(wrongPrereq),/prerequisites differ/);
  }
 }
});
