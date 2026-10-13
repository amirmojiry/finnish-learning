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
 assert.equal(sidecar.counts.dictionary_forms,read('data/common-words.json').words.length);
 assert.equal(sidecar.records.length,sidecar.counts.records);
 assert.equal(new Set(sidecar.records.map(r=>r.id)).size,sidecar.records.length);
 assert.deepEqual(sidecar.records.map(r=>r.id),sidecar.records.map(r=>r.id).sort());
 assert.ok(sidecar.records.some(r=>r.provenance==='source_backed_outside_dictionary'));
 assert.ok(sidecar.records.some(r=>r.provenance==='curated_unranked'));
 assert.ok(sidecar.records.every(r=>r.identity_review_status==='reviewed'||(r.lexeme_id===null&&r.sense_id===null&&r.morphology===null&&r.identity_review_status==='unresolved')));
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
 const actual=generator.build(read('data/common-words.json'),stages,generator.readParoleSource(fs.readFileSync(path.join(ROOT,'data/parole_frek_3.txt'))),read('data/course/reviewed-lexical-identities.json'));
 assert.deepEqual(actual,sidecar);
 assert.equal(actual.counts.shipped_lessons,140);
});


test('array-valued authored activity references and prompt items receive lesson occurrences',()=>{
 const fixture={id:'fixture',items:{
   a:{surface_form:'a',item_type:'word'},
   b:{surface_form:'b',item_type:'expression'},
   c:{surface_form:'c',item_type:'expression'},
   d:{surface_form:'d',item_type:'prompt'}
 },lessons:[{id:'fixture-lesson',new_targets:[],activities:[
   {type:'sequence-order',items:['a']},
   {type:'dialogue-order',turns:['b']},
   {type:'guided-writing',expected_items:['c']},
   {type:'prompt-choice',prompt_item:'d',answer_item:'a'}
 ]}]};
 const built=generator.build({words:[]},[fixture],{forms:new Map()});
 for(const id of ['a','b','c','d']){
  const kind=id==='b'||id==='c'?'expression':'form';
  const record=built.records.find(r=>r.id===generator.stableId(kind,id));
  assert.ok(record,'missing authored reference '+id);
  assert.ok(record.occurrences.some(o=>o.item_id===id&&o.lesson_id==='fixture-lesson'));
 }
});

test('previously missed guided-writing expressions from A1.1 section four are indexed',()=>{
 for(const form of ['Hevonen on iso.','Lintu on pieni.']){
  const r=sidecar.records.find(row=>row.id===generator.stableId('expression',generator.normalize(form)));
  assert.ok(r,'missing authored expression '+form);
  assert.ok(r.occurrences.some(o=>o.section_id==='a1.1-section-4'));
 }
});

test('Parole provenance of uncurated taught forms is read from the full original source',()=>{
 const source=generator.readParoleSource(fs.readFileSync(path.join(ROOT,'data/parole_frek_3.txt')));
 const listed=source.forms.get('olet');
 assert.ok(listed);
 assert.equal(listed.frequency_rank,745);
 const olet=sidecar.records.find(r=>r.id===generator.stableId('form','olet'));
 assert.ok(olet);
 assert.equal(olet.provenance,'source_backed_outside_dictionary');
 assert.equal(olet.source_rank,listed.frequency_rank);
 assert.equal(olet.source_position,listed.position);
});


test('reviewed pronoun cases share a lexeme but retain independent surface evidence',()=>{
 const records=new Map(sidecar.records.map(r=>[r.surface_form,r]));
 assert.equal(records.get('minä').lexeme_id,'lexeme:mina');
 assert.equal(records.get('minun').lexeme_id,'lexeme:mina');
 assert.notEqual(records.get('minä').form_id,records.get('minun').form_id);
 assert.equal(records.get('minun').morphology.case,'genitive');
 assert.equal(records.get('on').identity_review_status,'unresolved');
 assert.equal(records.get('olin').sense_id,null);
});
test('unknown, duplicate and invalid editorial mappings are rejected',()=>{
 const build=entries=>generator.build({words:[]},[],{forms:new Map()},{entries});
 const valid={surface_form:'not-shipped',lexeme_id:'lexeme:test',sense_id:'sense:test-base',morphology:{part_of_speech:'noun',case:'nominative',number:'singular'}};
 assert.throws(()=>build([valid]),/not found/);
 assert.throws(()=>generator.build({words:[{word:'known',frequency_rank:1}]},[],{forms:new Map()},{entries:[{...valid,surface_form:'known'},{...valid,surface_form:'known'}]}),/Duplicate reviewed surface/);
 assert.throws(()=>build([{...valid,sense_id:'bad'}]),/Invalid reviewed lexical identity/);
});
