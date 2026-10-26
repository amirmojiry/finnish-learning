#!/usr/bin/env node
'use strict';
// Explicitly reviewed noun identities; a course example witnesses an editorial
// decision, not automatically proven morphology or learner achievement.
const fs=require('node:fs'),path=require('node:path');
const {normalize,stableId,validateReviews}=require('./build-lexical-identity.cjs');
const ROOT=path.resolve(__dirname,'..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const REQUIRED=Object.freeze([
 'takki','juna','kirjasto','ystävä','ruoka','kahvi','kahvia','vettä',
 'työ','työtä','lääkäri','lääkärille','kaupasta','asemalle','lippua',
 'musiikki','harrastus','apu','ilta','huone','perhe','lapsi','pankki'
]);
const SENSES=Object.freeze({
 'takki':['takki','jacket','nominative'],
 'juna':['juna','train','nominative'],
 'kirjasto':['kirjasto','library','nominative'],
 'ystävä':['ystava','friend','nominative'],
 'ruoka':['ruoka','food','nominative'],
 'kahvi':['kahvi','coffee','nominative'],
 'kahvia':['kahvi','coffee','partitive'],
 'vettä':['vesi','water','partitive'],
 'työ':['tyo','work','nominative'],
 'työtä':['tyo','work','partitive'],
 'lääkäri':['laakari','doctor','nominative'],
 'lääkärille':['laakari','doctor','allative'],
 'kaupasta':['kauppa','shop','elative'],
 'asemalle':['asema','station','allative'],
 'lippua':['lippu','ticket','partitive'],
 'musiikki':['musiikki','music','nominative'],
 'harrastus':['harrastus','hobby','nominative'],
 'apu':['apu','help','nominative'],
 'ilta':['ilta','evening','nominative'],
 'huone':['huone','room','nominative'],
 'perhe':['perhe','family','nominative'],
 'lapsi':['lapsi','child','nominative'],
 'pankki':['pankki','bank','nominative'],
});
// Only attested exact token occurrences may witness a nominative identity.
// Some original item glosses cite an inflected form; these separately pinned
// authored examples support the exact surface without rewriting legacy lessons.
const SUPPLEMENTAL=Object.freeze({
 juna:Object.freeze({source:'course',section_id:'a1.2-section-2',item_id:'a12s2-topic-saapuu'}),
 kahvi:Object.freeze({source:'course',section_id:'a1.1-section-4',item_id:'s4-yksi'}),
 ruoka:Object.freeze({source:'dictionary_example',word:'hyvä',field:'example_2_fi'})
});
const exactWords=value=>typeof value==='string'
 ?value.normalize('NFC').toLocaleLowerCase('fi-FI').match(/[\p{L}\p{M}]+/gu)||[]:[];
