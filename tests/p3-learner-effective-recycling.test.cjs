'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const p3=require('../scripts/audit-p3-recycling.cjs');
const lexical=require('../scripts/build-lexical-identity.cjs');
const ROOT=path.join(__dirname,'..');
const side=JSON.parse(fs.readFileSync(path.join(ROOT,'data/course/lexical-identity-sidecar.json'),'utf8'));
const known=new Map(side.records.map(x=>[x.id,x]));
const id=(kind,value)=>lexical.stableId(kind,lexical.normalize(value));
const item=(surface,example,item_type='word')=>({surface_form:surface,example_fi:example,item_type});
function section(){
 return {id:'a2.1-section-3',level:'A2.1',items:{
  one:item('minä','Minä olen täällä.'),two:item('kirja','Tämä on kirja.'),
  oneAgain:item('minä','Minä opiskelen suomea.'),oneCopy:item('minä','Minä olen täällä.'),
  bookAgain:item('kirja','Kirja on pöydällä.'),mine:item('minun','Tämä on minun kirjani.'),
  mineAgain:item('minun','Minun kirjani on tässä.')
 },lessons:[
  {id:'fixture-one',order:1,new_targets:['one','two'],activities:[
   {type:'teach',item:'one'},{type:'choice',mode:'meaning',item:'one'},
   {type:'type',item:'two'}]},
  {id:'fixture-two',order:2,new_targets:['mine'],activities:[
   {type:'type',item:'mine'},{type:'choice',mode:'listen',item:'oneCopy'},
   {type:'type',item:'oneAgain'},{type:'dictation',item:'bookAgain'}]},
  {id:'fixture-checkpoint',order:3,new_targets:[],checkpoint_targets:['mine'],activities:[
   {type:'choice',item:'mine'},{type:'production',item:'mineAgain'}]}
 ]};
}
test('P3 audits the actual 140 learner-effective editions, not deleted authoring indices',()=>{
 const report=p3.load();
 assert.deepEqual(report.errors,[]);
 assert.equal(report.summary.sections,14);
 assert.equal(report.summary.lessons,140);
 assert.equal(report.summary.introduced_exact_forms,931);
 assert.equal(report.summary.duplicate_exact_introduction_count,0);
 assert.equal(report.summary.lessons_with_editorial_reduction,80);
 assert.equal(report.summary.strict_lessons,0);
 assert.ok(report.summary.introductions_with_later_graded<=931);
 assert.ok(report.summary.introductions_with_later_new_context<=report.summary.introductions_with_later_graded);
 assert.ok(report.summary.introductions_with_later_productive<=report.summary.introductions_with_later_graded);
 assert.ok(report.summary.introductions_with_unknown_semantics>0);
 const shortened=report.lessons.filter(x=>x.effective_activity_count<x.authored_activity_count);
 assert.equal(shortened.length,80);
 assert.ok(report.lessons.every(x=>!('user_score' in x)&&!('mastered' in x)));
 assert.match(p3.markdown(report),/authored example/i);
});
test('reviewed lexeme/sense families keep distinct exact form evidence',()=>{
 const s=section(),r=p3.assess([s],side);
 assert.deepEqual(r.errors,[]);
 assert.equal(r.summary.introduced_exact_forms,3);
 assert.equal(r.summary.introduced_other_form_of_reviewed_family,1); // minä / minun
 const one=r.lessons[0].later_retrieval.find(x=>x.form_id===id('form','minä'));
 assert.ok(one.later_lesson_ids.includes('fixture-two'));
 assert.ok(one.novel_context_lesson_ids.includes('fixture-two'));
 assert.equal(one.later_receptive,true);
 assert.equal(one.later_productive,true);
 const mine=r.lessons[1].later_retrieval[0];
 assert.equal(mine.form_id,id('form','minun'));
 assert.equal(mine.later_productive,true);
 assert.ok(!r.lessons[1].repeated_new_exact_ids.length);
 const x=p3.form(s,'mine',known),y=p3.form(s,'one',known);
 assert.equal(x.family_id,y.family_id);
 assert.notEqual(x.id,y.id);
});
test('same written form in a different item or example cannot be reintroduced as new',()=>{
 const s=section();
 s.lessons[1].new_targets=['oneAgain'];
 const r=p3.assess([s],side);
 assert.equal(r.summary.duplicate_exact_introduction_count,1);
 assert.ok(r.errors.some(x=>x.reasons.some(y=>y.includes('form already introduced'))));
});
test('a later identical sentence is a review but not a new authored context',()=>{
 const s=section();
 s.lessons[1].activities=s.lessons[1].activities.filter(x=>x.item!=='oneAgain');
 const r=p3.assess([s],side);
 const x=r.lessons[0].later_retrieval.find(e=>e.form_id===id('form','minä'));
 assert.ok(x.later_lesson_ids.includes('fixture-two'));
 assert.deepEqual(x.novel_context_lesson_ids,[]);
});
test('removing a question from an editorial edition removes its score evidence',()=>{
 const s=section();
 s.lessons[1].editorial_revision={id:'r1',activity_indices:[0,1,3]};
 const r=p3.assess([s],side);
 const x=r.lessons[0].later_retrieval.find(e=>e.form_id===id('form','minä'));
 assert.equal(x.later_receptive,true);
 assert.equal(x.later_productive,false);
 assert.deepEqual(x.novel_context_lesson_ids,[]);
 assert.equal(r.lessons[1].authored_activity_count,4);
 assert.equal(r.lessons[1].effective_activity_count,3);
});
test('complete section-level release requires later graded activity in a different Finnish context',()=>{
 const s=section();
 s.composition_recycling_gate='required';
 const good=p3.assess([s],side);
 assert.deepEqual(good.errors,[]);
 const missing=section();missing.composition_recycling_gate='required';
 missing.lessons[1].activities=missing.lessons[1].activities.filter(x=>x.item!=='bookAgain');
 const result=p3.assess([missing],side);
 assert.ok(result.errors.some(x=>x.form_id===id('form','kirja')&&
  x.reasons.some(reason=>reason.includes('missing later new Finnish example'))));
 const noReview=section();noReview.composition_recycling_gate='required';
 noReview.lessons[1].activities=noReview.lessons[1].activities.filter(x=>x.item!=='bookAgain');
 noReview.lessons[2].activities=noReview.lessons[2].activities.filter(x=>x.item!=='mine'&&x.item!=='mineAgain');
 const missingLater=p3.assess([noReview],side);
 assert.ok(missingLater.errors.some(x=>x.form_id===id('form','minun')&&
  x.reasons.some(reason=>reason.includes('missing later scored retrieval'))));
});
test('homographs stay globally unresolved and skill modes never turn choice into dictation',()=>{
 const fake={id:'a2.1-section-3',items:{
  voi:item('voi','En voi hyvin.'),pitaa:item('pitää','Minun pitää lähteä.')
 },lessons:[]};
 for(const key of ['voi','pitaa']){
  const t=p3.form(fake,key,known);
  assert.equal(t.reviewed,false);
  assert.equal(t.family_id,null);
 }
 assert.equal(p3.activityMode({type:'choice',mode:'listen'}),'listening');
 assert.equal(p3.activityMode({type:'choice',mode:'meaning'}),'receptive');
 assert.equal(p3.activityMode({type:'dictation'}),'dictation');
 assert.equal(p3.activityMode({type:'type'}),'typed');
 assert.equal(p3.activityMode({type:'production'}),'independent');
 assert.equal(p3.activityMode({type:'negative-transform'}),'guided');
});
test('reviewed lexeme families do not transfer success to another case form',()=>{
 const s=section(),r=p3.assess([s],side);
 const a=r.lessons[0].later_retrieval.find(x=>x.form_id===id('form','minä'));
 assert.ok(a.later_lesson_ids.length);
 const b=r.lessons[1].later_retrieval.find(x=>x.form_id===id('form','minun'));
 assert.notDeepEqual(a.later_lesson_ids,b.later_lesson_ids);
 assert.ok(b.later_lesson_ids.every(x=>x==='fixture-checkpoint'));
});
test('P3 does not enforce 2+2+1 lexical quotas on a correctly assessed lesson',()=>{
 const s=section();
 const report=p3.assess([s],side);
 assert.deepEqual(report.errors,[]);
 assert.equal(report.lessons[0].outside_new_guidance,true);
 assert.equal(report.lessons[0].outside_review_guidance,true);
 assert.equal(report.lessons[1].new_exact_form_count,1);
});
