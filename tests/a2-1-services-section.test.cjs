'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const course=require('../course.js');
const ROOT=path.resolve(__dirname,'..');
const load=name=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
const levels=['A1.1','A1.2','A1.3','A2.1'];
const payloads=levels.map(level=>{
 const prefix=level.toLowerCase(),count=level==='A2.1'?2:4;
 return {level,curriculum:load('data/course/'+prefix+'-curriculum.json'),sections:Array.from({length:count},(_,i)=>load('data/course/'+prefix+'-section-'+(i+1)+'.json'))};
});
const stages=course.validateImplementedPath(payloads);
const section=stages[13];
const contract=payloads.at(-1).curriculum;
const sourceDictionary=new Map(load('data/common-words.json').words.map(w=>[w.word.normalize('NFC').toLocaleLowerCase('fi-FI'),w]));

test('A2.1 Section 2 is the 14th playable section, with 140 existing and new lessons',()=>{
 assert.deepEqual(course.COURSE_STAGES.map(s=>s.level),levels);
 assert.deepEqual(course.COURSE_STAGES[3].sectionUrls,[
  './data/course/a2.1-section-1.json','./data/course/a2.1-section-2.json'
 ]);
 assert.equal(stages.length,14);
 const allIds=stages.flatMap(s=>s.lessons.map(l=>l.id));
 assert.equal(allIds.length,140);
 assert.equal(new Set(allIds).size,140);
 assert.equal(section.id,'a2.1-section-2');
 assert.equal(section.curriculum_section_id,'a2.1-s2');
 assert.equal(contract.sections[1].authoring_status,'implementation_candidate');
 assert.ok(contract.sections.slice(2).every(s=>s.authoring_status==='outline_only'));
 assert.equal(payloads.at(-1).sections.length,2);
});

test('A2.1 service lessons map all authored Finnish/Persian contract targets',()=>{
 assert.equal(section.lessons.length,10);
 assert.equal(section.lessons.reduce((total,l)=>total+l.activities.length,0),150);
 for(let i=0;i<10;i++){
  const l=section.lessons[i],spec=contract.sections[1].lessons[i];
  assert.equal(l.curriculum_id,spec.id);
  assert.equal(l.order,i+1);
  assert.equal(l.summary_fa,spec.can_do_fa);
  assert.equal(l.grammar_fa,spec.grammar_note_fa);
  assert.match(l.grammar_fa,/[\u0600-\u06FF]/u,l.id);
  for(const [key,target] of [['high_frequency','high_frequency_targets'],['topic','topic_targets'],['expressions','expressions']]){
   assert.deepEqual(l.curriculum_target_refs[key].map(id=>section.items[id].surface_form),spec[target],l.id+'/'+key);
  }
  assert.equal(l.activities.length,15,l.id);
  assert.equal(l.activities.filter(a=>a.type==='production').length,1,l.id);
  assert.equal(l.activities.filter(a=>a.type==='choice'&&a.mode==='listen').length,1,l.id);
  assert.equal(l.activities.filter(a=>a.type==='dictation').length,1,l.id);
  assert.equal(l.activities.filter(a=>a.type==='sentence-order').length,1,l.id);
  assert.equal(l.activities.filter(a=>a.type==='inflection-production').length,1,l.id);
 }
});

test('A2.1 service labels are distinct and official frequency metadata is never fabricated',()=>{
 for(const item of Object.values(section.items)){
  assert.ok(item.surface_form&&item.translation_fa&&item.example_fi&&item.example_fa,item.id);
  assert.deepEqual(item.accepted_answers,[item.surface_form],item.id);
  const canonical=sourceDictionary.get(item.surface_form.normalize('NFC').toLocaleLowerCase('fi-FI'));
  assert.equal(item.frequency_status,canonical?'ranked':'unranked',item.id);
  assert.equal(item.frequency_rank,canonical?canonical.frequency_rank:null,item.id);
 }
 for(const l of section.lessons)for(const a of l.activities.filter(a=>a.type==='choice')){
  const labels=a.options.map(id=>(a.mode==='meaning'||a.mode==='listen'
   ? section.items[id]?.translation_fa : section.items[id]?.surface_form)||'');
  assert.ok(labels.every(Boolean),l.id);
  assert.equal(new Set(labels).size,labels.length,l.id+' / '+a.mode+' / '+labels.join(' | '));
  assert.ok(a.options.includes(a.item),l.id);
 }
});

