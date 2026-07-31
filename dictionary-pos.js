(function initializeDictionaryPos(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (!root || !root.document) return;

  function getCurrentWords() {
    try {
      return typeof state !== 'undefined' && Array.isArray(state.words) ? state.words : [];
    } catch (error) {
      return [];
    }
  }

  function renderPosFilters() {
    const select = root.document.getElementById('dictionary-pos-filter');
    if (!select) return [];

    const words = getCurrentWords();
    const labels = api.collectPosTypes(words);
    const selectedValue = api.resolveSelectedPos(select.value, labels);

    select.replaceChildren();

    const allOption = root.document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'همه انواع واژه';
    select.appendChild(allOption);

    labels.forEach((label) => {
      const option = root.document.createElement('option');
      option.value = label;
      option.textContent = label;
      select.appendChild(option);
    });

    select.value = selectedValue;
    return labels;
  }

  root.DictionaryPos = api;
  root.renderPosFilters = renderPosFilters;

  try {
    if (typeof populatePosFilter === 'function') {
      populatePosFilter = renderPosFilters;
    }
  } catch (error) {
    console.warn('Dictionary POS filter could not replace the legacy renderer:', error);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createDictionaryPosApi() {
  function getPosLabel(word) {
    return String(word?.part_of_speech_fa || word?.part_of_speech || '').trim();
  }

  function collectPosTypes(words) {
    return [...new Set((Array.isArray(words) ? words : [])
      .map(getPosLabel)
      .filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'fa'));
  }

  function resolveSelectedPos(selectedValue, availableTypes) {
    const selected = String(selectedValue || 'all');
    return selected === 'all' || availableTypes.includes(selected) ? selected : 'all';
  }

  function matchesPos(word, selectedValue) {
    return selectedValue === 'all' || getPosLabel(word) === selectedValue;
  }

  return {
    collectPosTypes,
    getPosLabel,
    matchesPos,
    resolveSelectedPos,
  };
}));
