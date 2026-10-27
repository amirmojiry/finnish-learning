#!/usr/bin/env node
'use strict';
// Build a bounded, reproducible set of scored reviews from already authored bilingual material.
// Never generate a Finnish sentence, infer an unreviewed P2 sense, or rewrite archived slides.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const levels = ['a1.1', 'a1.2', 'a1.3', 'a2.1'];
const files = levels.flatMap(level => [1,2,3,4].map(n =>
 'data/course/' + level + '-section-' + n + '.json'))
 .filter(file => fs.existsSync(path.join(ROOT, file)));
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const norm = value => String(value || '').normalize('NFC').toLocaleLowerCase('fi-FI').trim();
const identity = item => (item.item_type === 'expression' ? 'expression:' : 'form:') +
 norm(item.surface_form);
const tokens = value => norm(value).match(/[\p{L}\p{N}]+/gu) || [];
function positives(a) {
 if (['teach','number-grid'].includes(a.type)) return [];
 if (a.type === 'event-time-match') return [a.time_item].filter(Boolean);
 if (a.type === 'prompt-choice') return [a.answer_item].filter(Boolean);
 if (a.type === 'sequence-order') return a.items || [];
 if (a.type === 'short-reading') return [a.question_item].filter(Boolean);
 if (a.type === 'dialogue-order') return a.turns || [];
 if (a.type === 'negative-transform') return [a.negative_item || a.item].filter(Boolean);
 return a.item ? [a.item] : a.expected_items || [];
}
function acceptable(fi, fa, surface) {
 return typeof fi === 'string' && typeof fa === 'string' && Boolean(fa.trim())
  && fi.length <= 155 && fi.length >= surface.length + 3
  && tokens(fi).length >= 3 && !/_{2,}/.test(fi)
  && tokens(fi).includes(norm(surface));
}
function build(rawSections, dictionary) {
 const sections = structuredClone(rawSections);
 // A second run must use exactly the unchanged original authoring data.
 for (const section of sections) {
  for (const [itemId,item] of Object.entries(section.items)) {
   if (item.p3_review_provenance) delete section.items[itemId];
  }
  for (const lesson of section.lessons) delete lesson.p3_review_activities;
 }
 const rows = sections.flatMap(section => section.lessons.map((lesson,j) => ({
  section,lesson,
  eligible:!lesson.editorial_revision && !lesson.study_pacing
   && j < section.lessons.length-1 && lesson.activities.length <= 28,
  activities: lesson.editorial_revision
   ? lesson.editorial_revision.activity_indices.map(i => lesson.activities[i])
   : lesson.activities
 })));
 const graded = rows.map(row => new Set(row.activities.flatMap(positives)
  .filter(id => row.section.items[id]).map(id => identity(row.section.items[id]))));
 const missing = rows.flatMap((row,index) => (row.lesson.new_targets || []).map(itemId => ({
  row,index,itemId,item:row.section.items[itemId],
  id:identity(row.section.items[itemId])
 }))).filter(x => !graded.slice(x.index+1).some(g => g.has(x.id)));
 const dictionaryByForm = new Map(dictionary.words.map(word => [norm(word.word), word]));
 const loads = new Map(),plan = [];
 for (const entry of [...missing].reverse()) {
  const candidates = rows.map((row,index) => ({
   row,index,load:loads.get(index) || 0
  })).filter(x => x.row.eligible && x.index >= entry.index+2 && x.load < 2);
  candidates.sort((a,b) =>
   (a.index-entry.index)+a.load*12-((b.index-entry.index)+b.load*12));
  if (!candidates.length) throw Error('No safe post-introduction review slot for '+entry.id);
  const target = candidates[0];
  loads.set(target.index, target.load + 1);
  const original=entry.item;
  let example = {fi:original.example_fi,fa:original.example_fa,
   source:'original_lesson'};
  if (original.item_type !== 'expression') {
   const alternatives=[],word=dictionaryByForm.get(norm(original.surface_form));
   if (word && norm(word.lemma) === norm(original.lemma) &&
       String(word.translation_fa).trim() === String(original.translation_fa).trim()) {
    for (const n of [1,2]) alternatives.push({
     fi:n===1?word.example_fi:word.example_2_fi,
     fa:n===1?word.example_fa:word.example_2_fa,
     source:'curated_dictionary_example_'+n
    });
   }
   for (const section of sections) for (const [itemId,item] of Object.entries(section.items)) {
    if (section.id === entry.row.section.id && itemId === entry.itemId) continue;
    if (norm(item.surface_form) === norm(original.surface_form) &&
        norm(item.lemma) === norm(original.lemma) &&
        String(item.translation_fa).trim() === String(original.translation_fa).trim()) {
     alternatives.push({fi:item.example_fi,fa:item.example_fa,
      source:'authored_course_example',sourceSection:section.id,sourceItem:itemId});
    }
   }
   const alternate = alternatives.find(a =>
    acceptable(a.fi,a.fa,original.surface_form) &&
    norm(a.fi) !== norm(original.example_fi));
   if (alternate) example=alternate;
  }
  const cloze=original.item_type !== 'expression' &&
   acceptable(example.fi, example.fa, original.surface_form);
  const itemId='p3r-'+String(entry.index+1).padStart(3,'0')+'-'+
   entry.itemId.replace(/[^a-z0-9-]/gi,'-').slice(0,75);
  if (target.row.section.items[itemId]) throw Error('P3 alias collision: '+itemId);
  target.row.section.items[itemId] = {
   ...original,id:itemId,example_fi:example.fi,example_fa:example.fa,
   p3_review_provenance:{
    source_section_id:entry.row.section.id,
    source_lesson_id:entry.row.lesson.id,
    source_item_id:entry.itemId,context_origin:example.source,
    ...(example.sourceSection?{context_section_id:example.sourceSection,
     context_item_id:example.sourceItem}:{})
   }
  };
  (target.row.lesson.p3_review_activities ||= []).push({
   type:'type',mode:cloze?'cloze':'finnish',item:itemId,p3_review:true
  });
  plan.push({form_id:entry.id,source_lesson:entry.row.lesson.id,
   target_lesson:target.row.lesson.id,mode:cloze?'cloze':'finnish',
   source_example:example.source,
   novel_authored_context:cloze && norm(example.fi)!==norm(original.example_fi)});
 }
 if (plan.length !== missing.length) throw Error('Lost P3 review coverage');
 return {sections,plan,baseline_missing:missing.length};
}
function main(args=process.argv.slice(2)) {
 const flag=args[0]||'--check';
 if (!['--check','--write','--json'].includes(flag))
  throw Error('Usage: build-p3-reviewed-retrievals.cjs --check|--write|--json');
 const result=build(files.map(read),read('data/common-words.json'));
 if (flag==='--json') {
  process.stdout.write(JSON.stringify({baseline_missing:result.baseline_missing,
   scheduled:result.plan.length,review:result.plan},null,2)+'\n'); return;
 }
 for (let i=0;i<files.length;i++) {
  const file=path.join(ROOT,files[i]),serial=JSON.stringify(result.sections[i],null,2)+'\n';
  if (flag==='--write' && fs.readFileSync(file,'utf8')!==serial)
   fs.writeFileSync(file,serial);
  else if (flag==='--check' && fs.readFileSync(file,'utf8')!==serial)
   throw Error('P3 authored reviews stale: '+files[i]+'; run npm run p3:reviews:write');
 }
 process.stdout.write('P3 reviewed retrievals: '+result.plan.length+
  ' later scored, '+result.plan.filter(x=>x.novel_authored_context).length+
  ' reused alternate authored contexts.\n');
}
if (require.main === module) main();
module.exports={build,acceptable,positives,main};
