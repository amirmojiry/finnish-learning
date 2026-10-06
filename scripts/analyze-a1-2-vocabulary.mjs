import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CURRICULUM_PATH = path.join(ROOT, 'data', 'course', 'a1.2-curriculum.json');
const VOCABULARY_PATH = path.join(ROOT, 'data', 'common-words.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'course', 'a1.2-vocabulary-gap.json');
const PAROLE_LINE = /^(\d+)\s+(\d+)\s+(.+?)\s+\((\S+)\s+%\)$/;

function normalize(value) {
  return String(value).normalize('NFC').toLocaleLowerCase('fi-FI').trim();
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readParoleRows(sourceFile) {
  const bytes = await fs.readFile(path.join(ROOT, sourceFile));
  return bytes
    .toString('latin1')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      const match = line.match(PAROLE_LINE);
      if (!match) throw new Error(`Cannot parse Parole row ${index + 1}: ${line}`);
      return {
        source_position: index + 1,
        frequency_rank: Number(match[1]),
        frequency_count: Number(match[2]),
        word: match[3],
        frequency_percent: Number(match[4]),
      };
    });
}

function collectTargets(curriculum) {
  const targets = new Map();

  for (const section of curriculum.sections) {
    for (const lesson of section.lessons) {
      for (const [stream, values] of [
        ['high_frequency', lesson.high_frequency_targets],
        ['topic', lesson.topic_targets],
      ]) {
        for (const target of values) {
          const key = normalize(target);
          if (!targets.has(key)) {
            targets.set(key, {
              target,
              streams: new Set(),
              lesson_ids: new Set(),
              section_ids: new Set(),
            });
          }
          const item = targets.get(key);
          item.streams.add(stream);
          item.lesson_ids.add(lesson.id);
          item.section_ids.add(section.id);
        }
      }
    }
  }

  return targets;
}

function candidateExpansionEndpoints(currentSize, maximumEnd = 2000, step = 50) {
  const first = Math.ceil((currentSize + 1) / step) * step;
  const endpoints = [];
  for (let endpoint = first; endpoint <= maximumEnd; endpoint += step) endpoints.push(endpoint);
  return endpoints;
}

function chooseRecommendation(sourceRankedGaps, currentSize) {
  const candidates = candidateExpansionEndpoints(currentSize).map((end_position) => {
    const captured = sourceRankedGaps.filter((target) => target.source_position <= end_position);
    const added = end_position - currentSize;
    return {
      end_position,
      additional_source_forms: added,
      captured_target_count: captured.length,
      capture_density: Number((captured.length / added).toFixed(4)),
    };
  });

  const useful = candidates.filter((candidate) => candidate.captured_target_count > 0);
  const bestDensity = useful.reduce((best, candidate) => {
    if (!best) return candidate;

    const candidateYield = candidate.captured_target_count * best.additional_source_forms;
    const bestYield = best.captured_target_count * candidate.additional_source_forms;
    if (candidateYield > bestYield) return candidate;
    if (
      candidateYield === bestYield
      && candidate.additional_source_forms < best.additional_source_forms
    ) {
      return candidate;
    }
    return best;
  }, null);

  if (!bestDensity) {
    return {
      strategy: 'no_source_expansion_needed',
      start_position: null,
      end_position: currentSize,
      additional_source_forms: 0,
      captured_target_count: 0,
      captured_targets: [],
      remaining_source_ranked_gap_count: 0,
      candidate_endpoints: candidates,
      rationale: 'No A1.2 lexical target has an exact Parole match outside the current vocabulary.',
    };
  }

  const capturedTargets = sourceRankedGaps
    .filter((target) => target.source_position <= bestDensity.end_position)
    .map((target) => target.target);

  return {
    strategy: 'next_consecutive_parole_tranche',
    start_position: currentSize + 1,
    end_position: bestDensity.end_position,
    additional_source_forms: bestDensity.additional_source_forms,
    captured_target_count: capturedTargets.length,
    captured_targets: capturedTargets,
    remaining_source_ranked_gap_count: sourceRankedGaps.length - capturedTargets.length,
    candidate_endpoints: candidates,
    rationale:
      'Choose the standard 50-entry endpoint up to source position 2000 with the highest cumulative exact A1.2 target yield per added Parole form. This keeps the next source-backed expansion small and avoids inflating the common vocabulary merely to absorb low-frequency topic forms.',
  };
}

