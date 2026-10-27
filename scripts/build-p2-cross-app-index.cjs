#!/usr/bin/env node
'use strict';
// P2 joins exact written forms, not unreviewed senses or transferred learner mastery.
const fs = require('node:fs');
const path = require('node:path');
const {normalize, stableId} = require('./build-lexical-identity.cjs');
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = 'data/course/p2-cross-app-identity.json';
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

function build(sidecar, dictionary, contextual, sections) {
 if (sidecar?.schema_version !== 1 || !Array.isArray(sidecar.records) ||
     contextual?.schema_version !== 1 || !Array.isArray(contextual.items) ||
     !Array.isArray(dictionary?.words) || !Array.isArray(sections)) {
  throw Error('P2 identity inputs must use the reviewed source schemas');
 }
 const bySection = new Map();
 for (const section of sections) {
  if (!section.id || !section.curriculum_section_id || !section.items ||
      bySection.has(section.id)) throw Error('Invalid or repeated P2 section');
  bySection.set(section.id, section);
 }
 const dictionaryWords = new Map();
 for (const word of dictionary.words) {
  const key = normalize(word.word);
  if (!key || dictionaryWords.has(key)) throw Error('Duplicate dictionary word in P2 bridge');
  dictionaryWords.set(key, word);
 }
 const records = [], seenIds = new Set(), mappedItems = new Map();
 for (const row of sidecar.records) {
  if (!['form','expression'].includes(row.kind) || row.id !== stableId(row.kind,row.surface_form) ||
      seenIds.has(row.id) || row.form_id !== (row.kind === 'form' ? row.id : null) ||
      row.expression_id !== (row.kind === 'expression' ? row.id : null)) {
   throw Error('Invalid or conflicting P2 stable identity: ' + row.id);
  }
  seenIds.add(row.id);
  if (row.identity_review_status === 'reviewed') {
   if (row.kind !== 'form' || !row.lexeme_id || !row.sense_id || !row.morphology)
    throw Error('Reviewed P2 identity requires evidenced lexeme, sense and morphology: ' + row.id);
  } else if (row.identity_review_status !== 'unresolved' ||
             row.lexeme_id !== null || row.sense_id !== null || row.morphology !== null) {
   throw Error('Unreviewed P2 identity must have null semantic fields: ' + row.id);
  }
  const topics = [...new Set((row.occurrences || []).map(o => {
   const section = bySection.get(o.section_id);
   if (!section) throw Error('Unknown P2 source section: ' + o.section_id);
   return section.curriculum_section_id;
  }))].sort();
  if (JSON.stringify(topics) !== JSON.stringify(row.topic_ids)) {
   throw Error('Stale P2 topic IDs for ' + row.id);
  }
  const approvedReviews = new Set();
  for (const o of row.occurrences || []) {
   const section = bySection.get(o.section_id);
   const item = section.items[o.item_id];
   const lesson = section.lessons.find(l => l.id === o.lesson_id);
   if (!item || !lesson || normalize(item.surface_form) !== row.surface_form ||
       (item.item_type === 'expression' ? 'expression' : 'form') !== row.kind) {
    throw Error('Stale course occurrence: ' + o.section_id + '/' + o.item_id);
   }
   const reviewed = (lesson.review_targets || []).includes(o.item_id) ||
    (lesson.learning_objectives?.lexical || []).some(g => g.target_id === o.item_id && g.status === 'reviewed');
   if (reviewed) approvedReviews.add(lesson.id);
   const key = o.section_id + '\u0000' + o.item_id;
   const previous = mappedItems.get(key);
   if (previous && previous.identity_id !== row.id) throw Error('One course item maps to multiple identities: ' + key);
   const entry = previous || {section_id:o.section_id,item_id:o.item_id,identity_id:row.id,
     topic_id:section.curriculum_section_id,lesson_ids:[],review_lesson_ids:[],context_review:null};
   if (!entry.lesson_ids.includes(lesson.id)) entry.lesson_ids.push(lesson.id);
   if (reviewed && !entry.review_lesson_ids.includes(lesson.id)) entry.review_lesson_ids.push(lesson.id);
   mappedItems.set(key,entry);
  }
  if (JSON.stringify([...approvedReviews].sort()) !== JSON.stringify(row.explicit_review_lesson_ids))
   throw Error('Stale explicit authored review list: ' + row.id);
  if (row.first_shipped_lesson !== (row.occurrences?.[0]?.lesson_id || null))
   throw Error('First shipped lesson is not source-backed: ' + row.id);
  const word = row.kind === 'form' ? dictionaryWords.get(row.surface_form) : null;
  if (word && row.provenance !== 'ranked') throw Error('Dictionary match has invalid provenance: ' + row.id);
  records.push({id:row.id,kind:row.kind,surface_form:row.surface_form,form_id:row.form_id,
   expression_id:row.expression_id,lexeme_id:row.lexeme_id,sense_id:row.sense_id,
   morphology:row.morphology,identity_review_status:row.identity_review_status,
   provenance:row.provenance,source_rank:row.source_rank,topic_ids:topics,
   first_shipped_lesson:row.first_shipped_lesson,subsequent_lesson_ids:row.review_lessons,
   explicit_review_lesson_ids:row.explicit_review_lesson_ids,
   dictionary_word:word ? normalize(word.word) : null,
   word_practice_key:word ? normalize(word.word) : null});
 }
 for (const word of dictionaryWords.values()) {
  const id = stableId('form',word.word);
  if (!seenIds.has(id)) throw Error('Missing dictionary / Word Practice stable ID: ' + word.word);
 }
 const scoped = new Set();
 for (const review of contextual.items) {
  const key = review.section_id + '\u0000' + review.item_id;
  const link = mappedItems.get(key);
  const global = records.find(r => r.id === link?.identity_id);
  if (!link || !global || global.kind !== 'form' || global.form_id !== review.form_id ||
      global.identity_review_status !== 'unresolved' || review.reviewed_status !== 'reviewed' ||
      !review.lexeme_id || !review.sense_id || !review.morphology || scoped.has(key)) {
   throw Error('Invalid P2 item-scoped sense review: ' + key);
  }
  scoped.add(key);
  link.context_review = {context_id:review.context_id,lexeme_id:review.lexeme_id,
   sense_id:review.sense_id,morphology:review.morphology};
 }
 const course_items = [...mappedItems.values()].map(x => ({
  ...x,lesson_ids:x.lesson_ids.sort(),review_lesson_ids:x.review_lesson_ids.sort()
 })).sort((a,b)=>a.section_id.localeCompare(b.section_id,'en') ||
                       a.item_id.localeCompare(b.item_id,'en'));
 const counts = {identity_records:records.length,
  globally_reviewed:records.filter(r => r.identity_review_status === 'reviewed').length,
  globally_unresolved:records.filter(r => r.identity_review_status === 'unresolved').length,
  dictionary_and_word_practice_forms:dictionaryWords.size,
  course_items:course_items.length,contextually_reviewed_course_items:scoped.size};
 if (counts.identity_records !== sidecar.records.length ||
     counts.globally_reviewed + counts.globally_unresolved !== counts.identity_records ||
     counts.dictionary_and_word_practice_forms !== dictionary.words.length) {
  throw Error('P2 cross-app coverage reconciliation failed');
 }
 return {schema_version:1,identity_scope:'exact_form_expression_and_explicitly_reviewed_sense_only',
  disclaimer:'Course and Word Practice share exact written form IDs, not learning progress. Unresolved forms and expressions have no inferred lexeme/sense. Scoped homograph reviews never become global identity or SRS mastery.',
  counts,records,course_items};
}

function main(args=process.argv.slice(2)) {
 const mode = args[0] || '--check';
 if (!['--check','--write'].includes(mode)) throw Error('Usage: build-p2-cross-app-index.cjs --check|--write');
 const sections = ['a1.1','a1.2','a1.3','a2.1'].flatMap(level =>
  [1,2,3,4].map(n=>'data/course/'+level+'-section-'+n+'.json')
   .filter(p=>fs.existsSync(path.join(ROOT,p))).map(read));
 const output = JSON.stringify(build(
  read('data/course/lexical-identity-sidecar.json'),
  read('data/common-words.json'),
  read('data/course/contextual-lexical-identity-map.json'),sections))+'\n';
 const dest = path.join(ROOT,OUTPUT);
 if (mode === '--write') {
  fs.writeFileSync(dest,output);
  process.stdout.write('Wrote P2 cross-app exact-form identity index.\n');
 } else if (!fs.existsSync(dest) || fs.readFileSync(dest,'utf8') !== output) {
  throw Error('P2 shared identity index stale; run npm run p2:cross-app:write');
 } else process.stdout.write('P2 shared identity index current.\n');
}
if (require.main === module) main();
module.exports = {build,main};
