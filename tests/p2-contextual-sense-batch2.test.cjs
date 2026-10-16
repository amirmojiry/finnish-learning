'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const compiler=require('../scripts/build-contextual-sense-map.cjs');
const lexical=require('../scripts/build-lexical-identity.cjs');
const ROOT=path.resolve(__dirname,'..'),read=name=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
const sectionPaths=['a1.1','a1.2','a1.3','a2.1'].flatMap(level=>[1,2,3,4]
 .map(n=>'data/course/'+level+'-section-'+n+'.json').filter(p=>fs.existsSync(path.join(ROOT,p))));
const sections=sectionPaths.map(read);
const lexicalSidecar=read('data/course/lexical-identity-sidecar.json');
const edited=read('data/course/reviewed-contextual-senses.json');
const build=source=>compiler.build(sections,lexicalSidecar,source);
const stored=read('data/course/contextual-sense-map.json');
const byItem=new Map(stored.reviewed_items.map(x=>[x.section_id+'/'+x.item_id,x]));

test('batch two includes 15 independently reviewed item meanings across 24 original lesson references',()=>{
 const actual=build(edited);assert.deepEqual(actual,stored);
 assert.equal(actual.schema_version,1);
 assert.deepEqual(actual.counts,{
   reviewed_course_items:15,reviewed_lesson_occurrences:24,
   reviewed_ambiguous_written_surfaces:5,reviewed_contextual_lexemes:4,
   reviewed_contextual_senses:6,globally_unresolved_target_surfaces:5,
   existing_globally_reviewed_forms:47
 });
 assert.equal(new Set(stored.reviewed_items.map(x=>x.section_id+'/'+x.item_id)).size,15);
 for(const row of stored.reviewed_items){
   assert.equal(row.form_id,lexical.stableId('form',row.surface_form));
   assert.ok(row.lesson_occurrences.length);
   assert.ok(row.lesson_occurrences.every(o=>o.occurrence_id===
    [row.section_id,o.lesson_id,row.item_id].join('/')));
   assert.ok(!Object.hasOwn(row,'mastery')&&!Object.hasOwn(row,'srs')&&!Object.hasOwn(row,'completed'));
 }
});

test('one written form may have two verified course senses without global reassignment',()=>{
 const first=byItem.get('a1.1-section-3/s3-aika'),
   second=byItem.get('a1.2-section-4/a12s4-hf-14'),
   object=byItem.get('a2.1-section-2/a21s2-t-003');
 assert.equal(first.sense_id,'sense:aika-time');
 assert.equal(second.sense_id,'sense:aika-appointment');
 assert.equal(object.sense_id,'sense:aika-appointment');
 assert.equal(first.form_id,second.form_id);
 assert.equal(second.lexeme_id,object.lexeme_id);
 assert.notEqual(second.form_id,object.form_id);
 assert.equal(object.morphology.part_of_speech,'noun');
 assert.equal(object.morphology.case,'genitive');
 const able=byItem.get('a1.2-section-1/a12s1-hf-voi'),
   cannot=byItem.get('a1.2-section-3/a12s3-hf-14'),
   wellbeing=byItem.get('a1.2-section-4/a12s4-hf-17');
 assert.equal(able.sense_id,'sense:voida-ability');
 assert.equal(cannot.sense_id,'sense:voida-ability');
 assert.equal(wellbeing.sense_id,'sense:voida-wellbeing');
 assert.equal(able.form_id,wellbeing.form_id);
 assert.equal(able.morphology.person,3);
 assert.equal(able.morphology.verb_form,'finite');
 assert.equal(cannot.morphology.verb_form,'connegative');
 assert.equal(wellbeing.morphology.verb_form,'connegative');
 for(const form of compiler.AMBIGUOUS){
   const global=lexicalSidecar.records.find(x=>x.kind==='form'&&x.surface_form===form);
   assert.ok(global);
   assert.equal(global.identity_review_status,'unresolved');
   assert.equal(global.lexeme_id,null);
   assert.equal(global.sense_id,null);
   assert.equal(global.morphology,null);
 }
});

