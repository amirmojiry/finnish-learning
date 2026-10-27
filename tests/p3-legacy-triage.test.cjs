'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const p3=require('../scripts/audit-p3-recycling.cjs');
const triage=require('../scripts/plan-p3-remediation.cjs');
const lexical=require('../scripts/build-lexical-identity.cjs');
const ROOT=path.join(__dirname,'..');
const sidecar=JSON.parse(fs.readFileSync(path.join(ROOT,'data/course/lexical-identity-sidecar.json'),'utf8'));
const form=word=>lexical.stableId('form',lexical.normalize(word));
const item=(surface,example)=>({surface_form:surface,example_fi:example,item_type:'word'});

test('all 140 actual learner editions have an actionable deterministic P3 review queue',()=>{
 const result=triage.load();
 assert.equal(result.schema_version,1);
 assert.deepEqual(result.summary.sections,14);
 assert.equal(result.summary.lessons,140);
 assert.equal(result.summary.introductions,931);
 assert.equal(result.summary.without_later_graded,0,'source-backed P3 reviews cover every shipped first introduction');
 assert.ok(result.summary.without_later_different_context > 0);
 assert.ok(result.summary.without_later_different_context <= 838);
 assert.ok(result.summary.actionable_records>=result.summary.without_later_different_context);
 assert.ok(!result.entries.some(x=>x.priority_class==='missing-retrieval'));
 assert.ok(result.entries.some(x=>x.priority_class==='same-context-only'));
 assert.ok(result.entries.every(x=>x.priority_score>=0&&x.form_id&&x.lesson_id));
 assert.ok(result.entries.every(x=>!x.lexeme_id || x.identity_review_status==='reviewed'));
 assert.ok(result.entries.every(x=>!x.sense_id || x.identity_review_status==='reviewed'));
 assert.ok(result.entries.every(x=>!('mastered' in x)&&!('score' in x)&&!('dueAt' in x)));
 assert.ok(!JSON.stringify(result).includes('fiSrsProgressV1'));
 assert.deepEqual(result,triage.load(),'course remediation queue must be reproducible');
 assert.match(triage.markdown(result),/later different Finnish graded context/i);
 assert.match(triage.markdown(result),/Manual|qualified editor/i);
});

test('a new inflection in an already taught reviewed sense is a new FORM, not a new LEXEME',()=>{
 const s={id:'a2.1-section-3',level:'A2.1',items:{
  nominative:item('minä','Minä olen opiskelija.'),
  genitive:item('minun','Minun kirjani on pöydällä.'),
  genitiveAlias:item('minun','Minun nimeni on Aino.')
 },lessons:[
  {id:'first',new_targets:['nominative','genitive'],activities:[
   {type:'type',item:'nominative'},{type:'type',item:'genitive'}]},
  {id:'second',new_targets:[],activities:[
   {type:'choice',mode:'listen',item:'genitiveAlias'}]}
 ]};
 const report=p3.assess([s],sidecar);
 assert.deepEqual(report.errors,[]);
 assert.equal(report.summary.introduced_exact_forms,2);
 assert.equal(report.summary.newly_introduced_reviewed_lexeme_senses,1);
 assert.equal(report.summary.introduced_other_form_of_reviewed_family,1);
 assert.equal(report.lessons[0].new_reviewed_lexeme_sense_count,1);
 assert.equal(report.lessons[0].introduced_form_in_reviewed_family_count,1);
 const variants=report.lessons[0].reviewed_family_form_variants;
 assert.equal(variants.length,1);
 assert.equal(variants[0].form_id,form('minun'));
 assert.equal(variants[0].previously_introduced_form_id,form('minä'));
 assert.notEqual(form('minun'),form('minä'));
 const distinct=report.lessons[0].later_retrieval.find(x=>x.form_id===form('minun'));
 assert.deepEqual(distinct.later_graded_modes,['listening']);
 assert.equal(distinct.later_receptive,true);
 assert.equal(distinct.later_productive,false);
});

