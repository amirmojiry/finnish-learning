'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {plan,toMarkdown}=require('../scripts/plan-parole-expansion.cjs');
const {sourceRows}=require('../scripts/audit-course-coverage.cjs');
const ROOT=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
test('P4 queue is original-Parole-backed and excludes existing dictionary forms',()=>{
 const dictionary=read('data/common-words.json');
 const output=plan(read('data/course/coverage-audit.json'),dictionary,sourceRows());
 const installed=new Set(dictionary.words.map(w=>w.word.normalize('NFC').toLocaleLowerCase('fi-FI').trim()));
 const original=sourceRows().forms;
 assert.equal(output.installed_dictionary_forms,dictionary.words.length);
 assert.equal(output.source_backed_gap_count,334);
 assert.ok(output.shortlisted_source_backed.every(x=>!installed.has(x.form)));
 for(const e of output.shortlisted_source_backed){
  assert.equal(e.source_position,original.get(e.form).position);
  assert.equal(e.source_frequency_rank,original.get(e.form).frequency_rank);
  assert.equal(e.editorial_status,'pending_review');
 }
 assert.equal(new Set(output.shortlisted_source_backed.map(x=>x.form)).size,output.shortlisted_source_backed.length);
 assert.equal(output.proposed_next_source_window.first_source_position,dictionary.words.length+1);
 assert.equal(output.proposed_next_source_window.last_source_position,dictionary.words.length+25);
 assert.match(toMarkdown(output),/consecutive-source builder/);
});
test('P4 planner rejects fabricated source positions and invalid duplicate gaps',()=>{
 const gaps={gaps:{lexical_forms_outside_dictionary:[{surface_form:'la',source_position:123,source_frequency_rank:123,
  category:'parole_source_outside_curated_dictionary',authored_target_placements:2}]}};
 assert.throws(()=>plan(gaps,{words:[]},{forms:new Map()}),/provenance mismatch/);
 const double={gaps:{lexical_forms_outside_dictionary:[{surface_form:'hello',category:'curated_unranked'},{
  surface_form:'HELLO',category:'curated_unranked'}]}};
 assert.throws(()=>plan(double,{words:[]},{forms:new Map()}),/Duplicate\/invalid/);
});
