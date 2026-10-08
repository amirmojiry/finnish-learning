#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MASTER_FILE = path.join(ROOT, 'data/course/master-curriculum.json');
const COURSE_DIR = path.join(ROOT, 'data/course');
const EXPECTED_LEVELS = ['A1.1', 'A1.2', 'A1.3', 'A2.1', 'A2.2', 'B1.1', 'B1.2', 'B2.1', 'B2.2', 'C1', 'C2'];
const SKILLS = ['listening', 'reading', 'spoken_interaction', 'spoken_production', 'writing', 'mediation'];

function readJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function normalizeForm(value) {
  return String(value || '').normalize('NFC').toLocaleLowerCase('fi-FI').trim();
}

function fail(errors, condition, message) {
  if (!condition) errors.push(message);
}

function validateLessonCoverage(levelName, deliveryStatus, plannedSections, shippedSections) {
  const errors = [];
  const expectedBySection = new Map();
  const expectedIds = new Set();

  for (const section of plannedSections) {
    const sectionIds = new Set();
    fail(errors, !expectedBySection.has(section.id),
      `${levelName}: duplicate planned section ID: ${section.id}`);
    for (const lesson of section.lessons || []) {
      fail(errors, !expectedIds.has(lesson.id),
        `${levelName}: duplicate planned curriculum lesson ID: ${lesson.id}`);
      expectedIds.add(lesson.id);
      sectionIds.add(lesson.id);
    }
    expectedBySection.set(section.id, sectionIds);
  }

  const actualIds = new Set();
  let shippedLessonCount = 0;
  for (const section of shippedSections) {
    const expectedInSection = expectedBySection.get(section.curriculum_section_id);
    for (const lesson of section.lessons || []) {
      const lessonId = lesson.curriculum_id;
      shippedLessonCount += 1;
      fail(errors, expectedIds.has(lessonId),
        `${levelName}: unknown shipped curriculum lesson ID: ${lessonId}`);
      fail(errors, Boolean(expectedInSection?.has(lessonId)),
        `${levelName}: lesson ${lessonId} is not planned for section ${section.curriculum_section_id}`);
      fail(errors, !actualIds.has(lessonId),
        `${levelName}: duplicate shipped curriculum lesson ID: ${lessonId}`);
      actualIds.add(lessonId);
    }
  }

  const missing = [...expectedIds].filter(id => !actualIds.has(id));
  if (deliveryStatus === 'implemented') {
    fail(errors, missing.length === 0,
      `${levelName}: missing required curriculum lesson IDs: ${missing.join(', ')}`);
    fail(errors, expectedIds.size > 0 && shippedLessonCount === expectedIds.size
      && actualIds.size === expectedIds.size,
      `${levelName}: marked implemented without all unique planned lessons`);
  } else if (deliveryStatus === 'partially_implemented') {
    fail(errors, shippedLessonCount > 0 && shippedLessonCount < expectedIds.size,
      `${levelName}: partial delivery status no longer matches shipped content`);
  } else {
    fail(errors, shippedLessonCount === 0,
      `${levelName}: planned-only stage unexpectedly has shipped lessons`);
  }
  return errors;
}

