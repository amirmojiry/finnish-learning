'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const course=require('../course.js');
const grammar=require('../data/course/a2.1-curriculum.json').grammar_concepts;
const raw=[require('../data/course/a2.1-section-1.json'),require('../data/course/a2.1-section-2.json')];
const sections=raw.map(x=>course.validateSection(x));
const all=sections.flatMap(section=>section.lessons.map(lesson=>({section,lesson})));
test('audit all twenty A2.1 lessons and preserve listening and productive practice',()=>{
 assert.equal(all.length,20);
 for(const {section,lesson} of all){
   assert.doesNotThrow(()=>course.validateLessonObjectives(lesson,section,grammar));
   assert.equal(lesson.activities.length,15);
   assert.ok(lesson.activities.some(a=>a.type==='inflection-production'),lesson.id);
   assert.equal(lesson.activities.filter(a=>a.type==='production').length,1,lesson.id);
   assert.equal(lesson.activities.filter(a=>a.type==='dictation').length,1,lesson.id);
   assert.equal(lesson.activities.filter(a=>a.type==='choice'&&a.mode==='listen').length,1,lesson.id);
   assert.ok(lesson.learning_objectives.grammar.every(goal=>goal.evidence.length>0));
 }
});
test('new object, quantity, rection and destination forms are explicitly and correctly graded',()=>{
 const checks=[
 [0,2,'a21-object-core','paluulipun'],[0,3,'a12-quantities','tuntia'],
 [0,4,'a21-rections','hintaan'],[0,5,'a21-object-core','lippua'],
 [0,6,'a21-rections','kaupungista'],[0,8,'a21-illative-patterns','kotiin'],
 [1,4,'a21-rections','lääkkeestä']
 ];
 for(const [s,l,concept,answer] of checks){
  const section=sections[s],lesson=section.lessons[l];
  const choice=lesson.activities.find(a=>a.type==='morphology-choice'&&a.grammar_concept_ids?.includes(concept));
  assert.ok(choice,lesson.id+'/'+concept);
  assert.equal(choice.expected_fi,answer);
  assert.equal(choice.frame_fi.replace('_____',answer),section.items[choice.item].surface_form);
  assert.equal(choice.options_fi.filter(x=>x===answer).length,1);
  const goal=lesson.learning_objectives.grammar.find(g=>g.concept_id===concept);
  assert.equal(goal.evidence[0].mode,'recognition');
  const broken=structuredClone(lesson);
  broken.activities.find(a=>a.type==='morphology-choice'&&a.item===choice.item).grammar_concept_ids=[];
  assert.throws(()=>course.validateLessonObjectives(broken,section,grammar),/explicit evidence concept link/);
 }
});
test('sequencing and checkpoint object review have real positive scored evidence',()=>{
 const sec=sections[0],sequence=sec.lessons[7],cp=sec.lessons[9];
 const act=sequence.activities.find(a=>a.type==='controlled-production'&&a.item==='a21s1-e-072');
 assert.equal(act.expected_fi,'Lopuksi palasin kotiin.');
 assert.ok(act.grammar_concept_ids.includes('a21-sequencing'));
 assert.equal(sequence.learning_objectives.grammar.find(g=>g.concept_id==='a21-sequencing').evidence[0].mode,'supported_production');
 const completion=cp.activities.find(a=>a.type==='expression-completion'&&a.item==='a21s1-e-043');
 assert.ok(completion.grammar_concept_ids.includes('a21-object-core'));
 assert.ok(cp.learning_objectives.lexical.every(g=>g.status==='reviewed'));
 assert.ok(sections[1].lessons[9].learning_objectives.lexical.every(g=>g.status==='reviewed'));
});
