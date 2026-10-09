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
      for(const a of l.activities) if(a.options)assert.ok(a.options.includes(a.type==='short-reading'?a.question_item:a.item),l.id);
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


test('A1.3 grammar notes are Persian and contain no English-only learner explanations',()=>{
 for(const section of prepared.slice(8))for(const lesson of section.lessons){
  assert.match(lesson.grammar_fa,/[\u0600-\u06ff]/u,lesson.id);
  assert.ok(lesson.grammar_fa.length>35,lesson.id);
 }
});

test('A1.3 meaning and listening questions never present identical Persian labels for different IDs',()=>{
 for(const section of prepared.slice(8))for(const lesson of section.lessons)for(const activity of lesson.activities){
  if(activity.type!=='choice'||!['meaning','listen'].includes(activity.mode))continue;
  const labels=activity.options.map(id=>section.items[id].translation_fa.normalize('NFC').trim());
  assert.equal(new Set(labels).size,labels.length,lesson.id+' / '+activity.item);
 }
});

test('A1.3 checkpoints assess all nine previous lessons instead of repeating one lesson',()=>{
 for(const section of prepared.slice(8)){
  const source=new Map();
  section.lessons.slice(0,9).forEach(lesson=>{
   for(const id of lesson.curriculum_target_refs.expressions){
    if(!source.has(id))source.set(id,lesson.order);
   }
  });
  const checkpoint=section.lessons[9];
  const ids=[
   ...checkpoint.activities.map(a=>a.item).filter(Boolean),
   checkpoint.production_targets[0],
   ...checkpoint.listening_targets,
   ...checkpoint.structured_practice.map(a=>a.item)
  ];
  const represented=new Set(ids.map(id=>source.get(id)).filter(Boolean));
  assert.ok(represented.size>=8,section.id+': covered only '+[...represented].join(', '));
 }
});

test('all forty A1.3 learner-facing grammar notes explain the lesson in Persian', () => {
  for (const section of prepared.slice(8)) {
    for (const lesson of section.lessons) {
      assert.ok(lesson.grammar_fa.length >= 35, lesson.id);
      assert.match(lesson.grammar_fa, /[\u0600-\u06FF]/u, lesson.id);
      assert.doesNotMatch(lesson.grammar_fa, /^(?:checkpoint:|recycling only|selected|simple |short |common |reviewed |past-tense|invitation|telephone|future meaning)/iu, lesson.id);
    }
  }
});

test('A1.3 multiple-choice answers remain distinguishable after runtime activity injection', () => {
  for (const section of prepared.slice(8)) {
    for (const lesson of section.lessons) {
      for (const activity of lesson.activities.filter(a => a.type === 'choice')) {
        const options = activity.options || [];
        assert.ok(options.length >= 2, lesson.id);
        const label = id => activity.mode === 'meaning' || activity.mode === 'listen'
          ? section.items[id]?.translation_fa
          : section.items[id]?.surface_form;
        const labels = options.map(id => String(label(id) || '').normalize('NFC').trim());
        assert.ok(labels.every(Boolean), lesson.id);
        assert.equal(new Set(labels).size, labels.length, lesson.id + ' / ' + activity.mode + ' / ' + labels.join(' | '));
      }
    }
  }
});

test('every A1.3 checkpoint samples all nine preceding lessons with varied graded activities', () => {
  for (const [sectionIndex, section] of prepared.slice(8).entries()) {
    const checkpoint = section.lessons.at(-1);
    const forms = checkpoint.activities.map(a => section.items[a.item]?.surface_form).filter(Boolean);
    const checked = new Set(forms);
    assert.equal(checkpoint.activities.length, 15);
    assert.equal(checkpoint.checkpoint_targets.length, 15);
    assert.equal(new Set(checkpoint.checkpoint_targets).size, 15, section.id);
    assert.equal(new Set(checkpoint.activities.map(a => a.item)).size, 15, section.id);
    for (const lesson of payloads[2].curriculum.sections[sectionIndex].lessons.slice(0, 9)) {
      assert.ok(lesson.expressions.some(form => checked.has(form)), section.id + ': no assessed item for ' + lesson.id);
    }
    const types = checkpoint.activities.map(a => a.type);
    for (const type of ['production', 'dictation', 'sentence-order', 'expression-completion', 'controlled-production', 'morphology-choice']) {
      assert.ok(types.includes(type), section.id + ': missing ' + type);
    }
    assert.ok(types.includes('choice'), section.id);
    assert.ok(types.includes('type'), section.id);
    assert.equal(checkpoint.passing_score, 0.8, section.id);
  }
});

test('the authoritative documentation hub describes A1.3 as implemented', () => {
  const hub = fs.readFileSync(path.join(ROOT, 'docs/README.md'), 'utf8');
  assert.match(hub, /A1\\.2 and A1\\.3 each have four playable sections/);
  assert.doesNotMatch(hub, /A1\\.3 is a reviewed \*\*plan only\*\*/);
});
