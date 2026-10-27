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
 const expected=builder.build(read('data/course/lexical-identity-sidecar.json'),read('data/common-words.json'),
  read('data/course/contextual-lexical-identity-map.json'));
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
test('raw persisted Course events with missing grading flags are never synthesized into errors',()=>{
 const raw=[
  event({sessionId:'valid'}),
  event({sessionId:'missing-correct',correct:undefined}),
  event({sessionId:'missing-first',firstAttempt:undefined}),
  event({sessionId:'both-missing',correct:undefined,firstAttempt:undefined}),
  event({sessionId:'incorrect-types',correct:0,firstAttempt:'true'}),
  event({sessionId:'genuine-right',correct:true}),
 ];
 const backing=JSON.stringify({version:1,answerHistory:raw});
 const storage={getItem:key=>key==='fiCourseProgressV1'?backing:null,
  setItem:()=>{throw Error('The bridge must be read-only');}};
 assert.deepEqual(bridge.reviewPrioritiesFromStorage(storage,map,'fiCourseProgressV1',1,NOW),{on:1});
 assert.deepEqual(bridge.reviewPrioritiesFromStorage(storage,map,'fiCourseProgressV1',2,NOW),{});
 assert.deepEqual(bridge.reviewPrioritiesFromStorage({getItem:()=>'{invalid json'},map,'fiCourseProgressV1',1,NOW),{});
 assert.deepEqual(bridge.reviewPrioritiesFromStorage({getItem:()=>{throw Error('storage blocked')}},map,'fiCourseProgressV1',1,NOW),{});
 assert.deepEqual(bridge.reviewPrioritiesFromStorage({getItem:()=>JSON.stringify({version:1,answerHistory:[event({correct:undefined})]})},map,'fiCourseProgressV1',1,NOW),{});
 assert.deepEqual(bridge.reviewPrioritiesFromStorage({getItem:()=>JSON.stringify({version:1,answerHistory:[event({firstAttempt:undefined})]})},map,'fiCourseProgressV1',1,NOW),{});
 assert.equal(backing,JSON.stringify({version:1,answerHistory:raw}));
});

