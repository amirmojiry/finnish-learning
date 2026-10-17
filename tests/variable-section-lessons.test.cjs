'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const source = require('../data/course/a1.1-section-1.json');
const baseCurriculum = require('../data/course/a1.1-curriculum.json');

// Structural-only fixtures use original already-authored activities; no novel
// Finnish sentences, new learning claims or deployable course entries are created.
function fixture(count) {
  const originalTeaching = source.lessons.slice(0, -1);
  const originalContracts = baseCurriculum.sections[0].lessons.slice(0, -1);
  const samples = Array.from({length:count-1}, (_,i)=>i<originalTeaching.length?i:i%originalTeaching.length);
  const lessons = samples.map((sourceIndex,i)=>{
    const base=structuredClone(originalTeaching[sourceIndex]);
    base.id='variable-'+count+'-lesson-'+(i+1);
    base.curriculum_id='variable-'+count+'-l'+String(i+1).padStart(2,'0');
    base.order=i+1;
    base.recycle_from=[];
    return base;
  });
  const last=structuredClone(source.lessons.at(-1));
  last.id='variable-'+count+'-lesson-'+count;
  last.curriculum_id='variable-'+count+'-l'+String(count).padStart(2,'0');
  last.order=count;
  last.recycle_from=[];
  lessons.push(last);
  const originalPlans=[...samples.map(i=>originalContracts[i]),baseCurriculum.sections[0].lessons.at(-1)];
  const plans=originalPlans.map((src,i)=>({...structuredClone(src),id:lessons[i].curriculum_id,order:i+1,recycle_from:[]}));
  const section={...structuredClone(source),id:'variable-section-'+count,curriculum_section_id:'variable-s'+count,
    lessons};
  const curriculum=structuredClone(baseCurriculum);
  curriculum.sections=[{...curriculum.sections[0],id:section.curriculum_section_id,lessons:plans}];
  return {section,curriculum};
}

test('seven, ten and thirteen authored lessons validate against exactly matching curriculum',()=>{
 for(const count of [7,10,13]){
   const {section,curriculum}=fixture(count);
   const prepared=course.validateSection(section);
   assert.equal(prepared.lessons.length,count);
   assert.equal(prepared.lessons.at(-1).order,count);
   assert.equal(prepared.lessons.at(-1).checkpoint_targets.length,15);
   assert.equal(prepared.lessons.at(-1).passing_score,0.8);
   assert.equal(prepared.lessons.at(-1).activities.length,source.lessons.at(-1).activities.length);
   assert.equal(prepared.lessons[0].activities.length,source.lessons[0].activities.length);
   const matched=course.validateSectionAgainstCurriculum(prepared,curriculum);
   assert.equal(matched.curriculum_contract.lessons.length,count);
   assert.equal(course.validateImplementedPath([{level:'A1.1',curriculum,sections:[section]}])[0].lessons.length,count);
 }
});

test('sections do not silently pad, truncate or reject valid non-tenth checkpoints',()=>{
 for(const count of [7,13]){
   const {section}=fixture(count),validated=course.validateSection(section);
   const ids=validated.lessons.map(l=>l.id);
   assert.deepEqual(ids,section.lessons.map(l=>l.id));
   assert.equal(validated.lessons[count-1].order,count);
   assert.equal(validated.lessons.filter(l=>l.checkpoint_targets?.length).length,1);
   assert.equal(validated.lessons.filter(l=>l.order===count).length,1);
 }
});

test('invalid cardinality, order, identity and misplaced checkpoints fail closed',()=>{
 const original=fixture(7).section;
 function mutate(fn){const value=structuredClone(original);fn(value);return value;}
 assert.throws(()=>course.validateSection(mutate(s=>s.lessons=[])),/at least one authored lesson/);
 assert.throws(()=>course.validateSection(mutate(s=>s.lessons[1].order=5)),/consecutive/);
 assert.throws(()=>course.validateSection(mutate(s=>s.lessons[1].id=s.lessons[0].id)),/Duplicate or missing lesson ID/);
 assert.throws(()=>course.validateSection(mutate(s=>s.lessons[1].curriculum_id=s.lessons[0].curriculum_id)),/Duplicate or missing curriculum lesson ID/);
 assert.throws(()=>course.validateSection(mutate(s=>{delete s.lessons.at(-1).checkpoint_targets;delete s.lessons.at(-1).passing_score;})),/Last lesson must be the section checkpoint/);
 assert.throws(()=>course.validateSection(mutate(s=>{s.lessons[1].checkpoint_targets=[...s.lessons.at(-1).checkpoint_targets];})),/Checkpoint must be the final lesson/);
 assert.throws(()=>course.validateSection(mutate(s=>s.lessons.at(-1).new_targets=['s1-hei'])),/Checkpoint cannot introduce new targets/);
 const good=fixture(7),wrong=structuredClone(good.curriculum);
 wrong.sections[0].lessons[3].id='other-lesson';
 assert.throws(()=>course.validateSectionAgainstCurriculum(course.validateSection(good.section),wrong),/curriculum and authored lesson order mismatch/i);
 wrong.sections[0].lessons=wrong.sections[0].lessons.slice(0,-1);
 assert.throws(()=>course.validateSectionAgainstCurriculum(course.validateSection(good.section),wrong),/lesson count does not match/);
});

