'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const course=require('../course.js');
const raw=require('../data/course/a2.1-section-2.json');
test('generated activity counts may differ without changing the default legacy fifteen',()=>{
 const targets=['a','b','c'];
 assert.equal(course.buildStandardActivities(targets,[],12).length,12);
 assert.equal(course.buildStandardActivities(targets,[],18).length,18);
 assert.equal(course.buildStandardActivities(targets,[],20).length,20);
 assert.equal(course.buildStandardActivities(targets).length,15);
 assert.throws(()=>course.buildStandardActivities(targets,[],5),/cannot omit/);
 assert.throws(()=>course.buildStandardActivities(targets,[],0),/Invalid/);
 assert.throws(()=>course.buildStandardActivities(targets,[],201),/Invalid/);
});
test('explicitly authored lesson activity counts may grow independently',()=>{
 const modified=structuredClone(raw);
 const lesson=modified.lessons[0];
 lesson.activities.push({...lesson.activities.find(a=>a.type==='choice'&&a.mode==='meaning')});
 assert.equal(lesson.activities.length,16);
 lesson.activity_count=16;
 assert.equal(course.validateSection(modified).lessons[0].activities.length,16);
 assert.equal(course.validateSection(modified).lessons[1].activities.length,15);
 const invalid=structuredClone(modified);
 invalid.lessons[0].activity_count=17;
 assert.throws(()=>course.validateSection(invalid),/activity count differs/);
});
test('checkpoint builder supports matching variable targets and modes',()=>{
 const sec={items:{a:{id:'a',surface_form:'a'},b:{id:'b',surface_form:'b'},c:{id:'c',surface_form:'c'}}};
 const checkpoint={checkpoint_targets:['a','b','c'],checkpoint_modes:[['type','finnish'],['type','finnish'],['type','finnish']]};
 assert.equal(course.buildCheckpointActivities(sec,checkpoint).length,3);
 assert.throws(()=>course.buildCheckpointActivities(sec,{...checkpoint,checkpoint_modes:[]}),/matching nonempty/);
});
test('saved progress and scores remain valid independent of future activity counts',()=>{
 let progress=course.recordLessonCompletion(course.emptyProgress(),'legacy-lesson',8,10,123);
 const restored=course.sanitizeProgress(progress);
 assert.deepEqual(restored.lessonScores['legacy-lesson'],{correct:8,graded:10,completedAt:123});
 assert.equal(restored.completedLessons.includes('legacy-lesson'),true);
 const current=course.validateSection(raw);
 assert.equal(current.lessons.reduce((sum,l)=>sum+l.activities.length,0),150);
});
