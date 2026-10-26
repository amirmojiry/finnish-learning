'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const engine=require('../scripts/build-contextual-lexical-identities.cjs');
const lexical=require('../scripts/build-lexical-identity.cjs');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const reviews=read('data/course/reviewed-contextual-identities.json');
const prior=read('data/course/lexical-identity-sidecar.json');
const stages=['a1.1','a1.2','a1.3','a2.1'].flatMap(level=>[1,2,3,4]
 .map(n=>'data/course/'+level+'-section-'+n+'.json')
 .filter(p=>fs.existsSync(path.join(ROOT,p))).map(read));
const built=engine.build(reviews,stages,prior),stored=read('data/course/contextual-lexical-identity-map.json');
const byForm=form=>prior.records.find(r=>r.kind==='form'&&r.surface_form===form);
const lookup=(section,item)=>engine.lookup(built,section,item);
const modify=fn=>{const value=structuredClone(reviews);fn(value.entries);return value};

test('P2 context map has 15 distinct items and 24 links to original lesson references',()=>{
 assert.deepEqual(built,stored);
 assert.equal(built.schema_version,1);
 assert.equal(built.identity_scope,'reviewed_context_per_course_item');
 assert.deepEqual(built.counts,{
   ambiguous_global_surfaces:5,reviewed_contextual_items:15,linked_lesson_references:24,
   reviewed_lexemes:4,distinct_contextual_senses:6,unchanged_unresolved_global_surfaces:5,
   legacy_source_lemma_discrepancies:1,contextual_wellbeing_gloss_caveats:4
 });
 assert.equal(new Set(built.items.map(x=>x.context_id)).size,15);
 assert.equal(new Set(built.occurrences.map(x=>x.section_id+'/'+x.lesson_id+'/'+x.item_id)).size,24);
 assert.equal(fs.readFileSync(path.join(ROOT,'docs/P2-CONTEXTUAL-IDENTITY-BATCH2-REPORT.md'),'utf8'),engine.markdown(built));
 for(const entry of built.items){
  const parent=stages.find(s=>s.id===entry.section_id);
  const source=parent.items[entry.item_id];
  assert.ok(source,entry.context_id);
  assert.equal(entry.form_id,lexical.stableId('form',entry.surface_form));
  assert.equal(entry.context_fi,source.example_fi);
  assert.equal(entry.source_lemma_fi,source.lemma);
  assert.equal(entry.source_gloss_fa,source.translation_fa);
  assert.equal(entry.reviewed_status,'reviewed');
  assert.equal(entry.lesson_reference_count,built.occurrences.filter(o=>o.context_id===entry.context_id).length);
 }
});
test('same surface may encode two reviewed senses without affecting global identity',()=>{
 const time=lookup('a1.1-section-3','s3-aika'),appointment=lookup('a1.2-section-4','a12s4-hf-14');
 assert.equal(time.surface_form,appointment.surface_form);
 assert.equal(time.form_id,appointment.form_id);
 assert.notEqual(time.context_id,appointment.context_id);
 assert.equal(time.lexeme_id,appointment.lexeme_id);
 assert.notEqual(time.sense_id,appointment.sense_id);
 const acc=lookup('a2.1-section-2','a21s2-t-003');
 assert.equal(acc.sense_id,appointment.sense_id);
 assert.equal(acc.morphology.case,'genitive');
 assert.equal(byForm('ajan').identity_review_status,'unresolved');
 assert.equal(byForm('ajan').lexeme_id,null);
 const ability=lookup('a1.2-section-1','a12s1-hf-voi');
 const refusal=lookup('a1.2-section-3','a12s3-hf-14');
 const wellbeing=lookup('a1.3-section-1','a13s1-h-013');
 assert.equal(ability.sense_id,refusal.sense_id);
 assert.notEqual(ability.sense_id,wellbeing.sense_id);
 assert.equal(ability.form_id,wellbeing.form_id);
 assert.equal(ability.morphology.verb_form,'finite');
 assert.equal(refusal.morphology.verb_form,'connegative');
 assert.equal(wellbeing.morphology.verb_form,'connegative');
 assert.equal(wellbeing.sense_id,'sense:voida-wellbeing');
});
test('necessity and arrival are not confused with liking/holding or noun fire',()=>{
 const necessity=built.items.filter(e=>e.surface_form==='pitää');
 assert.equal(necessity.length,4);
 assert.ok(necessity.every(e=>e.sense_id==='sense:pitaa-necessity'&&e.morphology.verb_form==='finite'));
 const arrivals=built.items.filter(e=>e.surface_form==='tuli');
 assert.equal(arrivals.length,2);
 assert.ok(arrivals.every(e=>e.lexeme_id==='lexeme:tulla'&&e.sense_id==='sense:tulla-arrival'
   &&e.morphology.tense==='past'));
 const discrepancy=lookup('a1.3-section-4','a13s4-h-003');
 assert.equal(discrepancy.source_lemma_fi,'tuli');
 assert.equal(discrepancy.lemma_fi,'tulla');
 assert.equal(discrepancy.legacy_source_lemma_exception,'tuli');
 assert.equal(lookup('a2.1-section-1','a21s1-h-010').source_lemma_fi,'tulla');
 assert.equal(engine.lookup(built,'a1.1-section-4','s4-vesi'),null);
});
test('review coverage is exhaustive for exactly five globally unresolved surfaces',()=>{
 for(const form of engine.TARGET_FORMS){
  const side=byForm(form);
  assert.equal(side.identity_review_status,'unresolved');
  assert.equal(side.lexeme_id,null);
  assert.equal(side.sense_id,null);
  assert.equal(side.morphology,null);
  for(const o of side.occurrences){
   assert.ok(built.occurrences.some(x=>x.section_id===o.section_id&&x.item_id===o.item_id
     &&x.lesson_id===o.lesson_id&&x.form_id===side.form_id),form+'/'+o.item_id);
  }
 }
 assert.equal(prior.records.filter(x=>x.identity_review_status==='reviewed').length,70);
 assert.equal(prior.records.length,1264);
 assert.ok(built.items.every(x=>!Object.hasOwn(x,'mastered')&&
   !Object.hasOwn(x,'nextReviewAt')&&!Object.hasOwn(x,'dueAt')&&!Object.hasOwn(x,'score')));
 assert.equal(prior.records.filter(x=>x.kind==='expression'&&x.identity_review_status==='reviewed').length,0);
});
test('invalid contextual identity duplicates, unknown keys, mismatched examples and senses fail closed',()=>{
 const validate=x=>engine.build(x,stages,prior);
 assert.throws(()=>validate(modify(a=>a.push({...a[0]}))),/Duplicate item mapping/);
 assert.throws(()=>validate(modify(a=>a[0].item_id='imaginary-id')),/Unknown or unreferenced item/);
 assert.throws(()=>validate(modify(a=>a[0].section_id='not-shipped')),/Unknown or unreferenced item/);
 assert.throws(()=>validate(modify(a=>a[0].context_fi='I made this up.')),/Changed\/missing|Missing\/changed/i);
 assert.throws(()=>validate(modify(a=>a[0].sense_id='sense:aika-appointment')),/Unreviewed sense\/example combination/);
 assert.throws(()=>validate(modify(a=>a[0].surface_form='pitää')),/Stale surface mapping/);
 assert.throws(()=>validate(modify(a=>a[0].sense_id='sense:aika-mystery')),/Unreviewed sense\/example combination/);
 assert.throws(()=>validate(modify(a=>a.pop())),/Missing reviewed contextual item/);
 assert.throws(()=>validate(modify(a=>{a[0].mastered=true;})),
   /Unsupported contextual editorial metadata/);
 assert.throws(()=>validate(modify(a=>{a[0].nextReviewAt=123;})),
   /Unsupported contextual editorial metadata/);
 const tampered=structuredClone(prior),f=tampered.records.find(r=>r.kind==='form'&&r.surface_form==='ajan');
 f.identity_review_status='reviewed';
 assert.throws(()=>engine.build(reviews,stages,tampered),/must remain unresolved/);
 const stale=structuredClone(stages),section=stale.find(s=>s.id==='a1.1-section-3');
 section.items['s3-aika'].example_fi='Aika on huomenna.';
 assert.throws(()=>engine.build(reviews,stale,prior),/Changed\/missing|Missing\/changed/i);
});
test('morphological person, case, polarity and exception edits cannot silently pass',()=>{
 const validate=x=>engine.build(x,stages,prior);
 const edited=(surface,change)=>modify(entries=>{
  const value=entries.find(e=>e.surface_form===surface);
  assert.ok(value);
  change(value);
 });
 assert.throws(()=>validate(edited('ajan',e=>e.morphology.case='nominative')),/Invalid nominal morphology/);
 assert.throws(()=>validate(edited('voi',e=>e.morphology.person=1)),/Invalid finite verb morphology|Invalid finite verb fields/);
 assert.throws(()=>validate(edited('pitää',e=>e.morphology.tense='past')),/Invalid finite verb morphology/);
 assert.throws(()=>validate(edited('tuli',e=>delete e.legacy_source_lemma_exception)),/Undocumented source lemma mismatch/);
 assert.throws(()=>validate(edited('tuli',e=>e.sense_id='sense:tuli-fire')),/Unreviewed sense/);
 assert.throws(()=>validate(modify(a=>{
  const e=a.find(x=>x.surface_form==='voi'&&x.context_fi==='En voi hyvin.');
  e.morphology={part_of_speech:'verb',tense:'present',verb_form:'finite',
   mood:'indicative',person:3,number:'singular',polarity:'affirmative'};
 })),/Invalid positive voida context/);
 assert.throws(()=>validate(modify(a=>{
  const e=a.find(x=>x.surface_form==='voi'&&x.context_fi==='En voi hyvin.');
  delete e.legacy_gloss_note_en;
 })),/Missing wellbeing source-gloss caveat/);
});
test('Course, Parole provenance and Word Practice mapping remain surface-specific',()=>{
 const reviewMap=read('data/course/course-review-form-map.json');
 assert.equal(reviewMap.identity_scope,'reviewable_curated_dictionary_surface_forms_only');
 assert.ok(reviewMap.mappings.every(r=>{
  // Sense/lexeme labels may be passed only when reviewed, never as SRS mastery.
  const identity=prior.records.find(x=>x.kind==='form'&&x.form_id===r.form_id
    &&x.identity_review_status==='reviewed');
  const hasLexeme=Object.hasOwn(r,'lexeme_id'),hasSense=Object.hasOwn(r,'sense_id');
  return hasLexeme===hasSense&&(!hasLexeme||(identity&&identity.lexeme_id===r.lexeme_id
    &&identity.sense_id===r.sense_id))
    &&!['mastered','dueAt','nextReviewAt','score','lapses'].some(key=>Object.hasOwn(r,key));
 }));
 assert.equal(reviewMap.mappings.filter(r=>Object.hasOwn(r,'lexeme_id')).length,31);
 assert.ok(built.occurrences.every(r=>!Object.hasOwn(r,'mastered')&&!Object.hasOwn(r,'score')
   &&!Object.hasOwn(r,'dueAt')&&!Object.hasOwn(r,'nextReviewAt')));
 assert.ok(prior.records.every(r=>r.form_id===null||r.form_id===r.id));
 assert.equal(built.disclaimer.includes('SRS'),true);
 const dictionary=read('data/common-words.json');
 assert.equal(dictionary.words.length,425);
 for(const form of engine.TARGET_FORMS){
  const r=byForm(form);
  assert.equal(r.id,lexical.stableId('form',form));
  assert.ok(['ranked','source_backed_outside_dictionary','curated_unranked'].includes(r.provenance));
 }
});
