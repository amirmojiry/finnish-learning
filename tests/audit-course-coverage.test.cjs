'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const course=require('../course.js');
const audit=require('../scripts/audit-course-coverage.cjs');
const ROOT=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(ROOT,name),'utf8'));
const master=read('data/course/master-curriculum.json');
const stages=audit.loadStages(master);
const prepared=course.validateImplementedPath(stages);
const report=audit.build(master,prepared,read('data/common-words.json'),audit.sourceRows());

test('audit discovers shipped stages rather than planned-only future lessons',()=>{
  assert.deepEqual(stages.map(s=>s.level),course.COURSE_STAGES.map(s=>s.level));
  assert.equal(stages.length,4);
  assert.equal(prepared.length,14);
  assert.equal(report.summary.shipped_sections,14);
  assert.equal(report.summary.shipped_lessons,140);
  assert.equal(report.lessons.length,140);
  assert.equal(new Set(report.lessons.map(x=>x.id)).size,140);
  assert.equal(report.summary.dictionary_ranked_surface_entries,read('data/common-words.json').words.length);
});

test('audit counts runtime-injected graded activities rather than authored placeholders',()=>{
  const actual=prepared.flatMap(section=>section.lessons.flatMap(lesson=>lesson.activities));
  assert.equal(report.summary.graded_activity_slots,actual.filter(a=>a.type!=='teach'&&a.type!=='number-grid').length);
  assert.ok(actual.some(a=>a.type==='production'));
  assert.ok(actual.some(a=>a.type==='dictation'));
  assert.ok(report.summary.graded_grammar_related_slots>0);
});

test('graded correct answers exclude distractors, reading passages and teaching-only exposures',()=>{
  const s={items:{right:{surface_form:'oikea'},wrong:{surface_form:'väärä'},text:{surface_form:'lause'}}};
  const lesson={curriculum_target_refs:{high_frequency:['right','wrong'],topic:[],expressions:[]},new_targets:['wrong'],
    activities:[
      {type:'teach',item:'wrong'},
      {type:'choice',mode:'meaning',item:'right',options:['right','wrong']},
      {type:'short-reading',item:'text',question_item:'right',options:['right','wrong']},
    ]};
  const ev=audit.evidence(s,lesson);
  assert.deepEqual(ev.correct,['oikea']);
  assert.deepEqual(ev.declared_unassessed,['väärä']);
  assert.deepEqual(ev.teach_only,['väärä']);
  assert.deepEqual(ev.reading_only,['lause']);
  assert.deepEqual(ev.distractor_only,[]);
  assert.equal(ev.grammar_slots,0);
});

test('unusual graded activity schemas use the real correct-answer references',()=>{
  assert.deepEqual(audit.positives({type:'event-time-match',event_item:'event',time_item:'time',
    options:['wrong','time']}),['time']);
  assert.deepEqual(audit.positives({type:'prompt-choice',prompt_item:'prompt',answer_item:'reply',
    options:['wrong','reply']}),['reply']);
  assert.deepEqual(audit.positives({type:'sequence-order',items:['ma','ti','ke'],
    answer_order:[0,1,2]}),['ma','ti','ke']);
  assert.deepEqual(audit.positives({type:'number-grid',items:['one','two']}),[]);
  const s={items:{event:{surface_form:'tapahtuma'},time:{surface_form:'maanantai'},
    reply:{surface_form:'kyllä'},prompt:{surface_form:'kysymys'},wrong:{surface_form:'ei'},
    ma:{surface_form:'maanantai'},ti:{surface_form:'tiistai'},ke:{surface_form:'keskiviikko'}}};
  const lesson={curriculum_target_refs:{high_frequency:['time','ti','ke'],topic:[],expressions:[]},activities:[
    {type:'event-time-match',event_item:'event',time_item:'time',options:['time','wrong']},
    {type:'prompt-choice',prompt_item:'prompt',answer_item:'reply',options:['reply','wrong']},
    {type:'sequence-order',items:['ma','ti','ke'],answer_order:[0,1,2]},
    {type:'number-grid',items:['ma','ti','ke']},
  ]};
  const ev=audit.evidence(s,lesson);
  assert.deepEqual(ev.declared_unassessed,[]);
  assert.deepEqual(ev.correct,['keskiviikko','kyllä','maanantai','tiistai']);
  assert.ok(!ev.correct.includes('ei'));
});

test('audit follows source-backed Parole positions and never synthesizes a rank',()=>{
  const p=audit.sourceRows();
  assert.ok(p.positions>=read('data/common-words.json').words.length);
  assert.equal(p.forms.get('olla')?.frequency_rank!=null,true);
  const gaps=report.gaps.lexical_forms_outside_dictionary;
  assert.ok(gaps.every(x=>x.source_position===null||Number.isInteger(x.source_position)));
  assert.ok(gaps.every(x=>x.source_frequency_rank===null||Number.isInteger(x.source_frequency_rank)));
  assert.ok(gaps.every(x=>x.category==='not_in_original_parole'||x.category==='parole_source_outside_curated_dictionary'));
  assert.equal(report.summary.lexical_forms_missing_dictionary,gaps.length);
});

test('explicit grammar mapping is separate from a prose note and structure exercises',()=>{
  assert.ok(report.lessons.every(l=>typeof l.grammar.note_present==='boolean'));
  assert.ok(report.lessons.every(l=>l.grammar.evidence_status!=='mastered'));
  assert.equal(report.summary.grammar_concepts_with_explicit_lesson_ids,
    report.summary.grammar_concepts_planned_for_shipped_levels-
      report.gaps.grammar_concepts_without_lesson_ids.length);
  assert.equal(report.gaps.unresolved_grammar_dependencies.length,0);
});

test('audit distinguishes unverified lemma metadata, expressions and editorial senses',()=>{
  const s=report.summary;
  assert.ok(s.distinct_authored_lexical_surfaces>0);
  assert.ok(s.distinct_authored_expressions>0);
  assert.ok(s.lexical_target_placements>=s.distinct_authored_lexical_surfaces);
  assert.equal(s.reviewed_sense_ids_present,0);
  assert.match(report.methodology.lemma,/unverified/);
  assert.match(report.disclaimer,/NOT learner proficiency/);
});

test('static report emits a complete per-lesson machine contract and linked human-readable synopsis',()=>{
  const ids=new Set(report.lessons.map(l=>l.id));
  for(const row of report.gaps.lessons_with_unassessed_declared_targets){
    assert.ok(ids.has(row.lesson_id));
    assert.ok(row.forms.length>=1);
  }
  for(const row of report.lessons){
    assert.ok(row.can_do_fa&&row.curriculum_id&&row.section_id);
    assert.ok(Array.isArray(row.lexical.correct_answer));
    assert.equal(row.lexical.high_frequency_target_forms.length,row.target_counts.high_frequency);
    assert.equal(row.lexical.topic_target_forms.length,row.target_counts.topic);
    assert.equal(row.lexical.expression_target_forms.length,row.target_counts.expressions);
    assert.ok(Array.isArray(row.lexical.authored_new_forms));
    assert.ok(Array.isArray(row.grammar.prerequisite_concept_ids));
    assert.ok(row.grammar.structured_or_morphology_slots>=0);
  }
  const text=audit.toMarkdown(report);
  assert.match(text,/# Course lexical and grammar audit/);
  assert.match(text,/planned grammar concepts/i);
  assert.match(text,/140 shipped lessons/);
  assert.doesNotMatch(text,/140 mastered lessons/);
});
