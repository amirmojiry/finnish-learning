'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const load=name=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
const normalize=x=>String(x).normalize('NFC').toLocaleLowerCase('fi-FI').trim();
const token=(word,example)=>{
 const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return new RegExp('(^|[^\\p{L}\\p{N}])'+escaped+'(?=$|[^\\p{L}\\p{N}])','iu').test(example);
};
test('P4 first contiguous batch retains original Parole frequencies and bilingual curation',()=>{
 const batch=load('data/vocabulary-details/401-425.json');
 const words=load('data/common-words.json').words;
 const sourceRows=fs.readFileSync(path.join(ROOT,'data/parole_frek_3.txt')).toString('latin1').split(/\r?\n/).filter(Boolean);
 const start=words.length-batch.length;
 assert.equal(batch.length,25);
 assert.equal(start,400);
 assert.equal(new Set(words.map(x=>normalize(x.word))).size,words.length);
 for(let i=0;i<batch.length;i++){
  const form=batch[i],entry=words[start+i];
  const matched=sourceRows[start+i].match(/^(\d+)\s+(\d+)\s+(.+?)\s+\((\S+)\s+%\)$/);
  assert.ok(matched,'original row is parsable '+(start+i+1));
  assert.equal(entry.position,start+i+1);
  assert.equal(entry.rank,start+i+1);
  assert.equal(entry.frequency_rank,Number(matched[1]));
  assert.equal(entry.frequency_count,Number(matched[2]));
  assert.equal(normalize(entry.word),normalize(matched[3]));
  assert.equal(entry.frequency_percent,Number(matched[4]));
  for(const key of ['translation_fa','part_of_speech','part_of_speech_fa','lemma',
    'example_fi','example_fa','example_2_fi','example_2_fa']){
    assert.ok(String(form[key]||'').trim(),entry.word+' '+key);
    assert.equal(entry[key],form[key]);
  }
  assert.ok(token(form.word,form.example_fi),form.word+' missing in first example');
  assert.ok(token(form.word,form.example_2_fi),form.word+' missing in second example');
 }
});
test('new UD example translations are checked in as local Persian strings',()=>{
 const t=load('data/corpus-example-translations-fa.json');
 assert.equal(t.example_count,Object.keys(t.translations).length);
 for(const id of ['tdt:train:t025.5','tdt:train:u048.11','tdt:train:wn085.16']){
  assert.ok(t.translations[id]?.trim(),'Missing actual corpus sentence translation: '+id);
 }
});
