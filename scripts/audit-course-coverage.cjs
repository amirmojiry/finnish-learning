#!/usr/bin/env node
'use strict';

// Audit authored opportunities, never individual learner mastery.
const fs=require('node:fs'),path=require('node:path'),course=require('../course.js');
const ROOT=path.resolve(__dirname,'..'),DIR=path.join(ROOT,'data/course');
const JSON_FILE=path.join(DIR,'coverage-audit.json');
const MD_FILE=path.join(ROOT,'docs/COURSE-COVERAGE-AUDIT.md');
const GRAMMAR_TYPES=new Set(['morphology-choice','inflection-production','sentence-order','expression-completion','controlled-production','negative-transform','guided-writing','dialogue-order']);
const PRODUCTIVE=new Set(['production','type','dictation','expression-completion','controlled-production','inflection-production','negative-transform','guided-writing']);
const norm=v=>String(v||'').normalize('NFC').toLocaleLowerCase('fi-FI').trim();
const unique=values=>[...new Set(values)].sort((a,b)=>a.localeCompare(b,'fi'));
const read=relative=>JSON.parse(fs.readFileSync(path.join(ROOT,relative),'utf8'));
function sourceRows() {
  const lines=fs.readFileSync(path.join(ROOT,'data/parole_frek_3.txt')).toString('latin1').split(/\r?\n/);
  const forms=new Map();let position=0;
  for(const line of lines){
    if(!line.trim())continue;
    position++;
    const m=line.match(/^(\d+)\s+(\d+)\s+(.+?)\s+\((\S+)\s+%\)$/);
    if(!m)throw Error('Invalid original Parole row at '+position);
    const form=norm(m[3]);
    if(!forms.has(form))forms.set(form,{position,frequency_rank:Number(m[1])});
  }
  return {positions:position,forms};
}
function loadStages(master) {
  const files=fs.readdirSync(DIR);
  return master.levels.filter(level=>level.curriculum_file).map(level=>{
    const prefix=level.level.toLowerCase().replace('.','\\.');
    const regex=new RegExp('^'+prefix+'-section-([0-9]+)\\.json$');
    const ordered=files.filter(f=>regex.test(f)).sort((a,b)=>Number(a.match(regex)[1])-Number(b.match(regex)[1]));
    return {level:level.level,curriculum:read(level.curriculum_file),sections:ordered.map(f=>read('data/course/'+f))};
  }).filter(stage=>stage.sections.length);
}
function positives(a) {
  if(a.type==='teach')return [];
  if(a.type==='short-reading')return a.question_item?[a.question_item]:[];
  if(a.type==='dialogue-order')return a.turns||[];
  if(a.type==='negative-transform')return [a.negative_item||a.item].filter(Boolean);
  if(a.item)return [a.item];
  return a.expected_items||[];
}
function evidence(section,lesson) {
  const refs=lesson.curriculum_target_refs||{};
  const targetIds=[...new Set([...(refs.high_frequency||[]),...(refs.topic||[]),...(refs.expressions||[]),...(lesson.new_targets||[]),...(lesson.practice_targets||[]),...(lesson.checkpoint_targets||[])])];
  const intro=new Set(lesson.new_targets||[]),teach=new Set(),correct=new Set(),receptive=new Set(),productive=new Set(),wrong=new Set(),reading=new Set();
  let grammatical=0,morphological=0;
  for(const a of lesson.activities){
    if(a.type==='teach'&&a.item)teach.add(a.item);
    if(a.type==='short-reading'&&a.item)reading.add(a.item);
    if(GRAMMAR_TYPES.has(a.type))grammatical++;
    if(['morphology-choice','inflection-production'].includes(a.type))morphological++;
    const answers=positives(a);
    for(const id of answers)if(section.items[id]){
      correct.add(id);
      (PRODUCTIVE.has(a.type)?productive:receptive).add(id);
    }
    for(const id of a.options||[])if(section.items[id]&&!answers.includes(id))wrong.add(id);
  }
  const toForms=ids=>unique([...ids].filter(id=>section.items[id]).map(id=>norm(section.items[id].surface_form)));
  const targeted=toForms(targetIds),correctForms=toForms(correct),correctSet=new Set(correctForms);
  return {
    declared:targeted,
    introduced:toForms([...intro,...teach]),
    correct:correctForms,
    receptive:toForms(receptive),
    productive:toForms(productive),
    declared_unassessed:targeted.filter(form=>!correctSet.has(form)),
    teach_only:toForms([...teach].filter(id=>!correct.has(id))),
    distractor_only:toForms([...wrong].filter(id=>!correct.has(id)&&!teach.has(id))),
    reading_only:toForms([...reading].filter(id=>!correct.has(id))),
    grammar_slots:grammatical,morphology_slots:morphological,
  };
}
function build(master,stages,dictionary,parole) {
  const dict=new Map(dictionary.words.map(w=>[norm(w.word),w]));
  const grammar=master.levels.filter(level=>stages.some(s=>s.level===level.level))
    .flatMap(level=>level.grammar.map(g=>({id:g.id,level:level.level,title_en:g.title_en,prerequisites:g.prerequisites||[]})));
  const knownGrammar=new Set(grammar.map(g=>g.id));
  const allGrammar=new Map(master.levels.flatMap(level=>level.grammar.map(g=>[g.id,level.level])));
  const errors=grammar.flatMap(g=>g.prerequisites.filter(p=>!allGrammar.has(p)).map(p=>({id:g.id,unresolved:p})));
  const rows=[],sections=[],lexical=new Map(),expressions=new Set(),words=[],first=new Map(),later=new Set(),mapped=new Set();
  const rankedConflicts=[];
  for(const section of stages){
    const current=[];
    for(const lesson of section.lessons){
      const refs=lesson.curriculum_target_refs||{},ev=evidence(section,lesson);
      const intended=unique([...(lesson.grammar_concept_ids||[]),...(lesson.grammar_targets||[])].filter(id=>typeof id==='string'));
      const known=intended.filter(id=>knownGrammar.has(id)); known.forEach(id=>mapped.add(id));
      const review=ev.correct.filter(form=>first.has(form)&&first.get(form)!==lesson.id);
      review.forEach(form=>later.add(form));
      const row={id:lesson.id,curriculum_id:lesson.curriculum_id,level:section.level,section_id:section.id,order:lesson.order,
        can_do_fa:lesson.objective_fa||lesson.summary_fa||'',
        target_counts:Object.fromEntries(['high_frequency','topic','expressions'].map(key=>[key,(refs[key]||[]).length])),
        authored_new_targets:(lesson.new_targets||[]).length,
        lexical:{
          declared_forms:ev.declared,
          first_referenced:ev.declared.filter(form=>!first.has(form)),
          introduced:ev.introduced,correct_answer:ev.correct,
          receptive_count:ev.receptive.length,productive_count:ev.productive.length,
          later_correct_retrieval:review,declared_unassessed:ev.declared_unassessed,
          teach_only:ev.teach_only,distractor_only_count:ev.distractor_only.length,
          reading_only:ev.reading_only,
          high_frequency_target_forms:unique((refs.high_frequency||[]).filter(id=>section.items[id]).map(id=>norm(section.items[id].surface_form))),
          topic_target_forms:unique((refs.topic||[]).filter(id=>section.items[id]).map(id=>norm(section.items[id].surface_form))),
          expression_target_forms:unique((refs.expressions||[]).filter(id=>section.items[id]).map(id=>norm(section.items[id].surface_form))),
          authored_new_forms:unique((lesson.new_targets||[]).filter(id=>section.items[id]).map(id=>norm(section.items[id].surface_form))),
        },
        grammar:{
          note_present:Boolean(String(lesson.grammar_fa||'').trim()),
          concept_ids:known,unknown_ids:intended.filter(id=>!knownGrammar.has(id)),
          structured_or_morphology_slots:ev.grammar_slots,
          morphology_slots:ev.morphology_slots,
          evidence_status:known.length?'explicit_ids_need_activity_mapping_review':'unmapped',
          prerequisite_concept_ids:unique(known.flatMap(id=>grammar.find(g=>g.id===id)?.prerequisites||[])),
        }
      };
      current.push(row);rows.push(row);
      for(const form of ev.declared)if(!first.has(form))first.set(form,lesson.id);
      for(const id of [...(refs.high_frequency||[]),...(refs.topic||[])]){
        const item=section.items[id];if(!item)continue;
        const form=norm(item.surface_form);lexical.set(form,(lexical.get(form)||0)+1);
      }
      for(const id of refs.expressions||[]){
        if(section.items[id])expressions.add(norm(section.items[id].surface_form));
      }
    }
    const ids=new Set(section.lessons.flatMap(l=>[...(l.curriculum_target_refs?.high_frequency||[]),...(l.curriculum_target_refs?.topic||[])]));
    for(const id of ids)if(section.items[id])words.push(section.items[id]);
    sections.push({
      level:section.level,id:section.id,lessons:current.length,
      graded_slots:section.lessons.reduce((n,l)=>n+l.activities.filter(a=>a.type!=='teach').length,0),
      unassessed_target_forms:current.reduce((n,l)=>n+l.lexical.declared_unassessed.length,0),
      lessons_missing_grammar_ids:current.filter(l=>!l.grammar.concept_ids.length).length,
    });
  }
  for(const item of words)if(item.frequency_status==='ranked' &&
    (!dict.has(norm(item.surface_form)) || item.frequency_rank!==dict.get(norm(item.surface_form)).frequency_rank))
    rankedConflicts.push(item.id||item.surface_form);
  const distinct=unique([...lexical.keys()]);
  const outside=distinct.filter(form=>!dict.has(form)).map(form=>({
    surface_form:form,source_position:parole.forms.get(form)?.position??null,
    source_frequency_rank:parole.forms.get(form)?.frequency_rank??null,
    category:parole.forms.has(form)?'parole_source_outside_curated_dictionary':'not_in_original_parole',
    authored_target_placements:lexical.get(form),
  })).sort((a,b)=>(a.source_position??Infinity)-(b.source_position??Infinity)||
    a.surface_form.localeCompare(b.surface_form,'fi'));
  const summary={
    shipped_sections:sections.length,shipped_lessons:rows.length,
    graded_activity_slots:sections.reduce((n,s)=>n+s.graded_slots,0),
    dictionary_ranked_surface_entries:dictionary.words.length,
    distinct_authored_lexical_surfaces:distinct.length,
    lexical_target_placements:[...lexical.values()].reduce((a,b)=>a+b,0),
    distinct_lemma_field_values_unverified:unique(words.map(i=>norm(i.lemma)).filter(Boolean)).length,
    reviewed_sense_ids_present:unique(words.map(i=>i.sense_id).filter(Boolean)).length,
    distinct_authored_expressions:expressions.size,
    lexical_forms_repeated_across_placements:[...lexical.values()].filter(n=>n>1).length,
    lexical_forms_matching_curated_dictionary:distinct.filter(f=>dict.has(f)).length,
    lexical_forms_missing_dictionary:outside.length,
    outside_dictionary_but_in_original_parole:outside.filter(x=>x.source_position!=null).length,
    outside_dictionary_and_not_in_original_parole:outside.filter(x=>x.source_position==null).length,
    assessed_again_after_earlier_reference:later.size,
    grammar_concepts_planned_for_shipped_levels:grammar.length,
    grammar_concepts_with_explicit_lesson_ids:mapped.size,
    lessons_without_explicit_grammar_concept_ids:rows.filter(r=>!r.grammar.concept_ids.length).length,
    graded_grammar_related_slots:rows.reduce((n,r)=>n+r.grammar.structured_or_morphology_slots,0),
    graded_morphology_slots:rows.reduce((n,r)=>n+r.grammar.morphology_slots,0),
    lessons_with_declared_unassessed_forms:rows.filter(r=>r.lexical.declared_unassessed.length).length,
    ranked_metadata_conflicts:rankedConflicts.length,
  };
  return {
    schema_version:1,
    disclaimer:'This reports static teaching opportunities, NOT learner proficiency, CEFR/YKI or verified senses.',
    methodology:{
      matched_forms:'Exact NFC + fi-FI lowercase surface, no guessed morphology or sense',
      lemma:'Stored lemma-field values are unverified proxies, not normalized lexemes',
      source:'Original Latin-1 Parole positions; existing dictionary is only curated subset',
      correct_answer:'Only positive targets of runtime-injected graded activities; distractors are excluded',
      later_review:'Static correct-answer appearance after an earlier authored target, not SRS learner evidence',
      grammar:'A note or a morphology exercise does not prove a canonical concept was taught',
    },
    summary,sections,lessons:rows,gaps:{
      lexical_forms_outside_dictionary:outside,
      top_repeated_lexical_surfaces:[...lexical].filter(x=>x[1]>1)
        .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'fi')).slice(0,30)
        .map(([form,count])=>({surface_form:form,placements:count})),
      lessons_with_unassessed_declared_targets:rows.filter(r=>r.lexical.declared_unassessed.length)
        .map(r=>({lesson_id:r.id,forms:r.lexical.declared_unassessed})),
      grammar_concepts_without_lesson_ids:grammar.filter(g=>!mapped.has(g.id)),
      unresolved_grammar_dependencies:errors,
      lessons_with_unknown_grammar_ids:rows.filter(r=>r.grammar.unknown_ids.length)
        .map(r=>({id:r.id,ids:r.grammar.unknown_ids})),
      ranked_item_metadata_conflicts:unique(rankedConflicts),
    }
  };
}
function toMarkdown(report) {
  const s=report.summary,g=report.gaps,B=String.fromCharCode(96);
  const q=value=>B+value+B;
  const md=[
    '# Course lexical and grammar audit',
    '',
    'Reproducible audit: '+q('npm run curriculum:coverage:report')+
      '. Data: '+q('data/course/coverage-audit.json')+'.',
    '**Static teaching opportunities only.** Not learner mastery, speaking proficiency, or CEFR/YKI certification.',
    '',
    '## Key findings','',
    '- '+s.shipped_lessons+' shipped lessons / '+s.shipped_sections+' sections; '+s.graded_activity_slots+' graded slots after real runtime injection.',
    '- '+s.lexical_target_placements+' lexical target placements and '+s.distinct_authored_lexical_surfaces+' distinct surface forms; '+s.distinct_lemma_field_values_unverified+
      ' lemma-field values (unverified) and '+s.reviewed_sense_ids_present+' explicit sense IDs.',
    '- '+s.distinct_authored_expressions+' expression surfaces; '+s.lexical_forms_repeated_across_placements+' lexical surfaces appear in multiple target placements. '+s.assessed_again_after_earlier_reference+
      ' forms receive a correct-answer opportunity in later lessons (NOT an actual learner SRS event).',
    '- '+s.dictionary_ranked_surface_entries+' dictionary entries; '+s.lexical_forms_matching_curated_dictionary+' authored lexical target forms found in the curated dictionary; '+s.lexical_forms_missing_dictionary+
      ' missing, of which '+s.outside_dictionary_but_in_original_parole+' exist in original Parole and '+s.outside_dictionary_and_not_in_original_parole+' were not found.',
    '- '+s.grammar_concepts_planned_for_shipped_levels+' planned grammar concepts in shipped stages; '+s.grammar_concepts_with_explicit_lesson_ids+
      ' with explicit lesson concept IDs. '+s.lessons_without_explicit_grammar_concept_ids+' lessons lack these links even though '+s.graded_grammar_related_slots+
      ' structural/grammar slots exist ('+s.graded_morphology_slots+' morphology slots).',
    '- '+s.lessons_with_declared_unassessed_forms+' lessons declare at least one form without a positive correct-answer activity in the same lesson; some could be intentional and need review.',
    '',
    '## Per-section coverage','','| Level | Section | Lessons | Graded slots | Unassessed form occurrences | Missing grammar-ID lessons |','| --- | --- | ---: | ---: | ---: | ---: |'
  ];
  for(const row of report.sections)md.push('| '+row.level+' | '+row.id+' | '+row.lessons+' | '+row.graded_slots+' | '+row.unassessed_target_forms+' | '+row.lessons_missing_grammar_ids+' |');
  md.push('','## Lexical candidates outside the installed dictionary','',
    'First 50 shipped single-word targets by original Parole position (full list in JSON). No ranks are assigned to unranked expressions.','',
    '| Form | Parole position | Status | Placements |','| --- | ---: | --- | ---: |');
  for(const x of g.lexical_forms_outside_dictionary.slice(0,50))md.push('| '+x.surface_form.replaceAll('|','\\|')+' | '+(x.source_position??'not found')+' | '+x.category+' | '+x.authored_target_placements+' |');
  md.push('','## Planned grammar concepts without lesson-ID mapping','',
    'Grammar notes and individual morphology exercises do not establish concept traceability. This is a P1 gap, not proof that all grammar is absent.','',
    '| Grammar ID | Stage | Prerequisites |','| --- | --- | --- |');
  for(const x of g.grammar_concepts_without_lesson_ids)md.push('| '+q(x.id)+' | '+x.level+' | '+(x.prerequisites.map(q).join(', ')||'—')+' |');
  md.push('','## Next work according to issue #101','',
    '1. P1: add explicit grammar IDs/prerequisites and assess them positively, without changing taught Finnish forms blindly.',
    '2. P2: review lexeme/meaning/form identities; the stored lemma fields are not certified identities.',
    '3. P3: ensure positive coverage of authored forms in multiple relevant contexts, not distractors alone.',
    '4. P4: source-based corpus gaps should be curated in small batches with Parole and UD validation.',
    '',
    'Use '+q('node scripts/audit-course-coverage.cjs --json')+' for per-lesson rows or '+q('--check')+' to validate snapshots.',
    'No learner progress, local storage, SRS schedule, dictionary or lesson file is modified.','');
  return md.join('\n');
}
function main(args=process.argv.slice(2)) {
  const mode=args[0]||'--markdown';
  if(!['--markdown','--json','--check','--write'].includes(mode)) {
    process.stderr.write('Usage: audit-course-coverage.cjs [--markdown|--json|--check|--write]\n');
    process.exitCode=2;return;
  }
  const master=read('data/course/master-curriculum.json');
  const data=build(master,course.validateImplementedPath(loadStages(master)),read('data/common-words.json'),sourceRows());
  const json=JSON.stringify(data,null,2)+'\n',md=toMarkdown(data)+'\n';
  if(mode==='--json')process.stdout.write(json);
  else if(mode==='--markdown')process.stdout.write(md);
  else if(mode==='--write'){
    fs.writeFileSync(JSON_FILE,json);fs.writeFileSync(MD_FILE,md);
    process.stdout.write('Wrote course coverage snapshots.\n');
  } else {
    const existingJson=fs.existsSync(JSON_FILE)?fs.readFileSync(JSON_FILE,'utf8'):null;
    const existingMd=fs.existsSync(MD_FILE)?fs.readFileSync(MD_FILE,'utf8'):null;
    if(existingJson!==json||existingMd!==md){
      process.stderr.write('Missing or stale course audit snapshots; run npm run curriculum:coverage:write.\n');
      process.exitCode=1;
    }else process.stdout.write('Course coverage audit current for '+data.summary.shipped_lessons+' lessons.\n');
  }
}
if(require.main===module)main();
module.exports={norm,positives,evidence,build,toMarkdown,sourceRows,loadStages,main};
