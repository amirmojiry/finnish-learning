'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const ROOT = path.resolve(__dirname, '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
const payloads = ['A1.1', 'A1.2', 'A1.3'].map(level => {
  const stem=level.toLowerCase();
  return {level,curriculum:read('data/course/'+stem+'-curriculum.json'),sections:[1,2,3,4].map(n=>read('data/course/'+stem+'-section-'+n+'.json'))};
});
const prepared=course.validateImplementedPath(payloads);
const wordMap=new Map(read('data/common-words.json').words.map(w=>[w.word.normalize('NFC').toLocaleLowerCase('fi-FI'),w]));

test('A1.1 to A1.3 offers 12 sections and 120 independent lessons',()=>{
  assert.deepEqual(course.COURSE_STAGES.map(s=>s.level),['A1.1','A1.2','A1.3']);
  assert.equal(prepared.length,12);
  const ids=prepared.flatMap(s=>s.lessons.map(l=>l.id));
  assert.equal(ids.length,120);
  assert.equal(new Set(ids).size,120);
  assert.deepEqual(prepared.slice(8).map(s=>s.curriculum_section_id),[1,2,3,4].map(n=>'a1.3-s'+n));
});

test('A1.3 delivers 40 contract-mapped lessons and 600 graded/teaching activities',()=>{
  const curriculum=payloads[2].curriculum;
  for(let n=0;n<4;n++){
    const s=prepared[n+8],contract=curriculum.sections[n];
    assert.equal(s.activity_count_per_lesson,15);
    assert.deepEqual(s.lessons.map(l=>l.curriculum_id),contract.lessons.map(l=>l.id));
    assert.equal(s.lessons.reduce((sum,l)=>sum+l.activities.length,0),150);
    for(const l of s.lessons){
      const cl=contract.lessons[l.order-1];
      for(const [key,source] of [['high_frequency','high_frequency_targets'],['topic','topic_targets'],['expressions','expressions']]){
        assert.deepEqual(l.curriculum_target_refs[key].map(id=>s.items[id].surface_form),cl[source],l.id+key);
      }
      assert.equal(l.activities.filter(a=>a.type==='production').length,1,l.id);
      assert.equal(l.activities.filter(a=>a.type==='choice'&&a.mode==='listen').length,1,l.id);
      assert.equal(l.activities.filter(a=>a.type==='dictation').length,1,l.id);
      assert.ok(l.activities.some(a=>a.type==='sentence-order'),l.id);
      assert.ok(l.objective_fa&&l.grammar_fa,l.id);
      for(const a of l.activities) if(a.options)assert.ok(a.options.includes(a.item),l.id);
    }
    assert.equal(s.lessons.at(-1).passing_score,0.8);
    for(const type of ['sentence-order','expression-completion','controlled-production','morphology-choice']){
      assert.ok(s.lessons.at(-1).activities.some(a=>a.type===type),s.id+' / '+type);
    }
  }
});

test('No manufactured Parole ranks or empty Finnish/Persian learning content',()=>{
 for(const section of prepared.slice(8))for(const item of Object.values(section.items)){
  assert.ok(item.surface_form&&item.translation_fa&&item.example_fi&&item.example_fa,item.id);
  assert.ok(item.accepted_answers.includes(item.surface_form),item.id);
  const source=wordMap.get(item.surface_form.normalize('NFC').toLocaleLowerCase('fi-FI'));
  assert.equal(item.frequency_status,source?'ranked':'unranked',item.id);
  assert.equal(item.frequency_rank,source?source.frequency_rank:null,item.id);
 }
});

test('A1.3 entry is browseable without destroying prior saved progress',()=>{
 const old=course.emptyProgress();
 const completed=course.recordLessonCompletion(old,payloads[1].sections[0].lessons[0].id,9,10);
 const roundTrip=course.sanitizeProgress(completed);
 assert.deepEqual(roundTrip.completedLessons,completed.completedLessons);
 assert.equal(course.isCourseLessonAccessible(prepared,roundTrip,8,0),true);
 assert.equal(course.isCourseLessonAccessible(prepared,roundTrip,8,1),false);
});


test('integrated lessons have source-matched bilingual reading comprehension',()=>{
  for(const section of prepared.slice(8)){
    const lesson=section.lessons[8];
    const readings=lesson.activities.filter(a=>a.type==='short-reading');
    assert.equal(readings.length,2,section.id);
    for(const a of readings){
      const passage=section.items[a.item].surface_form;
      const expected=section.items[a.question_item].surface_form;
      assert.ok(passage.includes(expected),a.item);
      assert.equal(a.options.filter(id=>passage.includes(section.items[id].surface_form)).length,1,a.item);
      assert.ok(section.items[a.item].translation_fa&&section.items[a.item].example_fa);
    }
  }
  assert.equal(prepared[8].lessons[8].activities.filter(a=>a.type==='dialogue-order').length,1);
});

test('A1.3 ordering activities are meaningfully scrambled and reconstruct only their canonical Finnish sentence',()=>{
  for(const section of prepared.slice(8))for(const lesson of section.lessons){
    for(const a of lesson.activities.filter(x=>x.type==='sentence-order')){
      assert.notDeepEqual(a.answer_order,a.tokens.map((_,i)=>i),lesson.id);
      assert.equal(a.answer_order.map(i=>a.tokens[i]).join(' '),a.expected_fi);
      assert.ok(a.expected_fa&&a.expected_fa.trim(),lesson.id);
    }
  }
});

test('A1.3 final checkpoint samples earlier sections as well as recent events',()=>{
 const last=prepared.at(-1).lessons.at(-1);
 const forms=last.checkpoint_targets.map(id=>prepared.at(-1).items[id].surface_form);
 for(const sample of ['Haluatko tulla minun kanssani?','Missä kirjasto on?','Mitä tämä tarkoittaa?','Eilen olin kotona.','Huomenna menen töihin.']){
  assert.ok(forms.includes(sample),sample);
 }
});
