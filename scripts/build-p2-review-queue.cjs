#!/usr/bin/env node
'use strict';
// This reproducible review queue is explicitly NOT automatic lexical/sense review.
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const JSON_PATH='data/course/p2-unresolved-review-queue.json';
const MD_PATH='docs/P2-UNRESOLVED-REVIEW-QUEUE.md';
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const BUCKETS=Object.freeze(['known_context_sensitive','course_form','course_expression','dictionary_only']);
function build(sidecar,contextual){
 if(sidecar?.schema_version!==1||!Array.isArray(sidecar.records)||
   contextual?.schema_version!==1||!Array.isArray(contextual.items))
  throw Error('Invalid source sidecar or contextual identity snapshot');
 const ambiguous=new Map();
 for(const item of contextual.items){
  const key=item.form_id;
  ambiguous.set(key,(ambiguous.get(key)||0)+1);
 }
 const entries=sidecar.records.filter(r=>r.identity_review_status==='unresolved').map(r=>{
  if(r.lexeme_id!==null||r.sense_id!==null||r.morphology!==null)
   throw Error('Unresolved item contains a fabricated semantic identity: '+r.id);
  const lessons=new Set((r.occurrences||[]).map(o=>o.lesson_id));
  const bucket=ambiguous.has(r.form_id)?'known_context_sensitive':
   lessons.size?(r.kind==='expression'?'course_expression':'course_form'):'dictionary_only';
  return {id:r.id,kind:r.kind,surface_form:r.surface_form,form_id:r.form_id,
   expression_id:r.expression_id,provenance:r.provenance,source_rank:r.source_rank,
   source_position:r.source_position,first_shipped_lesson:r.first_shipped_lesson,
   authored_lesson_count:lessons.size,reviewed_contextual_items:ambiguous.get(r.form_id)||0,
   review_bucket:bucket,review_status:'pending_human_review'};
 });
 entries.sort((a,b)=>BUCKETS.indexOf(a.review_bucket)-BUCKETS.indexOf(b.review_bucket)
  ||b.authored_lesson_count-a.authored_lesson_count
  ||(a.source_position??Number.MAX_SAFE_INTEGER)-(b.source_position??Number.MAX_SAFE_INTEGER)
  ||a.id.localeCompare(b.id,'en'));
 const counts={identity_records:sidecar.records.length,
  globally_reviewed:sidecar.records.length-entries.length,unresolved:entries.length,
  unresolved_forms:entries.filter(x=>x.kind==='form').length,
  unresolved_expressions:entries.filter(x=>x.kind==='expression').length,
  contextual_items_reviewed:contextual.items.length,
  globally_unresolved_context_sensitive:entries.filter(x=>x.review_bucket==='known_context_sensitive').length};
 if(counts.globally_unresolved_context_sensitive!==5||
  counts.globally_reviewed+counts.unresolved!==counts.identity_records)throw Error('P2 review queue reconciliation failed');
 return {schema_version:1,scope:'Explicit review queue, NOT a generated lemma/sense/form decision or achieved learner mastery.',
  counts,records:entries};
}
function markdown(report){
 const c=report.counts;
 const lines=['# P2 unresolved lexical/sense review queue','',
  '[Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [Child #225](https://github.com/amirmojiry/finnish-learning/issues/225) · [Editorial decisions](P2-REVIEWED-NOUNS-AND-SHARED-FORM-IDS.md)','',
  '**Unreviewed is not unlearned.** These are authoring identity records; no user results are read, inferred or stored.','',
  '- All globally indexed forms/expressions: **'+c.identity_records+'**',
  '- Explicit reviewed global noun/pronoun identities: **'+c.globally_reviewed+'**',
  '- Still globally unresolved: **'+c.unresolved+'** (**'+c.unresolved_forms+'** exact forms, **'+c.unresolved_expressions+'** expressions)',
  '- Existing item-scoped contextual sense reviews: **'+c.contextual_items_reviewed+
  '**; the five affected ambiguous written surfaces remain globally unresolved.','',
  '## Prioritized next review witnesses','',
  '| Surface/phrase | Type | Review category | Authored lessons | Provenance |',
  '| --- | --- | --- | ---: | --- |'];
 for(const row of report.records.slice(0,40)){
  lines.push('| \`'+row.surface_form.replaceAll('|','\\|')+'\` | '+row.kind+' | '+
   row.review_bucket+' | '+row.authored_lesson_count+' | '+row.provenance+' |');
 }
 lines.push('','## How to progress safely','',
  '1. Examine the exact authored Finnish and Persian context for a target; compare available UD morphological analyses and real case government. Review expressions as expressions, not as the sum of word lemmas.',
  '2. Record an explicit lexeme, sense and exact morphological reading when evidence is sufficient. If several senses apply, retain separate **section+item** identities rather than a fabricated global sense.',
  '3. Add editorial fixtures, validate source rank provenance and regenerate the sidecar; do not infer or propagate SRS mastery to related forms.',
  '4. Keep existing local Word Practice records keyed by their exact written word; only prioritize independently reviewed/eligible matching exact forms. No transfer across different inflections.',
  '',
  'Regenerate and verify with \`node scripts/build-p2-review-queue.cjs --write\` and \`--check\`. All rows are already present with stable form/expression IDs in the original sidecar; this queue **does not count as linguistic review**.','');
 return lines.join('\n');
}
function main(args=process.argv.slice(2)){
 const mode=args[0]||'--check';
 if(!['--check','--write','--json','--markdown'].includes(mode))throw Error('Unsupported P2 queue mode');
 const report=build(read('data/course/lexical-identity-sidecar.json'),
  read('data/course/contextual-lexical-identity-map.json'));
 const outputs={[JSON_PATH]:JSON.stringify(report,null,2)+'\n',[MD_PATH]:markdown(report)};
 if(mode==='--json')process.stdout.write(outputs[JSON_PATH]);
 else if(mode==='--markdown')process.stdout.write(outputs[MD_PATH]);
 else for(const [rel,content] of Object.entries(outputs)){
  const p=path.join(ROOT,rel);
  if(mode==='--write')fs.writeFileSync(p,content);
  else if(!fs.existsSync(p)||fs.readFileSync(p,'utf8')!==content)
   throw Error('P2 unresolved review queue stale: '+rel);
 }
}
if(require.main===module)main();
module.exports={build,markdown,main};
