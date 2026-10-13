#!/usr/bin/env node
'use strict';
// Audited authored opportunities are not learner attempts or demonstrated mastery.
const fs=require('node:fs'),path=require('node:path');
const audit=require('./audit-course-coverage.cjs');
const course=require('../course.js');
const lexical=require('./build-lexical-identity.cjs');
const ROOT=path.resolve(__dirname,'..');
const JSON_PATH=path.join(ROOT,'data/course/lesson-composition-audit.json');
const MD_PATH=path.join(ROOT,'data/course/lesson-composition-audit.generated.md');
const PRODUCTIVE=new Set(['production','type','dictation','expression-completion','controlled-production','inflection-production','negative-transform','guided-writing','sentence-order']);
const unique=items=>[...new Set(items)];
function identity(section,itemId,known) {
 const item=section.items[itemId];
 if(!item||!item.surface_form)throw Error('Unknown or empty authored target: '+section.id+'/'+itemId);
 const kind=item.item_type==='expression'?'expression':'form';
 const id=lexical.stableId(kind,lexical.normalize(item.surface_form)),reviewed=known.get(id);
 return {id,surface_form:lexical.normalize(item.surface_form),kind,
  reviewed_lexeme_id:reviewed?.identity_review_status==='reviewed'?reviewed.lexeme_id:null,
  reviewed_sense_id:reviewed?.identity_review_status==='reviewed'?reviewed.sense_id:null};
}
function targets(lesson) {
 const r=lesson.curriculum_target_refs||{};
 return unique([...(r.high_frequency||[]),...(r.topic||[]),...(r.expressions||[]),
  ...(lesson.new_targets||[]),...(lesson.practice_targets||[]),...(lesson.review_targets||[]),
  ...(lesson.checkpoint_targets||[])]);
}
function positiveEvidence(section,lesson,known) {
 const graded=new Map();
 for(const activity of lesson.activities||[])for(const itemId of audit.positives(activity)){
  if(!section.items[itemId])continue;
  const resolved=identity(section,itemId,known);
  const state=graded.get(resolved.id)||{identity:resolved,recognition:0,production:0};
  if(PRODUCTIVE.has(activity.type))state.production++;
  else state.recognition++;
  graded.set(resolved.id,state);
 }
 return graded;
}
function evaluate(sections,sidecar) {
 const known=new Map((sidecar.records||[]).map(r=>[r.id,r]));
 const introduced=new Map(),rows=[],errors=[];
 for(const section of sections)for(const lesson of section.lessons||[]){
  const strict=section.id==='a2.1-section-3'||lesson.composition_policy==='required';
  const checkpoint=Boolean(lesson.checkpoint_targets?.length)||Boolean(lesson.passing_score);
  const declared=targets(lesson).map(itemId=>identity(section,itemId,known));
  const declaredById=new Map(declared.map(t=>[t.id,t]));
  const graded=positiveEvidence(section,lesson,known);
  const newTargets=unique((lesson.new_targets||[]).map(id=>identity(section,id,known).id));
  const duplicateNew=newTargets.filter(id=>introduced.has(id));
  const missingPositive=[...declaredById.keys()].filter(id=>!graded.has(id));
  const reviewedCorrect=[...graded.keys()].filter(id=>introduced.has(id)&&introduced.get(id)!==lesson.id);
  const positivelyTested=[...graded.keys()].filter(id=>declaredById.has(id));
  const grammatical=lesson.learning_objectives?.grammar||[];
  const lessonErrors=[];
  if(strict){
   if(!lesson.learning_objectives?.communicative?.length)lessonErrors.push('missing communicative objective');
   if(!lesson.learning_objectives?.lexical?.length)lessonErrors.push('missing lexical objective');
   if(!grammatical.length)lessonErrors.push('missing grammar objectives and graded evidence');
   if(checkpoint&&newTargets.length)lessonErrors.push('checkpoint introduces new targets');
   if(duplicateNew.length)lessonErrors.push('previously introduced forms labelled new: '+duplicateNew.join(', '));
   if(missingPositive.length)lessonErrors.push('targets without correct-answer assessment: '+missingPositive.join(', '));
   for(const goal of grammatical)if(!goal.evidence?.length)lessonErrors.push('grammar objective without graded evidence: '+goal.concept_id);
  }
  if(lessonErrors.length)errors.push({section_id:section.id,lesson_id:lesson.id,reasons:lessonErrors});
  rows.push({section_id:section.id,lesson_id:lesson.id,level:section.level,
   authored_activities:lesson.activities.length,checkpoint,new_surface_ids:newTargets,
   reviewed_correct_surface_ids:reviewedCorrect,declared_target_count:declaredById.size,
   correct_answer_target_count:positivelyTested.length,
   productive_target_count:[...graded.values()].filter(v=>declaredById.has(v.identity.id)&&v.production>0).length,
   missing_positive_surface_ids:missingPositive,repeated_new_surface_ids:duplicateNew,
   grammar_objectives:grammatical.map(g=>g.concept_id),
   reviewed_identities:[...declaredById.values()].filter(t=>t.reviewed_sense_id).map(t=>({
     form_id:t.id,lexeme_id:t.reviewed_lexeme_id,sense_id:t.reviewed_sense_id
   })),
   later_positive_lessons:[],
   advisory_new_outside_3_to_6:!checkpoint&&(newTargets.length<3||newTargets.length>6),
   advisory_review_below_3:!checkpoint&&reviewedCorrect.length<3,strict_gate:strict
  });
  for(const id of newTargets)if(!introduced.has(id))introduced.set(id,lesson.id);
 }
 const sectionById=new Map(sections.map(s=>[s.id,s]));
 const positiveByForm=new Map();
 for(let index=0;index<rows.length;index++){
  const row=rows[index],section=sectionById.get(row.section_id);
  const lesson=section.lessons.find(l=>l.id===row.lesson_id);
  for(const id of positiveEvidence(section,lesson,known).keys()){
   if(!positiveByForm.has(id))positiveByForm.set(id,[]);
   positiveByForm.get(id).push(index);
  }
 }
 for(let i=0;i<rows.length;i++){
  rows[i].later_positive_lessons=rows[i].new_surface_ids.map(id=>({
   form_id:id,lesson_ids:(positiveByForm.get(id)||[]).filter(index=>index>i).map(index=>rows[index].lesson_id)
  })).filter(entry=>entry.lesson_ids.length>0);
 }
 return {schema_version:1,scope:'authored opportunities, not learner achievement',
  policy:'Strict for A2.1 Section 3 and explicitly opted-in lessons; legacy gaps remain advisory.',
  summary:{sections:sections.length,lessons:rows.length,
   declared_missing_positive:rows.reduce((n,r)=>n+r.missing_positive_surface_ids.length,0),
   lessons_with_missing_positive:rows.filter(r=>r.missing_positive_surface_ids.length).length,
   duplicate_new_labels:rows.reduce((n,r)=>n+r.repeated_new_surface_ids.length,0),
   forms_with_planned_later_positive_reviews:new Set(rows.flatMap(r=>r.later_positive_lessons.map(entry=>entry.form_id))).size,
   legacy_advisory_short_review_lessons:rows.filter(r=>!r.strict_gate&&r.advisory_review_below_3).length,
   strictly_validated_lessons:rows.filter(r=>r.strict_gate).length
  },errors,lessons:rows};
}
function markdown(data) {
 const out=['# Lesson composition and recycling audit','',
  'Generated by npm run lesson:composition:write in data/course/. Static authored opportunities only; no learner mastery, SRS events, or CEFR claims.','',
  '## Coverage','','| Measure | Count |','| --- | ---: |',
  '| Shipped sections | '+data.summary.sections+' |',
  '| Shipped lessons | '+data.summary.lessons+' |',
  '| Lessons with missing positively assessed targets | '+data.summary.lessons_with_missing_positive+' |',
  '| Missing positive assessment occurrences | '+data.summary.declared_missing_positive+' |',
  '| Repeated forms labelled new | '+data.summary.duplicate_new_labels+' |',
  '| Forms with planned later correct-answer reviews | '+data.summary.forms_with_planned_later_positive_reviews+' |',
  '| Strict-gated lessons | '+data.summary.strictly_validated_lessons+' |','',
  '## Highest-priority legacy gaps (advisory)','','| Lesson | Missing positive targets | Repeated new forms |',
  '| --- | ---: | ---: |'];
 const sorted=data.lessons.filter(r=>r.missing_positive_surface_ids.length||r.repeated_new_surface_ids.length)
  .sort((a,b)=>(b.missing_positive_surface_ids.length+b.repeated_new_surface_ids.length*2)-
  (a.missing_positive_surface_ids.length+a.repeated_new_surface_ids.length*2)||a.lesson_id.localeCompare(b.lesson_id,'en')).slice(0,25);
 for(const r of sorted)out.push('| '+r.lesson_id+' | '+r.missing_positive_surface_ids.length+' | '+r.repeated_new_surface_ids.length+' |');
 out.push('','Legacy gaps are editorial review recommendations, not automatic replacements or deletion.',
  'New A2.1 Section 3 lessons (or composition_policy: required) must assess each declared target positively, have linked grammar and communicative goals, avoid reintroducing the same surface as new, and keep checkpoints free of new targets.',
  'A default of 3-6 new lexical targets and 3-5 reviewed targets is guidance, never a fixed quota. Lessons may have variable activity counts.',
  'Only explicitly reviewed P2 semantic links may join lexemes or senses; source-form identities and learner evidence remain separate.',
  'Full per-lesson evidence: run npm run lesson:composition:json; optional snapshots are generated into data/course/ without replacing authored documentation.','');
 return out.join('\n');
}
function load() {
 const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
 const stages=audit.loadStages(read('data/course/master-curriculum.json'));
 return evaluate(course.validateImplementedPath(stages),read('data/course/lexical-identity-sidecar.json'));
}
function main(args=process.argv.slice(2)){
 const action=args[0]||'--check';
 if(!['--check','--write','--json','--markdown'].includes(action))throw Error('Usage: audit-lesson-composition.cjs --check|--write|--json|--markdown');
 const report=load();
 const json=JSON.stringify(report,null,2)+'\n',md=markdown(report)+'\n';
 if(action==='--json')process.stdout.write(json);
 if(action==='--markdown')process.stdout.write(md);
 if(action==='--write'){fs.writeFileSync(JSON_PATH,json);fs.writeFileSync(MD_PATH,md);process.stdout.write('Wrote composition audit.\n');}
 if(action==='--check' && (report.summary.lessons<1 || JSON.stringify(load(),null,2)!==json.trim()))
  throw Error('Non-deterministic or empty composition report');
 if(report.errors.length)throw Error('Strict lesson composition invalid: '+JSON.stringify(report.errors));
}
if(require.main===module)main();
module.exports={identity,targets,positiveEvidence,evaluate,markdown,load,main};
