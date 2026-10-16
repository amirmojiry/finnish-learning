#!/usr/bin/env node
'use strict';
// Reviewed course-item senses are not global form identity or SRS mastery.
const fs=require('node:fs'),path=require('node:path');
const {normalize,stableId}=require('./build-lexical-identity.cjs');
const ROOT=path.resolve(__dirname,'..');
const SOURCE='data/course/reviewed-contextual-senses.json';
const OUTPUT='data/course/contextual-sense-map.json';
const REPORT='docs/P2-CONTEXTUAL-SENSE-REPORT.md';
const AMBIGUOUS=['aika','ajan','voi','pitää','tuli'];
const NOM={part_of_speech:'noun',case:'nominative',number:'singular'};
const GEN={part_of_speech:'noun',case:'genitive',number:'singular'};
const finite=tense=>({part_of_speech:'verb',verb_form:'finite',tense,mood:'indicative',person:3,number:'singular',polarity:'affirmative'});
const CONNEG={part_of_speech:'verb',verb_form:'connegative',tense:'present',mood:'indicative',polarity:'negative'};
const key=(section,item)=>section+'::'+item;
const example=s=>String(s||'').normalize('NFC').trim();

// This narrow review fixture recognizes ONLY fifteen manually audited example contexts.
// It must never be mistaken for a generic Finnish parser or a generated inflection table.
function expectedFor(surface,context){
 const fi=example(context);
 if(surface==='aika'&&fi==='Aika on nyt.')return {lemma:'aika',lexeme_id:'lexeme:aika',sense_id:'sense:aika-time',morphology:NOM};
 if(surface==='aika'&&fi==='Minulla on aika lääkärille.')return {lemma:'aika',lexeme_id:'lexeme:aika',sense_id:'sense:aika-appointment',morphology:NOM};
 if(surface==='ajan'&&fi==='Hei, haluaisin varata ajan lääkärille.')return {lemma:'aika',lexeme_id:'lexeme:aika',sense_id:'sense:aika-appointment',morphology:GEN};
 if(surface==='voi'&&fi==='Hän voi auttaa sinua.')return {lemma:'voida',lexeme_id:'lexeme:voida',sense_id:'sense:voida-ability',morphology:finite('present')};
 if(surface==='voi'&&fi==='Anteeksi, en voi.')return {lemma:'voida',lexeme_id:'lexeme:voida',sense_id:'sense:voida-ability',morphology:CONNEG};
 if(surface==='voi'&&fi==='En voi hyvin.')return {lemma:'voida',lexeme_id:'lexeme:voida',sense_id:'sense:voida-wellbeing',morphology:CONNEG};
 if(surface==='pitää'&&(fi==='Minun pitää lähteä.'||fi==='Minun pitää siirtää vastaanottoaikaani.'))return {lemma:'pitää',lexeme_id:'lexeme:pitaa',sense_id:'sense:pitaa-necessity',morphology:finite('present')};
 if(surface==='tuli'&&(fi==='Bussi tuli myöhässä.'||fi==='Sitten bussi tuli asemalle.'))return {lemma:'tulla',lexeme_id:'lexeme:tulla',sense_id:'sense:tulla-arrive',morphology:finite('past')};
 return null;
}
function expectedException(surface,item,exp,context){
 if(normalize(item.lemma)!==normalize(exp.lemma))return 'incorrect_source_lemma';
 if(surface==='pitää')return 'polysemous_source_gloss';
 if(surface==='tuli'&&String(item.translation_fa||'').includes('آتش'))return 'polysemous_source_gloss';
 if(surface==='voi'&&['En voi hyvin.','Anteeksi, en voi.'].includes(example(context)))return 'generic_source_gloss';
 return null;
}
function authoredRefs(lesson,items){
 const refs=lesson.curriculum_target_refs||{};
 const found=new Set([...(refs.high_frequency||[]),...(refs.topic||[]),...(refs.expressions||[]),
  ...(lesson.new_targets||[]),...(lesson.practice_targets||[]),...(lesson.checkpoint_targets||[]),
  ...(lesson.review_targets||[])]);
 for(const a of lesson.activities||[]){
  for(const f of ['item','answer_item','question_item','negative_item','affirmative_item','event_item','time_item','prompt_item'])
   if(a[f]&&items[a[f]])found.add(a[f]);
  for(const f of ['items','turns','expected_items'])
   if(Array.isArray(a[f]))for(const item of a[f])if(items[item])found.add(item);
 }
 return found;
}
function build(sections,sidecar,source){
 if(source?.schema_version!==1||!Array.isArray(source.entries))throw Error('Invalid contextual source schema');
 const bySection=new Map(sections.map(s=>[s.id,s]));
 if(bySection.size!==sections.length)throw Error('Duplicate source section ID');
 const global=new Map(sidecar.records.filter(r=>r.kind==='form').map(r=>[r.surface_form,r]));
 const observed=new Map();
 for(const surface of AMBIGUOUS){
  const form=global.get(surface);
  if(!form||form.identity_review_status!=='unresolved'||form.lexeme_id!==null||
    form.sense_id!==null||form.morphology!==null||form.form_id!==stableId('form',surface))
   throw Error('Global homograph identity must remain unresolved: '+surface);
  for(const occ of form.occurrences){
   const k=key(occ.section_id,occ.item_id);
   if(!observed.has(k))observed.set(k,[]);
   observed.get(k).push(occ);
  }
 }
 const visited=new Set(),results=[];
 for(const row of source.entries){
  const k=key(row.section_id,row.item_id);
  if(visited.has(k))throw Error('Duplicate contextual item: '+k);
  visited.add(k);
  const section=bySection.get(row.section_id),item=section?.items?.[row.item_id];
  if(!item||item.item_type==='expression')throw Error('Unknown contextual course item: '+k);
  const surface=normalize(item.surface_form);
  if(!AMBIGUOUS.includes(surface))throw Error('Contextual sense outside reviewed surfaces: '+k);
  if(row.surface_form!==surface)throw Error('Stale contextual surface: '+k);
  if(!example(row.context_fi)||example(row.context_fi)!==example(item.example_fi))
   throw Error('Stale or invented contextual example: '+k);
  const exp=expectedFor(surface,item.example_fi);
  if(!exp)throw Error('Unreviewed Finnish sense context: '+k);
  if(row.lexeme_id!==exp.lexeme_id||row.sense_id!==exp.sense_id)
   throw Error('Wrong lexeme/sense for authored context: '+k);
  if(JSON.stringify(row.morphology)!==JSON.stringify(exp.morphology))
   throw Error('Incorrect inflectional analysis: '+k);
  if(typeof row.sense_gloss_en!=='string'||row.sense_gloss_en.trim().length<4)
   throw Error('Missing bounded English meaning: '+k);
  const exception=expectedException(surface,item,exp,item.example_fi);
  if((row.source_exception?.code||null)!==exception||
    (exception&&(typeof row.source_exception?.reason_en!=='string'||row.source_exception.reason_en.length<20)))
   throw Error('Legacy gloss or lemma exception not documented: '+k);
  const occurrences=observed.get(k);
  if(!occurrences?.length)throw Error('Unattested authored item: '+k);
  const duplicateOccurrences=new Set();
  for(const o of occurrences){
   const lesson=section.lessons.find(l=>l.id===o.lesson_id);
   if(!lesson||!authoredRefs(lesson,section.items).has(row.item_id))
    throw Error('Stale authored lesson reference: '+k+'/'+o.lesson_id);
   const occId=[o.section_id,o.lesson_id,o.item_id].join('/');
   if(duplicateOccurrences.has(occId))throw Error('Duplicate authored lesson reference: '+occId);
   duplicateOccurrences.add(occId);
  }
  results.push({section_id:row.section_id,item_id:row.item_id,surface_form:surface,
   form_id:stableId('form',surface),lexeme_id:row.lexeme_id,sense_id:row.sense_id,
   sense_gloss_en:row.sense_gloss_en,morphology:row.morphology,context_fi:row.context_fi,
   ...(row.source_exception?{source_exception:row.source_exception}:{}),
   lesson_occurrences:occurrences.map(o=>({occurrence_id:[o.section_id,o.lesson_id,o.item_id].join('/'),
    lesson_id:o.lesson_id,role:o.role}))});
 }
 const missing=[...observed.keys()].filter(k=>!visited.has(k));
 if(missing.length)throw Error('Missing authored ambiguous item review(s): '+missing.join(', '));
 results.sort((a,b)=>key(a.section_id,a.item_id).localeCompare(key(b.section_id,b.item_id),'en'));
 const counts={
  reviewed_course_items:results.length,
  reviewed_lesson_occurrences:results.reduce((n,r)=>n+r.lesson_occurrences.length,0),
  reviewed_ambiguous_written_surfaces:new Set(results.map(r=>r.surface_form)).size,
  reviewed_contextual_lexemes:new Set(results.map(r=>r.lexeme_id)).size,
  reviewed_contextual_senses:new Set(results.map(r=>r.sense_id)).size,
  globally_unresolved_target_surfaces:AMBIGUOUS.length,
  existing_globally_reviewed_forms:sidecar.records.filter(r=>r.identity_review_status==='reviewed').length
 };
 if(counts.reviewed_course_items!==15||counts.reviewed_lesson_occurrences!==24||
  counts.reviewed_contextual_senses!==6||counts.reviewed_contextual_lexemes!==4||
  counts.existing_globally_reviewed_forms!==47)throw Error('Contextual batch coverage changed: '+JSON.stringify(counts));
 return {schema_version:1,identity_scope:'reviewed_authored_course_item_only',
  disclaimer:'Course-item senses neither relabel global homographic forms nor imply Course proficiency, Word Practice SRS mastery, due dates or lexeme-wide learning.',
  parent_issue:101,batch_issue:184,counts,globally_unresolved_surfaces:AMBIGUOUS,reviewed_items:results};
}
function markdown(r){
 const c=r.counts;
 const rows=r.reviewed_items.map(e=>'| '+e.surface_form+' | '+e.section_id+'/'+e.item_id+
  ' | '+e.sense_id+' | '+e.context_fi+' | '+e.lesson_occurrences.length+' |').join('\n');
 return '# P2 contextual senses — editorial batch 2\n\n'
  +'[Methodology](P2-CONTEXTUAL-SENSES-BATCH2.md) · [فارسی](P2-CONTEXTUAL-SENSES-BATCH2.fa.md) · [Issue #184](https://github.com/amirmojiry/finnish-learning/issues/184)\n\n'
  +'The five globally ambiguous written form IDs stay **unresolved**. No Course scores, Word Practice SRS schedules, proficiency or Parole source fields are modified.\n\n'
  +'| Coverage | Count |\n| --- | ---: |\n'
  +'| Reviewed distinct authored course items | '+c.reviewed_course_items+' |\n'
  +'| Authored lesson references | '+c.reviewed_lesson_occurrences+' |\n'
  +'| Written homographic surfaces | '+c.reviewed_ambiguous_written_surfaces+' |\n'
  +'| Contextual lexemes | '+c.reviewed_contextual_lexemes+' |\n'
  +'| Contextual senses | '+c.reviewed_contextual_senses+' |\n'
  +'| Global homographs still unresolved | '+c.globally_unresolved_target_surfaces+' |\n'
  +'| Previously globally reviewed exact forms (unchanged) | '+c.existing_globally_reviewed_forms+' |\n\n'
  +'## Authored item evidence\n\n'
  +'| Surface | Course item | Contextual sense | Authored example | Lesson uses |\n'
  +'| --- | --- | --- | --- | ---: |\n'+rows+'\n\n'
  +'## Boundaries\n\n'
  +'- Each row is a section/item editorial decision, not a global word-sense classifier. Reuse of the same item across lessons preserves its reviewed context rather than inferring additional senses.\n'
  +'- The appointment object ajan is distinct from the globally unresolved homograph meaning I drive.\n'
  +'- The form voi is reviewed as ability or well-being, never the noun butter; pitää is necessity, not liking; tuli is past-tense tulla, not fire.\n'
  +'- Legacy mismatches in authored lemmas/glosses remain untouched and are accompanied by explicit source-exception notes.\n'
  +'- Regenerate with npm run p2:context:write, verify with npm run p2:context:check, and execute the full npm test gate before merge.\n';
}
function main(args=process.argv.slice(2)){
 const action=args[0]||'--check';
 if(!['--check','--write','--markdown'].includes(action))throw Error('Usage: build-contextual-sense-map.cjs --check|--write|--markdown');
 const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
 const sections=['a1.1','a1.2','a1.3','a2.1'].flatMap(level=>[1,2,3,4]
  .map(n=>'data/course/'+level+'-section-'+n+'.json')
  .filter(p=>fs.existsSync(path.join(ROOT,p))).map(read));
 const r=build(sections,read('data/course/lexical-identity-sidecar.json'),read(SOURCE));
 const outputs={[OUTPUT]:JSON.stringify(r,null,2)+'\n',[REPORT]:markdown(r)};
 if(action==='--markdown')process.stdout.write(outputs[REPORT]);
 else for(const [file,content] of Object.entries(outputs)){
  const filepath=path.join(ROOT,file);
  if(action==='--write')fs.writeFileSync(filepath,content);
  else if(!fs.existsSync(filepath)||fs.readFileSync(filepath,'utf8')!==content)
   throw Error('Contextual sense snapshot stale: '+file+'; run npm run p2:context:write');
 }
}
if(require.main===module)main();
module.exports={build,main,markdown,expectedFor,expectedException,AMBIGUOUS,key,authoredRefs};
