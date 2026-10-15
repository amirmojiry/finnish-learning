'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const build=require('../scripts/build-lexical-identity.cjs');
const audit=require('../scripts/audit-reviewed-lexical-identities.cjs');
const ROOT=path.resolve(__dirname,'..'),read=name=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
const sidecar=read('data/course/lexical-identity-sidecar.json');
const reviews=read('data/course/reviewed-lexical-identities.json');
const dictionary=read('data/common-words.json');
const records=new Map(sidecar.records.filter(row=>row.kind==='form').map(row=>[row.surface_form,row]));
const approved=new Map(reviews.entries.map(row=>[row.surface_form,row]));

test('P2 batch reviews 40 deliberate forms in addition to the seven original identities',()=>{
 const report=audit.evaluate(sidecar,reviews);
 assert.deepEqual(report.errors,[]);
 assert.equal(reviews.entries.length,47);
 assert.equal(new Set(reviews.entries.map(row=>row.surface_form)).size,47);
 assert.equal(audit.BATCH_FORMS.length,40);
 assert.equal(report.counts.first_batch_new_forms,40);
 assert.equal(report.counts.reviewed_nouns_in_batch,23);
 assert.equal(report.counts.reviewed_pronouns_in_batch,17);
 assert.equal(report.counts.reviewed_forms,47);
 assert.equal(report.counts.unresolved_forms,777);
 assert.equal(report.counts.unresolved_expressions,440);
 assert.equal(report.counts.total_records,1264);
 assert.equal(report.counts.new_dictionary_only_forms,2);
 assert.equal(report.counts.new_forms_in_shipped_lessons,38);
 const snapshot=read('data/course/p2-identity-batch1-audit.json');
 assert.deepEqual(snapshot,report);
 for(const form of [...audit.BASE_FORMS,...audit.BATCH_FORMS]){
   const item=records.get(form),entry=approved.get(form);
   assert.equal(item?.identity_review_status,'reviewed',form);
   assert.equal(item?.form_id,build.stableId('form',form));
   assert.equal(item?.lexeme_id,entry.lexeme_id);
   assert.equal(item?.sense_id,entry.sense_id);
   assert.deepEqual(item?.morphology,entry.morphology);
 }
});

test('personal and demonstrative pronouns share lexeme/sense, not surface identity or number',()=>{
 function family(a,b){
   assert.equal(records.get(a).lexeme_id,records.get(b).lexeme_id,a+' vs '+b);
   assert.equal(records.get(a).sense_id,records.get(b).sense_id,a+' vs '+b);
   assert.notEqual(records.get(a).form_id,records.get(b).form_id,a+' vs '+b);
 }
 for(const [a,b] of [
   ['minä','minun'],['minä','minulle'],['hän','hänen'],
   ['me','meidän'],['he','heidän'],['se','siinä'],['se','siitä'],['se','siihen'],
   ['tämä','tässä'],['tämä','tästä'],['tämä','tähän'],
   ['kaupunki','kaupungin'],['koti','kotiin'],['ajan','aikaa'],['ajan','aikana']
 ])family(a,b);
 assert.equal(records.get('meidän').morphology.number,'plural');
 assert.equal(records.get('heidän').morphology.case,'genitive');
 assert.equal(records.get('minulle').morphology.case,'allative');
 assert.equal(records.get('tähän').morphology.case,'illative');
 assert.equal(records.get('siitä').morphology.case,'elative');
 assert.equal(records.get('aikaa').morphology.case,'partitive');
 assert.equal(records.get('aikana').morphology.case,'essive');
 assert.equal(records.get('kotiin').morphology.case,'illative');
});

test('context-sensitive homographs and lexicalized locatives remain explicitly unresolved',()=>{
 for(const form of ['aika','kotona','voi','pitää','tuli','on','olin']){
   const row=records.get(form);
   assert.ok(row,form);
   assert.equal(row.identity_review_status,'unresolved',form);
   assert.equal(row.lexeme_id,null,form);
   assert.equal(row.sense_id,null,form);
   assert.equal(row.morphology,null,form);
 }
 assert.notEqual(records.get('on').form_id,records.get('olin').form_id);
 assert.notEqual(records.get('kotiin').form_id,records.get('kotona').form_id);
 assert.notEqual(records.get('tämä').form_id,records.get('se').form_id);
 assert.ok(sidecar.records.every(r=>r.kind!=='expression'||r.identity_review_status==='unresolved'));
});

