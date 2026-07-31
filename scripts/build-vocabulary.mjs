import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = path.join(ROOT, 'data/common-words.json');
const DETAILS_DIRECTORY = path.join(ROOT, 'data/vocabulary-details');
const PAROLE_LINE = /^(\d+)\s+(\d+)\s+(\S+)\s+\(([\d.]+)\s+%\)$/;
const REQUIRED_DETAIL_FIELDS = [
  'translation_fa',
  'example_fi',
  'example_fa',
  'part_of_speech',
  'part_of_speech_fa',
  'lemma',
  'example_2_fi',
  'example_2_fa',
];

function normalize(value) {
  return String(value).normalize('NFC').toLocaleLowerCase('fi-FI').trim();
}

function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exampleContainsWord(sentence, word) {
  const escaped = escapeRegExp(word);
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
    'iu',
  );
  return pattern.test(sentence);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readDetailBundles() {
  try {
    const entries = await fs.readdir(DETAILS_DIRECTORY, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, 'en'));

    const bundles = [];
    for (const fileName of files) {
      const payload = await readJson(path.join(DETAILS_DIRECTORY, fileName));
      const words = Array.isArray(payload) ? payload : payload.words;
      if (!Array.isArray(words)) {
        throw new Error(`${fileName} must contain an array or an object with a words array.`);
      }
      bundles.push({ fileName, words });
    }
    return bundles;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function readParoleRows(sourceFile) {
  const bytes = await fs.readFile(path.join(ROOT, sourceFile));
  return bytes
    .toString('latin1')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      const match = line.match(PAROLE_LINE);
      if (!match) {
        throw new Error(`Cannot parse Parole row ${index + 1}: ${line}`);
      }
      return {
        position: index + 1,
        rank: index + 1,
        frequency_rank: Number(match[1]),
        word: match[3],
        frequency_count: Number(match[2]),
        frequency_percent: Number(match[4]),
      };
    });
}

function validateDetails(details, sourceWord, position) {
  if (!details || normalize(details.word) !== normalize(sourceWord)) {
    throw new Error(`Missing curated details for source position ${position}: ${sourceWord}`);
  }

  for (const field of REQUIRED_DETAIL_FIELDS) {
    if (typeof details[field] !== 'string' || !details[field].trim()) {
      throw new Error(`Missing ${field} for ${sourceWord}`);
    }
  }

  if (position > 100 && !exampleContainsWord(details.example_fi, sourceWord)) {
    throw new Error(`The first Finnish example does not contain ${sourceWord}.`);
  }
  if (position > 100 && !exampleContainsWord(details.example_2_fi, sourceWord)) {
    throw new Error(`The second Finnish example does not contain ${sourceWord}.`);
  }
}

function parseLimit(argumentsList) {
  const limitIndex = argumentsList.indexOf('--limit');
  if (limitIndex === -1) return null;
  const value = Number(argumentsList[limitIndex + 1]);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('--limit must be followed by a positive integer.');
  }
  return value;
}

async function buildVocabulary({ limit = null } = {}) {
  const current = await readJson(OUTPUT_PATH);
  const sourceFile = current.source?.source_file;
  if (!sourceFile) throw new Error('The vocabulary source_file metadata is missing.');

  const sourceRows = await readParoleRows(sourceFile);
  const sourcePositionByWord = new Map(
    sourceRows.map((row) => [normalize(row.word), row.position]),
  );
  const detailsByWord = new Map(
    current.words.map((word) => [normalize(word.word), word]),
  );
  const bundles = await readDetailBundles();
  let highestBundlePosition = 0;
  const bundleOwnerByWord = new Map();

  for (const bundle of bundles) {
    for (const details of bundle.words) {
      const key = normalize(details.word);
      if (!key) throw new Error(`${bundle.fileName} contains an entry without a word.`);
      if (bundleOwnerByWord.has(key)) {
        throw new Error(
          `${details.word} appears in both ${bundleOwnerByWord.get(key)} and ${bundle.fileName}.`,
        );
      }
      const sourcePosition = sourcePositionByWord.get(key);
      if (!sourcePosition) {
        throw new Error(`${details.word} from ${bundle.fileName} is not present in the Parole source.`);
      }
      bundleOwnerByWord.set(key, bundle.fileName);
      highestBundlePosition = Math.max(highestBundlePosition, sourcePosition);
      detailsByWord.set(key, details);
    }
  }

  const targetCount = limit ?? Math.max(current.words.length, highestBundlePosition);
  if (targetCount > sourceRows.length) {
    throw new Error(`Requested ${targetCount} entries, but the source has ${sourceRows.length}.`);
  }

  const words = sourceRows.slice(0, targetCount).map((sourceRow) => {
    const details = detailsByWord.get(normalize(sourceRow.word));
    validateDetails(details, sourceRow.word, sourceRow.position);
    return {
      ...sourceRow,
      translation_fa: details.translation_fa,
      example_fi: details.example_fi,
      example_fa: details.example_fa,
      part_of_speech: details.part_of_speech,
      part_of_speech_fa: details.part_of_speech_fa,
      lemma: details.lemma,
      example_2_fi: details.example_2_fi,
      example_2_fa: details.example_2_fa,
    };
  });

  const uniqueForms = new Set(words.map((word) => normalize(word.word)));
  if (uniqueForms.size !== words.length) {
    throw new Error(`Expected ${words.length} unique forms, found ${uniqueForms.size}.`);
  }

  const persianCount = toPersianDigits(words.length);
  const countChanged = words.length !== current.words.length;
  return {
    title_fa: countChanged
      ? `${persianCount} صورت واژگانی پرتکرار در زبان نوشتاری فنلاندی`
      : current.title_fa,
    description_fa: countChanged
      ? `${persianCount} صورت واژگانی پرتکرار از پیکره نوشتاری Parole، همراه با تعداد و درصد وقوع، ترجمه فارسی، نوع واژه، شکل پایه و دو مثال آموزشی.`
      : current.description_fa,
    source: current.source,
    words,
  };
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const limit = parseLimit(process.argv.slice(2));
  const output = await buildVocabulary({ limit });
  const serialized = `${JSON.stringify(output, null, 2)}\n`;

  if (checkOnly) {
    const current = await fs.readFile(OUTPUT_PATH, 'utf8');
    if (current !== serialized) {
      throw new Error(
        'data/common-words.json is stale. Run npm run build:vocabulary and commit the result.',
      );
    }
    console.log(`Vocabulary build is reproducible for ${output.words.length} entries.`);
    return;
  }

  await fs.writeFile(OUTPUT_PATH, serialized, 'utf8');
  console.log(`Built and validated ${output.words.length} Parole vocabulary entries.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