test('same lexeme with different reviewed senses is not deduplicated as one semantic family',()=>{
 const s={id:'a2.1-section-3',level:'A2.1',items:{
  first:item('testa','Hän testaa tänään.'),
  second:item('testb','Testb on talossa.')
 },lessons:[{id:'one',new_targets:['first','second'],activities:[
  {type:'type',item:'first'},{type:'type',item:'second'}]}]};
 const custom={records:[
  {id:form('testa'),kind:'form',identity_review_status:'reviewed',lexeme_id:'lexeme:shared',sense_id:'sense:a',provenance:'ranked'},
  {id:form('testb'),kind:'form',identity_review_status:'reviewed',lexeme_id:'lexeme:shared',sense_id:'sense:b',provenance:'ranked'}
 ]};
 const result=p3.assess([s],custom);
 assert.equal(result.summary.newly_introduced_reviewed_lexeme_senses,2);
 assert.equal(result.summary.introduced_other_form_of_reviewed_family,0);
 assert.deepEqual(result.errors,[]);
});

test('ambiguous P2 forms cannot become a verified new family by guessed lemma',()=>{
 const s={id:'a2.1-section-3',level:'A2.1',items:{
  first:item('voi','En voi hyvin.'),
  second:item('pitää','Minun pitää lähteä.')
 },lessons:[{id:'one',new_targets:['first','second'],activities:[
  {type:'type',item:'first'},{type:'type',item:'second'}]}]};
 const result=p3.assess([s],sidecar);
 assert.equal(result.summary.newly_introduced_reviewed_lexeme_senses,0);
 assert.equal(result.summary.introductions_with_unknown_semantics,2);
 assert.equal(result.summary.introduced_other_form_of_reviewed_family,0);
});

test('optional strict skill gate distinguishes later listening recognition from production',()=>{
 const s={id:'a2.1-section-3',level:'A2.1',composition_skill_gate:'required',
  items:{one:item('kirja','Minulla on kirja.'),
   alias:item('kirja','Kirja on pöydällä.')},
  lessons:[
   {id:'one',new_targets:['one'],activities:[{type:'type',item:'one'}]},
   {id:'two',new_targets:[],activities:[{type:'choice',mode:'listen',item:'alias'}]},
   {id:'checkpoint',new_targets:[],checkpoint_targets:['one'],activities:[{type:'choice',item:'one'}]}
  ]};
 const missing=p3.assess([s],sidecar);
 assert.ok(missing.errors.some(e=>e.form_id===form('kirja')&&
  e.reasons.includes('missing later productive evidence')));
 assert.ok(!missing.errors.some(e=>e.reasons?.includes('missing later receptive evidence')));
 s.lessons[1].activities.push({type:'dictation',item:'alias'});
 const repaired=p3.assess([s],sidecar);
 assert.deepEqual(repaired.errors,[]);
});

test('terminal unshipped path is flagged as pending, not a silently invented follow-up',()=>{
 const id=form('kirja');
 const report={summary:{sections:1,lessons:3,introduced_exact_forms:1,
  introductions_with_later_graded:0,introductions_with_later_new_context:0,
  introductions_with_later_receptive:0,introductions_with_later_productive:0},
  lessons:[
   {section_id:'a2.1-section-2',lesson_id:'lesson-1',later_retrieval:[]},
   {section_id:'a2.1-section-2',lesson_id:'lesson-2',later_retrieval:[{
    form_id:id,later_lesson_ids:[],novel_context_lesson_ids:[],
    later_receptive:false,later_productive:false,later_graded_modes:[]}]},
   {section_id:'a2.1-section-2',lesson_id:'checkpoint',later_retrieval:[]}]};
 const x=triage.plan(report,{records:[
  {id,kind:'form',surface_form:'kirja',provenance:'ranked',
   identity_review_status:'unresolved',source_rank:10}]});
 assert.equal(x.summary.after_final_shipped_section_pending,1);
 assert.equal(x.summary.without_later_graded,1);
 assert.equal(x.entries[0].priority_class,'next-section-pending');
 assert.equal(x.entries[0].lexeme_id,null);
 assert.equal(x.entries[0].remaining_shipped_lessons,1);
});
