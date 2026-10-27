'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const p3 = require('../scripts/audit-p3-recycling.cjs');
const author = require('../scripts/build-p3-reviewed-retrievals.cjs');
const lexical = require('../scripts/build-lexical-identity.cjs');
const ROOT = path.resolve(__dirname,'..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8'));
const sections = ['a1.1','a1.2','a1.3','a2.1'].flatMap(level =>
 [1,2,3,4].map(i => 'data/course/'+level+'-section-'+i+'.json')
 .filter(f => fs.existsSync(path.join(ROOT,f))).map(read));
const words = read('data/common-words.json');
const generated = author.build(sections,words);
const indexByLesson = new Map(sections.flatMap(s => s.lessons.map(l => l.id))
 .map((id,i) => [id,i]));

test('P3 editorial supplements reproduce source-backed data exactly on repeated builds',()=>{
 assert.equal(generated.baseline_missing,62);
 assert.equal(generated.plan.length,62);
 assert.deepEqual(generated.sections,sections);
 assert.deepEqual(author.build(generated.sections,words),generated);
 assert.equal(new Set(generated.plan.map(p => p.form_id)).size,62);
 for(const event of generated.plan){
  assert.ok(indexByLesson.get(event.source_lesson) < indexByLesson.get(event.target_lesson));
  assert.ok(indexByLesson.get(event.target_lesson) - indexByLesson.get(event.source_lesson) >= 2);
 }
});
test('all revised learner editions keep original archived content, stable IDs and a bounded workload',()=>{
 let count=0;
 for(const section of sections){
  for(const lesson of section.lessons){
   const originals = course.lessonEditionActivities(lesson,'legacy');
   assert.deepEqual(originals,lesson.activities);
   if(!lesson.p3_review_activities)continue;
   assert.ok(!lesson.editorial_revision && !lesson.study_pacing);
   assert.ok(!lesson.checkpoint_targets?.length);
   assert.ok(lesson.p3_review_activities.length>=1 && lesson.p3_review_activities.length<=2);
   const edited=course.lessonEditionActivities(lesson,'p3');
   assert.deepEqual(edited.slice(0,originals.length),originals);
   assert.deepEqual(edited.slice(originals.length),lesson.p3_review_activities);
   assert.ok(course.lessonEditionSlides(lesson,'p3').length<=30);
   for(const activity of lesson.p3_review_activities){
    assert.equal(activity.p3_review,true);
    assert.equal(activity.type,'type');
    assert.ok(['finnish','cloze'].includes(activity.mode));
    const item=section.items[activity.item],provenance=item?.p3_review_provenance;
    assert.ok(item&&provenance,'missing documented bilingual source');
    const origin=sections.find(x=>x.id===provenance.source_section_id);
    const source=origin?.items[provenance.source_item_id];
    assert.ok(source);
    assert.equal(source.surface_form,item.surface_form);
    assert.equal(source.translation_fa,item.translation_fa);
    assert.equal(source.lemma,item.lemma);
    if(activity.mode==='cloze'){
     assert.ok(author.acceptable(item.example_fi,item.example_fa,item.surface_form));
     assert.ok(item.example_fi && item.example_fa);
    }
    count++;
   }
  }
 }
 assert.equal(count,62);
});
test('later genuinely graded practice closes missing-retrieval gap; different context is counted only if displayed',()=>{
 const report=p3.load();
 assert.deepEqual(report.errors,[]);
 assert.equal(report.summary.introduced_exact_forms,931);
 assert.equal(report.summary.duplicate_exact_introduction_count,0);
 assert.equal(report.summary.introductions_with_later_graded,931);
 assert.ok(report.summary.introductions_with_later_new_context<931);
 const all=report.lessons.flatMap(l=>l.later_retrieval);
 assert.equal(all.length,931);
 assert.ok(all.every(x=>x.later_lesson_ids.length));
 // Authored examples only; no claim that unseen semantic families share mastery.
 assert.equal(read('data/common-words.json').words.length,425);
});
test('new review aliases resolve to canonical exact-form identities, not to a shared SRS score',()=>{
 const sidecar=read('data/course/lexical-identity-sidecar.json');
 const index=read('data/course/p2-cross-app-identity.json');
 const sideIds=new Set(sidecar.records.map(x=>x.id));
 const link=new Map(index.course_items.map(x=>[x.section_id+'/'+x.item_id,x]));
 for(const section of sections)for(const lesson of section.lessons)
  for(const activity of lesson.p3_review_activities||[]){
   const item=section.items[activity.item];
   const type=item.item_type==='expression'?'expression':'form';
   const id=lexical.stableId(type,lexical.normalize(item.surface_form));
   assert.ok(sideIds.has(id),'missing stable form/expression for '+activity.item);
   assert.equal(link.get(section.id+'/'+activity.item)?.identity_id,id);
  }
});
