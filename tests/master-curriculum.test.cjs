'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { validateMaster, validateLessonCoverage, inventory, normalizeForm } = require('../scripts/audit-master-curriculum.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');
const curriculum = JSON.parse(read('data/course/master-curriculum.json'));
const EXPECTED = ['A1.1', 'A1.2', 'A1.3', 'A2.1', 'A2.2', 'B1.1', 'B1.2', 'B2.1', 'B2.2', 'C1', 'C2'];

test('master syllabus covers exactly the intended eleven Finnish educational stages', () => {
  assert.deepEqual(curriculum.levels.map(stage => stage.level), EXPECTED);
  assert.deepEqual(curriculum.framework.canonical_cefr_levels, ['A1','A2','B1','B2','C1','C2']);
  assert.match(curriculum.framework.official_grammar_warning, /not mandatory grammar lists or word quotas/);
  assert.match(curriculum.framework.evidence_warning, /not proof of a CEFR or YKI score/);
});

test('all stage concepts form a valid forward-only grammar dependency graph', () => {
  assert.deepEqual(validateMaster(curriculum), []);
  const grammar = curriculum.levels.flatMap(stage => stage.grammar);
  assert.equal(new Set(grammar.map(item => item.id)).size, grammar.length);
  assert.ok(grammar.length >= 65);
  const known = new Set(grammar.map(item => item.id));
  for (const stage of curriculum.levels) {
    for (const item of stage.grammar) for (const dep of item.prerequisites) {
      assert.ok(known.has(dep), `${item.id} references absent concept ${dep}`);
    }
  }
});

test('all levels have substantial thematic lexical, expressions, sentence and skill plans', () => {
  for (const stage of curriculum.levels) {
    assert.equal(stage.topic_streams.length, 4);
    assert.equal(stage.modules.length, 4);
    assert.ok(stage.expressions.length >= 4);
    assert.ok(stage.sentence_patterns.length >= 4);
    for (const sentence of stage.sentence_patterns) {
      assert.ok(sentence.fi && sentence.fa);
    }
    assert.deepEqual(Object.keys(stage.skills).sort(), curriculum.skill_keys.slice().sort());
    assert.ok(stage.assessment.human_assessment_required);
  }
});

test('advisory frequency candidate windows never assert official level word quotas', () => {
  const ceilings = curriculum.levels.map(stage => stage.frequency_stream.advisory_parole_source_position_ceiling);
  const numeric = ceilings.filter(Number.isInteger);
  assert.ok(numeric.length >= 7);
  assert.ok(numeric.every((n,i) => n > 0 && (i === 0 || n > numeric[i-1])));
  assert.ok(ceilings.slice(numeric.length).every(v => v === null));
  assert.match(curriculum.lexical_policy.measurement, /Parole/);
  assert.match(curriculum.lexical_policy.ranked_vs_curated, /unranked/);
});

test('inventory distinguishes planned, shipped and source dictionary terms', () => {
  const audit = inventory(curriculum);
  const available = JSON.parse(read('data/common-words.json')).words;
  assert.equal(audit.source_vocabulary_size, available.length);
  const a11 = audit.stages.find(s => s.level === 'A1.1');
  const a12 = audit.stages.find(s => s.level === 'A1.2');
  const a13 = audit.stages.find(s => s.level === 'A1.3');
  assert.equal(a11.shipped_lesson_count, a11.authored_curriculum_lessons);
  assert.equal(a12.shipped_lesson_count, a12.authored_curriculum_lessons);
  assert.equal(a13.shipped_lesson_count, a13.authored_curriculum_lessons);
  assert.equal(a13.authored_curriculum_lessons, 40);
  assert.ok(a11.target_strings_also_in_current_dictionary <= a11.unique_curriculum_lexical_surface_targets);
  assert.ok(a12.target_strings_also_in_current_dictionary <= a12.unique_curriculum_lexical_surface_targets);
  const a21 = audit.stages.find(s=>s.level==='A2.1');
  assert.equal(a21.authored_curriculum_lessons, 40);
  assert.equal(a21.shipped_lesson_count, 10);
  assert.equal(a21.shipped_section_count, 1);
  assert.ok(audit.stages.filter(s=>!['A1.1','A1.2','A1.3','A2.1'].includes(s.level)).every(s=>s.shipped_lesson_count===0));
});

test('declared status tracks actual published coverage, not curriculum review status', () => {
  const report = inventory(curriculum);
  for (const stage of report.stages) {
    if(stage.declared_delivery_status === 'implemented') {
      assert.ok(stage.authored_curriculum_lessons > 0 && stage.shipped_lesson_count === stage.authored_curriculum_lessons);
    } else if(stage.declared_delivery_status === 'partially_implemented') {
      assert.ok(stage.shipped_lesson_count > 0 && stage.shipped_lesson_count < stage.authored_curriculum_lessons);
    } else {
      assert.equal(stage.shipped_lesson_count, 0, `${stage.level}: planned-only stage contains shipped lessons`);
    }
  }
});

