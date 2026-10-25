#!/usr/bin/env node
'use strict';
// Editorial lexical links describe source forms, not SRS outcomes or learner mastery.
const fs=require('node:fs');
const path=require('node:path');
const {normalize,stableId}=require('./build-lexical-identity.cjs');
const ROOT=path.resolve(__dirname,'..');
const JSON_OUT='data/course/p2-identity-batch1-audit.json';
const MD_OUT='docs/P2-IDENTITY-BATCH1-REPORT.md';

const BATCH_FORMS=Object.freeze([
 'hän','hänen','me','meidän','te','he','heidän','tämä','tässä','tästä','tähän',
 'se','siinä','siitä','siihen','minulle','mikä',
 'apteekki','viesti','kauppa','koulu','koti','kotiin','asema','bussi','lippu',
 'numero','nimi','puhelin','osoite','keittiö','olohuone','makuuhuone',
 'kuitti','kortti','vesi','aikaa','aikana','kaupunki','kaupungin'
]);
const BASE_FORMS=Object.freeze(['kissa','koira','kirja','minä','minun','sinä','sinun']);
const DEFERRED_FORMS=Object.freeze(['aika','ajan','kotona','voi','pitää','tuli']);
function evaluate(sidecar, reviews) {
 const errors=[],entries=reviews.entries||[];
 const approved=new Map(entries.map(e=>[normalize(e.surface_form),e]));
 // The historical projection must never hide a newly, incorrectly reclassified
 // ambiguous global form. Only separately approved noun reviews may be extra.
 const rawForms=new Map((sidecar.records||[]).filter(r=>r.kind==='form')
  .map(r=>[normalize(r.surface_form),r]));
 for(const form of DEFERRED_FORMS){
  const raw=rawForms.get(form);
  if(!raw||raw.identity_review_status!=='unresolved'||raw.lexeme_id!==null||
    raw.sense_id!==null||raw.morphology!==null)
   errors.push('Ambiguous or frozen form must remain unresolved: '+form);
 }
 // Historical batch-1 report is frozen to its 47 originally reviewed forms.
 // Later separately verified batches retain their real reviewed status in the
 // live sidecar, but are projected as unresolved solely for this old report.
 const records=(sidecar.records||[]).map(row=>{
  if(row.identity_review_status==='reviewed' && !approved.has(normalize(row.surface_form)))
   return {...row,lexeme_id:null,sense_id:null,morphology:null,identity_review_status:'unresolved'};
  return row;
 });
 const byForm=new Map(records.filter(r=>r.kind==='form').map(r=>[normalize(r.surface_form),r]));
 if(new Set(BATCH_FORMS).size!==40||BATCH_FORMS.length!==40)errors.push('Batch must have 40 unique forms');
 if(new Set(BASE_FORMS).size!==7)errors.push('Baseline identities list is invalid');
 if(new Set(entries.map(e=>normalize(e.surface_form))).size!==entries.length)errors.push('Duplicate reviewed editorial surfaces');
 for(const name of [...BASE_FORMS,...BATCH_FORMS]){
   if(!approved.has(name))errors.push('Missing reviewed form: '+name);
   const saved=byForm.get(name);
   if(!saved||saved.identity_review_status!=='reviewed')errors.push('Source form is not marked reviewed: '+name);
   const entry=approved.get(name);
   if(entry&&saved&&(entry.lexeme_id!==saved.lexeme_id||entry.sense_id!==saved.sense_id
       ||JSON.stringify(entry.morphology)!==JSON.stringify(saved.morphology))){
     errors.push('Editorial identity overlay mismatch: '+name);
   }
 }
 for(const name of DEFERRED_FORMS){
   const row=byForm.get(name);
   if(!row||row.identity_review_status!=='unresolved'||row.lexeme_id!==null||row.sense_id!==null||row.morphology!==null){
     errors.push('Ambiguous or frozen form must remain unresolved: '+name);
   }
 }
 const reviewed=records.filter(r=>r.identity_review_status==='reviewed');
 const unverified=records.filter(r=>r.identity_review_status==='unresolved');
 for(const record of records){
   if(record.kind==='expression'&&record.identity_review_status==='reviewed'){
     errors.push('No expressions have been editorially reviewed in this batch: '+record.surface_form);
   }
   if(record.identity_review_status==='reviewed' && (
     !approved.has(record.surface_form)||record.kind!=='form'||!record.form_id
     ||record.id!==stableId('form',record.surface_form))){
     errors.push('Orphan or malformed reviewed form: '+record.surface_form);
   }
 }
 if(approved.size!==reviewed.length)errors.push('Sidecar reviewed count differs from approved source');
 const selection=BATCH_FORMS.map(form=>byForm.get(form)).filter(Boolean);
 const families=new Map();
 for(const row of reviewed){
   if(!row.lexeme_id||!row.sense_id||!row.morphology||!row.form_id){
     errors.push('Malformed reviewed identity: '+row.surface_form);
     continue;
   }
   const key=row.lexeme_id+' / '+row.sense_id;
   if(!families.has(key))families.set(key,{lexeme_id:row.lexeme_id,sense_id:row.sense_id,
     forms:[]});
   families.get(key).forms.push({surface_form:row.surface_form,form_id:row.form_id,
     case:row.morphology.case,number:row.morphology.number,
     provenance:row.provenance,shipped_lesson_count:new Set((row.occurrences||[]).map(o=>o.lesson_id)).size});
 }
 const familyRows=[...families.values()].sort((a,b)=>a.lexeme_id.localeCompare(b.lexeme_id,'en'));
 for(const family of familyRows)family.forms.sort((a,b)=>a.surface_form.localeCompare(b.surface_form,'fi-FI'));
 const counts={
   total_records:records.length,
   reviewed_forms:reviewed.length,
   previously_reviewed_forms:BASE_FORMS.length,
   first_batch_new_forms:selection.length,
   reviewed_nouns_in_batch:selection.filter(r=>r.morphology?.part_of_speech==='noun').length,
   reviewed_pronouns_in_batch:selection.filter(r=>r.morphology?.part_of_speech==='pronoun').length,
   unresolved_forms:unverified.filter(r=>r.kind==='form').length,
   unresolved_expressions:unverified.filter(r=>r.kind==='expression').length,
   distinct_reviewed_lexemes:new Set(reviewed.map(r=>r.lexeme_id)).size,
   distinct_reviewed_senses:new Set(reviewed.map(r=>r.sense_id)).size,
   new_forms_in_shipped_lessons:selection.filter(r=>r.first_shipped_lesson!==null).length,
   new_dictionary_only_forms:selection.filter(r=>r.first_shipped_lesson===null).length,
   new_course_occurrences:selection.reduce((n,r)=>n+r.occurrences.length,0)
 };
 const batchProvenance={ranked:0,source_backed_outside_dictionary:0,curated_unranked:0};
 for(const row of selection)if(Object.hasOwn(batchProvenance,row.provenance))batchProvenance[row.provenance]++;
 if(counts.reviewed_forms<47||counts.first_batch_new_forms!==40
   ||counts.reviewed_nouns_in_batch!==23||counts.reviewed_pronouns_in_batch!==17){
   errors.push('Initial P2 editorial batch count or POS distribution regressed');
 }
 if(counts.reviewed_forms+counts.unresolved_forms+counts.unresolved_expressions!==counts.total_records){
   errors.push('Reviewed/unresolved identity totals do not reconcile');
 }
 return {
   schema_version:1,parent_issue:101,batch_issue:182,
   scope:'Explicit, bounded noun/pronoun form+sense editorial decisions; no learner proficiency claim',
   disclaimer:'No Course scores, review due dates, Word Practice SRS history or lexeme-wide mastery is inferred or transferred.',
   counts,batch_provenance:batchProvenance,
   deliberately_unresolved:[...DEFERRED_FORMS],
   families:familyRows,errors
 };
}
function markdown(report){
 const c=report.counts;
 const rows=report.families.map(row=>'| '+row.lexeme_id+' | '+row.sense_id+
 ' | '+row.forms.map(f=>'\`'+f.surface_form+'\` ('+f.case+' '+f.number+')').join(', ')+' |').join('\n');
 return '# P2 reviewed lexical identities — editorial batch 1\n\n'
 +'[Review methodology](P2-LEXICAL-IDENTITIES-BATCH1.md) · [فارسی](P2-LEXICAL-IDENTITIES-BATCH1.fa.md) · [Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [Batch #182](https://github.com/amirmojiry/finnish-learning/issues/182)\n\n'
 +'This is a **deterministic inventory of editorially identified forms**, not evidence of learner mastery, completed spaced repetition, CEFR/YKI achievement, or automatically verified inflection paradigms.\n\n'
 +'## Coverage\n\n'
 +'| Measure | Count |\n| --- | ---: |\n'
 +'| Total form/expression records | '+c.total_records+' |\n'
 +'| Reviewed exact forms (including original seven) | '+c.reviewed_forms+' |\n'
 +'| Reviewed additions in batch 1 | '+c.first_batch_new_forms+' |\n'
 +'| Added noun forms | '+c.reviewed_nouns_in_batch+' |\n'
 +'| Added pronoun forms | '+c.reviewed_pronouns_in_batch+' |\n'
 +'| New forms occurring in shipped lessons | '+c.new_forms_in_shipped_lessons+' |\n'
 +'| New dictionary-only forms | '+c.new_dictionary_only_forms+' |\n'
 +'| Unresolved exact form records | '+c.unresolved_forms+' |\n'
 +'| Unresolved expression records | '+c.unresolved_expressions+' |\n'
 +'| Distinct reviewed lexemes | '+c.distinct_reviewed_lexemes+' |\n'
 +'| Distinct reviewed senses | '+c.distinct_reviewed_senses+' |\n\n'
 +'## Reviewed lexeme/sense groups\n\n'
 +'Each listed case label is a **single reviewed form**. It does not generate other forms or merge form-specific SRS evidence.\n\n'
 +'| Lexeme | Context-bounded sense | Exact reviewed forms |\n| --- | --- | --- |\n'
 +rows+'\n\n'
 +'## Explicitly deferred\n\n'
 +'No automatic sense assignment for \`aika\` (noun/adverb), \`ajan\` (time / I drive), \`voi\` (verb/noun), \`pitää\` (multiple verb senses), \`tuli\` (past tense verb/fire), or frozen locative \`kotona\`. Only the separately attested nominal \`aikaa / aikana\`, water noun \`vesi\` and goal \`kotiin\` are reviewed.\n\n'
 +'## Reproducibility\n\n'
 +'- \`npm run lexical:identity:check\`: source-to-sidecar deterministic overlay.\n'
 +'- \`npm run p2:identity:check\`: this editorial batch inventory is current.\n'
 +'- \`npm run p2:identity:write\`: regenerate this report and its machine-readable JSON.\n'
 +'- \`npm test\`: cross-form, provenance, unknown/ambiguous and SRS-isolation regression gates.\n';
}
function main(mode=process.argv[2]||'--check'){
 if(!['--check','--write','--markdown'].includes(mode))throw Error('Usage: audit-reviewed-lexical-identities.cjs --check|--write|--markdown');
 const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
 const report=evaluate(read('data/course/lexical-identity-sidecar.json'),read('data/course/reviewed-lexical-identities.json'));
 if(report.errors.length)throw Error('P2 reviewed lexical inventory failed: '+report.errors.join('; '));
 const outputs={[JSON_OUT]:JSON.stringify(report,null,2)+'\n',[MD_OUT]:markdown(report)};
 if(mode==='--markdown')process.stdout.write(outputs[MD_OUT]);
 else for(const [rel,content] of Object.entries(outputs)){
   const file=path.join(ROOT,rel);
   if(mode==='--write')fs.writeFileSync(file,content);
   else if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content)throw Error('P2 audit snapshot stale: '+rel);
 }
}
if(require.main===module)main();
module.exports={evaluate,markdown,main,BATCH_FORMS,BASE_FORMS,DEFERRED_FORMS};
