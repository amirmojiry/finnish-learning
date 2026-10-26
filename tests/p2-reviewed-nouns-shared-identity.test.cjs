'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const nouns=require('../scripts/audit-p2-noun-batch.cjs');
const identity=require('../scripts/build-lexical-identity.cjs');
const reviewMap=require('../scripts/build-course-review-map.cjs');
const backlog=require('../scripts/build-p2-review-queue.cjs');
const bridge=require('../course-srs-bridge.js');
const srs=require('../spaced-repetition.js');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const batch=read('data/course/reviewed-lexical-identities-batch3.json');
const old=read('data/course/reviewed-lexical-identities.json');
const side=read('data/course/lexical-identity-sidecar.json');
const dict=read('data/common-words.json');
const ctx=read('data/course/contextual-lexical-identity-map.json');
const map=read('data/course/course-review-form-map.json');
const sections=[...'a1.1,a1.2,a1.3,a2.1'.split(',')].flatMap(level=>[1,2,3,4]
  .map(n=>'data/course/'+level+'-section-'+n+'.json')
  .filter(p=>fs.existsSync(path.join(ROOT,p))).map(read));
const record=form=>side.records.find(r=>r.kind==='form'&&r.surface_form===form);
const stable=form=>identity.stableId('form',identity.normalize(form));
const NOW=Date.parse('2026-10-26T09:00:00Z');
const event=(changes={})=>({sequence:1,answeredAt:NOW-60000,sessionId:'lesson-one',
 sectionId:'s',targetId:'one',activityType:'choice',firstAttempt:true,correct:false,...changes});

test('23 noun forms have exact attested token witnesses and preserve all 47 old IDs',()=>{
 const result=nouns.audit(batch,old,side,dict,sections);
 assert.deepEqual(result,{global_total:1264,reviewed:70,new_nouns:23,unresolved:1194,
  unresolved_expressions:440,exact_noun_witnesses:23,unchanged_base:47});
 assert.equal(old.entries.length,47);
 assert.equal(batch.entries.length,23);
 const combined=new Set([...old.entries,...batch.entries].map(x=>x.surface_form));
 assert.equal(combined.size,70);
 for(const entry of [...old.entries,...batch.entries]){
  const row=record(entry.surface_form);
  assert.equal(row.form_id,stable(entry.surface_form));
  assert.equal(row.lexeme_id,entry.lexeme_id);
  assert.equal(row.sense_id,entry.sense_id);
  assert.deepEqual(row.morphology,entry.morphology);
 }
 const sets=[
  ['kahvi','kahvia','partitive'],['työ','työtä','partitive'],
  ['lääkäri','lääkärille','allative'],['koti','kotiin','illative'],
  ['vesi','vettä','partitive'],['asema','asemalle','allative'],
  ['kauppa','kaupasta','elative'],['lippu','lippua','partitive'],
 ];
 for(const [base,derived,kase] of sets){
  assert.equal(record(base).lexeme_id,record(derived).lexeme_id);
  assert.equal(record(base).sense_id,record(derived).sense_id);
  assert.equal(record(derived).morphology.case,kase);
  assert.notEqual(record(base).form_id,record(derived).form_id);
 }
 assert.ok(batch.entries.every(e=>e.morphology.number==='singular'));
 assert.equal(batch.entries.filter(e=>e.witness.source==='course').length,22);
 assert.equal(batch.entries.filter(e=>e.witness.source==='dictionary').length,1);
 for(const form of ['euro','sänky']){
  const row=record(form);
  assert.equal(row.identity_review_status,'unresolved',form+' lacks a nominative token witness');
  assert.equal(row.lexeme_id,null);
  assert.equal(row.sense_id,null);
  assert.ok(!batch.entries.some(e=>e.surface_form===form));
 }
});

