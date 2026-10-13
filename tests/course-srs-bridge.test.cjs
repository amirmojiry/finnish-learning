'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const srs=require('../spaced-repetition.js');
const bridge=require('../course-srs-bridge.js');
const builder=require('../scripts/build-course-review-map.cjs');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const NOW=Date.parse('2026-10-13T12:00:00Z');
const map={schema_version:1,mappings:[
 {section_id:'s1',item_id:'on',form_id:'form:6f-6e',surface_form:'on'},
 {section_id:'s1',item_id:'olin',form_id:'form:6f-6c-69-6e',surface_form:'olin'}
]};
const event=(changes={})=>({sequence:1,answeredAt:NOW-60000,sessionId:'lesson-123',sectionId:'s1',targetId:'on',
 activityType:'choice',firstAttempt:true,productive:false,correct:false,...changes});
test('Course bridge maps exact dictionary form IDs and excludes expressions from compact manifest',()=>{
 const expected=builder.build(read('data/course/lexical-identity-sidecar.json'),read('data/common-words.json'));
 assert.deepEqual(read('data/course/course-review-form-map.json'),expected);
 assert.ok(expected.mappings.length>100);
 const available=new Set(read('data/common-words.json').words.map(w=>w.word.toLocaleLowerCase('fi-FI')));
 assert.ok(expected.mappings.every(m=>m.form_id.startsWith('form:')&&available.has(m.surface_form)));
 assert.equal(new Set(expected.mappings.map(m=>m.section_id+'/'+m.item_id)).size,expected.mappings.length);
});
test('first-attempt failures, not distractors, retries, successful hits, or repeated clicks, prioritize reviews',()=>{
 const history=[event(),event({sequence:2,answeredAt:NOW-59000}),event({sequence:3,firstAttempt:false,correct:true}),
   event({sequence:4,sessionId:'lesson-456',correct:true}),event({sequence:5,activityType:'teach',sessionId:'lesson-777'}),
   event({sequence:6,targetId:'missing',sessionId:'lesson-888'}),event({sequence:7,targetId:'olin',sessionId:'lesson-999'})];
 const original=JSON.stringify(history),data={answerHistory:history};
 assert.deepEqual(bridge.reviewPriorities(data,map,NOW),{on:1,olin:1});
 assert.equal(JSON.stringify(history),original);
 assert.deepEqual(bridge.reviewPriorities({answerHistory:[event({firstAttempt:false})]},map,NOW),{});
 assert.deepEqual(bridge.reviewPriorities({answerHistory:[event({correct:true})]},map,NOW),{});
 assert.deepEqual(bridge.reviewPriorities({answerHistory:[event({answeredAt:NOW-31*86400000})]},map,NOW),{});
});
test('Word Practice due reviews retain priority; Course weak hints only reorder unseen words within new limits',()=>{
 const words=[{rank:1,word:'ja'},{rank:2,word:'on'},{rank:3,word:'olin'},{rank:4,word:'ei'}];
 const original=srs.emptyProgress(NOW);
 const withDue=srs.recordAnswer(original,words[0],false,NOW-20*60000);
 const saved=JSON.stringify(withDue);
 const queue=srs.buildReviewQueue(words,withDue,NOW,{newLimit:3,sessionLimit:3,coursePriorities:{on:2,olin:1}});
 assert.deepEqual(queue.map(w=>w.word),['ja','on','olin']);
 assert.equal(JSON.stringify(withDue),saved);
 assert.equal(withDue.words.ja.totalAnswers,1);
 assert.equal(withDue.words.on,undefined);
 const withoutNew=srs.buildReviewQueue(words,withDue,NOW,{newLimit:0,coursePriorities:{on:1000}});
 assert.deepEqual(withoutNew.map(w=>w.word),['ja']);
});
test('legacy and malformed evidence never mutate SRS progress or synthesize mastery',()=>{
 assert.deepEqual(bridge.reviewPriorities(null,map,NOW),{});
 assert.deepEqual(bridge.reviewPriorities({answerHistory:[{targetId:'on',correct:false}]},map,NOW),{});
 assert.deepEqual(bridge.reviewPriorities({answerHistory:[event()]},{schema_version:0,mappings:map.mappings},NOW),{});
 assert.deepEqual(bridge.reviewPriorities({answerHistory:[event({targetId:'unknown'})]},map,NOW),{});
 const before=srs.emptyProgress(NOW);
 srs.buildReviewQueue([{rank:1,word:'on'}],before,NOW,{coursePriorities:{on:12}});
 assert.deepEqual(before,srs.emptyProgress(NOW));
});
test('new bridge asset loads before Word Practice and reads current Course evidence only on review start',()=>{
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 const course=html.indexOf('src="course.js?'),bridgeAsset=html.indexOf('src="course-srs-bridge.js?');
 const spaced=html.indexOf('src="spaced-repetition.js?');
 assert.ok(course>=0&&bridgeAsset>course&&spaced>bridgeAsset);
 const text=fs.readFileSync(path.join(ROOT,'spaced-repetition.js'),'utf8');
 assert.match(text,/course\.loadProgress\(windowObject\.localStorage\)/);
 assert.match(text,/course-review-form-map\.json/);
 assert.match(text,/coursePriorities: courseReviewPriorities\(\)/);
});
