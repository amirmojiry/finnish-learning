#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {normalize,stableId}=require('./build-lexical-identity.cjs');
const ROOT=path.resolve(__dirname,'..');
const SOURCE='data/course/reviewed-contextual-identities.json';
const OUTPUT='data/course/contextual-lexical-identity-map.json';
const REPORT='docs/P2-CONTEXTUAL-IDENTITY-BATCH2-REPORT.md';
const TARGET_FORMS=Object.freeze(['aika','ajan','voi','pitää','tuli']);
const LEMMA_IDS=Object.freeze({aika:'lexeme:aika',voida:'lexeme:voida',pitää:'lexeme:pitaa',tulla:'lexeme:tulla'});
// Deliberate editorial whitelist of exact authored examples: NOT an automatic word-sense classifier.
const SENSES=Object.freeze({
 'sense:aika-time':{lemma:'aika',contexts:['Aika on nyt.']},
 'sense:aika-appointment':{lemma:'aika',contexts:['Minulla on aika lääkärille.','Hei, haluaisin varata ajan lääkärille.']},
 'sense:voida-ability':{lemma:'voida',contexts:['Hän voi auttaa sinua.','Anteeksi, en voi.']},
 'sense:voida-wellbeing':{lemma:'voida',contexts:['En voi hyvin.']},
 'sense:pitaa-necessity':{lemma:'pitää',contexts:['Minun pitää lähteä.','Minun pitää siirtää vastaanottoaikaani.']},
 'sense:tulla-arrival':{lemma:'tulla',contexts:['Bussi tuli myöhässä.','Sitten bussi tuli asemalle.']}
});
const itemKey=(sectionId,itemId)=>sectionId+'/'+itemId;
const contextId=(sectionId,itemId)=>'course-item:'+itemKey(sectionId,itemId);
function exactFields(value,expected,name){
 if(!value||typeof value!=='object'||Array.isArray(value)||
 Object.keys(value).sort().join('|')!==expected.slice().sort().join('|'))throw Error('Invalid '+name+' fields');
}
function validateMorphology(e){
 const m=e.morphology;
 if(e.lemma_fi==='aika'){
  exactFields(m,['part_of_speech','case','number'],'nominal morphology');
  if(m.part_of_speech!=='noun'||m.number!=='singular'||
    m.case!==(e.surface_form==='ajan'?'genitive':'nominative'))
   throw Error('Invalid nominal morphology: '+e.item_id);
  return;
 }
 if(!['voida','pitää','tulla'].includes(e.lemma_fi))throw Error('Unreviewed verb lemma');
 if(m?.verb_form==='connegative'){
  exactFields(m,['part_of_speech','tense','verb_form','polarity'],'connegative');
  if(e.lemma_fi!=='voida'||m.part_of_speech!=='verb'||m.tense!=='present'
   ||m.polarity!=='negative'||!(/^(En voi\b|Anteeksi, en voi\.$)/u.test(e.context_fi)))
   throw Error('Invalid negative voida morphology: '+e.item_id);
  return;
 }
 exactFields(m,['part_of_speech','tense','verb_form','mood','person','number','polarity'],'finite verb');
 if(m.part_of_speech!=='verb'||m.verb_form!=='finite'||m.mood!=='indicative'
  ||m.person!==3||m.number!=='singular'||m.polarity!=='affirmative'
  ||m.tense!==(e.lemma_fi==='tulla'?'past':'present'))
  throw Error('Invalid finite verb morphology: '+e.item_id);
 if(e.lemma_fi==='voida'&&!/^Hän voi\b/u.test(e.context_fi))
  throw Error('Invalid positive voida context');
}
function build(reviews,sections,sidecar){
 if(reviews?.schema_version!==1||!Array.isArray(reviews.entries))throw Error('Invalid contextual review schema');
 if(sidecar?.identity_scope!=='reviewed_identity_overlay_on_normalized_surface'||!Array.isArray(sidecar.records))
  throw Error('Expected unchanged source identity map');
 const sectionMap=new Map();
 for(const s of sections){
  if(!s?.id||!s.items||sectionMap.has(s.id))throw Error('Missing or duplicate section ID');
  sectionMap.set(s.id,s);
 }
 const forms=new Map(sidecar.records.filter(r=>r.kind==='form').map(r=>[r.surface_form,r]));
 const target=TARGET_FORMS.map(form=>{
  const r=forms.get(form);
  if(!r||r.identity_review_status!=='unresolved'||r.lexeme_id!==null||
    r.sense_id!==null||r.morphology!==null||r.form_id!==stableId('form',form))
   throw Error('Global surface homograph must remain unresolved: '+form);
  return r;
 });
 const expected=new Map();
 for(const r of target)for(const o of r.occurrences){
  const k=itemKey(o.section_id,o.item_id),s=sectionMap.get(o.section_id);
  if(!s||!s.items[o.item_id]||normalize(s.items[o.item_id].surface_form)!==r.surface_form||
    !s.lessons.some(l=>l.id===o.lesson_id))throw Error('Stale course occurrence: '+k);
  if(!expected.has(k))expected.set(k,{surface:r.surface_form,form_id:r.form_id,uses:[]});
  expected.get(k).uses.push(o);
 }
 const entries=new Map();
 for(const e of reviews.entries){
  const k=itemKey(e.section_id,e.item_id),ex=expected.get(k);
  if(entries.has(k))throw Error('Duplicate item mapping: '+k);
  if(!ex)throw Error('Unknown or unreferenced item: '+k);
  if(e.surface_form!==ex.surface||normalize(e.surface_form)!==e.surface_form)
   throw Error('Stale surface mapping: '+k);
  const original=sectionMap.get(e.section_id).items[e.item_id];
  if(original.item_type==='expression'||!original.example_fi||e.context_fi!==original.example_fi)
   throw Error('Changed/missing exact authored Finnish example: '+k);
  // These five target forms contain letters only; require independent whole-word occurrence.
  if(!new RegExp('(^|[^\\p{L}])'+e.surface_form+'($|[^\\p{L}])','iu').test(e.context_fi))
   throw Error('Example lacks reviewed surface token: '+k);
  const sense=SENSES[e.sense_id];
  if(!sense||sense.lemma!==e.lemma_fi||!sense.contexts.includes(e.context_fi)
    ||e.lexeme_id!==LEMMA_IDS[e.lemma_fi]||
    !e.sense_id.startsWith('sense:'+e.lexeme_id.slice(7)+'-'))
   throw Error('Unreviewed sense/example combination: '+k);
  if(typeof e.sense_gloss_en!=='string'||e.sense_gloss_en.trim().length<5
    ||e.sense_gloss_en.length>100)throw Error('Missing bounded sense gloss: '+k);
  if(original.lemma!==e.lemma_fi){
   if(e.lemma_fi!=='tulla'||original.lemma!=='tuli'
     ||e.legacy_source_lemma_exception!==original.lemma)
    throw Error('Undocumented source lemma mismatch: '+k);
  }else if(Object.hasOwn(e,'legacy_source_lemma_exception'))
   throw Error('Unnecessary source lemma exception: '+k);
  if(e.sense_id==='sense:voida-wellbeing'){
   if(typeof e.legacy_gloss_note_en!=='string'||!e.legacy_gloss_note_en.includes('wellbeing'))
    throw Error('Missing wellbeing source-gloss caveat: '+k);
  }else if(Object.hasOwn(e,'legacy_gloss_note_en'))
   throw Error('Unnecessary source-gloss caveat: '+k);
  validateMorphology(e);
  entries.set(k,{...e,context_id:contextId(e.section_id,e.item_id),form_id:ex.form_id,
   source_lemma_fi:original.lemma,source_gloss_fa:original.translation_fa,
   source_context_fa:original.example_fa??null,reviewed_status:'reviewed',
   lesson_reference_count:ex.uses.length});
 }
 for(const k of expected.keys())if(!entries.has(k))throw Error('Missing reviewed contextual item: '+k);
 if(entries.size!==15)throw Error('Expected exactly 15 distinct course items');
 const items=[...entries.values()].sort((a,b)=>a.section_id.localeCompare(b.section_id)||a.item_id.localeCompare(b.item_id));
 const occurrences=[];
 for(const [k,entry] of entries)for(const o of expected.get(k).uses){
  occurrences.push({context_id:entry.context_id,section_id:o.section_id,lesson_id:o.lesson_id,
   item_id:o.item_id,role:o.role,form_id:entry.form_id,
   lexeme_id:entry.lexeme_id,sense_id:entry.sense_id});
 }
 occurrences.sort((a,b)=>a.section_id.localeCompare(b.section_id)||
  a.lesson_id.localeCompare(b.lesson_id)||a.item_id.localeCompare(b.item_id));
 if(occurrences.length!==24)throw Error('Expected 24 original lesson references');
 const counts={ambiguous_global_surfaces:target.length,reviewed_contextual_items:items.length,
  linked_lesson_references:occurrences.length,reviewed_lexemes:new Set(items.map(i=>i.lexeme_id)).size,
  distinct_contextual_senses:new Set(items.map(i=>i.sense_id)).size,
  unchanged_unresolved_global_surfaces:target.length,
  legacy_source_lemma_discrepancies:items.filter(i=>i.legacy_source_lemma_exception).length,
  contextual_wellbeing_gloss_caveats:items.filter(i=>i.legacy_gloss_note_en).length};
 return {schema_version:1,identity_scope:'reviewed_context_per_course_item',
  disclaimer:'Item-scoped editorial senses do not modify global stable form IDs, Parole ranks, user Course scores, Word Practice SRS history, or claim learner mastery.',
  counts,items,occurrences};
}
function lookup(map,sectionId,itemId){
 return (map.items||[]).find(x=>x.section_id===sectionId&&x.item_id===itemId)||null;
}
function markdown(map){
 const c=map.counts,rows=map.items.map(e=>{
  const m=e.morphology,shape=m.part_of_speech==='noun'?m.case+' '+m.number:
   m.verb_form==='connegative'?'present connegative':'indicative '+m.tense+' 3SG';
  return '| '+e.surface_form+' | '+e.section_id+' / '+e.item_id+' | '+e.sense_id+
   ' | '+shape+' | '+e.context_fi+' | '+e.lesson_reference_count+' |';
 }).join('\n');
 return '# P2 item-context lexical identity: batch 2\n\n'
  +'[Methodology](P2-CONTEXTUAL-IDENTITY-BATCH2.md) · [فارسی](P2-CONTEXTUAL-IDENTITY-BATCH2.fa.md) · [Issue #184](https://github.com/amirmojiry/finnish-learning/issues/184)\n\n'
  +'This is an editorial, read-only mapping of **'+c.reviewed_contextual_items
  +' distinct items** across **'+c.linked_lesson_references+' lesson references**. '
  +'All five global surface homographs remain unresolved; references can be distractors, not learning evidence.\n\n'
  +'## Counters\n\n| Measure | Count |\n| --- | ---: |\n'
  +'| Reviewed section/item meanings | '+c.reviewed_contextual_items+' |\n'
  +'| Linked lesson references | '+c.linked_lesson_references+' |\n'
  +'| Distinct reviewed senses | '+c.distinct_contextual_senses+' |\n'
  +'| Distinct contextual lexemes | '+c.reviewed_lexemes+' |\n'
  +'| Original globally unresolved surfaces | '+c.unchanged_unresolved_global_surfaces+' |\n'
  +'| Annotated old lemma discrepancy | '+c.legacy_source_lemma_discrepancies+' |\n'
  +'| Contextual wellbeing gloss caveats | '+c.contextual_wellbeing_gloss_caveats+' |\n\n'
  +'## Evidence by authored item\n\n'
  +'| Surface | Section / item | Reviewed sense | Morphology | Authored Finnish example | References |\n'
  +'| --- | --- | --- | --- | --- | ---: |\n'+rows+'\n\n'
  +'## Explicit boundaries\n\n'
  +'- Aika as general time versus appointment are separate senses; ajan is a nominal appointment object only in its reviewed example, not a claim about the verb ajaa in general.\n'
  +'- Voi in a positive ability phrase differs from the negative wellbeing phrase En voi hyvin. In en voi the form is connegative; the noun meaning butter is not reviewed.\n'
  +'- Pitää refers to necessity in these examples, not holding or liking. Tuli is a past-tense form of tulla in these examples, not the fire noun.\n'
  +'- One authored legacy item has lemma tuli though its example uses the verb tulla. The original item is preserved and its exception is explicit.\n'
  +'- No learner mastery or cross-SRS review transfer occurs. Only documented item meanings are linked.\n\n'
  +'Use npm run p2:context:check to verify or npm run p2:context:write to regenerate.\n';
}
function main(mode=process.argv[2]||'--check'){
 if(!['--check','--write','--markdown'].includes(mode))
  throw Error('Usage: build-contextual-lexical-identities.cjs --check|--write|--markdown');
 const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
 const sections=['a1.1','a1.2','a1.3','a2.1'].flatMap(level=>[1,2,3,4]
  .map(n=>'data/course/'+level+'-section-'+n+'.json')
  .filter(p=>fs.existsSync(path.join(ROOT,p))).map(read));
 const result=build(read(SOURCE),sections,read('data/course/lexical-identity-sidecar.json'));
 const output={[OUTPUT]:JSON.stringify(result,null,2)+'\n',[REPORT]:markdown(result)};
 if(mode==='--markdown')process.stdout.write(output[REPORT]);
 else for(const [name,data] of Object.entries(output)){
  const file=path.join(ROOT,name);
  if(mode==='--write')fs.writeFileSync(file,data);
  else if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==data)
   throw Error('Stale contextual identity artifact: '+name);
 }
}
if(require.main===module)main();
module.exports={build,lookup,markdown,main,TARGET_FORMS,SENSES,contextId,validateMorphology};
