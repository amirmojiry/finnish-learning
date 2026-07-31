(() => {
  'use strict';

  const SUMMARY_URL = 'data/ud/word-summary.json?v=20260731-2';
  const LABELS_URL = 'data/ud/labels-fa.json?v=20260731-2';
  const VOCABULARY_URL = 'data/common-words.json?v=20260731-8';
  const SECTION_ID = 'ud-analysis-section';

  const numberFormatter = new Intl.NumberFormat('fa-IR');
  const percentFormatter = new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
  const frequencyPercentFormatter = new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  });

  const TREEBANK_LABELS = {
    TDT: 'Turku Dependency Treebank',
    FTB: 'Finnish TreeBank',
    PUD: 'Parallel UD',
    OOD: 'Out-of-Domain',
  };

  const CONFIDENCE_LABELS = {
    high: 'بسیار یکدست',
    medium: 'نسبتاً یکدست',
    low: 'متنوع',
  };

  const FEATURE_VALUE_LABELS = {
    Case: {
      Nom: 'نهادی', Gen: 'اضافی', Acc: 'مفعولی', Par: 'جزئی',
      Ine: 'درونِ چیزی', Ela: 'از درون', Ill: 'به درون',
      Ade: 'روی یا نزد', Abl: 'از روی یا نزد', All: 'به روی یا نزد',
      Ess: 'در نقشِ', Tra: 'تبدیل‌شدن به', Abe: 'بدون',
      Ins: 'ابزاری', Com: 'همراه با',
    },
    Number: { Sing: 'مفرد', Plur: 'جمع' },
    Tense: { Pres: 'حال', Past: 'گذشته' },
    Mood: { Ind: 'اخباری', Imp: 'امری', Cnd: 'شرطی', Pot: 'احتمالی' },
    Voice: { Act: 'معلوم', Pass: 'مجهول یا بی‌شخص' },
    Person: { '0': 'بی‌شخص', '1': 'اول‌شخص', '2': 'دوم‌شخص', '3': 'سوم‌شخص' },
    VerbForm: { Fin: 'صرف‌شده', Inf: 'مصدر', Part: 'وجه وصفی' },
    Degree: { Pos: 'ساده', Cmp: 'تفضیلی', Sup: 'عالی' },
    Polarity: { Neg: 'منفی', Pos: 'مثبت' },
    PronType: {
      Dem: 'اشاره', Ind: 'نامعین', Int: 'پرسشی', Rel: 'موصولی',
      Prs: 'شخصی', Rcp: 'متقابل', Art: 'حرف تعریف', Tot: 'کلی',
    },
    NumType: { Card: 'اصلی', Ord: 'ترتیبی' },
    PartForm: { Pres: 'حال', Past: 'گذشته', Agent: 'فاعلی', Neg: 'منفی' },
    Poss: { Yes: 'دارای پسوند ملکی' },
    Reflex: { Yes: 'بازتابی' },
    Connegative: { Yes: 'همراه فعل منفی' },
    Abbr: { Yes: 'مخفف' },
    Foreign: { Yes: 'بیگانه' },
    Typo: { Yes: 'دارای خطای نوشتاری' },
    Style: { Coll: 'محاوره‌ای', Arch: 'کهن', Rare: 'کم‌کاربرد' },
  };

  const udState = {
    promise: null,
    wordsByForm: new Map(),
    frequencyByForm: new Map(),
    labels: null,
    lastWord: '',
    frequencyEventsBound: false,
  };

  function normalizeWord(value) {
    return String(value || '').trim().normalize('NFC').toLocaleLowerCase('fi-FI');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function formatNumber(value) {
    return numberFormatter.format(Number(value) || 0);
  }

  function formatPercent(value) {
    return `${percentFormatter.format(Number(value) || 0)}٪`;
  }

  function formatFrequencyPercent(value) {
    return `${frequencyPercentFormatter.format(Number(value) || 0)}٪`;
  }

  function getUposLabel(tag) {
    return udState.labels?.upos?.[tag] || tag || 'نامشخص';
  }

  function getFeatureLabel(name) {
    return udState.labels?.features?.[name] || name;
  }

  function getFeatureValueLabel(feature, value) {
    return FEATURE_VALUE_LABELS[feature]?.[value] || '';
  }

  function getRelationLabel(relation) {
    const base = String(relation || 'dep').split(':')[0];
    return udState.labels?.dependency_relations?.[base] || base;
  }

  function getDominantUpos(row) {
    const rows = Array.isArray(row?.upos) ? row.upos : [];
    return rows.length ? rows[0] : null;
  }

  function makeProgressRows(rows, options) {
    const { label, secondary, value, percent } = options;
    return rows.map((row) => {
      const rowPercent = Math.max(0, Math.min(100, Number(percent(row)) || 0));
      return `
        <div class="ud-progress-row">
          <div class="ud-progress-label">
            <span>${label(row)}</span>
            <span class="ud-progress-value">${value(row)}</span>
          </div>
          ${secondary ? `<div class="ud-progress-secondary">${secondary(row)}</div>` : ''}
          <div class="ud-progress-track" aria-hidden="true">
            <span style="width:${rowPercent}%"></span>
          </div>
        </div>`;
    }).join('');
  }

  function getSectionAnchor(detail) {
    const practiceGrid = detail?.querySelector('.word-practice-grid');
    return practiceGrid?.closest('.word-detail-section')
      || detail?.querySelector('.word-detail-meta')
      || null;
  }

  function ensureSection() {
    const detail = document.getElementById('dictionary-detail');
    const anchor = getSectionAnchor(detail);
    if (!detail || !anchor) return null;

    let section = document.getElementById(SECTION_ID);
    if (!section) {
      section = document.createElement('section');
      section.id = SECTION_ID;
      section.className = 'ud-analysis-section';
      section.hidden = true;
      section.setAttribute('aria-live', 'polite');
    }
    if (section.previousElementSibling !== anchor) {
      anchor.insertAdjacentElement('afterend', section);
    }
    return section;
  }

  function ensureFrequencyInfo() {
    const rankValue = document.getElementById('detail-rank');
    const card = rankValue?.closest('.word-meta-card');
    const label = card?.querySelector('.word-meta-label');
    if (!card || !label) return null;

    let row = card.querySelector('.ud-frequency-label-row');
    let button = card.querySelector('.ud-frequency-info-button');
    let popover = card.querySelector('.ud-frequency-popover');

    if (!row) {
      row = document.createElement('div');
      row.className = 'ud-frequency-label-row';
      label.insertAdjacentElement('beforebegin', row);
      row.appendChild(label);
    }

    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'ud-frequency-info-button';
      button.textContent = '!';
      button.setAttribute('aria-label', 'نمایش تعداد و درصد بسامد');
      button.setAttribute('aria-expanded', 'false');
      row.appendChild(button);
    }

    if (!popover) {
      popover = document.createElement('div');
      popover.className = 'ud-frequency-popover';
      popover.hidden = true;
      popover.setAttribute('role', 'status');
      card.appendChild(popover);
    }

    if (!button.dataset.bound) {
      button.dataset.bound = 'true';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const opening = popover.hidden;
        document.querySelectorAll('.ud-frequency-popover:not([hidden])').forEach((item) => {
          item.hidden = true;
          item.parentElement?.querySelector('.ud-frequency-info-button')?.setAttribute('aria-expanded', 'false');
        });
        popover.hidden = !opening;
        button.setAttribute('aria-expanded', opening ? 'true' : 'false');
      });
    }

    return { button, popover };
  }

  function bindFrequencyDismissEvents() {
    if (udState.frequencyEventsBound) return;
    udState.frequencyEventsBound = true;
    document.addEventListener('click', (event) => {
      if (event.target.closest?.('.ud-frequency-info-button, .ud-frequency-popover')) return;
      document.querySelectorAll('.ud-frequency-popover:not([hidden])').forEach((popover) => {
        popover.hidden = true;
        popover.parentElement?.querySelector('.ud-frequency-info-button')?.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.ud-frequency-popover:not([hidden])').forEach((popover) => {
        popover.hidden = true;
        const button = popover.parentElement?.querySelector('.ud-frequency-info-button');
        button?.setAttribute('aria-expanded', 'false');
        button?.focus();
      });
    });
  }

  function updateFrequencyInfo(normalizedWord) {
    const controls = ensureFrequencyInfo();
    if (!controls) return;
    const frequency = udState.frequencyByForm.get(normalizedWord);
    if (!frequency) {
      controls.button.hidden = true;
      controls.popover.hidden = true;
      return;
    }

    controls.button.hidden = false;
    controls.popover.innerHTML = `
      <strong>بسامد در پیکره نوشتاری Parole</strong>
      <span>تعداد تکرار: <b>${formatNumber(frequency.frequency_count)}</b></span>
      <span>سهم از کل پیکره: <b>${formatFrequencyPercent(frequency.frequency_percent)}</b></span>
      <small>بر پایه فهرست اصلی Kotus/Kielipankki</small>`;
  }

  function renderStatus(message, type = 'loading') {
    const section = ensureSection();
    if (!section) return;
    section.hidden = false;
    section.innerHTML = `
      <div class="ud-status ${type === 'error' ? 'is-error' : ''}">
        ${type === 'loading' ? '<span class="ud-loader" aria-hidden="true"></span>' : ''}
        <span>${escapeHtml(message)}</span>
      </div>`;
  }

  function syncDominantPosToAppData() {
    let appState;
    try {
      appState = typeof state !== 'undefined' ? state : null;
    } catch (error) {
      return false;
    }
    if (!appState?.words?.length || !udState.wordsByForm.size) return false;

    let changed = false;
    appState.words.forEach((word) => {
      const row = udState.wordsByForm.get(normalizeWord(word.word));
      const dominant = getDominantUpos(row);
      if (!dominant?.tag) return;
      const label = getUposLabel(dominant.tag);
      if (word.part_of_speech !== dominant.tag || word.part_of_speech_fa !== label) {
        word.part_of_speech = dominant.tag;
        word.part_of_speech_fa = label;
        word.ud_upos_percent = Number(dominant.percent) || 0;
        changed = true;
      }
      const mapped = appState.wordMap?.get(normalizeWord(word.word));
      if (mapped && mapped !== word) {
        mapped.part_of_speech = dominant.tag;
        mapped.part_of_speech_fa = label;
        mapped.ud_upos_percent = Number(dominant.percent) || 0;
      }
    });

    if (changed) {
      try {
        if (typeof renderPosFilters === 'function') renderPosFilters();
        if (typeof renderDictionaryList === 'function') renderDictionaryList();
      } catch (error) {
        console.warn('UD POS values were applied, but the dictionary list could not be refreshed:', error);
      }
    }
    return true;
  }

  function scheduleDominantPosSync() {
    [0, 300, 900, 1800].forEach((delay) => {
      window.setTimeout(syncDominantPosToAppData, delay);
    });
  }

  async function loadData() {
    if (udState.promise) return udState.promise;

    udState.promise = Promise.all([
      fetch(SUMMARY_URL, { cache: 'no-cache' }),
      fetch(LABELS_URL, { cache: 'no-cache' }),
      fetch(VOCABULARY_URL),
    ]).then(async ([summaryResponse, labelsResponse, vocabularyResponse]) => {
      if (!summaryResponse.ok || !labelsResponse.ok || !vocabularyResponse.ok) {
        throw new Error('UD or vocabulary data request failed');
      }
      const [summary, labels, vocabulary] = await Promise.all([
        summaryResponse.json(),
        labelsResponse.json(),
        vocabularyResponse.json(),
      ]);
      if (!Array.isArray(summary.words) || !Array.isArray(vocabulary.words)) {
        throw new Error('Invalid UD or vocabulary schema');
      }
      udState.labels = labels;
      udState.wordsByForm = new Map(
        summary.words.map((row) => [normalizeWord(row.word), row]),
      );
      udState.frequencyByForm = new Map(
        vocabulary.words.map((row) => [normalizeWord(row.word), row]),
      );
      scheduleDominantPosSync();
      return summary;
    }).catch((error) => {
      udState.promise = null;
      throw error;
    });

    return udState.promise;
  }

  function renderTreebanks(row) {
    const entries = Object.entries(row.treebanks || {})
      .map(([treebank, count]) => ({ treebank, count: Number(count) || 0 }))
      .sort((a, b) => b.count - a.count);

    return makeProgressRows(entries, {
      label: (item) => `<strong class="ud-code">${escapeHtml(item.treebank)}</strong>`,
      secondary: (item) => escapeHtml(TREEBANK_LABELS[item.treebank] || item.treebank),
      value: (item) => `${formatNumber(item.count)} · ${formatPercent(item.count / row.occurrences * 100)}`,
      percent: (item) => item.count / row.occurrences * 100,
    });
  }

  function renderUpos(row) {
    const rows = Array.isArray(row.upos) ? row.upos : [];
    if (!rows.length) {
      return '<p class="ud-empty-note">این صورت به‌عنوان یک توکن ساده UPOS ندارد؛ تحلیل اجزای آن در بخش ساخت چندواژه‌ای آمده است.</p>';
    }

    return makeProgressRows(rows, {
      label: (item) => `${escapeHtml(getUposLabel(item.tag))} <span class="ud-code">${escapeHtml(item.tag)}</span>`,
      value: (item) => `${formatPercent(item.percent)} · ${formatNumber(item.count)}`,
      percent: (item) => item.percent,
    });
  }

  function renderLemmas(row) {
    const lemmas = Array.isArray(row.lemmas) ? row.lemmas : [];
    if (!lemmas.length) {
      return '<p class="ud-empty-note">برای کل این صورت lemma واحد ثبت نشده است؛ lemma اجزا پایین‌تر نمایش داده می‌شود.</p>';
    }

    return `<div class="ud-chip-list">${lemmas.map((item) => `
      <span class="ud-chip" title="${formatNumber(item.count)} رخداد">
        <b class="ud-ltr">${escapeHtml(item.lemma)}</b>
        <small>${formatPercent(item.percent)}</small>
      </span>`).join('')}</div>`;
  }

  function highlightTarget(text, targetForm) {
    const safeText = escapeHtml(text);
    const safeTarget = escapeHtml(targetForm || '');
    if (!safeTarget) return safeText;
    try {
      const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(safeTarget)})(?=$|[^\\p{L}\\p{N}])`, 'iu');
      return safeText.replace(pattern, '$1<mark>$2</mark>');
    } catch (error) {
      return safeText;
    }
  }

  function renderUdExample(example, compact = false) {
    if (!example?.text) return '';
    const source = [example.treebank, example.split].filter(Boolean).join(' · ');
    return `
      <figure class="ud-example ${compact ? 'is-compact' : ''}">
        <blockquote lang="fi" dir="ltr">${highlightTarget(example.text, example.target_form)}</blockquote>
        <figcaption>
          <span>${escapeHtml(source || 'UD')}</span>
          ${example.target_lemma ? `<span>lemma: <b class="ud-ltr">${escapeHtml(example.target_lemma)}</b></span>` : ''}
        </figcaption>
      </figure>`;
  }

  function renderCorpusExamples(row) {
    const examples = Array.isArray(row.examples) ? row.examples : [];
    if (!examples.length) return '';
    return `
      <article class="ud-card ud-examples-card">
        <header class="ud-card-header">
          <div><h3>مثال‌های واقعی از پیکره</h3><span>UD sentences</span></div>
          <span class="ud-disclosure-count">${formatNumber(examples.length)} مثال</span>
        </header>
        <div class="ud-example-list">${examples.map((example) => renderUdExample(example)).join('')}</div>
      </article>`;
  }

  function renderFeatureValues(feature) {
    return `<div class="ud-feature-values">${(feature.values || []).map((item) => {
      const translated = getFeatureValueLabel(feature.name, item.value);
      return `
        <div class="ud-feature-value">
          <div class="ud-value-chip" title="${formatNumber(item.count)} رخداد">
            <span class="ud-code">${escapeHtml(item.value)}</span>
            ${translated ? `<span>${escapeHtml(translated)}</span>` : ''}
            <b>${formatPercent(item.percent)}</b>
          </div>
          ${item.example ? renderUdExample(item.example, true) : ''}
        </div>`;
    }).join('')}</div>`;
  }

  function renderFeatures(row) {
    const features = Array.isArray(row.features) ? row.features : [];
    if (!features.length) {
      return '<p class="ud-empty-note">برای این صورت ویژگی صرفی مستقلی ثبت نشده است.</p>';
    }

    return `<div class="ud-feature-grid">${features.map((feature) => `
      <article class="ud-feature-card">
        <header>
          <div>
            <strong>${escapeHtml(getFeatureLabel(feature.name))}</strong>
            <span class="ud-code">${escapeHtml(feature.name)}</span>
          </div>
          <small>در ${formatPercent(feature.coverage_percent)} شواهد</small>
        </header>
        ${renderFeatureValues(feature)}
      </article>`).join('')}</div>`;
  }

  function renderContext(rows, role) {
    if (!rows?.length) return '';
    return `<div class="ud-context-list">${rows.map((item) => `
      <span title="${formatNumber(item.count)} بار">
        <b class="ud-ltr">${escapeHtml(item.form)}</b>
        <small>${escapeHtml(item.lemma)} · ${escapeHtml(item.upos)}</small>
      </span>`).join('')}</div>
      <span class="ud-context-caption">${role}</span>`;
  }

  function renderDependencyRows(rows, contextKey, contextLabel) {
    if (!rows?.length) return '<p class="ud-empty-note">داده‌ای ثبت نشده است.</p>';

    return `<div class="ud-dependency-list">${rows.map((item) => `
      <article class="ud-dependency-row">
        <div class="ud-dependency-main">
          <div>
            <strong>${escapeHtml(getRelationLabel(item.relation))}</strong>
            <span class="ud-code">${escapeHtml(item.relation)}</span>
          </div>
          <span>${formatPercent(item.percent)} · ${formatNumber(item.count)}</span>
        </div>
        <div class="ud-progress-track" aria-hidden="true"><span style="width:${Math.max(0, Math.min(100, Number(item.percent) || 0))}%"></span></div>
        ${renderContext(item[contextKey], contextLabel)}
      </article>`).join('')}</div>`;
  }

  function renderFeatBadges(feats) {
    if (!feats || typeof feats !== 'object') return '';
    const badges = [];
    Object.entries(feats).forEach(([name, values]) => {
      (Array.isArray(values) ? values : [values]).forEach((value) => {
        const translated = getFeatureValueLabel(name, value);
        badges.push(`<span title="${escapeHtml(getFeatureLabel(name))}">${escapeHtml(name)}=${escapeHtml(value)}${translated ? ` · ${escapeHtml(translated)}` : ''}</span>`);
      });
    });
    return badges.length ? `<div class="ud-analysis-feats">${badges.join('')}</div>` : '';
  }

  function renderMultiwordComponents(analysis) {
    if (analysis.kind !== 'multiword_token' || !analysis.components?.length) return '';
    return `
      <div class="ud-multiword-components">
        ${analysis.components.map((component, index) => `
          ${index ? '<span class="ud-plus">+</span>' : ''}
          <div class="ud-component">
            <b class="ud-ltr">${escapeHtml(component.form)}</b>
            <span>${escapeHtml(component.lemma)}</span>
            <small>${escapeHtml(getUposLabel(component.upos))} · <span class="ud-code">${escapeHtml(component.upos)}</span></small>
            ${renderFeatBadges(component.feats)}
          </div>`).join('')}
      </div>`;
  }

  function renderAnalyses(row) {
    const analyses = Array.isArray(row.analyses) ? row.analyses : [];
    if (!analyses.length) return '<p class="ud-empty-note">تحلیل ترکیبی ثبت نشده است.</p>';

    return `<div class="ud-analysis-list">${analyses.map((analysis, index) => `
      <article class="ud-analysis-row">
        <div class="ud-analysis-rank">${formatNumber(index + 1)}</div>
        <div class="ud-analysis-body">
          <div class="ud-analysis-heading">
            <div>
              ${analysis.kind === 'multiword_token'
                ? '<strong>ساخت چندواژه‌ای</strong>'
                : `<strong class="ud-ltr">${escapeHtml(analysis.lemma || '—')}</strong>
                   <span>${escapeHtml(getUposLabel(analysis.upos))} · <span class="ud-code">${escapeHtml(analysis.upos || 'X')}</span></span>`}
            </div>
            <span>${formatPercent(analysis.percent)} · ${formatNumber(analysis.count)}</span>
          </div>
          ${renderFeatBadges(analysis.feats)}
          ${renderMultiwordComponents(analysis)}
        </div>
      </article>`).join('')}</div>`;
  }

  function renderMultiwordNotice(row) {
    const count = Number(row.surface_kinds?.multiword_token) || 0;
    if (!count) return '';
    const analysis = (row.analyses || []).find((item) => item.kind === 'multiword_token');
    return `
      <aside class="ud-multiword-notice">
        <div>
          <span class="ud-badge">Multiword token</span>
          <strong>این صورت در CoNLL-U از چند جزء نحوی ساخته شده است.</strong>
          <p>${formatNumber(count)} رخداد به شکل چندواژه‌ای ثبت شده؛ بنابراین نوع واژه و ویژگی‌ها برای هر جزء جداگانه تحلیل می‌شوند.</p>
        </div>
        ${analysis ? renderMultiwordComponents(analysis) : ''}
      </aside>`;
  }

  function applyCurrentDominantPos(row) {
    const detailPos = document.getElementById('detail-pos');
    const dominant = getDominantUpos(row);
    if (!detailPos || !dominant?.tag) return;
    detailPos.textContent = getUposLabel(dominant.tag);
    detailPos.title = `${dominant.tag} · ${formatPercent(dominant.percent)} از رخدادهای UD`;
    detailPos.dataset.udUpos = dominant.tag;
  }

  function renderWord(row) {
    const section = ensureSection();
    if (!section) return;

    applyCurrentDominantPos(row);
    const treebankCount = Object.values(row.treebanks || {}).filter((count) => Number(count) > 0).length;
    const surfaceTokenCount = Number(row.surface_kinds?.token) || 0;
    const uposNote = row.upos_observed_occurrences < row.occurrences
      ? `<p class="ud-card-note">درصدهای UPOS بر پایه ${formatNumber(row.upos_observed_occurrences)} توکن ساده محاسبه شده‌اند؛ ${formatNumber(row.occurrences - row.upos_observed_occurrences)} رخداد چندواژه‌ای جداگانه تحلیل شده است.</p>`
      : '';

    section.hidden = false;
    section.innerHTML = `
      <div class="ud-section-header">
        <div>
          <span class="ud-kicker">تحلیل پیکره‌ای UD 2.18</span>
          <h2>این واژه در متن‌های واقعی چگونه به‌کار رفته است؟</h2>
          <p>آمار و مثال‌ها از برچسب‌گذاری دستوری و نحوی چهار treebank فنلاندی استخراج شده‌اند.</p>
        </div>
        <span class="ud-evidence-badge">${formatNumber(row.occurrences)} رخداد</span>
      </div>

      <div class="ud-stat-grid">
        <div class="ud-stat"><span>شواهد</span><strong>${formatNumber(row.occurrences)}</strong><small>${formatNumber(surfaceTokenCount)} توکن ساده</small></div>
        <div class="ud-stat"><span>پیکره‌ها</span><strong>${formatNumber(treebankCount)}</strong><small>TDT · FTB · PUD · OOD</small></div>
        <div class="ud-stat"><span>تحلیل غالب</span><strong>${formatPercent(row.dominant_analysis_percent)}</strong><small>${escapeHtml(CONFIDENCE_LABELS[row.analysis_confidence] || 'متنوع')}</small></div>
      </div>

      ${renderMultiwordNotice(row)}

      <div class="ud-primary-grid">
        <article class="ud-card">
          <header class="ud-card-header">
            <div><h3>نوع واژه</h3><span>UPOS</span></div>
            ${row.ambiguous_upos ? '<span class="ud-badge is-warning">چندکارکردی</span>' : ''}
          </header>
          ${renderUpos(row)}
          ${uposNote}
        </article>

        <article class="ud-card">
          <header class="ud-card-header"><div><h3>توزیع در پیکره‌ها</h3><span>Treebanks</span></div></header>
          ${renderTreebanks(row)}
        </article>
      </div>

      <article class="ud-card ud-lemma-card">
        <header class="ud-card-header"><div><h3>شکل‌های پایه مشاهده‌شده</h3><span>Lemma</span></div></header>
        ${renderLemmas(row)}
      </article>

      ${renderCorpusExamples(row)}

      <details class="ud-disclosure">
        <summary>
          <span><strong>ویژگی‌های صرفی همراه مثال</strong><small>FEATS، مقدارها و یک جمله واقعی برای هر مقدار موجود</small></span>
          <span class="ud-disclosure-count">${formatNumber(row.features?.length || 0)} گروه</span>
        </summary>
        <div class="ud-disclosure-body">${renderFeatures(row)}</div>
      </details>

      <details class="ud-disclosure">
        <summary>
          <span><strong>نقش‌های نحوی</strong><small>جایگاه واژه در dependency tree</small></span>
          <span class="ud-disclosure-count">DEPREL</span>
        </summary>
        <div class="ud-disclosure-body">
          <div class="ud-subsection">
            <h3>وقتی این واژه وابسته است</h3>
            <p>رابطه واژه با هسته نحوی خود</p>
            ${renderDependencyRows(row.dependency_as_dependent, 'common_heads', 'هسته‌های رایج')}
          </div>
          <div class="ud-subsection">
            <h3>وقتی واژه هسته است</h3>
            <p>${formatNumber(row.dependency_as_head?.link_count || 0)} پیوند به وابسته‌های آن ثبت شده است.</p>
            ${renderDependencyRows(row.dependency_as_head?.relations, 'common_dependents', 'وابسته‌های رایج')}
          </div>
        </div>
      </details>

      <details class="ud-disclosure">
        <summary>
          <span><strong>تحلیل‌های ترکیبی پرتکرار</strong><small>Lemma + UPOS + FEATS</small></span>
          <span class="ud-disclosure-count">${formatNumber(row.analyses?.length || 0)} مورد</span>
        </summary>
        <div class="ud-disclosure-body">${renderAnalyses(row)}</div>
      </details>

      <p class="ud-source-note">درصدهای UD سهم رخدادهای همین صورت واژگانی در treebankهای بارگذاری‌شده‌اند. تعداد و درصد کنار رتبه بسامد، جداگانه از فهرست اصلی Parole می‌آیند.</p>`;
  }

  async function refreshForCurrentWord(force = false) {
    const wordElement = document.getElementById('detail-word');
    const word = wordElement?.textContent?.trim() || '';
    if (!word) return;
    const normalized = normalizeWord(word);
    if (!force && normalized === udState.lastWord) return;
    udState.lastWord = normalized;

    renderStatus('در حال بارگذاری تحلیل پیکره‌ای…');
    try {
      await loadData();
      if (normalizeWord(document.getElementById('detail-word')?.textContent) !== normalized) return;
      updateFrequencyInfo(normalized);
      syncDominantPosToAppData();
      const row = udState.wordsByForm.get(normalized);
      if (!row) {
        renderStatus('برای این واژه تحلیل UD پیدا نشد.', 'error');
        return;
      }
      renderWord(row);
    } catch (error) {
      console.error('Failed to load UD analysis:', error);
      renderStatus('بارگذاری تحلیل پیکره‌ای ناموفق بود. صفحه را دوباره باز کن.', 'error');
    }
  }

  function initialize() {
    ensureSection();
    ensureFrequencyInfo();
    bindFrequencyDismissEvents();
    const wordElement = document.getElementById('detail-word');
    if (!wordElement) return;

    const observer = new MutationObserver(() => refreshForCurrentWord());
    observer.observe(wordElement, { childList: true, characterData: true, subtree: true });

    loadData().then(() => {
      scheduleDominantPosSync();
      const currentWord = normalizeWord(wordElement.textContent);
      if (currentWord) updateFrequencyInfo(currentWord);
    }).catch((error) => {
      console.error('Failed to preload UD analysis:', error);
    });

    if (wordElement.textContent.trim()) {
      refreshForCurrentWord(true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