function validateMaster(master) {
  const errors = [];
  fail(errors, master.schema_version === 1, 'Master schema_version must be 1');
  fail(errors, master.status === 'design_baseline_not_runtime_course', 'Master is a planning baseline, not a runtime course');
  fail(errors, JSON.stringify(master.framework?.canonical_cefr_levels) === JSON.stringify(['A1','A2','B1','B2','C1','C2']), 'Canonical CEFR levels changed');
  fail(errors, JSON.stringify(master.framework?.project_level_order) === JSON.stringify(EXPECTED_LEVELS), 'Unexpected stage order');
  fail(errors, JSON.stringify(master.skill_keys) === JSON.stringify(SKILLS), 'Missing skill dimensions');
  fail(errors, Array.isArray(master.sources) && master.sources.length >= 4, 'Primary source references missing');
  const sourceIds = new Set();
  for (const source of master.sources || []) {
    fail(errors, /^https:\/\//.test(source.url || '') && source.name && source.role, `Incomplete source citation: ${source.id}`);
    fail(errors, !sourceIds.has(source.id), `Duplicate source ID: ${source.id}`);
    sourceIds.add(source.id);
  }
  const levels = Array.isArray(master.levels) ? master.levels : [];
  fail(errors, JSON.stringify(levels.map(level => level.level)) === JSON.stringify(EXPECTED_LEVELS), 'Exactly eleven ordered project stages are required');
  const seenGrammar = new Map();
  const seenModules = new Set();
  levels.forEach((level, levelIndex) => {
    const cefr = level.level.match(/^[ABC][12]/)?.[0];
    fail(errors, level.cefr === cefr, `${level.level}: incorrect CEFR parent`);
    fail(errors, level.outcome_fa && level.outcome_en && level.title_fa, `${level.level}: missing communicative outcome`);
    fail(errors, ['implemented','partially_implemented','planned'].includes(level.delivery_status), `${level.level}: invalid delivery status`);
    fail(errors, Array.isArray(level.grammar) && level.grammar.length >= 5, `${level.level}: insufficient grammar scope`);
    fail(errors, Array.isArray(level.review_grammar), `${level.level}: missing grammar recycling`);
    fail(errors, Array.isArray(level.modules) && level.modules.length === 4, `${level.level}: four proposed modules required`);
    fail(errors, Array.isArray(level.topic_streams) && level.topic_streams.length >= 4, `${level.level}: topic samples missing`);
    fail(errors, Array.isArray(level.expressions) && level.expressions.length >= 4, `${level.level}: expression examples missing`);
    fail(errors, Array.isArray(level.sentence_patterns) && level.sentence_patterns.length >= 4, `${level.level}: bilingual sentence patterns missing`);
    for (const name of SKILLS) fail(errors, typeof level.skills?.[name] === 'string' && level.skills[name].length > 12, `${level.level}: missing ${name} can-do`);
    fail(errors, level.assessment?.task_fa && level.assessment.human_assessment_required === true, `${level.level}: authentic assessment note missing`);
    fail(errors, JSON.stringify(level.assessment?.coverage) === JSON.stringify(SKILLS), `${level.level}: assessment skill coverage missing`);
    fail(errors, level.frequency_stream?.selection_policy_fa && Object.hasOwn(level.frequency_stream, 'advisory_parole_source_position_ceiling'), `${level.level}: corpus vs curated policy missing`);
    if (level.curriculum_file) {
      const filepath = path.join(ROOT, level.curriculum_file);
      fail(errors, fs.existsSync(filepath), `${level.level}: missing declared curriculum file`);
      if (fs.existsSync(filepath)) {
        const curriculum = readJson(filepath);
        fail(errors, curriculum.level === level.level, `${level.level}: attached curriculum level mismatch`);
        fail(errors, JSON.stringify(curriculum.sections.map(s => s.id)) === JSON.stringify(level.modules.map(m => m.id)), `${level.level}: module IDs diverge from reviewed curriculum`);
      }
    } else {
      fail(errors, level.delivery_status === 'planned', `${level.level}: without an authored curriculum the stage must remain planned`);
    }
    // Validate actual shipped section files against declared level contracts.
    const levelPrefix = level.level.toLowerCase().replace('.', '\\.');
    const shippedFiles = fs.readdirSync(COURSE_DIR).filter(name =>
      new RegExp('^' + levelPrefix + '-section-[0-9]+\\.json$').test(name));
    const shippedSections = shippedFiles.map(name => readJson(path.join(COURSE_DIR, name)));
    const expectedModuleIds = new Set((level.modules || []).map(module => module.id));
    const declaredSections = level.curriculum_file && fs.existsSync(path.join(ROOT, level.curriculum_file))
      ? readJson(path.join(ROOT, level.curriculum_file)).sections
      : [];
    const shippedIds = new Set();
    for (const shipped of shippedSections) {
      fail(errors, expectedModuleIds.has(shipped.curriculum_section_id),
        level.level + ': shipped section missing from master modules: ' + shipped.curriculum_section_id);
      fail(errors, !shippedIds.has(shipped.curriculum_section_id),
        level.level + ': duplicate shipped section: ' + shipped.curriculum_section_id);
      shippedIds.add(shipped.curriculum_section_id);
    }
    errors.push(...validateLessonCoverage(
      level.level, level.delivery_status, declaredSections, shippedSections,
    ));
    for (const module of level.modules || []) {
      fail(errors, new RegExp('^' + level.level.toLowerCase().replace('.', '\\.') + '-s[1-4]$').test(module.id)
        && module.title_fa && module.can_do_fa, level.level + ': invalid module ID/content ' + module.id);
      fail(errors, !seenModules.has(module.id), 'Duplicate module ID: ' + module.id);
      seenModules.add(module.id);
    }
    for (const topic of level.topic_streams || []) {
      fail(errors, topic.id && topic.title_fa && Array.isArray(topic.samples) && topic.samples.length >= 3, `${level.level}: missing topic samples`);
      fail(errors, (topic.samples || []).every(x => typeof x === 'string' && x.trim()), `${level.level}: empty Finnish topic sample`);
    }
    for (const pattern of level.sentence_patterns || []) {
      fail(errors, pattern.fi && pattern.fa, `${level.level}: bilingual sentence pattern missing`);
    }
    for (const grammar of level.grammar || []) {
      fail(errors, /^[a-z][a-z0-9-]*$/.test(grammar.id || '') && grammar.title_fa && grammar.title_en, `${level.level}: invalid grammar entry ${grammar.id}`);
      fail(errors, !seenGrammar.has(grammar.id), `Duplicate grammar ID: ${grammar.id}`);
      for (const dependency of grammar.prerequisites || []) {
        fail(errors, seenGrammar.has(dependency), `${level.level}: prerequisite must be previously introduced: ${dependency}`);
      }
      seenGrammar.set(grammar.id, levelIndex);
    }
    for (const reviewed of level.review_grammar || []) {
      fail(errors, seenGrammar.has(reviewed) && seenGrammar.get(reviewed) < levelIndex, `${level.level}: review must refer to a previous stage: ${reviewed}`);
    }
  });
  fail(errors, master.lexical_policy?.ranked_vs_curated && master.lexical_policy?.measurement, 'Ranked/curated distinction or corpus-coverage caveat missing');
  return errors;
}

function inventory(master) {
  const vocabulary = readJson(path.join(ROOT, 'data/common-words.json')).words;
  const dictionary = new Set(vocabulary.map(entry => normalizeForm(entry.word)));
  const files = fs.readdirSync(COURSE_DIR);
  const stages = master.levels.map(level => {
    const prefix = level.level.toLowerCase();
    const authored = files.filter(file => new RegExp('^'+prefix.replace('.','\\.')+'-section-[0-9]+\\.json$').test(file)).map(file => readJson(path.join(COURSE_DIR,file)));
    const curriculum = level.curriculum_file ? readJson(path.join(ROOT, level.curriculum_file)) : null;
    const plannedLessons = curriculum?.sections.flatMap(section => section.lessons) || [];
    const words = new Set(plannedLessons.flatMap(lesson => [...lesson.high_frequency_targets, ...lesson.topic_targets]).map(normalizeForm));
    const implementedIds = new Set(authored.map(s => s.curriculum_section_id));
    const plannedIds = curriculum ? curriculum.sections.map(s => s.id) : level.modules.map(m => m.id);
    const seenLessons = authored.flatMap(s => s.lessons);
    const linkedIds = new Set(seenLessons.map(l => l.curriculum_id));
    return {
      level:level.level,
      cefr:level.cefr,
      declared_delivery_status:level.delivery_status,
      planned_module_count:level.modules.length,
      authored_curriculum_sections:curriculum?.sections.length || 0,
      authored_curriculum_lessons:plannedLessons.length,
      shipped_section_count:authored.length,
      shipped_lesson_count:seenLessons.length,
      missing_section_ids:plannedIds.filter(id=>!implementedIds.has(id)),
      authored_curriculum_lesson_ids_missing_implementation:plannedLessons.filter(l=>!linkedIds.has(l.id)).map(l=>l.id),
      unique_curriculum_lexical_surface_targets:words.size,
      target_strings_also_in_current_dictionary:[...words].filter(x=>dictionary.has(x)).length,
      expression_examples_planned:new Set(plannedLessons.flatMap(l=>l.expressions)).size,
    };
  });
  return {schema_version:1,source_vocabulary_size:vocabulary.length,source_vocabulary_distinct_forms:dictionary.size,stages};
}

function toMarkdown(report) {
  const rows = report.stages.map(row =>
    `| ${row.level} | ${row.authored_curriculum_lessons || '—'} | ${row.shipped_lesson_count} | ${row.missing_section_ids.length} | ${row.unique_curriculum_lexical_surface_targets || '—'} |`);
  return [
    '# Course-content implementation inventory',
    '',
    'Generated by: node scripts/audit-master-curriculum.cjs --markdown',
    'Counts distinguish curriculum planning from content implemented in the app.',
    `Available dictionary: ${report.source_vocabulary_size} Parole-backed surface-form entries; not a CEFR vocabulary estimate.`,
    '',
    '| Level | Planned curriculum lessons | Implemented lesson records | Missing module implementations | Unique listed lexical targets |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
    'An exact match with the 400-word dictionary only means a matching written surface form is available; it does not mean it is taught, learned or mastered.',
    'No stage beyond the existing authored curricula has actual lessons; the 4-module roadmap alone does not imply 40 playable lessons.'
  ].join('\n') + '\n';
}

function main(args=process.argv.slice(2)) {
  const master=readJson(MASTER_FILE);
  const errors=validateMaster(master);
  if(errors.length) {
    process.stderr.write(errors.map(error=>`ERROR: ${error}`).join('\n')+'\n');
    process.exitCode=1;
    return;
  }
  const report=inventory(master);
  const mode=args[0] || '--summary';
  if(mode==='--json') process.stdout.write(JSON.stringify(report,null,2)+'\n');
  else if(mode==='--markdown') process.stdout.write(toMarkdown(report));
  else if(mode==='--check') process.stdout.write('Master curriculum validated: 11 stages, grammar dependency graph, skills, modules and authored A1 references.\n');
  else if(mode==='--summary') process.stdout.write(toMarkdown(report));
  else {process.stderr.write('Usage: node scripts/audit-master-curriculum.cjs [--check|--json|--markdown|--summary]\n');process.exitCode=2;}
}

if(require.main===module)main();
module.exports={validateMaster,validateLessonCoverage,inventory,toMarkdown,normalizeForm};
