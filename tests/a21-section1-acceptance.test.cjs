'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const course=require('../course.js');
const raw=require('../data/course/a2.1-section-1.json'),curriculum=require('../data/course/a2.1-curriculum.json');
const sidecar=require('../data/course/lexical-identity-sidecar.json');
const prior=['a1.1','a1.2','a1.3'].flatMap(level=>[1,2,3,4].map(n=>require('../data/course/'+level+'-section-'+n+'.json')));
const curricula=Object.fromEntries(['a1.1','a1.2','a1.3'].map(level=>[level.toUpperCase(),require('../data/course/'+level+'-curriculum.json')]));
const {evaluate,ORIGINAL_CHECKPOINT_TARGETS,assessesExpression}=require('../scripts/audit-a21-section1.cjs');
const verify=x=>evaluate(x,curriculum,sidecar,prior,curricula);
test('A2.1 travel acceptance covers every introduction and later retrieval',()=>{
 const result=verify(raw);assert.deepEqual(result.errors,[]);
 assert.equal(result.summary.lessons,10);assert.equal(result.summary.missing_positive_targets,0);
 assert.equal(result.summary.repeated_new_labels,0);
 assert.equal(result.summary.introduced_surface_forms_and_expressions,result.summary.surfaces_with_later_positive_review);
 for(const lesson of raw.lessons)assert.equal(lesson.learning_objectives.grammar_scope,'assessed');
 for(const lesson of raw.lessons.slice(8))assert.deepEqual(lesson.new_targets,[]);
});
test('complete expressions are introduced before assessment',()=>{
 const prepared=course.validateSection(raw);
 for(const lesson of prepared.lessons)for(const id of lesson.new_targets){
  if(raw.items[id].item_type!=='expression')continue;
  const taught=lesson.activities.findIndex(a=>a.type==='teach'&&a.item===id);
  const assessed=lesson.activities.findIndex(a=>assessesExpression(a,id,raw.items));
  assert.ok(taught>=0&&assessed>taught,lesson.id+': '+id);
 }
 const altered=structuredClone(raw),lesson=altered.lessons[0],id=lesson.new_targets.find(x=>raw.items[x].item_type==='expression');
 lesson.activities=lesson.activities.filter(a=>!(a.type==='teach'&&a.item===id));
 assert.ok(verify(altered).errors.some(error=>error.includes('expression assessed before teaching: '+id)));
});
test('missing positives and vacuous alternatives fail section audit',()=>{
 const altered=structuredClone(raw),lesson=altered.lessons[0],id=lesson.learning_objectives.lexical[0].target_id;
 lesson.activities=lesson.activities.map(a=>a.item===id&&a.type!=='teach'?{type:'teach',item:id}:a);
 assert.ok(verify(altered).errors.some(e=>e.includes('target lacks positive answer: '+id)));
 const second=structuredClone(raw),choice=second.lessons[0].activities.find(a=>a.type==='choice');choice.options=[choice.item];
 assert.ok(verify(second).errors.some(e=>e.includes('meaningful alternatives')));
});
test('reading and writing use taught material and strict grading',()=>{
 const result=verify(raw);assert.deepEqual(result.errors,[]);
 for(const id of ['a21s1-reading-1','a21s1-reading-2'])assert.equal(raw.lessons[8].activities.filter(a=>a.type==='short-reading'&&a.item===id).length,2);
 for(const index of [7,8]){
  const a=raw.lessons[index].activities.find(a=>a.type==='guided-writing');
  assert.equal(a.expected_items.length,4);assert.equal(a.answer_policy,'morphology');
  for(const id of a.expected_items)assert.ok(raw.lessons.slice(0,index+1).some(l=>l.activities.some(a=>a.type==='teach'&&a.item===id)));
 }
});
test('checkpoint preserves fifteen targets, eighty percent and historical IDs',()=>{
 const checkpoint=raw.lessons[9];assert.deepEqual(checkpoint.checkpoint_targets,ORIGINAL_CHECKPOINT_TARGETS);
 assert.equal(checkpoint.passing_score,0.8);assert.equal(Object.keys(raw.items).length,83);
 assert.deepEqual(raw.lessons.map(l=>l.id),Array.from({length:10},(_,i)=>'a2.1-section-1-lesson-'+(i+1)));
 const lesson=course.validateSection(raw).lessons[0],p=course.recordLessonCompletion(course.emptyProgress(),lesson.id,8,10,123);
 assert.deepEqual(course.sanitizeProgress(p).lessonScores[lesson.id],{correct:8,graded:10,completedAt:123});
});
