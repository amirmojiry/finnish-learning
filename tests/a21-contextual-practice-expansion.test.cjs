'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const course=require('../course.js');
const curriculum=require('../data/course/a2.1-curriculum.json');
const raw=[require('../data/course/a2.1-section-1.json'),require('../data/course/a2.1-section-2.json')];
const sections=raw.map(section=>course.validateSection(section));
const expectedCounts=[
 [17,18,20,18,18,18,19,18,19,15],
 [19,19,18,19,19,19,18,19,19,15],
];

test('all 20 shipped A2.1 lessons have exactly their authored length and retain core activities',()=>{
 assert.equal(sections.length,2);
 assert.equal(sections.flatMap(section=>section.lessons).length,20);
 sections.forEach((section,index)=>{
  assert.deepEqual(section.lessons.map(l=>l.activities.length),expectedCounts[index]);
  assert.equal(section.lessons.reduce((sum,l)=>sum+l.activities.length,0),index===0?180:184);
  section.lessons.forEach((lesson,i)=>{
   assert.equal(lesson.activities.length,lesson.activity_count??15);
   assert.equal(lesson.activities.filter(a=>a.type==='production').length,1);
   assert.equal(lesson.activities.filter(a=>a.type==='dictation').length,1);
   assert.equal(lesson.activities.filter(a=>a.type==='choice'&&a.mode==='listen').length,1);
   assert.equal(lesson.activities.filter(a=>a.type==='inflection-production').length,1);
   assert.doesNotThrow(()=>course.validateLessonObjectives(lesson,section,curriculum.grammar_concepts));
   if(i===9){
    assert.equal(lesson.activities.length,15);
    assert.equal(lesson.checkpoint_targets.length,15);
    assert.deepEqual(lesson.new_targets,[]);
    assert.ok(lesson.learning_objectives.lexical.every(x=>x.status==='reviewed'));
   }else{
    assert.ok(lesson.activity_count>15);
   }
  });
 });
});

test('contextual Finnish clozes positively assess missing authored word forms in 18 lessons',()=>{
 let contextual=0,isolated=0,complete=0;
 sections.forEach((section,index)=>section.lessons.slice(0,9).forEach((lesson,i)=>{
  const specKeys=new Set();
  for(const spec of lesson.structured_practice||[]){
   if(spec.type!=='expression-completion'||section.items[spec.item]?.item_type!=='word')continue;
   const key=spec.type+'::'+spec.item;
   assert.ok(!specKeys.has(key),lesson.id+' duplicated contextual practice');
   specKeys.add(key);
   assert.ok(spec.prompt_fi.includes('_____'));
   assert.equal(spec.prompt_fi.replace('_____',spec.accepted_answers[0]),spec.expected_fi);
   assert.ok(spec.expected_fa?.trim());
   assert.ok(lesson.activities.some(a=>a.type===spec.type&&a.item===spec.item));
   contextual++;
  }
  for(const target of lesson.new_targets){
   if(section.items[target].item_type!=='word')continue;
   const tested=lesson.activities.some(a=>a.type!=='teach'&&a.type!=='number-grid'&&a.item===target);
   assert.ok(tested,lesson.id+' has unassessed new word '+target);
  }
  isolated+=lesson.activities.filter(a=>a.type==='type'&&section.items[a.item]?.item_type==='word').length;
  complete+=lesson.activities.filter(a=>a.type==='type'&&section.items[a.item]?.item_type==='expression').length;
 }));
 assert.equal(contextual,45);
 assert.ok(isolated>=1,'paluulippu has no full-sentence source example');
 assert.ok(complete>=13,'retrieve full service/travel phrases in writing');
});

