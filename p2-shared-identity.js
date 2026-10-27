(function attachP2Identity(root,factory) {
 const api = factory();
 if (typeof module === 'object' && module.exports) module.exports = api;
 if (root) root.FinnishP2Identity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createP2Identity() {
 'use strict';
 const normalize = value => String(value || '').normalize('NFC').toLocaleLowerCase('fi-FI').trim();
 const stableId = (kind,value) => kind + ':' + [...normalize(value)]
   .map(c => c.codePointAt(0).toString(16)).join('-');
 let pendingLoad = null;

 // Only manually reviewed global or exact Course-item contextual senses can be exposed.
 // No shared progress score is created: SRS and Course history remain distinct.
 function hydrate(data) {
  if (data?.identity_scope === 'compact_exact_forms_and_reviewed_context_only') {
   if (data.schema_version !== 1 || !Array.isArray(data.rows) || !Array.isArray(data.links))
    throw Error('Invalid compact P2 identity index');
   const records = data.rows.map(row => {
    if (!Array.isArray(row) || row.length !== 7 || ![0,1].includes(row[0]) ||
        ![0,1].includes(row[3]) || !Array.isArray(row[4]) ||
        !Array.isArray(row[6]) || (row[2] !== null &&
        (!Array.isArray(row[2]) || row[2].length !== 3))) {
     throw Error('Malformed compact P2 identity record');
    }
    const kind=row[0] === 0 ? 'form' : 'expression',surface=normalize(row[1]),id=stableId(kind,surface);
    if (row[3] === 1 && kind !== 'form') throw Error('Expressions cannot inherit SRS identity');
    return {id,kind,surface_form:surface,form_id:kind === 'form' ? id : null,
     expression_id:kind === 'expression' ? id : null,
     lexeme_id:row[2]?.[0] || null,sense_id:row[2]?.[1] || null,
     morphology:row[2]?.[2] || null,
     identity_review_status:row[2] ? 'reviewed' : 'unresolved',
     topic_ids:row[4],first_shipped_lesson:row[5],
     explicit_review_lesson_ids:row[6],
     dictionary_word:row[3] ? surface : null,word_practice_key:row[3] ? surface : null};
   });
   const course_items=data.links.map(link => {
    if (!Array.isArray(link) || link.length !== 4 ||
        !Number.isInteger(link[2]) || link[2] < 0 || link[2] >= records.length ||
        (link[3] !== null && (!Array.isArray(link[3]) || link[3].length !== 4))) {
     throw Error('Malformed compact P2 Course-item link');
    }
    return {section_id:link[0],item_id:link[1],identity_id:records[link[2]].id,
     context_review:link[3] ? {context_id:link[3][0],lexeme_id:link[3][1],
      sense_id:link[3][2],morphology:link[3][3]} : null};
   });
   data={schema_version:1,identity_scope:'exact_form_expression_and_explicitly_reviewed_sense_only',
    counts:data.counts,records,course_items};
  }
  if (data?.schema_version !== 1 ||
      data.identity_scope !== 'exact_form_expression_and_explicitly_reviewed_sense_only' ||
      !Array.isArray(data.records) || !Array.isArray(data.course_items)) throw Error('Invalid P2 identity index');
  const records = new Map(), course = new Map();
  for (const r of data.records) {
   if (!r || !['form','expression'].includes(r.kind) ||
       r.id !== stableId(r.kind,r.surface_form) || records.has(r.id) ||
       r.form_id !== (r.kind === 'form' ? r.id : null) ||
       r.expression_id !== (r.kind === 'expression' ? r.id : null)) {
    throw Error('Conflicting P2 stable form or expression');
   }
   if (r.identity_review_status !== 'reviewed' &&
       (r.identity_review_status !== 'unresolved' ||
        r.lexeme_id !== null || r.sense_id !== null || r.morphology !== null)) {
    throw Error('Unreviewed P2 sense must be null');
   }
   if (r.identity_review_status === 'reviewed' &&
       (!r.lexeme_id || !r.sense_id || !r.morphology)) throw Error('Incomplete reviewed P2 sense');
   if (r.dictionary_word !== null && (r.kind !== 'form' ||
       normalize(r.dictionary_word) !== r.surface_form ||
       r.word_practice_key !== r.dictionary_word)) throw Error('Unsafe Word Practice identity');
   records.set(r.id,r);
  }
  for (const link of data.course_items) {
   if (!link?.section_id || !link.item_id || !records.has(link.identity_id)) {
    throw Error('Stale P2 authored item link');
   }
   const key = link.section_id + '\u0000' + link.item_id;
   if (course.has(key)) throw Error('Duplicate P2 authored item link');
   const record = records.get(link.identity_id);
   if (link.context_review &&
       (record.kind !== 'form' || record.identity_review_status !== 'unresolved' ||
        !link.context_review.context_id || !link.context_review.lexeme_id ||
        !link.context_review.sense_id || !link.context_review.morphology)) {
    throw Error('Unsafe scoped homograph identity');
   }
   course.set(key,link);
  }
  function decorate(record,link=null) {
   if (!record) return null;
   const scoped = link?.context_review || null;
   const global = record.identity_review_status === 'reviewed';
   return {id:record.id,kind:record.kind,surface_form:record.surface_form,
    form_id:record.form_id,expression_id:record.expression_id,
    topic_ids:record.topic_ids,first_shipped_lesson:record.first_shipped_lesson,
    explicit_review_lesson_ids:record.explicit_review_lesson_ids,
    dictionary_word:record.dictionary_word,word_practice_key:record.word_practice_key,
    identity_review_status:global ? 'reviewed' : scoped ? 'reviewed_context_only' : 'unresolved',
    review_scope:scoped ? 'course_item' : global ? 'global' : 'unresolved',
    lexeme_id:scoped?.lexeme_id || (global ? record.lexeme_id : null),
    sense_id:scoped?.sense_id || (global ? record.sense_id : null),
    morphology:scoped?.morphology || (global ? record.morphology : null),
    course_item_id:link?.item_id || null,section_id:link?.section_id || null};
  }
  return {
   counts:data.counts,
   courseItem:(sectionId,itemId) => {
    const link=course.get(String(sectionId)+'\u0000'+String(itemId));
    return link ? decorate(records.get(link.identity_id),link) : null;
   },
   dictionaryWord:word => {
    const name=normalize(word),record=records.get(stableId('form',name));
    return record?.dictionary_word === name ? decorate(record) : null;
   },
   wordPracticeWord:word => {
    const name=normalize(word),record=records.get(stableId('form',name));
    return record?.word_practice_key === name ? decorate(record) : null;
   },
   expression:phrase => decorate(records.get(stableId('expression',phrase))),
  };
 }
 function load(windowObject) {
  if (!windowObject?.fetch) return Promise.resolve(null);
  if (!pendingLoad) {
   const version=windowObject.document?.querySelector('meta[name="app-version"]')?.content || '1';
   pendingLoad=windowObject.fetch('./data/course/p2-cross-app-runtime.json?v='+encodeURIComponent(version),
     {cache:'no-store'})
    .then(response=>{if(!response.ok)throw Error(String(response.status));return response.json();})
    .then(hydrate).catch(()=>null); // Legacy/offline views continue without the optional index.
  }
  return pendingLoad;
 }
 return {normalize,stableId,hydrate,load};
});
