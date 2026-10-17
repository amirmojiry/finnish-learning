'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const audit=require('../scripts/audit-section-structure.cjs');
const course=require('../course.js');
const root=path.resolve(__dirname,'..');
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const master=read('data/course/master-curriculum.json');
const stages=course.COURSE_STAGES.map(stage=>({
  level:stage.level,curriculum:read(stage.curriculumUrl.replace(/^\.\//,'')),
  sections:stage.sectionUrls.map(url=>read(url.replace(/^\.\//,'')))
}));

test('planned curriculum slots never inflate playable section/lesson inventory',()=>{
 const result=audit.build(master,stages);
 const t=result.totals;
 assert.equal(t.planned_section_slots,44);
 assert.equal(t.shipped_sections,14);
 assert.equal(t.shipped_playable_lessons,140);
 assert.equal(t.outline_only_sections,2);
 assert.equal(t.documented_unshipped_lesson_outlines,20);
 assert.equal(t.planned_only_section_slots,28);
 assert.equal(t.shipped_section_lesson_counts.length,14);
 assert.ok(t.shipped_section_lesson_counts.every(n=>n===10));
 assert.equal(t.shipped_sections+t.outline_only_sections+t.planned_only_section_slots,t.planned_section_slots);
 const a21=result.sections.filter(s=>s.level==='A2.1');
 assert.deepEqual(a21.map(s=>s.shipping_status),['shipped','shipped','outline_only','outline_only']);
 assert.ok(a21.slice(2).every(s=>s.shipped_lesson_count===0 && s.outline_lesson_count===10));
 assert.deepEqual(read('data/course/section-structure-audit.json'),result);
 assert.equal(fs.readFileSync(path.join(root,'docs/SECTION-STRUCTURE-AUDIT.md'),'utf8'),audit.markdown(result));
});

test('changing a shipped manifest changes the recorded playable count, without changing plan-only slots',()=>{
 const modified=structuredClone(stages);
 const target=modified[0].sections[0],plan=modified[0].curriculum.sections[0];
 target.lessons=[...target.lessons.slice(0,6),target.lessons.at(-1)];
 plan.lessons=[...plan.lessons.slice(0,6),plan.lessons.at(-1)];
 target.lessons.at(-1).order=7;
 plan.lessons.at(-1).order=7;
 target.lessons.at(-1).recycle_from=[];
 plan.lessons.at(-1).recycle_from=[];
 const report=audit.build(master,modified);
 assert.equal(report.totals.shipped_playable_lessons,137);
 assert.equal(report.totals.planned_section_slots,44);
 assert.equal(report.totals.outline_only_sections,2);
 assert.equal(report.sections[0].shipped_lesson_count,7);
 assert.equal(report.sections[0].shipping_status,'shipped');
});

test('audit refuses unknown shipped sections, missing stages and disconnected plans',()=>{
 const rogue=structuredClone(stages);
 rogue[0].sections[0].curriculum_section_id='no-plan';
 assert.throws(()=>audit.build(master,rogue),/missing from the curriculum/i);
 const missing=structuredClone(stages);
 missing[0].sections[0].lessons.pop();
 assert.throws(()=>audit.build(master,missing),/checkpoint|count/i);
 const badMaster=structuredClone(master);
 badMaster.levels[0].modules.push({...badMaster.levels[0].modules[0]});
 assert.throws(()=>audit.build(badMaster,stages),/Repeated planned section id/);
});

test('all stored runtime stage URLs match shipped audit entries, never future-only outlines',()=>{
 const report=audit.build(master,stages),shipped=report.sections.filter(s=>s.shipping_status==='shipped');
 const config=course.COURSE_STAGES.flatMap(stage=>stage.sectionUrls);
 assert.equal(config.length,shipped.length);
 for(const section of shipped){
   assert.ok(stages.find(stage=>stage.level===section.level)?.sections.some(raw=>raw.id===section.shipped_section_id));
   assert.ok(section.shipped_lesson_count>0);
 }
 assert.equal(course.COURSE_STAGES.find(stage=>stage.level==='A2.1').sectionUrls.length,2);
});
