import { readFile, readdir, writeFile } from 'node:fs/promises';

const vocabularyPath = new URL('../data/common-words.json', import.meta.url);
const enrichmentDirectory = new URL('./vocabulary-enrichment/', import.meta.url);

const vocabulary = JSON.parse(await readFile(vocabularyPath, 'utf8'));
const enrichmentFiles = (await readdir(enrichmentDirectory))
  .filter((name) => name.endsWith('.json'))
  .sort();

const enrichmentEntries = (
  await Promise.all(
    enrichmentFiles.map(async (name) => JSON.parse(
      await readFile(new URL(name, enrichmentDirectory), 'utf8'),
    )),
  )
).flat();

const enrichmentByRank = new Map(
  enrichmentEntries.map((entry) => [entry.rank, entry]),
);

if (vocabulary.words.length !== 100 || enrichmentByRank.size !== 100) {
  throw new Error('Expected exactly 100 vocabulary and enrichment entries.');
}

vocabulary.description_fa = 'صد صورت واژگانی پرتکرار در یک پیکره مکالمه‌ای فنلاندی، همراه با ترجمه، نوع واژه، شکل پایه و دو مثال آموزشی.';
vocabulary.source.note_fa = 'این رتبه‌بندی بر اساس زیرنویس‌هاست و بنابراین به زبان گفتاری نزدیک است. فهرست شامل صورت‌های صرف‌شده نیز می‌شود، نه فقط شکل پایه واژه‌ها. فیلد lemma شکل پایه یا مدخل واژه‌نامه‌ای هر واژه را نشان می‌دهد.';

vocabulary.words = vocabulary.words.map((word) => {
  const enrichment = enrichmentByRank.get(word.rank);
  if (!enrichment) throw new Error(`Missing enrichment for rank ${word.rank}.`);

  const enrichedWord = { ...word, ...enrichment };
  const examples = [enrichedWord.example_fi, enrichedWord.example_2_fi];

  for (const example of examples) {
    if (!example.toLocaleLowerCase('fi-FI').includes(
      enrichedWord.word.toLocaleLowerCase('fi-FI'),
    )) {
      throw new Error(`Example does not contain ${enrichedWord.word}: ${example}`);
    }
  }

  return enrichedWord;
});

await writeFile(
  vocabularyPath,
  `${JSON.stringify(vocabulary, null, 2)}\n`,
  'utf8',
);

console.log('Enriched 100 vocabulary entries.');
