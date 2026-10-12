#!/usr/bin/env node
'use strict';
// Stable surface identity is not a claim of lexeme, sense or learner mastery.
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'data/course/lexical-identity-sidecar.json');
const normalize=value=>String(value||'').normalize('NFC').toLocaleLowerCase('fi-FI').trim();
const stableId=(kind,form)=>kind+':'+[...form].map(c=>c.codePointAt(0).toString(16)).join('-');
function readParoleSource(bytes){
 const forms=new Map();
 let position=0;
 for(const line of bytes.toString('latin1').split(/\r?\n/)){
  if(!line.trim())continue;
  position++;
  const match=line.match(/^(\d+)\s+(\d+)\s+(.+?)\s+\((\S+)\s+%\)$/);
  if(!match)throw Error('Invalid original Parole row at '+position);
  const form=normalize(match[3]);
  if(!forms.has(form))forms.set(form,{position,frequency_rank:Number(match[1])});
 }
 return {forms,positions:position};
}
function build(dictionary,sections,parole){
 const dictionaryByForm=new Map();
 for(const w of dictionary.words||[]){
  const form=normalize(w.word);
  if(!form||dictionaryByForm.has(form))throw Error('Duplicate or invalid dictionary form: '+form);
  dictionaryByForm.set(form,w);
 }
 const sourceRows=parole?.forms||new Map();
 const entries=new Map();
 for(const section of sections){
  for(const lesson of section.lessons||[]){
   const refs=lesson.curriculum_target_refs||{};
   const active=new Set([...(refs.high_frequency||[]),...(refs.topic||[]),...(refs.expressions||[]),...(lesson.new_targets||[]),...(lesson.practice_targets||[]),...(lesson.checkpoint_targets||[]),...(lesson.review_targets||[])]);
   for(const activity of lesson.activities||[]){
    for(const field of ['item','answer_item','question_item','negative_item','affirmative_item','event_item','time_item','prompt_item']){
     if(activity[field]&&section.items[activity[field]])active.add(activity[field]);
    }
    for(const field of ['items','turns','expected_items']){
     if(Array.isArray(activity[field]))for(const itemId of activity[field]){
      if(section.items[itemId])active.add(itemId);
     }
    }
   }
   for(const itemId of [...active].sort()){
    const item=section.items[itemId];if(!item)throw Error('Unknown lesson item '+section.id+'/'+itemId);
    const form=normalize(item.surface_form);if(!form)throw Error('Empty form '+itemId);
    const kind=item.item_type==='expression'?'expression':'form';
    const id=stableId(kind,form);
    let record=entries.get(id);
    const word=dictionaryByForm.get(form);
    const source=sourceRows.get(form);
    const provenance=kind==='expression'?'curated_unranked':word?'ranked':source?.position!=null?'source_backed_outside_dictionary':'curated_unranked';
    if(!record){
      record={id,kind,surface_form:form,form_id:kind==='form'?id:null,expression_id:kind==='expression'?id:null,
       lexeme_id:null,sense_id:null,morphology:null,identity_review_status:'unresolved',
       provenance,source_rank:kind==='form'&&word?word.frequency_rank:kind==='form'&&source?.position!=null?source.frequency_rank:null,
       source_position:kind==='form'&&source?.position!=null?source.position:null,
       first_shipped_lesson:null,review_lessons:[],occurrences:[]};
      entries.set(id,record);
    }
    if(record.provenance!==provenance)throw Error('Inconsistent provenance '+id);
    record.occurrences.push({section_id:section.id,lesson_id:lesson.id,item_id:itemId,
      role:(lesson.new_targets||[]).includes(itemId)?'introduced':(lesson.checkpoint_targets||[]).includes(itemId)?'checkpoint':'referenced'});
    if(!record.first_shipped_lesson)record.first_shipped_lesson=lesson.id;
    else if(record.first_shipped_lesson!==lesson.id&&!record.review_lessons.includes(lesson.id))record.review_lessons.push(lesson.id);
   }
  }
 }
 // Include unencountered curated dictionary forms so Word Practice has a stable form namespace.
 for(const [form,word] of dictionaryByForm){
  const id=stableId('form',form);
  if(!entries.has(id))entries.set(id,{id,kind:'form',surface_form:form,form_id:id,expression_id:null,
    lexeme_id:null,sense_id:null,morphology:null,identity_review_status:'unresolved',provenance:'ranked',
    source_rank:word.frequency_rank,source_position:null,first_shipped_lesson:null,review_lessons:[],occurrences:[]});
 }
 return {schema_version:1,identity_scope:'exact_normalized_surface_only',
  disclaimer:'Stable surface/expression IDs do not verify lexemes, senses, morphology, teaching mastery or SRS transfers.',
  counts:{shipped_sections:sections.length,shipped_lessons:sections.reduce((n,s)=>n+s.lessons.length,0),dictionary_forms:dictionaryByForm.size,records:entries.size},
  records:[...entries.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)};
}
function main(args=process.argv.slice(2)){
 const command=args[0]||'--check';
 if(!['--check','--write'].includes(command))throw Error('Usage: build-lexical-identity.cjs --check|--write');
 const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
 const names=['a1.1','a1.2','a1.3','a2.1'];
 const sections=names.flatMap(level=>[1,2,3,4].map(n=>'data/course/'+level+'-section-'+n+'.json')
  .filter(p=>fs.existsSync(path.join(ROOT,p))).map(read));
 const data=build(read('data/common-words.json'),sections,readParoleSource(fs.readFileSync(path.join(ROOT,'data/parole_frek_3.txt'))));
 const serialized=JSON.stringify(data,null,2)+'\n';
 if(command==='--write'){fs.writeFileSync(OUT,serialized);process.stdout.write('Wrote lexical identity sidecar.\n');}
 else if(!fs.existsSync(OUT)||fs.readFileSync(OUT,'utf8')!==serialized){
  process.stderr.write('Lexical identity sidecar stale; run node scripts/build-lexical-identity.cjs --write.\n');
  process.exitCode=1;
 } else process.stdout.write('Lexical identity sidecar current.\n');
}
if(require.main===module)main();
module.exports={build,normalize,stableId,readParoleSource,main};
