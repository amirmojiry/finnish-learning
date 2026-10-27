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
const REVIEW_CASES = new Set(['nominative','genitive','partitive','inessive','elative','illative','allative','essive']);
const REVIEW_NUMBERS = new Set(['singular','plural']);
// An editorially reviewed case label is a property of ONE observed surface; it does not
// license synthesizing unreviewed inflections or transferring SRS mastery between forms.
function validateReviews(reviews, available) {
 const indexed=new Map(), lexemePartsOfSpeech=new Map();
 for(const entry of reviews.entries||[]){
  const form=normalize(entry.surface_form);
  if(!form||indexed.has(form))throw Error('Duplicate reviewed surface: '+form);
  if(!/^lexeme:[a-z0-9-]+$/.test(entry.lexeme_id)||!/^sense:[a-z0-9-]+$/.test(entry.sense_id)||!entry.sense_id.startsWith('sense:'+entry.lexeme_id.slice(7)+'-'))throw Error('Invalid reviewed lexical identity: '+form);
  const morph=entry.morphology;
  if(!morph||!['noun','pronoun'].includes(morph.part_of_speech)||!REVIEW_CASES.has(morph.case)||!REVIEW_NUMBERS.has(morph.number))throw Error('Invalid reviewed morphology: '+form);
  if(!available.has(stableId('form',form)))throw Error('Reviewed surface not found in shipped forms: '+form);
  const oldPos=lexemePartsOfSpeech.get(entry.lexeme_id);
  if(oldPos&&oldPos!==morph.part_of_speech)throw Error('Conflicting reviewed part of speech for lexeme: '+entry.lexeme_id);
  lexemePartsOfSpeech.set(entry.lexeme_id,morph.part_of_speech);
  indexed.set(form,entry);
 }
 return indexed;
}
function build(dictionary,sections,parole,reviews={entries:[]}){
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
   for(const activity of [...(lesson.activities||[]), ...(lesson.p3_review_activities||[])]){
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
 const reviewed=validateReviews(reviews,entries);
 for(const record of entries.values()){
  if(record.kind!=='form')continue;
  const match=reviewed.get(record.surface_form);
  if(!match)continue;
  record.lexeme_id=match.lexeme_id;
  record.sense_id=match.sense_id;
  record.morphology=match.morphology;
  record.identity_review_status='reviewed';
 }
 // Attach canonical curriculum topic IDs and explicitly authored review lesson IDs
 // without mistaking an appearance in a later lesson for scored review evidence.
 const sectionById = new Map(sections.map(section => [section.id, section]));
 for (const record of entries.values()) {
  record.topic_ids = [...new Set(record.occurrences.map(o =>
   sectionById.get(o.section_id)?.curriculum_section_id || o.section_id))].sort();
  const reviewLessons = new Set();
  for (const o of record.occurrences) {
   const section = sectionById.get(o.section_id);
   const lesson = section?.lessons?.find(l => l.id === o.lesson_id);
   if (!lesson) throw Error('Stale occurrence in reviewed lesson index: ' + record.id);
   const explicitlyReviewed = (lesson.review_targets || []).includes(o.item_id)
    || (lesson.learning_objectives?.lexical || [])
      .some(goal => goal.target_id === o.item_id && goal.status === 'reviewed');
   if (explicitlyReviewed) reviewLessons.add(o.lesson_id);
  }
  record.explicit_review_lesson_ids = [...reviewLessons].sort();
 }
 return {schema_version:1,identity_scope:'reviewed_identity_overlay_on_normalized_surface',
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
 const verifiedBase=read('data/course/reviewed-lexical-identities.json');
 const verifiedNouns=read('data/course/reviewed-lexical-identities-batch3.json');
 if(verifiedNouns?.schema_version!==1||!Array.isArray(verifiedNouns.entries))
  throw Error('Invalid P2 reviewed noun batch');
 const reviewed={entries:[...verifiedBase.entries,...verifiedNouns.entries]};
 const data=build(read('data/common-words.json'),sections,
  readParoleSource(fs.readFileSync(path.join(ROOT,'data/parole_frek_3.txt'))),reviewed);
 const serialized=JSON.stringify(data)+'\n';
 if(command==='--write'){fs.writeFileSync(OUT,serialized);process.stdout.write('Wrote lexical identity sidecar.\n');}
 else if(!fs.existsSync(OUT)||fs.readFileSync(OUT,'utf8')!==serialized){
  process.stderr.write('Lexical identity sidecar stale; run node scripts/build-lexical-identity.cjs --write.\n');
  process.exitCode=1;
 } else process.stdout.write('Lexical identity sidecar current.\n');
}
if(require.main===module)main();
module.exports={build,normalize,stableId,readParoleSource,validateReviews,main};
