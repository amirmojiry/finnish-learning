const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

test('browser renderer rebuilds the select from current words and drops stale options', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../dictionary-pos.js'), 'utf8');
  const select = {
    value: 'فعل',
    children: [],
    replaceChildren() {
      this.children = [];
    },
    appendChild(child) {
      this.children.push(child);
    },
  };
  const context = {
    console,
    state: {
      words: [
        { part_of_speech: 'VERB', part_of_speech_fa: 'فعل' },
        { part_of_speech: 'NOUN', part_of_speech_fa: 'اسم' },
      ],
    },
    document: {
      getElementById(id) {
        return id === 'dictionary-pos-filter' ? select : null;
      },
      createElement(tagName) {
        assert.equal(tagName, 'option');
        return { value: '', textContent: '' };
      },
    },
    populatePosFilter() {},
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'dictionary-pos.js' });

  const firstLabels = context.renderPosFilters();
  assert.deepEqual([...firstLabels], ['اسم', 'فعل'].sort((left, right) => left.localeCompare(right, 'fa')));
  assert.equal(select.value, 'فعل');
  assert.deepEqual(
    select.children.map((option) => option.value),
    ['all', ...firstLabels],
  );

  context.state.words = [
    { part_of_speech: 'AUX', part_of_speech_fa: 'فعل کمکی' },
  ];
  select.value = 'فعل';

  const secondLabels = context.renderPosFilters();
  assert.deepEqual([...secondLabels], ['فعل کمکی']);
  assert.equal(select.value, 'all');
  assert.deepEqual(
    select.children.map((option) => option.value),
    ['all', 'فعل کمکی'],
  );
});