test('editorial validation rejects unknown, duplicate, incompatible and invented morphology',()=>{
 const available=new Set(sidecar.records.filter(r=>r.kind==='form').map(r=>r.form_id));
 assert.equal(build.validateReviews(reviews,available).size,47);
 const entries=reviews.entries;
 const one=approved.get('hän'),two=approved.get('hänen');
 const check=(mutated,message)=>assert.throws(()=>build.validateReviews({entries:mutated},available),message);
 check([...entries,{...one,surface_form:'HÄN'}],/Duplicate reviewed surface/);
 check([...entries,{...one,surface_form:'made-up-form'}],/not found in shipped forms/);
 check([...entries.map(e=>e.surface_form==='hän'?{...e,sense_id:'sense:other-bad'}:e)],/Invalid reviewed lexical identity/);
 check([...entries.map(e=>e.surface_form==='hän'?{...e,morphology:{...e.morphology,case:'synthetic'}}:e)],/Invalid reviewed morphology/);
 check([...entries.map(e=>e.surface_form==='hän'?{...e,morphology:{...e.morphology,number:'dual'}}:e)],/Invalid reviewed morphology/);
 check([...entries.map(e=>e.surface_form==='hän'?{...e,morphology:{...e.morphology,part_of_speech:'verb'}}:e)],/Invalid reviewed morphology/);
 check([one,{...two,morphology:{...two.morphology,part_of_speech:'noun'}}],/Conflicting reviewed part of speech/);
 const without=structuredClone(sidecar),target=without.records.find(r=>r.surface_form==='minulle'&&r.kind==='form');
 target.lexeme_id='lexeme:other';
 assert.ok(audit.evaluate(without,reviews).errors.some(e=>e.includes('overlay mismatch: minulle')));
 const reclassified=structuredClone(sidecar),amb=reclassified.records.find(r=>r.surface_form==='voi'&&r.kind==='form');
 amb.identity_review_status='reviewed';
 assert.ok(audit.evaluate(reclassified,reviews).errors.some(e=>e.includes('must remain unresolved: voi')));
});

test('frequency provenance and Course-to-Word Practice linkage stay surface-specific',()=>{
 const dict=new Map(dictionary.words.map(w=>[build.normalize(w.word),w]));
 const source=build.readParoleSource(fs.readFileSync(path.join(ROOT,'data/parole_frek_3.txt')));
 for(const form of [...audit.BASE_FORMS,...audit.BATCH_FORMS]){
   const r=records.get(form),word=dict.get(form),original=source.forms.get(form);
   if(word){
     assert.equal(r.provenance,'ranked');
     assert.equal(r.source_rank,word.frequency_rank);
   }else if(original){
     assert.equal(r.provenance,'source_backed_outside_dictionary');
     assert.equal(r.source_rank,original.frequency_rank);
     assert.equal(r.source_position,original.position);
   }else{
     assert.equal(r.provenance,'curated_unranked');
     assert.equal(r.source_rank,null);
   }
 }
 const reviewMap=read('data/course/course-review-form-map.json');
 assert.equal(reviewMap.identity_scope,'reviewable_curated_dictionary_surface_forms_only');
 assert.ok(reviewMap.mappings.every(e=>e.form_id===build.stableId('form',e.surface_form)));
 assert.ok(reviewMap.mappings.every(e=>!Object.hasOwn(e,'lexeme_id')&&!Object.hasOwn(e,'sense_id')&&!Object.hasOwn(e,'mastered')&&!Object.hasOwn(e,'nextReviewAt')));
 assert.notEqual(records.get('minä').form_id,records.get('minulle').form_id);
 assert.equal(sidecar.disclaimer.includes('SRS'),true);
});

test('the first seven reviewed lexeme/sense decisions retain their original identities',()=>{
 const expected={
   'kirja':['lexeme:kirja','sense:kirja-book','nominative','singular'],
   'kissa':['lexeme:kissa','sense:kissa-animal','nominative','singular'],
   'koira':['lexeme:koira','sense:koira-animal','nominative','singular'],
   'minä':['lexeme:mina','sense:mina-first-person','nominative','singular'],
   'minun':['lexeme:mina','sense:mina-first-person','genitive','singular'],
   'sinä':['lexeme:sina','sense:sina-second-person','nominative','singular'],
   'sinun':['lexeme:sina','sense:sina-second-person','genitive','singular']
 };
 for(const [form,[lex,sense,kase,number]] of Object.entries(expected)){
   const e=approved.get(form);
   assert.equal(e.lexeme_id,lex);
   assert.equal(e.sense_id,sense);
   assert.deepEqual(e.morphology,{part_of_speech:form==='minä'||form==='minun'||form==='sinä'||form==='sinun'?'pronoun':'noun',case:kase,number});
 }
});
