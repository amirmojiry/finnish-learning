'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const generator=require('../scripts/build-lexical-identity.cjs');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const sidecar=read('data/course/lexical-identity-sidecar.json');

test('all shipped lessons and dictionary forms have stable provenance-aware surface IDs',()=>{
 assert.equal(sidecar.schema_version,1);
 assert.equal(sidecar.counts.shipped_sections,14);
 assert.equal(sidecar.counts.shipped_lessons,140);
 assert.equal(sidecar.counts.dictionary_forms,400);
 assert.equal(sidecar.records.length,sidecar.counts.records);
 assert.equal(new Set(sidecar.records.map(r=>r.id)).size,sidecar.records.length);
 assert.deepEqual(sidecar.records.map(r=>r.id),sidecar.records.map(r=>r.id).sort());
 assert.ok(sidecar.records.some(r=>r.provenance==='source_backed_outside_dictionary'));
 assert.ok(sidecar.records.some(r=>r.provenance==='curated_unranked'));
 assert.ok(sidecar.records.every(r=>r.lexeme_id===null&&r.sense_id===null&&r.morphology===null&&r.identity_review_status==='unresolved'));
 const on=sidecar.records.find(r=>r.id===generator.stableId('form','on'));
 const olin=sidecar.records.find(r=>r.id===generator.stableId('form','olin'));
 assert.ok(on&&olin);
 assert.notEqual(on.id,olin.id);
 assert.ok(sidecar.records.some(r=>r.kind==='expression'&&r.expression_id===r.id&&r.form_id===null));
 assert.ok(sidecar.records.every(r=>r.first_shipped_lesson===null||r.occurrences.some(o=>o.lesson_id===r.first_shipped_lesson)));
});

test('single-form casefolding is stable but does not conflate expressions',()=>{
 assert.equal(generator.stableId('form',generator.normalize(' ON ')),generator.stableId('form','on'));
 assert.notEqual(generator.stableId('form','on'),generator.stableId('expression','on'));
 assert.notEqual(generator.stableId('form','on'),generator.stableId('form','olin'));
});

test('sidecar compiler rejects duplicate normalized source identities',()=>{
 assert.throws(()=>generator.build({words:[{word:'On'},{word:'on'}]},[],{gaps:{}}),/Duplicate or invalid dictionary form/);
});

test('source-ranked fields follow curated Parole entries, not guessed morphology',()=>{
 const dict=new Map(read('data/common-words.json').words.map(w=>[generator.normalize(w.word),w]));
 for(const r of sidecar.records){
  if(r.provenance==='ranked'){
   assert.equal(r.kind,'form');
   assert.equal(r.source_rank,dict.get(r.surface_form)?.frequency_rank);
  }
  if(r.provenance==='curated_unranked')assert.equal(r.source_rank,null);
  if(r.kind==='expression')assert.equal(r.provenance,'curated_unranked');
 }
});

test('real output reproducibility and no dictionary/course schema modifications',()=>{
 const stages=['a1.1','a1.2','a1.3','a2.1'].flatMap(level=>[1,2,3,4].map(n=>'data/course/'+level+'-section-'+n+'.json')
   .filter(p=>fs.existsSync(path.join(ROOT,p))).map(read));
 const actual=generator.build(read('data/common-words.json'),stages,read('data/course/coverage-audit.json'));
 assert.deepEqual(actual,sidecar);
 assert.equal(actual.counts.shipped_lessons,140);
});
