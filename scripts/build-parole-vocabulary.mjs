import fs from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await fs.readFile(path, 'utf8'));

const current = await readJson('data/common-words.json');
const frequency = await readJson('data/parole-frequency.json');
const additions = await readJson('data/parole-new-details.json');

const normalize = (value) => value.normalize('NFC').toLocaleLowerCase('fi-FI');
const currentByWord = new Map(current.words.map((word) => [normalize(word.word), word]));

const words = frequency.words.map((frequencyWord) => {
  const details = currentByWord.get(normalize(frequencyWord.word)) || additions[frequencyWord.word];

  if (!details) {
    throw new Error(`Missing learning details for ${frequencyWord.word}`);
  }

  return {
    rank: frequencyWord.rank,
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

if (words.length !== 100) throw new Error(`Expected 100 words, received ${words.length}`);

const output = {
  title_fa: '۱۰۰ صورت واژگانی پرتکرار در زبان نوشتاری فنلاندی',
  description_fa: 'صد صورت واژگانی پرتکرار از پیکره نوشتاری Parole، همراه با تعداد و درصد وقوع، ترجمه فارسی، نوع واژه، شکل پایه و دو مثال آموزشی.',
  source: {
    name: frequency.source.name,
    provider: 'Kotimaisten kielten keskus (Kotus)',
    basis: frequency.source.corpus,
    corpus_size: 'حدود ۱۷ میلیون توکن نوشتاری',
    url: frequency.source.url,
    persistent_identifier: frequency.source.persistent_identifier,
    note_fa: 'این فهرست بر اساس صورت‌های واقعی واژه در پیکره نوشتاری است؛ بنابراین صورت‌های صرف‌شده و برخی نشانه‌ها یا مخفف‌ها نیز در آن دیده می‌شوند.',
  },
  words,
};

await fs.writeFile('data/common-words.json', `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Built ${words.length} Parole vocabulary entries.`);