test('P5 reviewed exact-form map carries genuine Finnish/Persian contexts but never guesses ambiguous senses',()=>{
 const generated=read('data/course/course-review-form-map.json');
 assert.ok(generated.mappings.length>200);
 assert.ok(generated.mappings.filter(x=>x.context_fi&&x.context_fa).length>150);
 const forms=generated.mappings.filter(x=>x.lexeme_id||x.sense_id);
 assert.ok(forms.length>20);
 assert.ok(forms.every(x=>x.lexeme_id&&x.sense_id));
 for(const x of generated.mappings){
  if(!x.context_fi)continue;
  assert.ok(x.context_fa);
  assert.ok(x.context_fi.normalize('NFC').toLocaleLowerCase('fi-FI')
   .match(/[\p{L}\p{N}]+/gu).includes(x.surface_form),x.item_id);
 }
 const danger=new Set(generated.excluded_ambiguous_form_ids);
 assert.ok(danger.size>=5);
 assert.ok(generated.mappings.every(x=>!danger.has(x.form_id)));
 assert.deepEqual(builder.safeExample({example_fi:'Hän voisi lähteä.',example_fa:'او شاید بتواند برود.'},'voi'),null);
 assert.deepEqual(builder.safeExample({example_fi:'Se on puhelin.',example_fa:'آن تلفن است.'},'on'),
  {context_fi:'Se on puhelin.',context_fa:'آن تلفن است.'});
});
test('P5 hints distinguish first-attempt skills, correct answers, and bounded source-context suggestions',()=>{
 const scoped={schema_version:1,mappings:[
  {section_id:'s1',item_id:'on',form_id:bridge.stableFormId('on'),surface_form:'on',
   lexeme_id:'lexeme:olla',sense_id:'sense:olla-be',
   context_fi:'Se on puhelin.',context_fa:'آن تلفن است.'},
  {section_id:'s1',item_id:'olin',form_id:bridge.stableFormId('olin'),surface_form:'olin',
   context_fi:'Minä olin kotona.',context_fa:'من در خانه بودم.'}
 ]};
 const history=[
  event({sessionId:'wrong-meaning',mode:'meaning'}),
  event({sessionId:'wrong-meaning',mode:'meaning',answeredAt:NOW-59000,sequence:2}),
  event({sessionId:'wrong-listening',mode:'listen',sequence:3,answeredAt:NOW-58000}),
  event({sessionId:'wrong-dictation',activityType:'dictation',sequence:4,answeredAt:NOW-57000}),
  event({sessionId:'correct-typed',activityType:'type',correct:true,sequence:5,answeredAt:NOW-56000}),
  event({sessionId:'failed-typed',activityType:'type',targetId:'olin',sequence:6,answeredAt:NOW-55000}),
  event({sessionId:'retry',activityType:'type',targetId:'olin',firstAttempt:false,sequence:7,answeredAt:NOW-54000})
 ];
 const data={answerHistory:history},snapshot=JSON.stringify(data);
 const evidence=bridge.reviewEvidenceByFormId(data,scoped,NOW),on=evidence[bridge.stableFormId('on')];
 assert.equal(on.errors,3);
 assert.equal(on.correct,1);
 assert.equal(on.byMode.receptive.incorrect,1);
 assert.equal(on.byMode.listening.incorrect,1);
 assert.equal(on.byMode.dictation.incorrect,1);
 assert.equal(on.byMode.typed.correct,1);
 const hints=bridge.reviewHintsByFormId(data,scoped,NOW);
 assert.equal(hints[bridge.stableFormId('on')].priority,3);
 assert.deepEqual(hints[bridge.stableFormId('on')].lastError.context,
  {fi:'Se on puhelin.',fa:'آن تلفن است.'});
 assert.equal(hints[bridge.stableFormId('on')].lastError.lexeme_id,'lexeme:olla');
 assert.equal(bridge.suggestedMode(hints[bridge.stableFormId('on')]),'cloze-input');
 assert.equal(bridge.suggestedMode(hints[bridge.stableFormId('olin')]),'cloze-input');
 assert.equal(bridge.evidenceMode(event({activityType:'production',guided:false})),'independent');
 assert.equal(bridge.evidenceMode(event({activityType:'negative-transform'})),'guided');
 assert.equal(bridge.evidenceMode(event({activityType:'choice',mode:'listen'})),'listening');
 assert.equal(bridge.evidenceMode(event({activityType:'short-reading'})),'receptive');
 assert.equal(bridge.suggestedMode({byMode:{listening:{incorrect:1}}}),'cloze-choice');
 assert.equal(bridge.suggestedMode({byMode:{receptive:{incorrect:1}}}),'translation');
 assert.equal(JSON.stringify(data),snapshot);
});
test('P5 malformed, legacy and sense-ambiguous events fail closed without ever changing Word Practice schedules',()=>{
 const form=bridge.stableFormId('pitää');
 const scoped={schema_version:1,excluded_ambiguous_form_ids:[form],mappings:[
  {section_id:'s1',item_id:'on',form_id:bridge.stableFormId('on'),surface_form:'on',
   context_fi:'Se on.',context_fa:'آن است.'},
  {section_id:'s1',item_id:'bad',form_id:form,surface_form:'pitää'}
 ]};
 const stored=JSON.stringify({version:1,answerHistory:[event(),event({targetId:'bad',sessionId:'ambiguous'}),
  event({firstAttempt:'true',sessionId:'legacy'}),event({correct:'false',sessionId:'legacy2'})]});
 const storage={getItem:key=>key==='fiCourseProgressV1'?stored:null,
  setItem(){throw Error('must be read-only')}};
 const hints=bridge.reviewHintsByFormIdFromStorage(storage,scoped,'fiCourseProgressV1',1,NOW);
 assert.deepEqual(Object.keys(hints),[bridge.stableFormId('on')]);
 assert.equal(hints[bridge.stableFormId('on')].priority,1);
 assert.equal(bridge.reviewHintsByFormIdFromStorage(storage,scoped,'fiCourseProgressV1',2,NOW)[bridge.stableFormId('on')],undefined);
 assert.deepEqual(bridge.reviewHintsByFormIdFromStorage({getItem(){throw Error('blocked')}},scoped,'fiCourseProgressV1',1,NOW),{});
 const old=srs.emptyProgress(NOW),before=JSON.stringify(old);
 const words=[{rank:1,word:'pitää'},{rank:2,word:'on'}];
 const q=srs.buildReviewQueue(words,old,NOW,{courseFormPriorities:bridge.reviewPrioritiesByFormId({answerHistory:[event()]},scoped,NOW)});
 assert.deepEqual(q.map(x=>x.word),['on','pitää']);
 assert.equal(JSON.stringify(old),before);
 assert.equal(stored,JSON.stringify({version:1,answerHistory:[event(),event({targetId:'bad',sessionId:'ambiguous'}),
  event({firstAttempt:'true',sessionId:'legacy'}),event({correct:'false',sessionId:'legacy2'})]}));
});

test('new bridge asset loads before Word Practice and reads current Course evidence only on review start',()=>{
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 const course=html.indexOf('src="course.js?'),bridgeAsset=html.indexOf('src="course-srs-bridge.js?');
 const spaced=html.indexOf('src="spaced-repetition.js?');
 assert.ok(course>=0&&bridgeAsset>course&&spaced>bridgeAsset);
 const text=fs.readFileSync(path.join(ROOT,'spaced-repetition.js'),'utf8');
 assert.match(text,/reviewPrioritiesByFormIdFromStorage\(/);
 assert.match(text,/course\.STORAGE_KEY/);
 assert.match(text,/course-review-form-map\.json/);
 assert.match(text,/courseFormPriorities: courseReviewPriorities\(\)/);
});
