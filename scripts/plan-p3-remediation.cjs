#!/usr/bin/env node
'use strict';
// P3 is an authored-opportunity audit, not a learner record or mastery signal.
const fs=require('node:fs'),path=require('node:path');
const p3=require('./audit-p3-recycling.cjs');
const ROOT=path.join(__dirname,'..');
const SIDECAR=path.join(ROOT,'data/course/lexical-identity-sidecar.json');

function plan(report,sidecar) {
 if(!Array.isArray(report?.lessons)||!Array.isArray(sidecar?.records))
  throw Error('P3 remediation plan needs a lesson report and P2 identity sidecar');
 const identities=new Map(sidecar.records.map(x=>[x.id,x]));
 const finalSection=report.lessons.at(-1)?.section_id;
 const entries=[];
 let introductions=0;
 for(let index=0;index<report.lessons.length;index++){
  const row=report.lessons[index];
  const familyVariants=new Map((row.reviewed_family_form_variants||[])
   .map(x=>[x.form_id,x.previously_introduced_form_id]));
  for(const target of row.later_retrieval||[]){
   introductions++;
   const side=identities.get(target.form_id);
   if(!side)throw Error('Missing canonical identity for '+row.lesson_id+'/'+target.form_id);
   const missingLater=!target.later_lesson_ids.length;
   const missingContext=!target.novel_context_lesson_ids.length;
   const missingReceptive=!target.later_receptive;
   const missingProductive=!target.later_productive;
   if(!missingLater&&!missingContext&&!missingReceptive&&!missingProductive)continue;
   const remaining=report.lessons.length-index-1;
   // In the final shipped section, a final teaching lesson may legitimately
   // await the not-yet-authored next section. Never invent a later activity.
   const futureSectionPending=row.section_id===finalSection&&remaining<=1;
   const stableReview=side.identity_review_status==='reviewed'
    &&Boolean(side.lexeme_id&&side.sense_id);
   const score=(missingLater?8:0)+(missingContext?4:0)
    +(missingReceptive?1:0)+(missingProductive?1:0)
    +(stableReview?1:0)+(remaining>=5?2:0);
   entries.push({
    section_id:row.section_id,lesson_id:row.lesson_id,
    form_id:target.form_id,kind:side.kind,surface_form:side.surface_form,
    provenance:side.provenance,
    source_rank:Number.isSafeInteger(side.source_rank)?side.source_rank:null,
    identity_review_status:side.identity_review_status,
    lexeme_id:stableReview?side.lexeme_id:null,
    sense_id:stableReview?side.sense_id:null,
    prior_reviewed_family_form_id:familyVariants.get(target.form_id)||null,
    remaining_shipped_lessons:remaining,
    later_graded_lesson_ids:target.later_lesson_ids,
    later_different_context_lesson_ids:target.novel_context_lesson_ids,
    later_graded_modes:target.later_graded_modes||[],
    later_distinct_new_context_count:target.later_distinct_new_context_count||0,
    flags:{missing_later_graded:missingLater,missing_different_context:missingContext,
     no_later_receptive:missingReceptive,no_later_productive:missingProductive,
     final_shipped_section_pending:futureSectionPending},
    priority_score:score,
    priority_class:futureSectionPending?'next-section-pending':missingLater?'missing-retrieval':
     missingContext?'same-context-only':'skill-balance-advisory'
   });
  }
 }
 entries.sort((a,b)=>b.priority_score-a.priority_score
  ||a.lesson_id.localeCompare(b.lesson_id,'en')
  ||a.form_id.localeCompare(b.form_id,'en'));
 const missingLater=entries.filter(x=>x.flags.missing_later_graded).length;
 const missingContext=entries.filter(x=>x.flags.missing_different_context).length;
 const awaiting=entries.filter(x=>x.flags.final_shipped_section_pending).length;
 const summary={sections:report.summary.sections,lessons:report.summary.lessons,
  introductions,actionable_records:entries.length,
  without_later_graded:missingLater,without_later_different_context:missingContext,
  after_final_shipped_section_pending:awaiting,
  with_reviewed_semantics:entries.filter(x=>x.lexeme_id).length,
  existing_later_receptive:report.summary.introductions_with_later_receptive,
  existing_later_productive:report.summary.introductions_with_later_productive};
 if(introductions!==report.summary.introduced_exact_forms
  ||missingLater!==introductions-report.summary.introductions_with_later_graded
  ||missingContext!==introductions-report.summary.introductions_with_later_new_context)
  throw Error('P3 remediation summary differs from learner-effective audit');
 return {schema_version:1,
  scope:'authored learner-effective assessment opportunities; no actual learner mastery',
  guidance:'Manual Finnish linguistic/editorial review is required before writing any new graded context.',
  summary,entries};
}
function markdown(result){
 const s=result.summary;
 const lines=['# P3: legacy later-review remediation queue','',
  'Generated from effective current lessons and reviewed P2 identities. Static authored practice only, not real learner performance.','',
  '| Metric | Count |','| --- | ---: |',
  '| Shipped lessons | '+s.lessons+' |',
  '| New exact-form introductions | '+s.introductions+' |',
  '| Without later graded retrieval | '+s.without_later_graded+' |',
  '| Without later different Finnish graded context | '+s.without_later_different_context+' |',
  '| Entries near the final unshipped section boundary | '+s.after_final_shipped_section_pending+' |',
  '| Entries needing some advisory triage | '+s.actionable_records+' |','',
  '## Highest-priority authored gaps','',
  '| Lesson | Exact target | Issue | Later graded modes | Rank |',
  '| --- | --- | --- | --- | ---: |'];
 for(const x of result.entries.slice(0,35)){
  const label=x.surface_form.replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
  lines.push('| '+x.lesson_id+' | '+label+' | '+x.priority_class+' | '+
   (x.later_graded_modes.length?x.later_graded_modes.join(', '):'none')+
   ' | '+(x.source_rank??'—')+' |');
 }
 lines.push('','## Editorial rules','',
  '- Review each missing later grade or identical-context reuse individually; some terminal introductions await a not-yet-shipped section.',
  '- The heuristic priority score orders review candidates; it never automatically adds, removes or evaluates learner activities.',
  '- Same reviewed lexeme/sense in a new inflection is not another truly new lexeme. Exact form grading must still remain independent.',
  '- Homographic or unreviewed P2 forms cannot be linked by guessed lemmas or granted cross-sense mastery.',
  '- Source Parole ranks and user Course/Word Practice progress are not modified.',
  '- Confirm new Finnish sentence examples, Persian translations and reading/production difficulty with a qualified editor before implementing a content change.',
  '','Run npm run p3:triage:json for the entire machine-readable queue.','');
 return lines.join('\n');
}
function load(){
 const sidecar=JSON.parse(fs.readFileSync(SIDECAR,'utf8'));
 return plan(p3.load(),sidecar);
}
function main(argv=process.argv.slice(2)){
 const flag=argv[0]||'--check';
 if(!['--check','--json','--markdown'].includes(flag))
  throw Error('Usage: plan-p3-remediation.cjs --check|--json|--markdown');
 const value=load();
 if(flag==='--json')process.stdout.write(JSON.stringify(value,null,2)+'\n');
 if(flag==='--markdown')process.stdout.write(markdown(value)+'\n');
 if(flag==='--check'){
  if(value.summary.lessons!==140||value.summary.introductions!==931)
   throw Error('P3 triage shipped baseline drift');
  if(JSON.stringify(value)!==JSON.stringify(load()))
   throw Error('P3 triage output is nondeterministic');
  if(value.entries.some(x=>x.identity_review_status!=='reviewed'&&(x.lexeme_id||x.sense_id)))
   throw Error('Unreviewed P2 semantics leaked into P3 plan');
  process.stdout.write('P3 triage: '+value.summary.lessons+' lessons; '+
   value.summary.without_later_graded+' missing later graded and '+
   value.summary.without_later_different_context+' missing changed context.\n');
 }
}
if(require.main===module)main();
module.exports={plan,markdown,load,main};
