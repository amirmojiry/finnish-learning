import fs from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await fs.readFile(path, 'utf8'));
const normalize = (value) => String(value).normalize('NFC').toLocaleLowerCase('fi-FI');
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const current = await readJson('data/common-words.json');
const firstHalf = await readJson('data/parole-101-150-details.json');
const secondHalf = await readJson('data/parole-151-200-details.json');
const sourceBytes = await fs.readFile('data/parole_frek_3.txt');
const sourceLines = sourceBytes
  .toString('latin1')
  .split(/\r?\n/)
  .filter((line) => line.trim())
  .slice(0, 200);

if (sourceLines.length !== 200) {
  throw new Error(`Expected 200 source lines, received ${sourceLines.length}`);
}

const frequencyWords = sourceLines.map((line, index) => {
  const match = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s+\(([\d.]+)\s+%\)$/);
  if (!match) throw new Error(`Cannot parse Parole line ${index + 1}: ${line}`);

  return {
    position: index + 1,
    frequency_rank: Number(match[1]),
    frequency_count: Number(match[2]),
    word: match[3],
    frequency_percent: Number(match[4]),
  };
});

const detailsByWord = new Map();
for (const details of [...current.words, ...firstHalf, ...secondHalf]) {
  detailsByWord.set(normalize(details.word), details);
}

function exampleContainsWord(sentence, word) {
  const escaped = escapeRegExp(word);
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'iu');
  return pattern.test(sentence);
}

const words = frequencyWords.map((frequencyWord) => {
  const details = detailsByWord.get(normalize(frequencyWord.word));
  if (!details) throw new Error(`Missing learning details for ${frequencyWord.word}`);

  for (const field of [
    'translation_fa',
    'example_fi',
    'example_fa',
    'part_of_speech',
    'part_of_speech_fa',
    'lemma',
    'example_2_fi',
    'example_2_fa',
  ]) {
    if (!details[field]) throw new Error(`Missing ${field} for ${frequencyWord.word}`);
  }

  if (!exampleContainsWord(details.example_fi, frequencyWord.word)) {
    throw new Error(`First example does not contain ${frequencyWord.word}: ${details.example_fi}`);
  }
  if (!exampleContainsWord(details.example_2_fi, frequencyWord.word)) {
    throw new Error(`Second example does not contain ${frequencyWord.word}: ${details.example_2_fi}`);
  }

  return {
    position: frequencyWord.position,
    rank: frequencyWord.position,
    frequency_rank: frequencyWord.frequency_rank,
    word: frequencyWord.word,
    frequency_count: frequencyWord.frequency_count,
    frequency_percent: frequencyWord.frequency_percent,
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

const uniqueWords = new Set(words.map((word) => normalize(word.word)));
if (words.length !== 200 || uniqueWords.size !== 200) {
  throw new Error(`Expected 200 unique words, received ${words.length} entries and ${uniqueWords.size} unique forms`);
}

const output = {
  title_fa: '۲۰۰ صورت واژگانی پرتکرار در زبان نوشتاری فنلاندی',
  description_fa: 'دویست صورت واژگانی پرتکرار از پیکره نوشتاری Parole، همراه با تعداد و درصد وقوع، ترجمه فارسی، نوع واژه، شکل پایه و دو مثال آموزشی.',
  source: {
    name: 'Kotus / Kielipankki: Frequency List of Written Finnish Word Forms',
    provider: 'Kotimaisten kielten keskus (Kotus)',
    basis: 'Finnish Parole text corpus',
    corpus_size: 'حدود ۱۷ میلیون توکن نوشتاری',
    url: 'https://www.kielipankki.fi/lexical-conceptual-resources/parole-taajuuslista/',
    persistent_identifier: 'http://urn.fi/urn:nbn:fi:lb-2021092005',
    source_file: 'data/parole_frek_3.txt',
    note_fa: 'فیلد rank جایگاه ترتیبی و یکتای مدخل در این فایل است. فیلد frequency_rank رتبه اصلی منبع را نگه می‌دارد و ممکن است برای واژه‌های هم‌بسامد تکراری باشد.',
  },
  words,
};

await fs.writeFile('data/common-words.json', `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Built and validated ${words.length} Parole vocabulary entries.`);
