#!/usr/bin/env node
'use strict';
// Exact authored source-form references do not certify lexeme mastery or transfer SRS history.
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'data/course/course-review-form-map.json');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const norm=x=>String(x||'').normalize('NFC').toLocaleLowerCase('fi-FI').trim();
function build(sidecar,dictionary){
 const available=new Set((dictionary.words||[]).map(x=>norm(x.word)));
 const targets=new Map();
 for(const row of sidecar.records||[]){
  if(row.kind!=='form'||!row.form_id||!available.has(row.surface_form))continue;
  for(const o of row.occurrences||[]){
   const key=o.section_id+'\u0000'+o.item_id;
   const entry={section_id:o.section_id,item_id:o.item_id,form_id:row.form_id,surface_form:row.surface_form};
   if(!o.section_id||!o.item_id)throw Error('Invalid authored course occurrence');
   if(targets.has(key)&&targets.get(key).form_id!==entry.form_id)throw Error('Conflicting form identity for '+key);
   targets.set(key,entry);
  }
 }
 return {schema_version:1,identity_scope:'reviewable_curated_dictionary_surface_forms_only',
  disclaimer:'Course authored target mapping is not user proficiency, SRS history, or lemma/sense transfer.',
  mappings:[...targets.values()].sort((a,b)=>a.section_id.localeCompare(b.section_id,'en')||a.item_id.localeCompare(b.item_id,'en'))};
}
function main(args=process.argv.slice(2)){
 const mode=args[0]||'--check';
 if(!['--check','--write'].includes(mode))throw Error('Usage: build-course-review-map.cjs --check|--write');
 const content=JSON.stringify(build(read('data/course/lexical-identity-sidecar.json'),read('data/common-words.json')),null,2)+'\n';
 if(mode==='--write'){fs.writeFileSync(OUT,content);process.stdout.write('Wrote Course review form map.\n');}
 else if(!fs.existsSync(OUT)||fs.readFileSync(OUT,'utf8')!==content)throw Error('Course review form map stale; run npm run course:review:write');
}
if(require.main===module)main();
module.exports={build,main};
