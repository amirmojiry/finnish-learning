(() => {
  'use strict';

  const SUMMARY_URL = 'data/ud/word-summary.json?v=20260731-1';
  const LABELS_URL = 'data/ud/labels-fa.json?v=20260731-1';
  const SECTION_ID = 'ud-analysis-section';

  const numberFormatter = new Intl.NumberFormat('fa-IR');
  const percentFormatter = new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: 1,
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

  const state = {
    promise: null,
    wordsByForm: new Map(),
    labels: null,
    lastWord: '',
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

  function formatNumber(value) {
    return numberFormatter.format(Number(value) || 0);
  }

  function formatPercent(value) {
    return `${percentFormatter.format(Number(value) || 0)}٪`;
  }

  function getUposLabel(tag) {
    return state.labels?.upos?.[tag] || tag || 'نامشخص';
  }

  function getFeatureLabel(name) {
    return state.labels?.features?.[name] || name;
  }

  function getFeatureValueLabel(feature, value) {
    return FEATURE_VALUE_LABELS[feature]?.[value] || '';
  }

  function getRelationLabel(relation) {
    const base = String(relation || 'dep').split(':')[0];
    return state.labels?.dependency_relations?.[base] || base;
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

  function ensureSection() {
    let section = document.getElementById(SECTION_ID);
    if (section) return section;

    const detail = document.getElementById('dictionary-detail');
    const meta = detail?.querySelector('.word-detail-meta');
    if (!detail || !meta) return null;

    section = document.createElement('section');
    section.id = SECTION_ID;
    section.className = 'ud-analysis-section';
    section.hidden = true;
    section.setAttribute('aria-live', 'polite');
    meta.insertAdjacentElement('afterend', section);
    return section;
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

  async function loadData() {
    if (state.promise) return state.promise;

    state.promise = Promise.all([
      fetch(SUMMARY_URL, { cache: 'no-cache' }),
      fetch(LABELS_URL, { cache: 'no-cache' }),
    ]).then(async ([summaryResponse, labelsResponse]) => {
      if (!summaryResponse.ok || !labelsResponse.ok) {
        throw new Error('UD data request failed');
      }
      const [summary, labels] = await Promise.all([
        summaryResponse.json(),
        labelsResponse.json(),
      ]);
      if (!Array.isArray(summary.words)) {
        throw new Error('Invalid UD summary schema');
      }
      state.labels = labels;
      state.wordsByForm = new Map(
        summary.words.map((row) => [normalizeWord(row.word), row]),
      );
      return summary;
    }).catch((error) => {
      state.promise = null;
      throw error;
    });

    return state.promise;
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

  function renderFeatureValues(feature) {
    return (feature.values || []).map((item) => {
      const translated = getFeatureValueLabel(feature.name, item.value);
      return `
        <span class="ud-value-chip" title="${formatNumber(item.count)} رخداد">
          <span class="ud-code">${escapeHtml(item.value)}</span>
          ${translated ? `<span>${escapeHtml(translated)}</span>` : ''}
          <b>${formatPercent(item.percent)}</b>
        </span>`;
    }).join('');
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
        <div class="ud-value-list">${renderFeatureValues(feature)}</div>
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

  function renderWord(row) {
    const section = ensureSection();
    if (!section) return;

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
          <p>آمار زیر از برچسب‌گذاری دستوری و نحوی چهار treebank فنلاندی استخراج شده است.</p>
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

      <details class="ud-disclosure">
        <summary>
          <span><strong>ویژگی‌های صرفی</strong><small>FEATS و مقدارهای مشاهده‌شده</small></span>
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

      <p class="ud-source-note">درصدها سهم رخدادهای همین صورت واژگانی در فایل‌های بارگذاری‌شده UD هستند و لزوماً توزیع کل زبان فنلاندی را نشان نمی‌دهند.</p>`;
  }

  async function refreshForCurrentWord(force = false) {
    const wordElement = document.getElementById('detail-word');
    const word = wordElement?.textContent?.trim() || '';
    if (!word) return;
    const normalized = normalizeWord(word);
    if (!force && normalized === state.lastWord) return;
    state.lastWord = normalized;

    renderStatus('در حال بارگذاری تحلیل پیکره‌ای…');
    try {
      await loadData();
      if (normalizeWord(document.getElementById('detail-word')?.textContent) !== normalized) return;
      const row = state.wordsByForm.get(normalized);
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
    const wordElement = document.getElementById('detail-word');
    if (!wordElement) return;

    const observer = new MutationObserver(() => refreshForCurrentWord());
    observer.observe(wordElement, { childList: true, characterData: true, subtree: true });

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
