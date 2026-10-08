'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const course = require('../course.js');
const ROOT = path.resolve(__dirname, '..');
const readJson = (filename) => JSON.parse(fs.readFileSync(path.join(ROOT, filename), 'utf8'));
const a11 = readJson('data/course/a1.1-curriculum.json');
const a12 = readJson('data/course/a1.2-curriculum.json');
const a11Sections = [1,2,3,4].map(n => readJson('data/course/a1.1-section-' + n + '.json'));
const a12Sections = [1,2,3,4].map(n => readJson('data/course/a1.2-section-' + n + '.json'));
const sourceRows = readJson('data/common-words.json').words;
const sourceMap = new Map(sourceRows.map(row => [row.word.normalize('NFC').toLocaleLowerCase('fi-FI'), row]));
const prepared = course.validateImplementedPath([
  { level:'A1.1', curriculum:a11, sections:a11Sections },
  { level:'A1.2', curriculum:a12, sections:a12Sections },
]);

test('A1.1 through A1.2 now contains eight playable sections and 80 uniquely mapped lessons', () => {
  assert.equal(prepared.length, 8);
  assert.deepEqual(prepared.map(section => section.curriculum_section_id), [
    'a1.1-s1','a1.1-s2','a1.1-s3','a1.1-s4',
    'a1.2-s1','a1.2-s2','a1.2-s3','a1.2-s4',
  ]);
  const ids = prepared.flatMap(section => section.lessons.map(lesson => lesson.id));
  assert.equal(ids.length, 80);
  assert.equal(new Set(ids).size, 80);
  const stage = course.COURSE_STAGES.find(entry => entry.level === 'A1.2');
  assert.deepEqual(stage.sectionUrls, [1,2,3,4].map(n => './data/course/a1.2-section-' + n + '.json'));
  assert.doesNotMatch(JSON.stringify(course.COURSE_STAGES), /A1\\.3/);
});

test('Sections 3 and 4 deliver every planned lesson and exactly 300 validated activities', () => {
  for(const sectionIndex of [2,3]) {
    const raw = a12Sections[sectionIndex];
    const section = prepared[4+sectionIndex];
    const planned = a12.sections[sectionIndex];
    assert.equal(raw.curriculum_section_id, planned.id);
    assert.equal(section.activity_count_per_lesson, 15);
    assert.equal(section.lessons.length, 10);
    assert.deepEqual(section.lessons.map(lesson=>lesson.curriculum_id), planned.lessons.map(lesson=>lesson.id));
    assert.equal(section.lessons.reduce((sum,lesson)=>sum+lesson.activities.length,0),150);
    for (const lesson of section.lessons) {
      assert.equal(lesson.activities.length, 15, lesson.id);
      assert.ok(lesson.objective_fa && lesson.summary_fa && lesson.grammar_fa);
      assert.equal(lesson.activities.filter(a=>a.type==='production').length,1,lesson.id);
      assert.equal(lesson.activities.filter(a=>a.type==='choice' && a.mode==='listen').length,1,lesson.id);
      assert.equal(lesson.activities.filter(a=>a.type==='dictation').length,1,lesson.id);
      assert.equal(lesson.production_targets.length,1);
      assert.equal(lesson.listening_targets.length,2);
      assert.ok(lesson.structured_practice.length>=1);
      const contract = planned.lessons[lesson.order-1];
      assert.deepEqual(lesson.recycle_from, contract.recycle_from);
      for(const [kind,key] of [['high_frequency','high_frequency_targets'],['topic','topic_targets'],['expressions','expressions']]) {
        const refs=lesson.curriculum_target_refs[kind];
        assert.equal(refs.length,contract[key].length,lesson.id+'/'+kind);
        assert.deepEqual(refs.map(id=>section.items[id].surface_form),contract[key],lesson.id+'/'+kind);
      }
      for(const act of lesson.activities) {
        if(!act.options)continue;
        assert.equal(new Set(act.options).size,act.options.length,lesson.id);
        if(act.item)assert.ok(act.options.includes(act.item),lesson.id);
      }
    }
  }
});

test('every new item has explicit Finnish, Persian, pronunciation example, accepted answer, and honest corpus provenance', () => {
  for (const raw of a12Sections.slice(2)) {
    for (const item of Object.values(raw.items)) {
      assert.ok(item.surface_form && item.translation_fa && item.example_fi && item.example_fa, item.id);
      assert.ok(item.accepted_answers.includes(item.surface_form), item.id);
      const fromDictionary=sourceMap.get(item.surface_form.normalize('NFC').toLocaleLowerCase('fi-FI'));
      if (fromDictionary) {
        assert.equal(item.frequency_status,'ranked',item.id);
        assert.equal(item.frequency_rank,fromDictionary.frequency_rank,item.id);
      } else {
        assert.equal(item.frequency_status,'unranked',item.id);
        assert.equal(item.frequency_rank,null,item.id);
      }
    }
  }
});