test('every stage is represented consistently across human-readable maps', () => {
  const fa = read('docs/MASTER-CURRICULUM.fa.md');
  const en = read('docs/MASTER-CURRICULUM.md');
  const grammar = read('docs/GRAMMAR-ROADMAP.md');
  const vocab = read('docs/VOCABULARY-ROADMAP.md');
  for (const stage of curriculum.levels) {
    assert.ok(fa.includes(`## ${stage.level} —`));
    assert.ok(en.includes(`### ${stage.level} —`));
    assert.ok(grammar.includes(`### ${stage.level} (CEFR ${stage.cefr})`));
    assert.ok(vocab.includes(`### ${stage.level} —`));
    for (const concept of stage.grammar) {
      assert.ok(fa.includes(concept.id), `Missing Persian grammar map ${concept.id}`);
      assert.ok(grammar.includes(concept.id), `Missing grammar dependency map ${concept.id}`);
    }
  }
  const auditDoc = read('docs/CURRICULUM-AUDIT.fa.md');
  assert.match(auditDoc, /A1\.2/);
  assert.match(auditDoc, /A1\.3/);
  assert.match(auditDoc, /برنامه/);
});

test('CLI validation is runnable in --check and --json modes', () => {
  const cmd = path.join(ROOT, 'scripts/audit-master-curriculum.cjs');
  const check = execFileSync(process.execPath, [cmd, '--check'], { encoding:'utf8' });
  assert.match(check, /validated: 11 stages/);
  const report = JSON.parse(execFileSync(process.execPath, [cmd, '--json'], { encoding:'utf8' }));
  assert.equal(report.stages.length, EXPECTED.length);
});

test('new curriculum data does not redefine current Parole frequency source fields', () => {
  assert.ok(!curriculum.levels.some(stage => Object.hasOwn(stage, 'frequency_rank') || Object.hasOwn(stage, 'frequency_percent')));
  assert.ok(curriculum.lexical_policy.corpus_source.includes('Parole'));
  assert.ok(curriculum.lexical_policy.counts.includes('not claim'));
});

test('Persian lexical counts match the normalized generated inventory', () => {
  const auditDoc = read('docs/CURRICULUM-AUDIT.fa.md');
  const audit = inventory(curriculum);
  const persianDigits = (number) => String(number).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  assert.equal(normalizeForm('Suomi'), normalizeForm('suomi'));
  for (const stage of audit.stages.filter(stage => stage.authored_curriculum_lessons > 0)) {
    const expectedRow = `| ${stage.level} | ${persianDigits(stage.unique_curriculum_lexical_surface_targets)} | ${persianDigits(stage.target_strings_also_in_current_dictionary)} |`;
    assert.ok(auditDoc.includes(expectedRow), `${stage.level}: the Persian audit table diverges from the normalized source inventory: ${expectedRow}`);
  }
});

test('lesson coverage validator rejects duplicate mapped lesson IDs even when the counts match', () => {
  const planned = [{
    id: 'a1.1-s1',
    lessons: [{ id: 'a1.1-s1-l09' }, { id: 'a1.1-s1-l10' }],
  }];
  const valid = [{
    curriculum_section_id: 'a1.1-s1',
    lessons: [{ curriculum_id: 'a1.1-s1-l09' }, { curriculum_id: 'a1.1-s1-l10' }],
  }];
  assert.deepEqual(validateLessonCoverage('A1.1', 'implemented', planned, valid), []);

  const duplicated = [{
    curriculum_section_id: 'a1.1-s1',
    lessons: [{ curriculum_id: 'a1.1-s1-l09' }, { curriculum_id: 'a1.1-s1-l09' }],
  }];
  const errors = validateLessonCoverage('A1.1', 'implemented', planned, duplicated);
  assert.ok(errors.some(error => /duplicate.*a1\.1-s1-l09/i.test(error)), errors.join('\n'));
  assert.ok(errors.some(error => /missing.*a1\.1-s1-l10/i.test(error)), errors.join('\n'));
});

test('partial stages cannot silently contain duplicated IDs or the wrong section mapping', () => {
  const planned = [
    { id: 'a1.2-s1', lessons: [{ id: 'a1.2-s1-l01' }, { id: 'a1.2-s1-l02' }] },
    { id: 'a1.2-s2', lessons: [{ id: 'a1.2-s2-l01' }] },
  ];
  const legitimatePartial = [{
    curriculum_section_id: 'a1.2-s1',
    lessons: [{ curriculum_id: 'a1.2-s1-l01' }],
  }];
  assert.deepEqual(validateLessonCoverage('A1.2', 'partially_implemented', planned, legitimatePartial), []);

  const duplicatedPartial = [{
    curriculum_section_id: 'a1.2-s1',
    lessons: [{ curriculum_id: 'a1.2-s1-l01' }, { curriculum_id: 'a1.2-s1-l01' }],
  }];
  assert.ok(validateLessonCoverage('A1.2', 'partially_implemented', planned, duplicatedPartial)
    .some(error => /duplicate/i.test(error)));

  const wrongSection = [{
    curriculum_section_id: 'a1.2-s1',
    lessons: [{ curriculum_id: 'a1.2-s2-l01' }],
  }];
  assert.ok(validateLessonCoverage('A1.2', 'partially_implemented', planned, wrongSection)
    .some(error => /not planned for section/i.test(error)));
  assert.deepEqual(validateLessonCoverage('A2.1', 'planned', [], []), []);
});