function summarizeLesson(lesson, targetByKey) {
  const lexicalTargets = [...lesson.high_frequency_targets, ...lesson.topic_targets];
  const details = lexicalTargets.map((target) => targetByKey.get(normalize(target)));
  return {
    lesson_id: lesson.id,
    lexical_target_count: lexicalTargets.length,
    current_source_backed_count: details.filter((item) => item.classification === 'current_source_backed').length,
    source_ranked_gap_count: details.filter((item) => item.classification === 'source_ranked_gap').length,
    curated_unranked_count: details.filter((item) => item.classification === 'curated_unranked').length,
    targets: details.map((item) => ({
      target: item.target,
      classification: item.classification,
      source_position: item.source_position,
    })),
  };
}

async function buildReport() {
  const curriculum = await readJson(CURRICULUM_PATH);
  const vocabulary = await readJson(VOCABULARY_PATH);
  const sourceFile = vocabulary.source?.source_file;
  if (!sourceFile) throw new Error('Vocabulary source_file metadata is missing.');

  const sourceRows = await readParoleRows(sourceFile);
  const sourceByWord = new Map();
  for (const row of sourceRows) {
    const key = normalize(row.word);
    if (!sourceByWord.has(key)) sourceByWord.set(key, row);
  }

  const currentByWord = new Map(
    vocabulary.words.map((word) => [normalize(word.word), word]),
  );
  const collected = collectTargets(curriculum);

  const targets = [...collected.values()]
    .map((target) => {
      const key = normalize(target.target);
      const current = currentByWord.get(key);
      const source = sourceByWord.get(key);
      const classification = current
        ? 'current_source_backed'
        : source
          ? 'source_ranked_gap'
          : 'curated_unranked';

      return {
        target: target.target,
        streams: [...target.streams].sort(),
        lesson_ids: [...target.lesson_ids].sort(),
        section_ids: [...target.section_ids].sort(),
        classification,
        source_position: source?.source_position ?? null,
        source_word: source?.word ?? null,
        frequency_rank: source?.frequency_rank ?? null,
        frequency_count: source?.frequency_count ?? null,
        frequency_percent: source?.frequency_percent ?? null,
      };
    })
    .sort((left, right) => {
      const classOrder = {
        current_source_backed: 0,
        source_ranked_gap: 1,
        curated_unranked: 2,
      };
      const byClass = classOrder[left.classification] - classOrder[right.classification];
      if (byClass) return byClass;
      const byPosition = (left.source_position ?? Number.MAX_SAFE_INTEGER)
        - (right.source_position ?? Number.MAX_SAFE_INTEGER);
      if (byPosition) return byPosition;
      return left.target.localeCompare(right.target, 'fi');
    });

  const targetByKey = new Map(targets.map((target) => [normalize(target.target), target]));
  const current = targets.filter((target) => target.classification === 'current_source_backed');
  const gaps = targets.filter((target) => target.classification === 'source_ranked_gap');
  const unranked = targets.filter((target) => target.classification === 'curated_unranked');

  const recommendation = chooseRecommendation(gaps, vocabulary.words.length);
  const sections = curriculum.sections.map((section) => ({
    section_id: section.id,
    lessons: section.lessons.map((lesson) => summarizeLesson(lesson, targetByKey)),
  }));

  return {
    schema_version: 1,
    curriculum_id: curriculum.id,
    curriculum_level: curriculum.level,
    current_vocabulary_size: vocabulary.words.length,
    source_file: sourceFile,
    classification_policy: {
      current_source_backed:
        'The exact surface form already exists in data/common-words.json.',
      source_ranked_gap:
        'The exact surface form exists in the original Parole source but is outside the current common vocabulary range.',
      curated_unranked:
        'No exact Parole surface-form match exists; keep the target curriculum-owned and do not fabricate frequency metadata.',
    },
    summary: {
      unique_lexical_target_count: targets.length,
      current_source_backed_count: current.length,
      source_ranked_gap_count: gaps.length,
      curated_unranked_count: unranked.length,
      current_coverage_percent: Number(((current.length / targets.length) * 100).toFixed(1)),
      exact_parole_match_percent: Number((((current.length + gaps.length) / targets.length) * 100).toFixed(1)),
    },
    recommendation,
    curated_unranked_targets: unranked.map((target) => target.target),
    targets,
    sections,
  };
}

async function main() {
  const report = await buildReport();
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const current = await fs.readFile(OUTPUT_PATH, 'utf8');
    if (current !== serialized) {
      throw new Error('data/course/a1.2-vocabulary-gap.json is stale. Regenerate it with this script.');
    }
    console.log(
      `A1.2 vocabulary gap report is current: ${report.summary.unique_lexical_target_count} unique targets.`,
    );
    return;
  }

  await fs.writeFile(OUTPUT_PATH, serialized, 'utf8');
  console.log(
    `Wrote A1.2 vocabulary gap report with ${report.summary.unique_lexical_target_count} unique targets.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
