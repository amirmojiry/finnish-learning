const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectPosTypes,
  getPosLabel,
  matchesPos,
  resolveSelectedPos,
} = require('../dictionary-pos.js');

test('collectPosTypes returns only unique non-empty categories used by words', () => {
  const words = [
    { part_of_speech: 'NOUN', part_of_speech_fa: 'اسم' },
    { part_of_speech: 'VERB', part_of_speech_fa: 'فعل' },
    { part_of_speech: 'AUX', part_of_speech_fa: 'فعل کمکی' },
    { part_of_speech: 'NOUN', part_of_speech_fa: 'اسم' },
    { part_of_speech: '', part_of_speech_fa: '  ' },
    {},
  ];

  const expected = ['اسم', 'فعل', 'فعل کمکی'].sort((left, right) => left.localeCompare(right, 'fa'));
  assert.deepEqual(collectPosTypes(words), expected);
});

test('collectPosTypes reflects current UD-mutated values and removes stale categories', () => {
  const words = [
    { part_of_speech: 'VERB', part_of_speech_fa: 'فعل' },
    { part_of_speech: 'VERB', part_of_speech_fa: 'فعل' },
  ];

  assert.deepEqual(collectPosTypes(words), ['فعل']);

  words[0].part_of_speech = 'AUX';
  words[0].part_of_speech_fa = 'فعل کمکی';
  words[1].part_of_speech = 'AUX';
  words[1].part_of_speech_fa = 'فعل کمکی';

  assert.deepEqual(collectPosTypes(words), ['فعل کمکی']);
  assert.ok(!collectPosTypes(words).includes('فعل'));
});

test('resolveSelectedPos preserves valid values and resets removed values', () => {
  const types = ['اسم', 'فعل کمکی'];
  assert.equal(resolveSelectedPos('اسم', types), 'اسم');
  assert.equal(resolveSelectedPos('فعل', types), 'all');
  assert.equal(resolveSelectedPos('', types), 'all');
  assert.equal(resolveSelectedPos('all', types), 'all');
});

test('matchesPos uses the displayed Persian label with an English fallback', () => {
  const noun = { part_of_speech: 'NOUN', part_of_speech_fa: 'اسم' };
  const auxiliary = { part_of_speech: 'AUX' };

  assert.equal(getPosLabel(noun), 'اسم');
  assert.equal(getPosLabel(auxiliary), 'AUX');
  assert.equal(matchesPos(noun, 'all'), true);
  assert.equal(matchesPos(noun, 'اسم'), true);
  assert.equal(matchesPos(noun, 'فعل'), false);
  assert.equal(matchesPos(auxiliary, 'AUX'), true);
});