test('all service grammar prompts reconstruct their explicitly taught Finnish expression',()=>{
 for(const l of section.lessons){
  for(const a of l.activities.filter(a=>a.type==='inflection-production')){
   assert.ok(a.frame_fi.includes('_____'),l.id);
   assert.ok(a.accepted_answers.includes(a.expected_fi),l.id);
   assert.equal(a.frame_fi.replace('_____',a.expected_fi),section.items[a.item].surface_form,l.id);
   assert.ok(a.explanation_fa&&/[\u0600-\u06FF]/u.test(a.explanation_fa),l.id);
  }
  for(const a of l.activities.filter(a=>a.type==='sentence-order')){
   assert.notDeepEqual(a.answer_order,a.tokens.map((_,i)=>i),l.id);
   assert.equal(a.answer_order.map(i=>a.tokens[i]).join(' '),a.expected_fi,l.id);
   assert.equal(a.expected_fi,section.items[a.item].surface_form,l.id);
  }
 }
});

test('service reading prompts offer one answer explicitly supported by the short passage',()=>{
 const lesson=section.lessons[8];
 const readings=lesson.activities.filter(a=>a.type==='short-reading');
 assert.equal(readings.length,2);
 for(const a of readings){
  const passage=section.items[a.item],answer=section.items[a.question_item];
  assert.ok(passage.surface_form.includes(answer.surface_form),a.item);
  assert.ok(passage.translation_fa&&/[\u0600-\u06FF]/u.test(passage.translation_fa),a.item);
  assert.equal(a.options.filter(id=>passage.surface_form.includes(section.items[id].surface_form)).length,1,a.item);
  assert.ok(a.options.includes(a.question_item),a.item);
 }
});

test('service checkpoint samples all nine lessons and tests eight independent practice families',()=>{
 const cp=section.lessons.at(-1);
 assert.equal(cp.passing_score,0.8);
 assert.equal(cp.checkpoint_targets.length,15);
 assert.equal(new Set(cp.checkpoint_targets).size,15);
 assert.equal(cp.activities.length,15);
 assert.equal(new Set(cp.activities.map(a=>a.item)).size,15);
 for(let i=0;i<9;i++){
  const e=section.lessons[i].curriculum_target_refs.expressions;
  assert.ok(cp.checkpoint_targets.some(id=>e.includes(id)),'No assessed example for lesson '+(i+1));
 }
 for(const type of ['production','dictation','sentence-order','expression-completion','controlled-production','inflection-production','choice','type']){
  assert.ok(cp.activities.some(a=>a.type===type),type);
 }
});

test('Persian objectives extend the first-person heading and the lessons avoid dosage advice',()=>{
 const header=fs.readFileSync(path.join(ROOT,'course.js'),'utf8');
 assert.match(header,/outcomesTitle\.textContent = 'در پایان این بخش می‌توانم'/u);
 assert.equal(section.can_do_fa.length,5);
 for(const goal of section.can_do_fa){
  assert.doesNotMatch(goal,/^می‌توانم(?:\s|$)/u);
  assert.match(goal,/(?:کنم|بفهمم|بخواهم|بپرسم|بدهم|ببرم|بنویسم)\.$/u);
 }
 const bilingual=Object.values(section.items).map(x=>x.surface_form+' '+x.translation_fa).join('\n');
 assert.doesNotMatch(bilingual,/\b(?:mg|ml|milligramma|millilitra|annostus|tablettia)\b/iu);
});

test('adding the service section does not reset A1 or A2.1 travel progress',()=>{
 let stored=course.emptyProgress();
 stored=course.recordLessonCompletion(stored,stages[11].lessons[0].id,9,10);
 stored=course.recordLessonCompletion(stored,stages[12].lessons[0].id,9,10);
 const restored=course.sanitizeProgress(stored);
 assert.deepEqual(restored.completedLessons,stored.completedLessons);
 assert.equal(course.isCourseLessonAccessible(stages,restored,13,0),true);
 assert.equal(course.isCourseLessonAccessible(stages,restored,13,1),false);
 assert.equal(course.isCourseLessonAccessible(stages,restored,12,0),true);
});
