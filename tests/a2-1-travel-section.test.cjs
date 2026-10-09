'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const ROOT=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
const levels=['A1.1','A1.2','A1.3','A2.1'];
const stages=levels.map(level=>{
 const prefix=level.toLowerCase();
 const count=level==='A2.1'?1:4;
 return {level,curriculum:read('data/course/'+prefix+'-curriculum.json'),sections:Array.from({length:count},(_,i)=>read('data/course/'+prefix+'-section-'+(i+1)+'.json'))};
});
const prepared=course.validateImplementedPath(stages),section=prepared.at(-1),contract=stages.at(-1).curriculum;
const dictionary=new Map(read('data/common-words.json').words.map(w=>[w.word.normalize('NFC').toLocaleLowerCase('fi-FI'),w]));

test('A2.1 travel is an additional real stage without exposing planned A2 modules',()=>{
 assert.deepEqual(course.COURSE_STAGES.map(s=>s.level),levels);
 assert.deepEqual(course.COURSE_STAGES.at(-1).sectionUrls,['./data/course/a2.1-section-1.json']);
 assert.equal(prepared.length,13);
 const all=prepared.flatMap(s=>s.lessons.map(l=>l.id));
 assert.equal(all.length,130);
 assert.equal(new Set(all).size,130);
 assert.equal(section.id,'a2.1-section-1');
 assert.equal(section.curriculum_section_id,'a2.1-s1');
 assert.equal(contract.sections.length,4);
 assert.equal(contract.sections[0].authoring_status,'implementation_candidate');
 assert.ok(contract.sections.slice(1).every(s=>s.authoring_status==='outline_only'));
 assert.equal(stages.at(-1).sections.length,1);
});

test('ten A2.1 travel lessons map exact curriculum target forms and cover 150 activities',()=>{
 assert.equal(section.lessons.length,10);
 assert.equal(section.lessons.reduce((n,l)=>n+l.activities.length,0),150);
 for(const lesson of section.lessons){
  const planned=contract.sections[0].lessons[lesson.order-1];
  assert.equal(lesson.curriculum_id,planned.id);
  for(const [key,source] of [['high_frequency','high_frequency_targets'],['topic','topic_targets'],['expressions','expressions']]){
   assert.deepEqual(lesson.curriculum_target_refs[key].map(id=>section.items[id].surface_form),planned[source],lesson.id+'/'+key);
  }
  assert.ok(lesson.grammar_fa&&/[\u0600-\u06ff]/u.test(lesson.grammar_fa),lesson.id);
  assert.equal(lesson.activities.length,15);
  assert.equal(lesson.activities.filter(a=>a.type==='production').length,1,lesson.id);
  assert.equal(lesson.activities.filter(a=>a.type==='choice'&&a.mode==='listen').length,1,lesson.id);
  assert.equal(lesson.activities.filter(a=>a.type==='dictation').length,1,lesson.id);
  assert.equal(lesson.activities.filter(a=>a.type==='sentence-order').length,1,lesson.id);
  assert.equal(lesson.activities.filter(a=>a.type==='inflection-production').length,1,lesson.id);
 }
});

test('all ranked A2.1 targets are backed by real Parole data and translations remain complete',()=>{
 for(const item of Object.values(section.items)){
  assert.ok(item.surface_form&&item.translation_fa&&item.example_fi&&item.example_fa,item.id);
  assert.ok(item.accepted_answers?.includes(item.surface_form),item.id);
  const source=dictionary.get(item.surface_form.normalize('NFC').toLocaleLowerCase('fi-FI'));
  assert.equal(item.frequency_status,source?'ranked':'unranked',item.id);
  assert.equal(item.frequency_rank,source?source.frequency_rank:null,item.id);
 }
});

test('choices and listening remain semantically distinguishable and inflection is explicit',()=>{
 for(const lesson of section.lessons)for(const a of lesson.activities){
  if(a.type==='choice'){
   const vals=a.options.map(id=>a.mode==='meaning'||a.mode==='listen'?section.items[id].translation_fa:section.items[id].surface_form);
   assert.equal(new Set(vals).size,vals.length,lesson.id+'/'+a.mode);
   assert.ok(a.options.includes(a.item),lesson.id);
  }
  if(a.type==='inflection-production'){
   assert.ok(a.frame_fi.includes('_____'),lesson.id);
   assert.ok(a.accepted_answers.includes(a.expected_fi),lesson.id);
   assert.ok(a.explanation_fa&&/[\u0600-\u06ff]/u.test(a.explanation_fa));
  }
  if(a.type==='sentence-order'){
   assert.equal(a.answer_order.map(i=>a.tokens[i]).join(' '),a.expected_fi);
   assert.notDeepEqual(a.answer_order,a.tokens.map((_,i)=>i));
  }
 }
});

test('integrated A2.1 travel reading questions have exactly one phrase from the passage',()=>{
 const activities=section.lessons[8].activities.filter(a=>a.type==='short-reading');
 assert.equal(activities.length,2);
 for(const a of activities){
  const sentence=section.items[a.item].surface_form;
  assert.ok(sentence.includes(section.items[a.question_item].surface_form));
  assert.equal(a.options.filter(id=>sentence.includes(section.items[id].surface_form)).length,1);
  assert.ok(a.options.includes(a.question_item));
 }
});

test('the A2.1 checkpoint covers all nine taught units without repeated targets',()=>{
 const l=section.lessons.at(-1);
 assert.equal(l.passing_score,0.8);
 assert.equal(l.checkpoint_targets.length,15);
 assert.equal(new Set(l.checkpoint_targets).size,15);
 assert.deepEqual(l.activities.map(a=>a.item).filter(Boolean).length,15);
 for(let i=0;i<9;i++){
  const taught=section.lessons[i].curriculum_target_refs.expressions;
  assert.ok(l.checkpoint_targets.some(id=>taught.includes(id)), 'Missing unit '+(i+1));
 }
 for(const type of ['production','dictation','sentence-order','expression-completion','controlled-production','inflection-production','choice','type']){
  assert.ok(l.activities.some(a=>a.type===type),type);
 }
});

test('A2.1 follows the first-person Persian section-goal heading',()=>{
 assert.ok(section.can_do_fa.length>=4);
 for(const outcome of section.can_do_fa){
  assert.ok(!/^می‌توانم\s/u.test(outcome));
  assert.match(outcome,/(?:کنم|بفهمم|بدهم|بخواهم|ببرم|بگویم|بپرسم)\.$/u);
 }
 const source=fs.readFileSync(path.join(ROOT,'course.js'),'utf8');
 assert.match(source,/outcomesTitle\.textContent = 'در پایان این بخش می‌توانم'/u);
});

test('A1 progress survives stage addition; A2.1 is browseable but unlocks sequentially',()=>{
 let before=course.emptyProgress();
 before=course.recordLessonCompletion(before,prepared[11].lessons[0].id,9,10);
 const after=course.sanitizeProgress(before);
 assert.deepEqual(after.completedLessons,before.completedLessons);
 assert.equal(course.isCourseLessonAccessible(prepared,after,12,0),true);
 assert.equal(course.isCourseLessonAccessible(prepared,after,12,1),false);
 assert.equal(course.isCourseLessonAccessible(prepared,after,11,0),true);
});
