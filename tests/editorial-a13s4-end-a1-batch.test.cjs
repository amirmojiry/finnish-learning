'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');
const audit = require('../scripts/audit-editorial-lesson-load.cjs');
const { positives } = require('../scripts/audit-course-coverage.cjs');
const specs = [
  {
    "n": 2,
    "removed": [
      31,
      32
    ],
    "old": 33,
    "edited": 31,
    "origGraded": 22,
    "graded": 20,
    "slides": 25,
    "hash": "190a02b0",
    "reading": 0,
    "writing": 0,
    "sequence": 0
  },
  {
    "n": 3,
    "removed": [
      28,
      32,
      33,
      34
    ],
    "old": 35,
    "edited": 31,
    "origGraded": 27,
    "graded": 23,
    "slides": 20,
    "hash": "1d924189",
    "reading": 0,
    "writing": 0,
    "sequence": 1
  },
  {
    "n": 4,
    "removed": [
      29,
      30,
      31
    ],
    "old": 33,
    "edited": 30,
    "origGraded": 23,
    "graded": 20,
    "slides": 21,
    "hash": "182a1bb9",
    "reading": 0,
    "writing": 0,
    "sequence": 0
  },
  {
    "n": 5,
    "removed": [
      25,
      26,
      28,
      29
    ],
    "old": 30,
    "edited": 26,
    "origGraded": 20,
    "graded": 16,
    "slides": 19,
    "hash": "9dcb67d1",
    "reading": 0,
    "writing": 0,
    "sequence": 0
  },
  {
    "n": 6,
    "removed": [
      28
    ],
    "old": 30,
    "edited": 29,
    "origGraded": 20,
    "graded": 19,
    "slides": 19,
    "hash": "b313bd01",
    "reading": 0,
    "writing": 0,
    "sequence": 0
  },
  {
    "n": 7,
    "removed": [
      22,
      23,
      27
    ],
    "old": 29,
    "edited": 26,
    "origGraded": 20,
    "graded": 17,
    "slides": 18,
    "hash": "b442e367",
    "reading": 0,
    "writing": 0,
    "sequence": 0
  },
  {
    "n": 8,
    "removed": [
      26
    ],
    "old": 27,
    "edited": 26,
    "origGraded": 19,
    "graded": 18,
    "slides": 18,
    "hash": "fad85842",
    "reading": 0,
    "writing": 1,
    "sequence": 0
  },
  {
    "n": 9,
    "removed": [
      32
    ],
    "old": 35,
    "edited": 34,
    "origGraded": 33,
    "graded": 32,
    "slides": 24,
    "hash": "8b88969e",
    "reading": 4,
    "writing": 1,
    "sequence": 0
  }
];
const source = () => JSON.parse(fs.readFileSync(path.join(__dirname,'..','data/course/a1.3-section-4.json'),'utf8'));
const section = () => course.validateSection(source());
const scored = a => course.scoredOpportunitiesOnSlide(a) > 0;
function hash(value){let h=2166136261,t=JSON.stringify(value);for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619)>>>0;return h.toString(16).padStart(8,'0');}

