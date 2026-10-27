#!/usr/bin/env node
'use strict';
// Authoring evidence in effective lessons only; NOT learner mastery.
const fs=require('node:fs'),path=require('node:path'),course=require('../course.js');
const audit=require('./audit-course-coverage.cjs'),lexical=require('./build-lexical-identity.cjs');
const ROOT=path.resolve(__dirname,'..');
const MODES=['receptive','listening','dictation','typed','guided','independent'];
const GUIDED=new Set(['expression-completion','controlled-production','inflection-production',
 'negative-transform','sentence-order','guided-writing','dialogue-order','sequence-order']);
const norm=lexical.normalize;
const unique=x=>[...new Set(x)];
function activityMode(a){
 if(a.type==='choice'&&a.mode==='listen')return'listening';
 if(a.type==='dictation')return'dictation';
 if(a.type==='type')return'typed';
 if(a.type==='production')return'independent';
 return GUIDED.has(a.type)?'guided':'receptive';
}
function form(section,itemId,known){
 const item=section.items?.[itemId];
 if(!item?.surface_form)throw Error('P3 unknown authored item '+section.id+'/'+itemId);
 const kind=item.item_type==='expression'?'expression':'form';
 const id=lexical.stableId(kind,norm(item.surface_form));
 const row=known.get(id);
 const verified=kind==='form'&&row?.identity_review_status==='reviewed'
  &&!!row.lexeme_id&&!!row.sense_id;
 return {id,kind,item_id:itemId,reviewed:verified,
  family_id:verified?row.lexeme_id+'/'+row.sense_id:null,
  provenance:row?.provenance||'unresolved',context:norm(item.example_fi)};
}
// Context is the Finnish *graded prompt*, not the referenced item's reusable
// dictionary example. A single expected inflection ("olen") is not a sentence:
// use its completed frame when available, or the authored item example.
function gradedContext(activity, fallback=''){
 const full=value=>typeof value==='string'&&value.trim().split(/\s+/u).length>=2
  &&!/_{2,}/u.test(value)?norm(value):'';
 const expected=full(activity.expected_fi);
 if(expected)return expected;
 const answer=typeof activity.expected_fi==='string'&&activity.expected_fi.trim()
  ?activity.expected_fi.trim()
  :Array.isArray(activity.accepted_answers)&&activity.accepted_answers.length===1
   ?activity.accepted_answers[0]:null;
 for(const prompt of [activity.prompt_fi,activity.frame_fi]){
  if(typeof prompt!=='string'||!prompt.trim())continue;
  const completed=answer&&/_{2,}/u.test(prompt)
   ?prompt.replace(/_{2,}/gu,answer):prompt;
  const result=full(completed);
  if(result)return result;
 }
 return fallback;
}
function evidence(section,lesson,known){
 const out=new Map();
 for(const a of course.lessonEditionActivities(lesson,lesson.p3_review_activities?.length?'p3':'editorial')){
  if(course.scoredOpportunitiesOnSlide(a)===0)continue;
  for(const id of audit.positives(a)){
   if(!section.items?.[id])continue;
   const x=form(section,id,known);
   const existing=out.get(x.id)||{modes:Object.fromEntries(MODES.map(m=>[m,0])),contexts:new Set()};
   existing.modes[activityMode(a)]++;
   // Translation-only recall is graded retrieval, not a new Finnish sentence prompt.
   const context=a.p3_review && a.mode==='finnish' ? '' : gradedContext(a,x.context);
   if(context)existing.contexts.add(context);
   out.set(x.id,existing);
  }
 }
 return out;
}
function assess(sections,sidecar){
 if(!Array.isArray(sections)||!Array.isArray(sidecar?.records))throw Error('P3 requires sections and a P2 sidecar');
 const known=new Map(sidecar.records.map(x=>[x.id,x]));
 const rows=[],bySection=new Map(),first=new Map(),families=new Map(),errors=[];
 for(const s of sections){
  if(!Array.isArray(s.lessons))throw Error('Invalid section');
  bySection.set(s.id,[]);
  for(const lesson of s.lessons){
   const introduced=unique(lesson.new_targets||[]).map(id=>form(s,id,known));
   const graded=evidence(s,lesson,known),checkpoint=!!(lesson.checkpoint_targets?.length||lesson.passing_score);
   const introducedHere=new Set();
   const duplicates=introduced.filter(x=>{
    const duplicate=first.has(x.id)||introducedHere.has(x.id);
    introducedHere.add(x.id);
    return duplicate;
   });

   // A new inflected form can be new as a *form* without being a truly new
   // lexeme/sense. Include earlier introductions in this same lesson.
   const firstReviewedFamilies=[],reviewedFamilyVariants=[],familyFirstHere=new Map();
   for(const x of introduced){
    if(!x.family_id)continue; // Unreviewed semantics must stay unknown.
    const firstFamilyForm=families.get(x.family_id)||familyFirstHere.get(x.family_id);
    if(!firstFamilyForm){
     familyFirstHere.set(x.family_id,x.id);
     firstReviewedFamilies.push(x);
    }else if(firstFamilyForm!==x.id){
     reviewedFamilyVariants.push({form_id:x.id,family_id:x.family_id,
      previously_introduced_form_id:firstFamilyForm});
    }
   }
   const previouslyGraded=[...graded.keys()].filter(id=>first.has(id)&&first.get(id).lesson!==lesson.id);
   const strict=s.id==='a2.1-section-3'||lesson.composition_policy==='required';
   if(strict){
    const reasons=[];
    if(duplicates.length)reasons.push('form already introduced: '+duplicates.map(x=>x.id).join(','));
    if(checkpoint&&introduced.length)reasons.push('new forms in checkpoint');
    if(introduced.some(x=>!graded.has(x.id)))reasons.push('new forms lack positive graded evidence');
    if(reasons.length)errors.push({section_id:s.id,lesson_id:lesson.id,reasons});
   }
   const row={section_id:s.id,lesson_id:lesson.id,level:s.level,checkpoint,strict_gate:strict,
    authored_activity_count:lesson.activities.length,
    effective_activity_count:course.lessonEditionActivities(lesson,lesson.p3_review_activities?.length?'p3':'editorial').length,
    new_exact_form_count:introduced.length,
    new_ranked_form_count:introduced.filter(x=>x.kind==='form'&&x.provenance==='ranked').length,
    new_topic_form_count:introduced.filter(x=>x.kind==='form'&&x.provenance!=='ranked').length,
    new_expression_count:introduced.filter(x=>x.kind==='expression').length,
    introduced_unreviewed_semantics_count:introduced.filter(x=>!x.reviewed).length,
    // Verified lexeme+sense families, NOT merely similar written lemma strings.
    new_reviewed_lexeme_sense_count:firstReviewedFamilies.length,
    new_ranked_reviewed_lexeme_sense_count:firstReviewedFamilies.filter(x=>x.provenance==='ranked').length,
    new_topic_reviewed_lexeme_sense_count:firstReviewedFamilies.filter(x=>x.provenance!=='ranked').length,
    introduced_form_in_reviewed_family_count:reviewedFamilyVariants.length,
    reviewed_family_form_variants:reviewedFamilyVariants,
    repeated_new_exact_ids:duplicates.map(x=>x.id),
    previously_introduced_graded_count:previouslyGraded.length,
    outside_new_guidance:!checkpoint&&(introduced.length<3||introduced.length>6),
    outside_review_guidance:!checkpoint&&(previouslyGraded.length<3||previouslyGraded.length>5),
    later_retrieval:[],_introduced:introduced,_graded:graded};
   rows.push(row);bySection.get(s.id).push(row);
   for(const x of introduced){
    // Compare later graded contexts with the actual initially assessed ones.
    // The item example is used only when initial grading has no full sentence.
    if(!first.has(x.id))first.set(x.id,{lesson:lesson.id,
     contexts:new Set(graded.get(x.id)?.contexts.size?[...graded.get(x.id).contexts]:
      x.context?[x.context]:[])});
    if(x.family_id&&!families.has(x.family_id))families.set(x.family_id,x.id);
   }
  }
 }
 const occurrences=new Map();
 for(let i=0;i<rows.length;i++)for(const [id,e] of rows[i]._graded){
  const existing=occurrences.get(id)||[];
  existing.push({index:i,lesson_id:rows[i].lesson_id,modes:e.modes,contexts:e.contexts});
  occurrences.set(id,existing);
 }
 let later=0,novel=0,receptive=0,productive=0;
 for(let i=0;i<rows.length;i++){
  const row=rows[i];
  row.later_retrieval=row._introduced.map(x=>{
   const subsequent=(occurrences.get(x.id)||[]).filter(y=>y.index>i);
   const initially=first.get(x.id)?.contexts||new Set(x.context?[x.context]:[]);
   const contextual=subsequent.filter(y=>[...y.contexts].some(c=>!initially.has(c)));
   const r=subsequent.some(y=>y.modes.receptive+y.modes.listening>0);
   const p=subsequent.some(y=>y.modes.dictation+y.modes.typed+y.modes.guided+y.modes.independent>0);
   if(subsequent.length)later++;if(contextual.length)novel++;if(r)receptive++;if(p)productive++;
   return {form_id:x.id,later_lesson_ids:unique(subsequent.map(y=>y.lesson_id)),
    novel_context_lesson_ids:unique(contextual.map(y=>y.lesson_id)),
    later_receptive:r,later_productive:p,
    later_graded_modes:MODES.filter(mode=>subsequent.some(y=>y.modes[mode]>0)),
    later_distinct_new_context_count:new Set(contextual.flatMap(y=>
     [...y.contexts].filter(context=>!initially.has(context)))).size};
  });
  delete row._introduced;delete row._graded;
 }
 for(const s of sections){
  const group=bySection.get(s.id);
  const required=s.composition_recycling_gate==='required'||(s.id==='a2.1-section-3'&&group.length===10);
  const skillRequired=s.composition_skill_gate==='required';
  if(!required&&!skillRequired)continue;
  for(const lesson of group)if(!lesson.checkpoint)for(const x of lesson.later_retrieval){
   const reasons=[];
   if(required){
    if(!x.later_lesson_ids.length)reasons.push('missing later scored retrieval');
    if(!x.novel_context_lesson_ids.length)reasons.push('missing later new Finnish example');
   }
   // Optional *explicit* acceptance policy: keep receptive and productive
   // later evidence separately. Ordinary lessons remain advisory.
   if(skillRequired){
    if(!x.later_receptive)reasons.push('missing later receptive evidence');
    if(!x.later_productive)reasons.push('missing later productive evidence');
   }
   if(reasons.length)errors.push({section_id:s.id,lesson_id:lesson.lesson_id,form_id:x.form_id,reasons});
  }
 }
 const teaching=rows.filter(x=>!x.checkpoint);
 const summary={sections:sections.length,lessons:rows.length,
  introduced_exact_forms:rows.reduce((n,x)=>n+x.new_exact_form_count,0),
  duplicate_exact_introduction_count:rows.reduce((n,x)=>n+x.repeated_new_exact_ids.length,0),
  introduced_other_form_of_reviewed_family:rows.reduce((n,x)=>n+x.introduced_form_in_reviewed_family_count,0),
  newly_introduced_reviewed_lexeme_senses:rows.reduce((n,x)=>n+x.new_reviewed_lexeme_sense_count,0),
  introductions_with_unknown_semantics:rows.reduce((n,x)=>n+x.introduced_unreviewed_semantics_count,0),
  introductions_with_later_graded:later,introductions_with_later_new_context:novel,
  introductions_with_later_receptive:receptive,introductions_with_later_productive:productive,
  lessons_outside_new_guidance:teaching.filter(x=>x.outside_new_guidance).length,
  lessons_outside_review_guidance:teaching.filter(x=>x.outside_review_guidance).length,
  lessons_with_editorial_reduction:rows.filter(x=>x.effective_activity_count<x.authored_activity_count).length,
  strict_lessons:rows.filter(x=>x.strict_gate).length};
 return {schema_version:1,scope:'learner-effective authored evidence, not observed mastery',
  policy:'2 ranked + 2 topical + 1 expression and 3-5 previously taught reviews are advisory, never quotas; unreviewed P2 senses remain unknown.',
  summary,errors,lessons:rows};
}
function markdown(report){
 const s=report.summary,lines=['# P3 learner-effective composition and retrieval audit','',
  'Static positive-answer opportunities in the learner-effective editorial edition, not learner behavior, proficiency or fatigue.','',
  '| Measure | Count |','| --- | ---: |'];
 for(const [name,key] of [
  ['Sections','sections'],['Lessons','lessons'],['Exact introductions','introduced_exact_forms'],
  ['Repeated exact introductions','duplicate_exact_introduction_count'],
  ['Introductions of additional forms in reviewed lexeme/sense families','introduced_other_form_of_reviewed_family'],
  ['Verified first introductions of reviewed lexeme/sense families','newly_introduced_reviewed_lexeme_senses'],
  ['Introductions with unknown P2 semantics','introductions_with_unknown_semantics'],
  ['Later scored retrievals','introductions_with_later_graded'],
  ['Later distinct authored example','introductions_with_later_new_context'],
  ['Later receptive practice','introductions_with_later_receptive'],
  ['Later typed/dictated/guided/independent production','introductions_with_later_productive'],
  ['Teaching lessons outside 3-6 new forms guidance','lessons_outside_new_guidance'],
  ['Teaching lessons outside 3-5 review guidance','lessons_outside_review_guidance'],
  ['Shorter effective lesson editions','lessons_with_editorial_reduction'],
  ['Strictly gated new lessons','strict_lessons']])lines.push('| '+name+' | '+s[key]+' |');
 lines.push('','## Priority legacy exceptions (advisory)','',
  '| Lesson | New exact forms | Verified new lexeme/senses | New forms of known families | Ranked forms | Topic forms | Expressions | Previously graded exact forms | Later graded | Later different context |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
 const score=r=>2*r.later_retrieval.filter(x=>!x.later_lesson_ids.length).length+
  r.later_retrieval.filter(x=>!x.novel_context_lesson_ids.length).length+Number(r.outside_review_guidance);
 for(const r of report.lessons.filter(x=>!x.checkpoint).slice().sort((a,b)=>score(b)-score(a)||a.lesson_id.localeCompare(b.lesson_id,'en')).slice(0,30))
  lines.push('| '+r.lesson_id+' | '+r.new_exact_form_count+' | '+r.new_reviewed_lexeme_sense_count+' | '+
   r.introduced_form_in_reviewed_family_count+' | '+r.new_ranked_form_count+' | '+
   r.new_topic_form_count+' | '+r.new_expression_count+' | '+r.previously_introduced_graded_count+
   ' | '+r.later_retrieval.filter(x=>x.later_lesson_ids.length).length+
   ' | '+r.later_retrieval.filter(x=>x.novel_context_lesson_ids.length).length+' |');
 lines.push('','## Interpretation','','- The proposed 2+2+1 / 3-5 composition is a **default suggestion**, not an enforced lexical quota.',
  '- For P2-reviewed lexeme/sense families, a later inflection is a new exact form but NOT a new lexeme/sense; within-lesson variants are also deduplicated. Individual form grading stays independent. Other semantics remain unknown.',
  '- An identical sentence in a later lesson is a **review**, not evidence for new context generalization.',
  '- Auditing removed editorial questions as current retrieval is incorrect; only learner-effective activities are counted.',
  '- Future complete A2.1 Section 3 lessons must have later positive grading in a changed authored Finnish context. Existing lessons remain advisory.',
  '- Manual language, RTL/accessibility and learner-outcome evaluation remain outstanding.','','Run node scripts/audit-p3-recycling.cjs --json for all 140 lesson rows.','');
 return lines.join('\n');
}
function load(){
 const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
 return assess(course.validateImplementedPath(audit.loadStages(read('data/course/master-curriculum.json'))),
  read('data/course/lexical-identity-sidecar.json'));
}
function main(args=process.argv.slice(2)){
 const mode=args[0]||'--check';
 if(!['--check','--json','--markdown'].includes(mode))throw Error('P3 supports --check, --json, --markdown');
 const report=load();
 if(mode==='--json')process.stdout.write(JSON.stringify(report,null,2)+'\n');
 if(mode==='--markdown')process.stdout.write(markdown(report));
 if(mode==='--check'){
  if(report.summary.sections!==14||report.summary.lessons!==140)throw Error('P3 course inventory drift');
  if(report.summary.duplicate_exact_introduction_count!==0)throw Error('P3 repeated exact introductions');
  process.stdout.write('P3: '+report.summary.lessons+' effective lessons, '+report.summary.introduced_exact_forms+
   ' exact introductions, '+report.summary.introductions_with_later_graded+
   ' later scored, '+report.summary.introductions_with_later_new_context+' varied context.\n');
 }
 if(report.errors.length)throw Error('Strict P3 acceptance failures: '+JSON.stringify(report.errors.slice(0,20)));
}
if(require.main===module)main();
module.exports={activityMode,gradedContext,form,evidence,assess,markdown,load,main};
