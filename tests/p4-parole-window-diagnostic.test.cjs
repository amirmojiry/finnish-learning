'use strict';
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
test('TEMP P4 source window diagnostic for offline corpus review',()=>{
 const text=fs.readFileSync(path.join(__dirname,'../data/parole_frek_3.txt')).toString('latin1');
 const lines=text.split(/\r?\n/).filter(Boolean);
 process.stdout.write('\nP4_SOURCE_WINDOW_START\n'+lines.slice(400,425).map((row,i)=>`${i+401} ${row}`).join('\n')+'\nP4_SOURCE_WINDOW_END\n');
});