test('editorial noun witnesses reject changed contexts, invented cases and unapproved ambiguities',()=>{
 const mutate=fn=>{const b=structuredClone(batch);fn(b);return b;};
 assert.throws(()=>nouns.audit(mutate(b=>b.entries[0].witness.example_fi='fabricated'),old,side,dict,sections),
  /Stale authored Finnish noun context/);
 assert.throws(()=>nouns.audit(mutate(b=>b.entries[0].witness.item_id='unknown'),old,side,dict,sections),
  /Unknown authored noun witness/);
 assert.throws(()=>nouns.audit(mutate(b=>b.entries[0].morphology.case='invented'),old,side,dict,sections),
  /Unreviewed noun sense or inflection/);
 assert.throws(()=>nouns.audit(mutate(b=>b.entries[0].lexeme_id='lexeme:voi'),old,side,dict,sections),
  /Unreviewed noun sense or inflection/);
 assert.throws(()=>nouns.audit(mutate(b=>b.entries.pop()),old,side,dict,sections),
  /Expected 23 exact-attested noun decisions/);
 for(const form of ['aika','ajan','voi','pitää','tuli','kotona']){
  const row=record(form);
  assert.equal(row.identity_review_status,'unresolved',form);
  assert.equal(row.lexeme_id,null);
  assert.equal(row.sense_id,null);
 }
 assert.equal(ctx.items.filter(x=>x.surface_form==='voi').map(x=>x.sense_id).includes('sense:voida-wellbeing'),true);
 assert.equal(ctx.items.some(x=>x.surface_form==='pitää'&&x.sense_id==='sense:pitaa-necessity'),true);
});

test('review refuses inflected-only course and dictionary examples as nominative evidence',()=>{
 const cloned=()=>structuredClone(sections);
 const altered=cloned(), transport=altered.find(s=>s.id==='a1.2-section-2');
 transport.items['a12s2-topic-saapuu'].example_fi='Menen junalla.';
 assert.throws(()=>nouns.audit(batch,old,side,dict,altered),
  /Missing exact Finnish noun surface token in attested example: juna/);

 const drinks=cloned(), cafe=drinks.find(s=>s.id==='a1.1-section-4');
 cafe.items['s4-yksi'].example_fi='Yksi kahvia, kiitos.';
 assert.throws(()=>nouns.audit(batch,old,side,dict,drinks),
  /Missing exact Finnish noun surface token in attested example: kahvi/);

 const food=structuredClone(dict);
 food.words.find(w=>w.word==='hyvä').example_2_fi='Tämä on ruokaa.';
 assert.throws(()=>nouns.audit(batch,old,side,food,sections),
  /Missing exact Finnish noun surface token in attested example: ruoka/);

 const alteredBatch=structuredClone(batch);
 alteredBatch.entries.find(e=>e.surface_form==='kahvi').witness.exact_example_source.item_id='s4-kahvi';
 assert.throws(()=>nouns.audit(alteredBatch,old,side,dict,sections),
  /Unapproved exact noun witness reference: kahvi/);
});

test('whole P2 queue accounts for every unresolved form and phrase without manufacturing senses',()=>{
 const actual=backlog.build(side,ctx);
 assert.deepEqual(read('data/course/p2-unresolved-review-queue.json'),actual);
 assert.equal(fs.readFileSync(path.join(ROOT,'docs/P2-UNRESOLVED-REVIEW-QUEUE.md'),'utf8'),
  backlog.markdown(actual));
 assert.deepEqual(actual.counts,{identity_records:1264,globally_reviewed:70,unresolved:1194,
  unresolved_forms:754,unresolved_expressions:440,contextual_items_reviewed:15,
  globally_unresolved_context_sensitive:5});
 assert.equal(new Set(actual.records.map(x=>x.id)).size,1194);
 assert.deepEqual(actual.records.slice(0,2).map(x=>x.surface_form),['voi','pitää']);
 assert.ok(actual.records.every(x=>x.review_status==='pending_human_review'&&
  side.records.some(old=>old.id===x.id&&old.identity_review_status==='unresolved')));
 assert.ok(!actual.records.some(x=>x.id===stable('kahvia')));
 const bogus=structuredClone(side);bogus.records.find(x=>x.surface_form==='voi'&&x.kind==='form').sense_id='sense:voida-ability';
 assert.throws(()=>backlog.build(bogus,ctx),/fabricated semantic identity/);
});

