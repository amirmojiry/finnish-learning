'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const course=require('../course.js');
const original=require('../data/course/a2.1-section-1.json');
const clone=()=>structuredClone(original);
const altered=count=>{
 const section=clone(),lesson=section.lessons[0];
 if(count===14)lesson.activities.splice(6,1);
 else if(count>15){
   const extra=structuredClone(lesson.activities.find(a=>a.type==='choice'&&a.mode==='meaning'&&a.item==='a21s1-e-006'));
   for(let i=0;i<count-15;i++)lesson.activities.push(structuredClone(extra));
 }
 return section;
};
test('variable authored lesson activity counts 14, 16, 25 survive preparation unchanged',()=>{
 for(const count of [14,16,25]){
   const raw=altered(count);
   const checked=course.validateSection(raw);
   assert.equal(checked.lessons[0].activities.length,count);
   assert.equal(raw.lessons[0].activities.length,count);
   assert.equal(checked.lessons[1].activities.length,15);
   assert.equal(checked.lessons[0].activities.filter(x=>x.type==='production').length,1);
   assert.equal(checked.lessons[0].activities.filter(x=>x.type==='dictation').length,1);
   assert.equal(checked.lessons[0].activities.filter(x=>x.type==='choice'&&x.mode==='listen').length,1);
 }
});
test('checkpoint preserves fifteen target identities but can add graded review slots',()=>{
 const raw=clone(),checkpoint=raw.lessons[9],extra=structuredClone(checkpoint.activities[0]);
 checkpoint.activities.push(extra);
 const checked=course.validateSection(raw),done=checked.lessons[9];
 assert.equal(done.activities.length,16);
 assert.equal(done.checkpoint_targets.length,15);
 assert.equal(new Set(done.checkpoint_targets).size,15);
});
test('invalid empty, overflowing or absent activity arrays fail closed',()=>{
 for(const count of [0,61]){
  const raw=clone();raw.lessons[0].activities=count===0?[]:Array.from({length:count},()=>structuredClone(raw.lessons[0].activities[5]));
  assert.throws(()=>course.validateSection(raw),/between 1 and 60 activities/);
 }
 const missing=clone();missing.lessons[0].activities=null;
 assert.throws(()=>course.validateSection(missing),/between 1 and 60 activities|curriculum metadata/);
});
test('scores persist their real graded denominator without storage shape changes',()=>{
 let progress=course.emptyProgress();
 progress=course.recordLessonCompletion(progress,'a2.1-section-1-lesson-1',17,21,12345);
 assert.deepEqual(progress.lessonScores['a2.1-section-1-lesson-1'],{correct:17,graded:21,completedAt:12345});
 assert.ok(progress.completedLessons.includes('a2.1-section-1-lesson-1'));
});