test('saved lesson completions and section unlocks rely on actual seven/ten/thirteen count',()=>{
 const first=fixture(7).section,second=fixture(10).section,third=fixture(13).section;
 const sections=[first,second,third];
 let saved=course.emptyProgress();
 assert.equal(course.isSectionComplete(first,saved),false);
 assert.equal(course.isSectionUnlocked(sections,saved,1),false);
 assert.equal(course.isCourseLessonAccessible(sections,saved,0,6),false);
 assert.equal(course.isCourseLessonAccessible(sections,saved,0,7),false);
 assert.equal(course.isCourseLessonAccessible(sections,saved,1,0),true);
 const attempts=[];
 for(let i=0;i<first.lessons.length;i++){
   saved=course.recordLessonCompletion(saved,first.lessons[i].id,8,10,100+i);
   attempts.push(first.lessons[i].id);
 }
 assert.equal(course.isSectionComplete(first,saved),true);
 assert.equal(course.isSectionUnlocked(sections,saved,1),true);
 assert.equal(course.isCourseLessonAccessible(sections,saved,1,1),false);
 const restored=course.sanitizeProgress(saved);
 assert.deepEqual(restored.completedLessons,attempts);
 assert.deepEqual(restored.lessonScores[first.lessons[0].id],{correct:8,graded:10,completedAt:100});
 const two=second.lessons.map(l=>l.id);
 for(let i=0;i<two.length;i++)saved=course.recordLessonCompletion(saved,two[i],9,12,500+i);
 assert.equal(course.isSectionUnlocked(sections,saved,2),true);
 assert.equal(course.isCourseLessonAccessible(sections,saved,2,12),false);
 for(let i=0;i<third.lessons.length-1;i++)saved=course.recordLessonCompletion(saved,third.lessons[i].id,10,15,1000+i);
 assert.equal(course.isSectionComplete(third,saved),false);
 assert.equal(course.isLessonUnlocked(third,saved,12),true);
 saved=course.recordLessonCompletion(saved,third.lessons.at(-1).id,12,15,2200);
 assert.equal(course.passesLessonRequirement(third.lessons.at(-1),11,15),false);
 assert.equal(course.passesLessonRequirement(third.lessons.at(-1),12,15),true);
 assert.equal(course.isSectionComplete(third,saved),true);
 assert.equal(saved.completedLessons.length,30);
 assert.deepEqual(course.sanitizeProgress(saved).lessonScores[third.lessons.at(-1).id],{correct:12,graded:15,completedAt:2200});
});

test('A1.1 Section 4 legacy final assessment remains valid without checkpoint_targets',()=>{
 const legacy=require('../data/course/a1.1-section-4.json');
 const final=legacy.lessons.at(-1);
 assert.equal(final.checkpoint_targets,undefined);
 assert.equal(final.passing_score,0.8);
 const prepared=course.validateSection(legacy);
 assert.equal(prepared.lessons.length,10);
 assert.equal(prepared.lessons.at(-1).activities.length,final.activity_count);
 const invalid=structuredClone(legacy);
 delete invalid.lessons.at(-1).passing_score;
 assert.throws(()=>course.validateSection(invalid),/Last lesson must be the section checkpoint/);
});

test('a previously stored ten-lesson section continues to unlock exactly as before',()=>{
 const sample=course.validateSection(source);
 const stored=source.lessons.map(l=>l.id);
 let progress=course.emptyProgress();
 for(const [index,id] of stored.entries())progress=course.recordLessonCompletion(progress,id,7,10,50+index);
 assert.equal(sample.lessons.length,10);
 assert.equal(course.isSectionComplete(sample,course.sanitizeProgress(progress)),true);
 assert.equal(course.isSectionUnlocked([sample,fixture(7).section],progress,1),true);
 assert.equal(progress.lastLessonId,stored.at(-1));
});

test('production navigation and map proportions remain derived from actual lesson count',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../course.js'),'utf8');
 assert.match(src,/\(completed \/ section\.lessons\.length\) \* 100/);
 assert.match(src,/section\.lessons\[currentIndex \+ 1\] \|\| null/);
 assert.match(src,/index === section\.lessons\.length - 1 \? ' is-last'/);
 assert.doesNotMatch(src,/section\.lessons\.length !== 10/);
});
