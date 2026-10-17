#!/usr/bin/env node
'use strict';
// Counts only deployed manifests as playable. Plans/outlines never confer progress.
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const ROOT = path.resolve(__dirname,'..');
const JSON_OUTPUT = 'data/course/section-structure-audit.json';
const MD_OUTPUT = 'docs/SECTION-STRUCTURE-AUDIT.md';

function build(master, stagePayloads) {
  if (!master || !Array.isArray(master.levels) || !Array.isArray(stagePayloads)) {
    throw new Error('Invalid structure audit inputs');
  }
  const stages = new Map();
  for (const stage of stagePayloads) {
    if (!stage?.level || stages.has(stage.level) || stage.curriculum?.level !== stage.level
      || !Array.isArray(stage.sections) || !Array.isArray(stage.curriculum?.sections)) {
      throw new Error('Invalid or duplicate shipped stage');
    }
    stages.set(stage.level, stage);
  }
  const levels=[], sections=[], plannedKeys = new Set();
  for (const level of master.levels) {
    if (!Array.isArray(level.modules)) throw new Error('Missing planned module list: '+level.level);
    const stage = stages.get(level.level);
    const published = new Map((stage?.sections || []).map(s=>[s.curriculum_section_id,s]));
    const contract = new Map((stage?.curriculum.sections || []).map(s=>[s.id,s]));
    if (published.size !== (stage?.sections || []).length) throw new Error('Duplicate shipped section contract IDs in '+level.level);
    let shippedLessons=0, shippedSections=0, outlined=0, plannedOnly=0, lessonOutlines=0;
    for (const module of level.modules) {
      const key=level.level+'/'+module.id;
      if (plannedKeys.has(key)) throw new Error('Repeated planned section id: '+key);
      plannedKeys.add(key);
      const raw=published.get(module.id), plan=contract.get(module.id);
      if (raw) {
        const checked=course.validateSectionAgainstCurriculum(course.validateSection(raw),stage.curriculum);
        if(checked.level !== level.level)throw new Error('Shipped section level mismatch: '+key);
        if (checked.lessons.length !== plan.lessons.length)throw new Error('Planned/shipped count mismatch: '+key);
        sections.push({level:level.level,curriculum_section_id:module.id,shipping_status:'shipped',
          shipped_section_id:checked.id,shipped_lesson_count:checked.lessons.length,
          outline_lesson_count:0});
        shippedSections++;
        shippedLessons+=checked.lessons.length;
      } else if (plan) {
        const n=Array.isArray(plan.lessons)?plan.lessons.length:0;
        sections.push({level:level.level,curriculum_section_id:module.id,shipping_status:'outline_only',
          shipped_section_id:null,shipped_lesson_count:0,outline_lesson_count:n});
        outlined++;
        lessonOutlines+=n;
      } else {
        sections.push({level:level.level,curriculum_section_id:module.id,shipping_status:'planned_only',
          shipped_section_id:null,shipped_lesson_count:0,outline_lesson_count:0});
        plannedOnly++;
      }
    }
    if(stage){
      for(const id of published.keys())if(!level.modules.some(m=>m.id===id))throw Error('Shipped section missing from master plan: '+level.level+'/'+id);
    }
    levels.push({level:level.level,delivery_status:level.delivery_status,planned_section_slots:level.modules.length,
      shipped_sections:shippedSections,shipped_lessons:shippedLessons,outline_only_sections:outlined,
      documented_unshipped_lesson_outlines:lessonOutlines,planned_only_sections:plannedOnly});
  }
  for(const level of stages.keys())if(!master.levels.some(x=>x.level===level))throw Error('Shipped stage absent from master curriculum: '+level);
  const totals={
    planned_section_slots:sections.length,
    shipped_sections:sections.filter(s=>s.shipping_status==='shipped').length,
    shipped_playable_lessons:sections.reduce((n,s)=>n+s.shipped_lesson_count,0),
    outline_only_sections:sections.filter(s=>s.shipping_status==='outline_only').length,
    documented_unshipped_lesson_outlines:sections.reduce((n,s)=>n+s.outline_lesson_count,0),
    planned_only_section_slots:sections.filter(s=>s.shipping_status==='planned_only').length,
    shipped_section_lesson_counts:sections.filter(s=>s.shipping_status==='shipped').map(s=>s.shipped_lesson_count)
  };
  return {schema_version:1,scope:'Shipped lessons are authored, playable manifests only; section plans and outlines are non-playable.',
    disclaimer:'A curriculum outline is not a completed lesson, a course score, or CEFR/YKI achievement.',
    totals,levels,sections};
}
function markdown(report) {
  const t=report.totals;
  const rows=report.levels.map(l=>'| '+l.level+' | '+l.planned_section_slots+' | '+l.shipped_sections+' | '+l.shipped_lessons+' | '+l.outline_only_sections+' | '+l.planned_only_sections+' |').join('\n');
  return '# Planned versus shipped Finnish course structure\n\n'
    +'[English delivery roadmap](ROADMAP.md) · [فارسی](ROADMAP.fa.md) · [Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [R3 #186](https://github.com/amirmojiry/finnish-learning/issues/186)\n\n'
    +'This is an automatically generated inventory. **Only shipped JSON manifests count as playable lessons.**'
    +' Design outlines are not interpreted as deployed content or learner proficiency.\n\n'
    +'## Summary\n\n| Measure | Count |\n| --- | ---: |\n'
    +'| Planned curriculum section slots | '+t.planned_section_slots+' |\n'
    +'| Shipped/playable sections | '+t.shipped_sections+' |\n'
    +'| Shipped/playable lessons | '+t.shipped_playable_lessons+' |\n'
    +'| Outline-only sections with authored non-playable lessons | '+t.outline_only_sections+' |\n'
    +'| Non-playable lesson outlines (not shipped) | '+t.documented_unshipped_lesson_outlines+' |\n'
    +'| Plan-only section slots with no shipped manifest | '+t.planned_only_section_slots+' |\n\n'
    +'## Levels\n\n| Level | Planned section slots | Shipped sections | Playable lessons | Outline-only sections | Plan-only slots |\n'
    +'| --- | ---: | ---: | ---: | ---: | ---: |\n'+rows+'\n\n'
    +'## Structural contract\n\n'
    +'- A section\'s shipped lesson count is derived from its authored ordered `lessons` and matching curriculum lessons (not a fixed 10).\n'
    +'- The final authored lesson is the checkpoint, whatever its ordinal. Its original assessment coverage is required.\n'
    +'- Progress fraction, map connectors, previous/next navigation and section unlocking continue to use the shipped lesson array.\n'
    +'- The existing fourteen shipped sections and their 140 saved lesson IDs are unchanged by this structural release.\n'
    +'- Current A2.1 Sections 3–4 remain outline-only; no third section is made playable.\n\n'
    +'Rebuild: `npm run r3:structure:write`. Validate: `npm run r3:structure:check`.\n';
}
function main(mode=process.argv[2]||'--check'){
  if(!['--check','--write','--markdown'].includes(mode))throw Error('Usage: audit-section-structure.cjs --check|--write|--markdown');
  const read=name=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
  const payloads=course.COURSE_STAGES.map(stage=>({
    level:stage.level,curriculum:read(stage.curriculumUrl.replace(/^\.\//,'')),
    sections:stage.sectionUrls.map(url=>read(url.replace(/^\.\//,'')))
  }));
  const report=build(read('data/course/master-curriculum.json'),payloads);
  const output={[JSON_OUTPUT]:JSON.stringify(report,null,2)+'\n',[MD_OUTPUT]:markdown(report)};
  if(mode==='--markdown')process.stdout.write(output[MD_OUTPUT]);
  else for(const [name,content] of Object.entries(output)){
    const file=path.join(ROOT,name);
    if(mode==='--write')fs.writeFileSync(file,content);
    else if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content)
      throw Error('Section structure snapshots stale: '+name);
  }
}
if(require.main===module)main();
module.exports={build,markdown,main};
