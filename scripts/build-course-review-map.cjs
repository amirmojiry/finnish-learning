#!/usr/bin/env node
'use strict';
// Exact authored source-form references do not certify lexeme mastery or transfer SRS history.
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'data/course/course-review-form-map.json');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const norm=x=>String(x||'').normalize('NFC').toLocaleLowerCase('fi-FI').trim();
const tokens=value=>String(value||'').normalize('NFC').toLocaleLowerCase('fi-FI').match(/[\p{L}\p{N}]+/gu)||[];
function safeExample(item,surface){
 const fi=typeof item?.example_fi==='string'?item.example_fi.trim():'';
 const fa=typeof item?.example_fa==='string'?item.example_fa.trim():'';
 // A real authored, translated sentence containing the *exact* target form.
 // Never infer a case form, translate, or reuse a sense-ambiguous example.
 return fi.length<=220&&fa.length<=220&&tokens(fi).length>=2&&tokens(fi).includes(norm(surface))&&fa
  ?{context_fi:fi,context_fa:fa}:null;
}
function build(sidecar,dictionary,contextual,loadSection=id=>read('data/course/'+id+'.json')){
 if(contextual?.schema_version!==1||!Array.isArray(contextual.items))
  throw Error('Missing reviewed contextual identity map');
 const excluded=new Set(contextual.items.map(x=>x.form_id));
 for(const id of excluded)if(typeof id!=='string'||!id.startsWith('form:'))throw Error('Invalid contextual form ID');
 const available=new Set((dictionary.words||[]).map(x=>norm(x.word)));
 const targets=new Map(),sectionCache=new Map();
 const itemFor=(sectionId,itemId)=>{
  if(!sectionCache.has(sectionId))sectionCache.set(sectionId,loadSection(sectionId));
  const section=sectionCache.get(sectionId);
  return section?.items?.[itemId] || section?.p3_review_items?.[itemId];
 };
 for(const row of sidecar.records||[]){
  if(row.kind!=='form'||!row.form_id||!available.has(row.surface_form)||excluded.has(row.form_id))continue;
  for(const o of row.occurrences||[]){
   const key=o.section_id+'\u0000'+o.item_id;
   if(!o.section_id||!o.item_id)throw Error('Invalid authored course occurrence');
   const item=itemFor(o.section_id,o.item_id);
   if(!item||norm(item.surface_form)!==norm(row.surface_form))
    throw Error('Stale P5 form-to-course item mapping '+key);
   const example=safeExample(item,row.surface_form);
   const reviewed=row.identity_review_status==='reviewed'&&row.lexeme_id&&row.sense_id;
   const entry={section_id:o.section_id,item_id:o.item_id,form_id:row.form_id,surface_form:row.surface_form,
    ...(reviewed?{lexeme_id:row.lexeme_id,sense_id:row.sense_id}:{}),
    ...(example||{})};
   if(targets.has(key)&&targets.get(key).form_id!==entry.form_id)throw Error('Conflicting form identity for '+key);
   targets.set(key,entry);
  }
 }
 return {schema_version:1,identity_scope:'reviewable_curated_dictionary_surface_forms_only',
  disclaimer:'Only validated, source-authored Finnish/Persian example contexts are optional review hints. Known context-sensitive homographs are excluded; no Course error transfers SRS history, a lexeme/sense score, or mastery.',
  excluded_ambiguous_form_ids:[...excluded].sort(),
  mappings:[...targets.values()].sort((a,b)=>a.section_id.localeCompare(b.section_id,'en')||a.item_id.localeCompare(b.item_id,'en'))};
}
function main(args=process.argv.slice(2)){
 const mode=args[0]||'--check';
 if(!['--check','--write'].includes(mode))throw Error('Usage: build-course-review-map.cjs --check|--write');
 const content=JSON.stringify(build(read('data/course/lexical-identity-sidecar.json'),
  read('data/common-words.json'),read('data/course/contextual-lexical-identity-map.json')),null,2)+'\n';
 if(mode==='--write'){fs.writeFileSync(OUT,content);process.stdout.write('Wrote Course review form map.\n');}
 else if(!fs.existsSync(OUT)||fs.readFileSync(OUT,'utf8')!==content)throw Error('Course review form map stale; run npm run course:review:write');
}
if(require.main===module)main();
module.exports={build,safeExample,main};