test('eight A1.3 Section 4 editorial editions preserve source identity, teaching and all prepared listening/grammar',()=>{
 const raw=source(),s=section();
 assert.equal(s.lessons.length,10);assert.equal(s.lessons[0].editorial_revision,undefined);
 for(const sp of specs){
  const lesson=s.lessons[sp.n-1],saved=raw.lessons[sp.n-1];
  const original=course.lessonEditionActivities(lesson,'legacy'),edited=course.lessonEditionActivities(lesson,'editorial'),slides=course.lessonEditionSlides(lesson,'editorial');
  const indices=original.flatMap((a,i)=>sp.removed.includes(i)?[]:[i]);
  assert.equal(hash(saved.activities),sp.hash,lesson.id+': historic source changed');
  assert.equal(lesson.editorial_revision.id,'r189-a13s4-l'+String(sp.n).padStart(2,'0')+'-v1');
  assert.equal(lesson.study_pacing,undefined,'no stored paced drafts in these eight lessons');
  assert.deepEqual(lesson.editorial_revision.activity_indices,indices,lesson.id);
  assert.equal(original.length,sp.old,lesson.id);assert.equal(edited.length,sp.edited,lesson.id);
  assert.equal(original.filter(scored).length,sp.origGraded,lesson.id);assert.equal(edited.filter(scored).length,sp.graded,lesson.id);
  assert.equal(slides.length,sp.slides,lesson.id);assert.ok(slides.length<=28&&slides.length>=12,lesson.id);
  assert.deepEqual(course.flattenLessonSlides(slides),edited,lesson.id);
  indices.forEach((idx,i)=>assert.strictEqual(edited[i],original[idx],lesson.id+': original activity modified'));
  assert.ok(edited.some(a=>a.mode==='listen'),lesson.id+': listening recognition lost');
  const dict=original.filter(a=>a.type==='dictation');assert.ok(dict.length>=1,lesson.id+': no prepared dictation');
  dict.forEach(a=>assert.ok(edited.includes(a),lesson.id+': dictation lost '+a.item));
  assert.ok(edited.some(course.isProductiveCourseActivity),lesson.id+': contextual production lost');
  assert.equal(edited.filter(a=>a.type==='short-reading').length,sp.reading);
  assert.equal(edited.filter(a=>a.type==='guided-writing').length,sp.writing);
  assert.equal(edited.filter(a=>a.type==='sequence-order').length,sp.sequence);
  for(const g of lesson.learning_objectives?.grammar||[])for(const e of g.evidence||[]){
   const a=Number.isInteger(e.activity_index)?original[e.activity_index]:original.find(x=>x.type===e.activity_type&&x.item===e.item_id);
   assert.ok(a&&scored(a)&&edited.includes(a),lesson.id+': grammar evidence lost '+g.concept_id);
  }
  for(const g of (lesson.learning_objectives?.lexical||[]).filter(x=>x.status==='introduced')){
   const firstTeach=edited.findIndex(a=>a.type==='teach'&&a.item===g.target_id),firstAssess=edited.findIndex(a=>scored(a)&&positives(a).includes(g.target_id));
   assert.ok(firstTeach>=0&&firstAssess>firstTeach,lesson.id+': first teach/assessment lost '+g.target_id);
  }
 }
});

test('19 omitted Finnish typed reviews already had independent scored evidence in earlier effective lessons',()=>{
 const s=section(),report=audit.buildReport();let count=0;
 for(const sp of specs){const l=s.lessons[sp.n-1],archive=course.lessonEditionActivities(l,'legacy'),edited=course.lessonEditionActivities(l,'editorial');
  const reviewed=new Set((l.learning_objectives?.lexical||[]).filter(x=>x.status==='reviewed').map(x=>x.target_id));const deferred=new Set();
  for(const i of sp.removed){const a=archive[i];assert.equal(a.type,'type');assert.equal(a.mode,'finnish');assert.ok(reviewed.has(a.item));
   assert.ok(s.lessons.slice(0,sp.n-1).some(prev=>course.lessonEditionActivities(prev,'editorial').some(x=>scored(x)&&positives(x).includes(a.item))),l.id+': no prior effective graded practice '+a.item);
   assert.ok(!edited.some(x=>scored(x)&&positives(x).includes(a.item)),l.id+': presumed deferred item still assessed');deferred.add(a.item);count++;
  }
  const row=report.lessons.find(x=>x.lesson_id===l.id);assert.ok(row?.revised);
  assert.deepEqual(new Set(row.deferred_review_target_ids),deferred);
  assert.equal(row.original_graded_answers-row.learner_graded_answers,sp.removed.length);
 }assert.equal(count,19);
});

