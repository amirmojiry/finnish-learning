const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const curriculum = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.2-curriculum.json'), 'utf8'),
);
const vocabulary = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'common-words.json'), 'utf8'),
);
const report = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'course', 'a1.2-vocabulary-gap.json'), 'utf8'),
);

function normalize(value) {
  return String(value).normalize('NFC').toLocaleLowerCase('fi-FI').trim();
}

function uniqueCurriculumTargets() {
  const targets = new Map();
  for (const section of curriculum.sections) {
    for (const lesson of section.lessons) {
      for (const [stream, values] of [
        ['high_frequency', lesson.high_frequency_targets],
        ['topic', lesson.topic_targets],
      ]) {
        for (const target of values) {
          const key = normalize(target);
          if (!targets.has(key)) targets.set(key, { target, streams: new Set(), lessons: new Set() });
          targets.get(key).streams.add(stream);
          targets.get(key).lessons.add(lesson.id);
        }
      }
    }
  }
  return targets;
}

test('A1.2 vocabulary gap report is reproducible from source data', () => {
  assert.doesNotThrow(() => {
    execFileSync(
      process.execPath,
      [path.join(ROOT, 'scripts', 'analyze-a1-2-vocabulary.mjs'), '--check'],
      { cwd: ROOT, stdio: 'pipe' },
    );
  });
});

test('A1.2 vocabulary gap classifies every unique lexical target exactly once', () => {
  const expected = uniqueCurriculumTargets();
  assert.equal(report.summary.unique_lexical_target_count, expected.size);
  assert.equal(report.targets.length, expected.size);
  assert.equal(new Set(report.targets.map((target) => normalize(target.target))).size, expected.size);

  for (const [key, target] of expected) {
    const item = report.targets.find((entry) => normalize(entry.target) === key);
    assert.ok(item, `Missing gap classification for ${target.target}`);
    assert.deepEqual([...item.streams].sort(), [...target.streams].sort());
    assert.deepEqual([...item.lesson_ids].sort(), [...target.lessons].sort());
  }
});

test('all A1.2 high-frequency targets remain inside the current source-backed vocabulary', () => {
  const current = new Set(vocabulary.words.map((word) => normalize(word.word)));
  const highFrequencyTargets = curriculum.sections.flatMap((section) =>
    section.lessons.flatMap((lesson) => lesson.high_frequency_targets),
  );

  for (const target of highFrequencyTargets) {
    assert.ok(current.has(normalize(target)), `High-frequency target ${target} is outside current vocabulary`);
    const item = report.targets.find((entry) => normalize(entry.target) === normalize(target));
    assert.equal(item.classification, 'current_source_backed');
  }
});

test('gap summary totals match the target classifications', () => {
  const counts = {
    current_source_backed: 0,
    source_ranked_gap: 0,
    curated_unranked: 0,
  };
  for (const target of report.targets) counts[target.classification] += 1;

  assert.equal(report.summary.current_source_backed_count, counts.current_source_backed);
  assert.equal(report.summary.source_ranked_gap_count, counts.source_ranked_gap);
  assert.equal(report.summary.curated_unranked_count, counts.curated_unranked);
  assert.equal(
    report.summary.unique_lexical_target_count,
    counts.current_source_backed + counts.source_ranked_gap + counts.curated_unranked,
  );
});

test('source-ranked gaps preserve real source metadata while curated targets have none', () => {
  for (const target of report.targets) {
    if (target.classification === 'source_ranked_gap') {
      assert.ok(Number.isInteger(target.source_position) && target.source_position > vocabulary.words.length);
      assert.ok(Number.isInteger(target.frequency_rank) && target.frequency_rank > 0);
      assert.ok(Number.isInteger(target.frequency_count) && target.frequency_count > 0);
      assert.equal(typeof target.frequency_percent, 'number');
      assert.ok(target.source_word);
    }

    if (target.classification === 'curated_unranked') {
      assert.equal(target.source_position, null);
      assert.equal(target.frequency_rank, null);
      assert.equal(target.frequency_count, null);
      assert.equal(target.frequency_percent, null);
      assert.equal(target.source_word, null);
    }
  }
});

test('multiword curated targets stay unranked instead of receiving fabricated Parole metadata', () => {
  assert.deepEqual([...report.curated_unranked_targets].sort(), ['joka päivä', 'meno-paluu'].sort());
});

test('recommended next vocabulary tranche is derived from the best practical capture density', () => {
  const recommendation = report.recommendation;
  assert.equal(recommendation.start_position, vocabulary.words.length + 1);
  assert.ok(recommendation.end_position > vocabulary.words.length);
  assert.equal(
    recommendation.additional_source_forms,
    recommendation.end_position - vocabulary.words.length,
  );

  const useful = recommendation.candidate_endpoints.filter((candidate) => candidate.captured_target_count > 0);
  const best = useful.reduce((winner, candidate) => {
    if (!winner || candidate.capture_density > winner.capture_density) return candidate;
    if (
      candidate.capture_density === winner.capture_density
      && candidate.additional_source_forms < winner.additional_source_forms
    ) {
      return candidate;
    }
    return winner;
  }, null);

  assert.equal(recommendation.end_position, best.end_position);
  assert.equal(recommendation.captured_target_count, best.captured_target_count);
  assert.equal(
    recommendation.remaining_source_ranked_gap_count,
    report.summary.source_ranked_gap_count - recommendation.captured_target_count,
  );

  const captured = report.targets
    .filter((target) =>
      target.classification === 'source_ranked_gap'
      && target.source_position <= recommendation.end_position
    )
    .map((target) => target.target);
  assert.deepEqual(recommendation.captured_targets, captured);
});

test('the current analysis recommends a focused 301-400 source-backed expansion', () => {
  assert.equal(report.current_vocabulary_size, 300);
  assert.equal(report.recommendation.start_position, 301);
  assert.equal(report.recommendation.end_position, 400);
  assert.equal(report.recommendation.additional_source_forms, 100);
  assert.equal(report.recommendation.captured_target_count, 9);
  assert.deepEqual(report.recommendation.captured_targets, [
    'perjantaina',
    'sunnuntaina',
    'keskiviikkona',
    'mistä',
    'suoraan',
    'yliopisto',
    'tulla',
    'maksaa',
    'pieni',
  ]);
});