test('Section 3 covers daily routines, university, partitive complements and calendar appointments', () => {
  const section=prepared[6],byId=id=>section.lessons.find(l=>l.curriculum_id===id);
  assert.ok(byId('a1.2-s3-l03').activities.some(a=>a.type==='morphology-choice'&&a.expected_fi==='toimistossa'));
  assert.ok(byId('a1.2-s3-l04').activities.some(a=>a.type==='morphology-choice'&&a.expected_fi==='musiikista'));
  assert.ok(byId('a1.2-s3-l06').activities.some(a=>a.type==='morphology-choice'&&a.expected_fi==='maanantaina'));
  const integration=byId('a1.2-s3-l09');
  assert.ok(integration.activities.some(a=>a.type==='dialogue-order'));
  assert.equal(integration.activities.filter(a=>a.type==='short-reading').length,2);
});

test('Section 4 provides weather visuals, clothing cues, clock appointments and imperatives', () => {
  const section=prepared[7],byId=id=>section.lessons.find(l=>l.curriculum_id===id);
  assert.ok(byId('a1.2-s4-l01').activities.some(a=>a.type==='visual-choice'));
  assert.ok(byId('a1.2-s4-l02').activities.some(a=>a.type==='visual-choice'));
  assert.ok(byId('a1.2-s4-l06').activities.some(a=>a.type==='clock-choice'&&a.hour===10));
  assert.ok(byId('a1.2-s4-l08').activities.some(a=>a.type==='morphology-choice'&&a.expected_fi==='juo'));
  const integrated=byId('a1.2-s4-l09');
  assert.ok(integrated.activities.some(a=>a.type==='dialogue-order'));
  assert.equal(integrated.activities.filter(a=>a.type==='short-reading').length,2);
});

test('guided production and expression-completion questions have self-contained Persian context', () => {
  for(const section of prepared.slice(6))for(const lesson of section.lessons){
    for(const a of lesson.activities){
      if(a.type==='expression-completion'){
        assert.ok(a.prompt_fa && a.prompt_fa.length>=5,lesson.id);
        assert.ok(a.prompt_fi.includes('_____'),lesson.id);
        assert.ok(a.accepted_answers.some(answer=>a.prompt_fi.replace('_____',answer)===a.expected_fi),lesson.id);
      }
      if(a.type==='controlled-production')assert.ok(a.prompt_fa&&a.cues_fi?.length>=1,lesson.id);
      if(a.type==='sentence-order')assert.ok(a.expected_fa&&a.expected_fi,lesson.id);
    }
  }
});

test('integrated readings have a single correct passage-matching statement', () => {
  for(const section of prepared.slice(6)) {
    const integration=section.lessons[8];
    for(const activity of integration.activities.filter(a=>a.type==='short-reading')) {
      const passage=section.items[activity.item].surface_form;
      const answer=section.items[activity.question_item].surface_form;
      assert.ok(passage.includes(answer),integration.id+': required answer absent');
      assert.equal(activity.options.filter(id=>passage.includes(section.items[id].surface_form)).length,1,integration.id);
    }
  }
});

test('checkpoint 3 and cumulative checkpoint 4 keep 80% passing and all structural skills', () => {
  for(const section of prepared.slice(6)) {
    const checkpoint=section.lessons.at(-1);
    assert.equal(checkpoint.passing_score,0.8,checkpoint.id);
    assert.equal(checkpoint.activities.length,15);
    for(const type of ['sentence-order','expression-completion','controlled-production','morphology-choice']){
      assert.ok(checkpoint.activities.some(a=>a.type===type),checkpoint.id+' / '+type);
    }
  }
  const final=prepared[7].lessons.at(-1);
  const types=final.checkpoint_targets.map(id=>prepared[7].items[id].surface_form);
  for(const phrase of ['Paljonko tämä maksaa?','Menen bussilla.','Opiskelen joka päivä.','Tänään on kylmä.','Minulla on kuumetta.','Tarvitsen apua.']) {
    assert.ok(types.includes(phrase),phrase);
  }
});

test('Section 4 remains browseable and first lesson is a gated jump entry', () => {
  const progress=course.emptyProgress();
  assert.equal(course.isSectionAccessible(prepared,progress,7),false);
  assert.equal(course.isCourseLessonAccessible(prepared,progress,7,0),true);
  assert.equal(course.isCourseLessonAccessible(prepared,progress,7,1),false);
});