test('all 54 introduced targets now have later independent graded retrieval in effective lessons',()=>{
 const s=section();let checked=0;const missing=[];
 for(const [i,l] of s.lessons.entries())for(const id of l.new_targets||[]){
  assert.ok(s.lessons.slice(i+1).some(later=>later.activities.some(a=>scored(a)&&positives(a).includes(id))),l.id+': missing original later practice '+id);
  const effective=s.lessons.slice(i+1).some(later=>course.lessonEditionActivities(later,'editorial').some(a=>scored(a)&&positives(a).includes(id)));
  if(!effective)missing.push(id);
  checked++;
 }
 assert.equal(checked,54);
 // The v1.65.0 frozen checkpoint omitted the only later review for e-076.
 // Its saved drafts retain v1 while fresh starts now include index 31 in v2.
 assert.deepEqual(missing,[],'every introduced target needs later effective graded retrieval');
 const final=s.lessons[9];assert.ok(final.editorial_revision.activity_indices.includes(31));
 assert.ok(!final.editorial_revision_history[0].activity_indices.includes(31));
 const lesson8=course.lessonEditionActivities(s.lessons[7],'editorial');
 assert.ok(lesson8.some(a=>a.type==='controlled-production'&&a.item==='a13s4-e-076'));
});

test('A1.3 final checkpoint preserves 80 percent threshold and historical v1 editorial edition',()=>{
 const s=section(),cp=s.lessons[9];assert.equal(cp.editorial_revision.id,'r215-a13-s4-l10-v2');
 assert.equal(cp.editorial_revision.activity_indices.length,30);assert.equal(cp.activities.length,32);
 assert.equal(cp.editorial_revision_history[0].id,'r189-a13-s4-l10-v1');
 assert.equal(cp.editorial_revision_history[0].activity_indices.length,29);
 assert.equal(cp.study_pacing.max_slides,15);assert.equal(cp.study_pacing.max_graded,20);
 assert.equal(course.passesLessonRequirement(cp,26,32),true);assert.equal(course.passesLessonRequirement(cp,25,32),false);
 assert.equal(course.lessonEditionActivities(cp,'legacy').length,32);assert.equal(course.lessonEditionActivities(cp,'editorial').length,30);
 const l3=course.lessonEditionActivities(s.lessons[2],'editorial');assert.equal(l3.filter(a=>a.type==='sequence-order').length,1);
 for(const n of [7,8]){let l=course.lessonEditionActivities(s.lessons[n],'editorial'),w=l.filter(a=>a.type==='guided-writing');assert.equal(w.length,1);assert.equal(w[0].expected_items.length,4);}
 const integrated=s.lessons[8],edited=course.lessonEditionActivities(integrated,'editorial');assert.equal(integrated.learning_objectives.grammar.flatMap(g=>g.evidence||[]).length,12);
 for(const passage of ['a13s4-reading-1','a13s4-reading-2']){const questions=edited.filter(a=>a.type==='short-reading'&&a.item===passage);assert.equal(questions.length,2);assert.equal(new Set(questions.map(a=>a.question_item)).size,2);}
});

test('v1.66.0 bilingual release and 140-lesson audit reflect checkpoint retrieval restored',()=>{
 const root=path.join(__dirname,'..'),version=fs.readFileSync(path.join(root,'VERSION'),'utf8').trim();
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const en=fs.readFileSync(path.join(root,'README.md'),'utf8'),fa=fs.readFileSync(path.join(root,'README.fa.md'),'utf8');
 const changelog=fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8');
 assert.equal(version, '1.69.0');assert.equal(pkg.version,version);assert.match(changelog,/\[1\.66\.0\]/);
 assert.match(en,/47 curated lessons \/ 189 fewer graded opportunities/);
 assert.match(fa,/۴۷ درس بازنگری‌شده و ۱۸۹ پاسخ نمره‌دار کمتر/);
 const report=audit.buildReport();assert.equal(report.summary.shipped_lessons,140);
 assert.equal(report.summary.editorially_revised_lessons, 71);
 assert.equal(report.summary.removed_grading_opportunities, 232);
 assert.equal(report.summary.learner_lessons_exceeding_30_slides,0);
 assert.equal(audit.priorityRows(report).length, 69);
 assert.match(audit.priorityMarkdown(report),/Remaining uncurated lessons: \*\*69\*\*; all \*\*71\*\* previously curated lessons are excluded\./);
});
