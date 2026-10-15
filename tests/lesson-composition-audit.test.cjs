'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const comp=require('../scripts/audit-lesson-composition.cjs');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const sidecar=read('data/course/lexical-identity-sidecar.json');
function sample(count=14) {
 return {id:'a2.1-section-3',level:'A2.1',
  items:{one:{surface_form:'kissa',item_type:'word'},two:{surface_form:'kirja',item_type:'word'},
   three:{surface_form:'minä',item_type:'word'},four:{surface_form:'olen',item_type:'word'}},
  lessons:[{id:'fixture-first',order:1,activities:[
   {type:'teach',item:'one'},
   {type:'choice',mode:'meaning',item:'one',options:['one','two','three','four']},
   {type:'type',item:'two'},
   {type:'choice',mode:'meaning',item:'three',options:['one','two','three','four']},
   ...Array.from({length:count-4},()=>({type:'choice',item:'four',options:['one','two','three','four']}))
  ],new_targets:['one','two','three'],curriculum_target_refs:{topic:['one','two','three']},
   learning_objectives:{communicative:[{id:'goal',can_do_fa:'سؤال بپرسم.'}],
    lexical:[{target_id:'one',status:'introduced'}],
    grammar:[{concept_id:'test-grammar',evidence:[{activity_type:'type',item_id:'two',mode:'supported_production'}]}]}}
  ]};
}
test('P3 audit reports shipped authored evidence without claiming SRS progress',()=>{
 const r=comp.load();
 assert.equal(r.summary.sections,14);
 assert.equal(r.summary.lessons,140);
 assert.equal(r.summary.strictly_validated_lessons,0);
 assert.deepEqual(r.errors,[]);
 assert.ok(r.lessons.every(l=>l.authored_activities>0));
 assert.ok(r.lessons.every(l=>l.missing_positive_surface_ids.length===0), 'All fourteen shipped sections have explicitly graded correct answers for declared targets.');
 assert.ok(!JSON.stringify(r).includes('completedLessons'));
 assert.match(comp.markdown(r),/authored opportunities/i);
});
test('new lesson contract handles flexible 14, 20 and 25 activity counts',()=>{
 for(const n of [14,20,25]){
  const r=comp.evaluate([sample(n)],sidecar);
  assert.equal(r.errors.length,0,JSON.stringify(r.errors));
  assert.equal(r.lessons[0].authored_activities,n);
  assert.equal(r.lessons[0].productive_target_count,1);
 }
});
test('distractors and teaching cards do not count as positive assessment',()=>{
 const s=sample();
 s.lessons[0].activities=s.lessons[0].activities.filter(a=>a.item!=='three');
 const r=comp.evaluate([s],sidecar);
 assert.ok(r.errors.some(e=>e.reasons.some(x=>x.includes('targets without correct-answer'))));
});
test('later positive use is planned review, not new or learner mastery',()=>{
 const s=sample();
 s.lessons.push({id:'fixture-second',order:2,new_targets:['two'],
  curriculum_target_refs:{topic:['one','two']},
  activities:[{type:'choice',item:'one',options:['one','two','three','four']},{type:'type',item:'two'}],
  learning_objectives:s.lessons[0].learning_objectives});
 const r=comp.evaluate([s],sidecar);
 assert.ok(r.lessons[0].later_positive_lessons.some(e=>e.lesson_ids.includes('fixture-second')));
 assert.ok(r.lessons[1].repeated_new_surface_ids.length);
 assert.ok(r.errors.some(e=>e.reasons.some(x=>x.includes('labelled new'))));
});
test('checkpoint does not introduce new targets or omit grammar evidence',()=>{
 const s=sample();s.lessons[0].checkpoint_targets=['one'];
 s.lessons[0].learning_objectives.grammar=[];
 const r=comp.evaluate([s],sidecar);
 assert.ok(r.errors[0].reasons.some(x=>x.includes('checkpoint introduces')));
 assert.ok(r.errors[0].reasons.some(x=>x.includes('grammar objectives')));
});
test('verified sense shared by two forms keeps separate correct-answer evidence',()=>{
 const s=sample();s.items.one.surface_form='minä';s.items.two.surface_form='minun';
 const r=comp.evaluate([s],sidecar);
 assert.equal(r.lessons[0].reviewed_identities[0].lexeme_id,'lexeme:mina');
 assert.equal(new Set(r.lessons[0].reviewed_identities.map(x=>x.form_id)).size,2);
});

test('later review summary counts distinct normalized forms once across repeated introductions',()=>{
 const s=sample();
 const second={...s.lessons[0],id:'fixture-second',order:2,new_targets:['one'],activities:[{type:'type',item:'one'}]};
 const third={...s.lessons[0],id:'fixture-third',order:3,new_targets:[],activities:[{type:'type',item:'one'}]};
 s.lessons.push(second,third);
 const result=comp.evaluate([s],sidecar);
 const all=result.lessons.flatMap(row=>row.later_positive_lessons.map(entry=>entry.form_id));
 assert.ok(all.length>new Set(all).size);
 assert.equal(result.summary.forms_with_planned_later_positive_reviews,new Set(all).size);
});
test('snapshot generator never overwrites authored curriculum audit guide',()=>{
 const script=fs.readFileSync(path.join(ROOT,'scripts/audit-lesson-composition.cjs'),'utf8');
 assert.ok(script.includes('data/course/lesson-composition-audit.generated.md'));
 assert.ok(!script.includes("MD_PATH=path.join(ROOT,'docs/LESSON-COMPOSITION-AUDIT.md')"));
});
test('documentation hub links the canonical composition audit methodology',()=>{
 const hub=fs.readFileSync(path.join(ROOT,'docs/README.md'),'utf8');
 assert.ok(hub.includes('[Lesson composition and recycling audit](LESSON-COMPOSITION-AUDIT.md)'));
});