test('the -maan target has an authored bilingual example, graded correct answer and later typed review',()=>{
 const travel=sections[0],id='a21s1-e-maan-001',item=travel.items[id];
 assert.equal(item.surface_form,'Lähdin ostamaan lippua.');
 assert.equal(item.translation_fa,'برای خرید بلیت راه افتادم.');
 assert.equal(item.frequency_status,'unranked');
 assert.equal(item.frequency_rank,null);
 const ticket=travel.lessons[2];
 assert.ok(ticket.practice_targets.includes(id));
 const decision=ticket.activities.find(a=>a.type==='morphology-choice'&&a.item===id);
 const guided=ticket.activities.find(a=>a.type==='controlled-production'&&a.item===id);
 assert.ok(decision);
 assert.equal(decision.frame_fi.replace('_____',decision.expected_fi),item.surface_form);
 assert.equal(decision.expected_fi,'ostamaan');
 assert.equal(decision.options_fi.filter(x=>x==='ostamaan').length,1);
 assert.ok(decision.grammar_concept_ids.includes('a21-maan'));
 assert.ok(guided.grammar_concept_ids.includes('a21-maan'));
 const introduction=ticket.learning_objectives.grammar.find(g=>g.concept_id==='a21-maan');
 assert.equal(introduction.status,'introduced');
 assert.deepEqual(introduction.prerequisite_concept_ids,['a13-verb-classes']);
 assert.deepEqual(introduction.evidence.map(e=>e.mode),['recognition','supported_production']);
 const later=travel.lessons[7],review=later.learning_objectives.grammar.find(g=>g.concept_id==='a21-maan');
 assert.equal(review.status,'reviewed');
 assert.ok(later.practice_targets.includes(id));
 assert.ok(later.activities.some(a=>a.type==='type'&&a.item===id&&a.grammar_concept_ids.includes('a21-maan')));
});

test('plural-partitive and four-event narration have real positively scored grade evidence',()=>{
 const travel=sections[0],sights=travel.lessons[6];
 const form=sights.activities.find(a=>a.type==='morphology-choice'&&a.item==='a21s1-t-058');
 assert.ok(form);
 assert.equal(form.expected_fi,'valokuvia');
 assert.equal(form.frame_fi.replace('_____',form.expected_fi),'Otin valokuvia.');
 assert.equal(form.options_fi.filter(x=>x==='valokuvia').length,1);
 const goal=sights.learning_objectives.grammar.find(g=>g.concept_id==='a21-plural-partitive');
 assert.equal(goal.status,'introduced');
 assert.deepEqual(goal.prerequisite_concept_ids,['a12-quantities']);
 assert.equal(goal.evidence[0].mode,'recognition');
 const narrative=travel.lessons[8],story=narrative.activities.find(a=>a.type==='guided-writing');
 assert.deepEqual(story.expected_items,['a21s1-e-077','a21s1-e-078','a21s1-e-079','a21s1-e-080']);
 const sequenceGoal=narrative.learning_objectives.grammar.find(g=>g.concept_id==='a21-sequencing');
 assert.equal(sequenceGoal.status,'reviewed');
 assert.equal(sequenceGoal.evidence[0].mode,'supported_production');
 const broken=structuredClone(narrative);
 broken.activities.find(a=>a.type==='guided-writing').grammar_concept_ids=[];
 assert.throws(()=>course.validateLessonObjectives(broken,travel,curriculum.grammar_concepts),/explicit evidence concept link/);
});

test('new contexts never replace existing 15-target checkpoints or affect stored A1 progress',()=>{
 let progress=course.recordLessonCompletion(course.emptyProgress(),'a1.3-section-4-lesson-1',9,10,123);
 assert.deepEqual(course.sanitizeProgress(progress).lessonScores['a1.3-section-4-lesson-1'],{correct:9,graded:10,completedAt:123});
 for(const section of sections){
  const checkpoint=section.lessons[9];
  assert.equal(checkpoint.checkpoint_targets.length,15);
  assert.equal(checkpoint.activities.length,15);
  assert.ok(checkpoint.activities.some(a=>a.type==='dictation'));
 }
});