test('Course-to-dictionary form mapping excludes contextual homographs without changing word records',()=>{
 const built=reviewMap.build(side,dict,ctx);
 assert.deepEqual(map,built);
 assert.equal(map.schema_version,1);
 assert.equal(map.mappings.length,239);
 assert.equal(map.excluded_ambiguous_form_ids.length,5);
 assert.ok(map.excluded_ambiguous_form_ids.includes(stable('voi')));
 assert.ok(map.excluded_ambiguous_form_ids.includes(stable('pitää')));
 assert.ok(map.excluded_ambiguous_form_ids.includes(stable('ajan')));
 assert.ok(map.mappings.every(row=>row.form_id===stable(row.surface_form)));
 assert.ok(map.mappings.every(row=>!map.excluded_ambiguous_form_ids.includes(row.form_id)));
 assert.ok(map.mappings.every(row=>!('lexeme_id' in row)&&!('sense_id' in row)&&!('dueAt' in row)));
});

test('Course first-attempt errors flow by exact form ID and never inherit another case or sense',()=>{
 const fake={schema_version:1,excluded_ambiguous_form_ids:[stable('voi')],mappings:[
  {section_id:'s',item_id:'one',form_id:stable('kahvi'),surface_form:'kahvi'},
  {section_id:'s',item_id:'partitive',form_id:stable('kahvia'),surface_form:'kahvia'},
  {section_id:'s',item_id:'unknown-sense',form_id:stable('voi'),surface_form:'voi'},
  {section_id:'s',item_id:'invalid',form_id:'form:fake',surface_form:'kahvi'}
 ]};
 const hist={answerHistory:[event(),event({targetId:'partitive',sessionId:'lesson-two'}),
  event({targetId:'unknown-sense',sessionId:'lesson-three'}),
  event({targetId:'invalid',sessionId:'lesson-four'}),
  event({targetId:'partitive',firstAttempt:false,sessionId:'lesson-five'}),
  event({targetId:'one',correct:true,sessionId:'lesson-six'})]};
 const byForm=bridge.reviewPrioritiesByFormId(hist,fake,NOW);
 assert.deepEqual(byForm,{[stable('kahvi')]:1,[stable('kahvia')]:1});
 assert.deepEqual(bridge.reviewPriorities(hist,fake,NOW),{kahvi:1,kahvia:1});
 const dictWords=[{word:'kahvi',rank:1},{word:'kahvia',rank:2},{word:'voi',rank:3}];
 const progress=srs.emptyProgress(NOW),original=JSON.stringify(progress);
 const queue=srs.buildReviewQueue(dictWords,progress,NOW,
  {courseFormPriorities:{[stable('kahvia')]:2},newLimit:2,sessionLimit:2});
 assert.deepEqual(queue.map(x=>x.word),['kahvia','kahvi']);
 assert.equal(JSON.stringify(progress),original);
 assert.ok(!('kahvia' in progress.words));
 const mistaken={...fake,mappings:[...fake.mappings,{section_id:'s',item_id:'one',form_id:stable('kahvia'),surface_form:'kahvia'}]};
 assert.deepEqual(bridge.reviewPrioritiesByFormId({answerHistory:[event()]},mistaken,NOW),{});
});

test('due Word Practice SRS always wins, local storage is unchanged, and previous form keys remain valid',()=>{
 const kahvi={rank:1,word:'kahvi'},kahvia={rank:2,word:'kahvia'},voi={rank:3,word:'voi'};
 let progress=srs.recordAnswer(srs.emptyProgress(NOW),kahvi,false,NOW-20*60000);
 const before=JSON.stringify(progress);
 const queue=srs.buildReviewQueue([kahvi,kahvia,voi],progress,NOW,
  {newLimit:3,sessionLimit:3,courseFormPriorities:{[stable('kahvia')]:99}});
 assert.deepEqual(queue.map(x=>x.word),['kahvi','kahvia','voi']);
 assert.equal(JSON.stringify(progress),before);
 assert.equal(progress.words.kahvia,undefined);
 const storageText=JSON.stringify({version:1,answerHistory:[event()]});
 const storage={getItem:key=>key==='fiCourseProgressV1'?storageText:null,
  setItem:()=>{throw Error('No P2 metadata writes to legacy records');}};
 const data={schema_version:1,mappings:[{section_id:'s',item_id:'one',form_id:stable('kahvi'),surface_form:'kahvi'}]};
 assert.deepEqual(bridge.reviewPrioritiesByFormIdFromStorage(storage,data,'fiCourseProgressV1',1,NOW),
  {[stable('kahvi')]:1});
 assert.equal(storageText,JSON.stringify({version:1,answerHistory:[event()]}));
});