test('necessity and arrived are bounded verbal readings, not liking or fire',()=>{
 for(const row of stored.reviewed_items.filter(r=>r.surface_form==='pitää')){
   assert.equal(row.lexeme_id,'lexeme:pitaa');
   assert.equal(row.sense_id,'sense:pitaa-necessity');
   assert.equal(row.morphology.verb_form,'finite');
   assert.equal(row.morphology.tense,'present');
   assert.equal(row.morphology.person,3);
   assert.equal(row.source_exception.code,'polysemous_source_gloss');
 }
 for(const row of stored.reviewed_items.filter(r=>r.surface_form==='tuli')){
   assert.equal(row.lexeme_id,'lexeme:tulla');
   assert.equal(row.sense_id,'sense:tulla-arrive');
   assert.equal(row.morphology.tense,'past');
   assert.equal(row.morphology.person,3);
   assert.notEqual(row.lexeme_id,'lexeme:tuli');
 }
 assert.equal(byItem.get('a1.3-section-4/a13s4-h-003').source_exception.code,'incorrect_source_lemma');
 assert.equal(byItem.get('a2.1-section-1/a21s1-h-010').source_exception.code,'polysemous_source_gloss');
 assert.equal(sections.find(s=>s.id==='a1.3-section-4').items['a13s4-h-003'].lemma,'tuli');
});

test('reject duplicate item mappings, missing mappings, and nonexistent item identifiers',()=>{
 const duplicate=structuredClone(edited);
 duplicate.entries.push(structuredClone(duplicate.entries[0]));
 assert.throws(()=>build(duplicate),/Duplicate contextual item/);
 const missing=structuredClone(edited);missing.entries.pop();
 assert.throws(()=>build(missing),/Missing authored ambiguous item review/);
 const unknown=structuredClone(edited);unknown.entries[0].item_id='fake-item-id';
 assert.throws(()=>build(unknown),/Unknown contextual course item/);
 const invented=structuredClone(edited);invented.entries[0].section_id='fake-section-id';
 assert.throws(()=>build(invented),/Unknown contextual course item/);
});

test('reject fake attested context, swapped sense, invalid inflection and missing source exception',()=>{
 const alter=mutation=>{const sample=structuredClone(edited);mutation(sample.entries);return sample;};
 assert.throws(()=>build(alter(entries=>{entries[0].context_fi='I invented a sentence.';})),/Stale or invented contextual example/);
 const time=edited.entries.findIndex(e=>e.sense_id==='sense:aika-time');
 assert.throws(()=>build(alter(entries=>{entries[time].sense_id='sense:aika-appointment';})),/Wrong lexeme\/sense/);
 const health=edited.entries.findIndex(e=>e.sense_id==='sense:voida-wellbeing');
 assert.throws(()=>build(alter(entries=>{entries[health].sense_id='sense:voida-ability';})),/Wrong lexeme\/sense/);
 const came=edited.entries.findIndex(e=>e.surface_form==='tuli');
 assert.throws(()=>build(alter(entries=>{entries[came].lexeme_id='lexeme:tuli';})),/Wrong lexeme\/sense/);
 const appoint=edited.entries.findIndex(e=>e.surface_form==='ajan');
 assert.throws(()=>build(alter(entries=>{entries[appoint].morphology.case='nominative';})),/Incorrect inflectional analysis/);
 const neg=edited.entries.findIndex(e=>e.surface_form==='voi'&&e.context_fi==='En voi hyvin.');
 assert.throws(()=>build(alter(entries=>{entries[neg].morphology.person=1;})),/Incorrect inflectional analysis/);
 assert.throws(()=>build(alter(entries=>{delete entries[came].source_exception;})),/Legacy gloss or lemma exception/);
 assert.throws(()=>build(alter(entries=>{entries[0].sense_gloss_en='';})),/Missing bounded English meaning/);
});

test('neither Parole provenance nor Word Practice SRS mapping is changed by context evidence',()=>{
 const before=read('data/course/course-review-form-map.json');
 const dictionary=read('data/common-words.json');
 const source=lexical.readParoleSource(fs.readFileSync(path.join(ROOT,'data/parole_frek_3.txt')));
 const base=lexical.build(dictionary,sections,source,read('data/course/reviewed-lexical-identities.json'));
 assert.deepEqual(base,lexicalSidecar);
 const after=build(edited);
 assert.equal(after.counts.existing_globally_reviewed_forms,47);
 assert.ok(before.mappings.every(m=>!Object.hasOwn(m,'sense_id')&&!Object.hasOwn(m,'lexeme_id')
   &&!Object.hasOwn(m,'mastered')&&!Object.hasOwn(m,'nextReviewAt')));
 assert.equal(before.identity_scope,'reviewable_curated_dictionary_surface_forms_only');
 const text=JSON.stringify(after);
 for(const field of ['nextReviewAt','dueAt','masteredAt','course_score','srs_state','learning_history']){
   assert.ok(!text.includes('"'+field+'"'),field);
 }
 for(const r of lexicalSidecar.records){
   if(!compiler.AMBIGUOUS.includes(r.surface_form)||r.kind!=='form')continue;
   assert.equal(r.identity_review_status,'unresolved');
 }
});
