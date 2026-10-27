'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = name => JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const builder = require('../scripts/build-p2-cross-app-index.cjs');
const identity = require('../p2-shared-identity.js');
const srs = require('../spaced-repetition.js');
const output = read('data/course/p2-cross-app-identity.json');
const compact = read('data/course/p2-cross-app-runtime.json');
const sidecar = read('data/course/lexical-identity-sidecar.json');
const dictionary = read('data/common-words.json');
const contextual = read('data/course/contextual-lexical-identity-map.json');
const sections = ['a1.1','a1.2','a1.3','a2.1'].flatMap(level =>
 [1,2,3,4].map(n=>'data/course/'+level+'-section-'+n+'.json')
  .filter(f=>fs.existsSync(path.join(root,f))).map(read));

test('P2 cross-app index reproduces all exact forms, expressions, topic IDs, and reviewed occurrences', () => {
 const generated=builder.build(sidecar,dictionary,contextual,sections);
 assert.deepEqual(output,generated);
 assert.deepEqual(compact,builder.compact(generated));
 assert.ok(JSON.stringify(compact).length < JSON.stringify(generated).length / 3);
 assert.equal(output.counts.identity_records,sidecar.records.length);
 assert.equal(output.counts.globally_reviewed,70);
 assert.equal(output.counts.globally_unresolved,1194);
 assert.equal(output.counts.contextually_reviewed_course_items,contextual.items.length);
 assert.equal(output.counts.dictionary_and_word_practice_forms,dictionary.words.length);
 assert.equal(new Set(output.course_items.map(x=>x.section_id+'/'+x.item_id)).size,output.course_items.length);
 const byId=new Map(output.records.map(r=>[r.id,r]));
 for(const row of output.course_items) {
  const section=sections.find(s=>s.id===row.section_id);
  assert.ok(section?.items[row.item_id] || section?.p3_review_items?.[row.item_id],
   'P2 must resolve both original and separately authored P3 review items');
  assert.equal(row.topic_id,section.curriculum_section_id);
  assert.ok(byId.has(row.identity_id));
 }
 for(const row of output.records) {
  assert.ok(row.topic_ids.every(t=>sections.some(s=>s.curriculum_section_id===t)));
  if(row.identity_review_status==='unresolved') {
   assert.equal(row.lexeme_id,null);assert.equal(row.sense_id,null);
   assert.equal(row.morphology,null);
  }
 }
});

test('Course, Dictionary and Word Practice resolve exactly the same eligible form IDs', () => {
 const joined=identity.hydrate(compact);
 for(const word of dictionary.words) {
  const dict=joined.dictionaryWord(word.word),practice=joined.wordPracticeWord(word.word);
  assert.ok(dict&&practice,'Missing dictionary/SRS identity for '+word.word);
  assert.equal(dict.id,identity.stableId('form',word.word));
  assert.equal(dict.form_id,practice.form_id);
  assert.equal(dict.word_practice_key,identity.normalize(word.word));
 }
 for(const link of output.course_items) {
  const item=joined.courseItem(link.section_id,link.item_id);
  assert.ok(item);
  assert.equal(item.id,link.identity_id);
  if(item.word_practice_key) {
   assert.equal(item.form_id,joined.wordPracticeWord(item.word_practice_key)?.form_id);
  }
 }
 const expressions=output.course_items.filter(x=>x.identity_id.startsWith('expression:'));
 assert.ok(expressions.length>100);
 const expression=joined.courseItem(expressions[0].section_id,expressions[0].item_id);
 assert.equal(expression.word_practice_key,null);
 assert.equal(expression.form_id,null);
 assert.equal(expression.expression_id,expression.id);
});

test('P2 protects case/tense evidence and reviewed contexts without inheriting SRS mastery',()=>{
 const joined=identity.hydrate(compact);
 const on=joined.dictionaryWord('on'),olin=joined.dictionaryWord('olin');
 assert.ok(on&&olin);
 assert.notEqual(on.form_id,olin.form_id);
 assert.equal(on.sense_id,null);
 const forms=output.records.filter(r=>r.lexeme_id==='lexeme:mina');
 assert.ok(forms.length>=2);
 assert.notEqual(forms[0].form_id,forms[1].form_id);
 assert.equal(forms[0].sense_id,forms[1].sense_id);
 const context=joined.courseItem('a1.1-section-3','s3-aika');
 assert.equal(context.review_scope,'course_item');
 assert.equal(context.sense_id,'sense:aika-time');
 const global=joined.dictionaryWord('aika');
 assert.equal(global?.review_scope,'unresolved');
 assert.equal(global?.sense_id,null);
 const notScoped=output.course_items.find(x=>
   x.identity_id===identity.stableId('form','voi')&&!x.context_review);
 if(notScoped)assert.equal(joined.courseItem(notScoped.section_id,notScoped.item_id).sense_id,null);
 const fakeWords=[{word:'on',rank:1},{word:'olin',rank:2}];
 const previous=srs.recordAnswer(srs.emptyProgress(1700000000000),fakeWords[0],true,1700000000000);
 const stored=JSON.stringify(previous);
 joined.wordPracticeWord('on');
 joined.wordPracticeWord('olin');
 assert.equal(JSON.stringify(previous),stored);
 assert.equal(previous.words.olin,undefined);
});

test('P2 resolver fails closed for forged senses, unsafe joins and absent browser cache',async()=>{
 const bad={...output,records:output.records.map((r,i)=>i===0?{...r,id:'form:bad'}:r)};
 assert.throws(()=>identity.hydrate(bad),/Conflicting P2 stable/);
 const unresolved=output.records.find(r=>r.identity_review_status==='unresolved');
 const forged={...output,records:output.records.map(r=>r.id===unresolved.id?{...r,sense_id:'sense:guessed'}:r)};
 assert.throws(()=>identity.hydrate(forged),/Unreviewed P2 sense/);
 const badCompact={...compact,links:[...compact.links,["fake","fake",compact.rows.length,null]]};
 assert.throws(()=>identity.hydrate(badCompact),/Malformed compact/);
 assert.equal(await identity.load({}),null);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const helperPos=html.indexOf('p2-shared-identity.js?v=');
 assert.ok(helperPos>=0&&helperPos<html.indexOf('app.js?v='));
 assert.match(fs.readFileSync(path.join(root,'course.js'),'utf8'),/identityIndex\?\.courseItem/);
 assert.match(fs.readFileSync(path.join(root,'app.js'),'utf8'),/p2Identity\?\.dictionaryWord/);
 assert.match(fs.readFileSync(path.join(root,'spaced-repetition.js'),'utf8'),/p2Identity\?\.wordPracticeWord/);
});