const AMBIGUOUS=Object.freeze(['aika','ajan','voi','pitää','tuli','kotona']);
function audit(batch,base,sidecar,dictionary,sections) {
 if(batch?.schema_version!==1||!Array.isArray(batch.entries)||batch.batch_issue!==225)
  throw Error('Invalid P2 noun batch metadata');
 const allowed=new Map(Object.entries(SENSES));
 const available=new Set(sidecar.records.filter(x=>x.kind==='form').map(x=>x.form_id));
 const old=new Set(base.entries.map(e=>normalize(e.surface_form)));
 const rows=new Map(sidecar.records.filter(x=>x.kind==='form').map(x=>[x.surface_form,x]));
 const words=new Map(dictionary.words.map(w=>[normalize(w.word),w]));
 const stages=new Map(sections.map(s=>[s.id,s]));
 if(new Set(REQUIRED).size!==23||batch.entries.length!==23)throw Error('Expected 23 exact-attested noun decisions');
 const seen=new Set();
 for(const entry of batch.entries){
  const f=normalize(entry.surface_form);
  if(f!==entry.surface_form||seen.has(f)||old.has(f)||!allowed.has(f))throw Error('Duplicate or unapproved noun review: '+f);
  seen.add(f);
  const [lemma,sense,kase]=allowed.get(f);
  if(entry.lexeme_id!=='lexeme:'+lemma||entry.sense_id!=='sense:'+lemma+'-'+sense||
   entry.sense_gloss_en!==sense.replaceAll('-',' ')||
   JSON.stringify(entry.morphology)!==JSON.stringify({part_of_speech:'noun',case:kase,number:'singular'}))
    throw Error('Unreviewed noun sense or inflection: '+f);
  const record=rows.get(f);
  if(!record||record.form_id!==stableId('form',f)||record.identity_review_status!=='reviewed'||
   record.lexeme_id!==entry.lexeme_id||record.sense_id!==entry.sense_id||
   JSON.stringify(record.morphology)!==JSON.stringify(entry.morphology))
   throw Error('Noun identity overlay missing/mismatched: '+f);
  const witness=entry.witness||{};
  let source;
  if(witness.source==='course'){
   const stage=stages.get(witness.section_id);
   source=stage?.items?.[witness.item_id];
   if(!source||source.item_type==='expression'||
    !record.occurrences.some(x=>x.section_id===witness.section_id&&x.item_id===witness.item_id))
    throw Error('Unknown authored noun witness: '+f);
  }else if(witness.source==='dictionary'&&f==='työtä'){
   source=words.get(f);
   if(!source||record.occurrences.length)throw Error('Invalid dictionary-only noun witness: '+f);
  }else throw Error('Unexpected noun witness source: '+f);
  if(normalize(source.surface_form||source.word)!==f||
   witness.example_fi!==source.example_fi||
   witness.gloss_fa!==source.translation_fa||
   witness.source_lemma_fi!==source.lemma||
   typeof witness.example_fi!=='string'||!witness.example_fi.trim())
   throw Error('Stale authored Finnish noun context, gloss or source lemma: '+f);
  const supplement=SUPPLEMENTAL[f];
  let exactExample=witness.example_fi;
  if(supplement){
   if(JSON.stringify(witness.exact_example_source)!==JSON.stringify(supplement))
    throw Error('Unapproved exact noun witness reference: '+f);
   if(supplement.source==='course'){
    const another=stages.get(supplement.section_id)?.items?.[supplement.item_id];
    if(!another||another.item_type==='expression')throw Error('Unknown exact course noun witness: '+f);
    exactExample=another.example_fi;
   }else if(supplement.source==='dictionary_example'){
    const another=words.get(supplement.word);
    if(!another||!['example_fi','example_2_fi'].includes(supplement.field))
     throw Error('Unknown exact dictionary noun witness: '+f);
    exactExample=another[supplement.field];
   }
  }else if(Object.hasOwn(witness,'exact_example_source')){
   throw Error('Unreviewed supplementary noun witness: '+f);
  }
  // Match the ENTIRE Finnish token, not a prefix or substring of a case
  // inflection, so "junalla" never certifies "juna" as nominative.
  if(!exactWords(exactExample).includes(f))
   throw Error('Missing exact Finnish noun surface token in attested example: '+f);
 }
 if(seen.size!==23||REQUIRED.some(f=>!seen.has(f)))throw Error('Missing reviewed noun');
 if(base.entries.length!==47)throw Error('Original 47 decisions must remain intact');
 if(validateReviews({entries:[...base.entries,...batch.entries]},available).size!==70)
  throw Error('Merged P2 schema validation did not yield 72 reviewed forms');
 const reviewed=sidecar.records.filter(x=>x.identity_review_status==='reviewed');
 if(sidecar.records.length!==1264||reviewed.length!==70||
   sidecar.records.filter(x=>x.identity_review_status==='unresolved').length!==1194||
   sidecar.records.filter(x=>x.kind==='expression'&&x.identity_review_status!=='unresolved').length)
  throw Error('Current exact-form/expression review coverage mismatch');
 for(const form of AMBIGUOUS){
  const row=rows.get(form);
  if(!row||row.identity_review_status!=='unresolved'||row.lexeme_id!==null||row.sense_id!==null||
    row.morphology!==null)throw Error('Known ambiguous surface cannot get global sense: '+form);
 }
 return {global_total:sidecar.records.length,reviewed:reviewed.length,new_nouns:batch.entries.length,
  unresolved:sidecar.records.length-reviewed.length,unresolved_expressions:440,
  exact_noun_witnesses:seen.size,unchanged_base:base.entries.length};
}
function main(args=process.argv.slice(2)){
 const mode=args[0]||'--check';
 if(!['--check','--json'].includes(mode))throw Error('Usage: audit-p2-noun-batch.cjs --check|--json');
 const batch=read('data/course/reviewed-lexical-identities-batch3.json');
 const base=read('data/course/reviewed-lexical-identities.json');
 const sidecar=read('data/course/lexical-identity-sidecar.json');
 const dictionary=read('data/common-words.json');
 const stages=[...'a1.1,a1.2,a1.3,a2.1'.split(',')].flatMap(level=>
  [1,2,3,4].map(n=>'data/course/'+level+'-section-'+n+'.json')
   .filter(x=>fs.existsSync(path.join(ROOT,x))).map(read));
 const result=audit(batch,base,sidecar,dictionary,stages);
 if(mode==='--json')process.stdout.write(JSON.stringify(result,null,2)+'\n');
 else process.stdout.write('P2 reviewed noun identities: '+result.reviewed+' / '+result.global_total+
  '; '+result.unresolved+' unresolved, zero global homograph guesses.\n');
}
if(require.main===module)main();
module.exports={audit,REQUIRED,SENSES,AMBIGUOUS,main};
