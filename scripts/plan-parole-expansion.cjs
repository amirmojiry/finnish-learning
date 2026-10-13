#!/usr/bin/env node
'use strict';
// A Parole source-form priority queue is an editorial review aid, not a CEFR requirement.
const fs=require('node:fs'),path=require('node:path');
const {sourceRows,norm}=require('./audit-course-coverage.cjs');
const ROOT=path.resolve(__dirname,'..');
const read=relative=>JSON.parse(fs.readFileSync(path.join(ROOT,relative),'utf8'));
function plan(coverage,dictionary,parole,{shortlistSize=30,trancheSize=25}={}){
 if(!Number.isInteger(shortlistSize)||shortlistSize<1||!Number.isInteger(trancheSize)||trancheSize<1)
  throw Error('Positive integer shortlist and tranche sizes required');
 const installed=new Set(dictionary.words.map(w=>norm(w.word)));
 const candidates=[],unranked=[];
 const seen=new Set();
 for(const gap of coverage.gaps.lexical_forms_outside_dictionary||[]){
  const form=norm(gap.surface_form);
  if(!form||seen.has(form))throw Error('Duplicate/invalid course vocabulary gap: '+form);
  seen.add(form);
  if(installed.has(form))throw Error('Course gap already in installed dictionary: '+form);
  const source=parole.forms.get(form);
  if(gap.category==='parole_source_outside_curated_dictionary'){
   if(!source||gap.source_position!==source.position||gap.source_frequency_rank!==source.frequency_rank)
    throw Error('Original Parole gap provenance mismatch: '+form);
   candidates.push({form,source_position:source.position,source_frequency_rank:source.frequency_rank,
    authored_target_placements:gap.authored_target_placements,
    review_priority:gap.authored_target_placements>=2?'repeated_course_target':'single_course_target',
    editorial_status:'pending_review'});
  }else{
   if(source)throw Error('Source-backed word incorrectly marked unranked: '+form);
   unranked.push({form,authored_target_placements:gap.authored_target_placements,
    editorial_status:'curated_unranked_requires_review'});
  }
 }
 candidates.sort((a,b)=>b.authored_target_placements-a.authored_target_placements||
  a.source_position-b.source_position||a.form.localeCompare(b.form,'fi'));
 const current=dictionary.words.length;
 return {schema_version:1,disclaimer:'Editorial priorities from shipped lesson targets. This report does not add dictionary entries, grade proficiency, or supply reviewed translations.',
  source:'Original Parole rows as verified by course coverage audit and scripts/audit-course-coverage.cjs',
  installed_dictionary_forms:current,source_backed_gap_count:candidates.length,unranked_gap_count:unranked.length,
  proposed_next_source_window:{first_source_position:current+1,last_source_position:current+trancheSize,
   caution:'Current vocabulary builder requires every intervening Parole position to have curated details, even if lesson gap priorities skip those forms.'},
  shortlisted_source_backed:candidates.slice(0,shortlistSize),unranked_course_targets:unranked,
  editorial_gates:['Review Finnish POS and lemma for every actual next-source-window form',
   'Review Persian translation and two meaningful bilingual examples containing the exact surface',
   'Rebuild source-grounded dictionary, UD summaries, corpus-example Persian translation coverage and synchronized app metadata',
   'No source rank, count or percentage may be invented; no missing translation IDs on release']};
}
function toMarkdown(p){
 const rows=['# P4 Parole candidate selection','',
  'Derived from actual shipped course gaps. Candidates are *not* yet reviewed or added to the dictionary.','',
  'Current dictionary forms: '+p.installed_dictionary_forms+'. Source-backed course gaps: '+p.source_backed_gap_count+'. Unranked gaps: '+p.unranked_gap_count+'.','',
  'The existing consecutive-source builder requires positions '+p.proposed_next_source_window.first_source_position+'-'+p.proposed_next_source_window.last_source_position+
  ' to have complete curated metadata for every source form before that tranche can ship; the ranked lesson-gap list below is a separate pedagogical priority queue.','',
  '| Candidate form | Original source position | Original source rank | Authored lesson placements | Priority |','| --- | ---: | ---: | ---: | --- |'];
 for(const e of p.shortlisted_source_backed)rows.push('| '+e.form+' | '+e.source_position+' | '+e.source_frequency_rank+
  ' | '+e.authored_target_placements+' | '+e.review_priority+' |');
 rows.push('','Source positions and frequency ranks remain independent; tie ranks are legitimate. No Persian translations, morphological assumptions, or learner mastery were auto-generated.',
  'Next actual expansion requires reviewed curation of the full contiguous source window and regeneration of UD/browser summaries, local Persian UD example translations and synchronized release metadata.','');
 return rows.join('\n');
}
function main(args=process.argv.slice(2)){
 const mode=args[0]||'--check';
 if(!['--check','--json','--markdown'].includes(mode))throw Error('Usage: plan-parole-expansion.cjs --check|--json|--markdown');
 const p=plan(read('data/course/coverage-audit.json'),read('data/common-words.json'),sourceRows());
 if(mode==='--json')process.stdout.write(JSON.stringify(p,null,2)+'\n');
 else if(mode==='--markdown')process.stdout.write(toMarkdown(p)+'\n');
 else if(p.source_backed_gap_count<1||p.shortlisted_source_backed.length<1||p.installed_dictionary_forms!==read('data/common-words.json').words.length)
  throw Error('P4 Parole selection invalid');
}
if(require.main===module)main();
module.exports={plan,toMarkdown,main};
