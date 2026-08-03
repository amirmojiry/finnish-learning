(() => {
  'use strict';

  const SECTION_ID = 'ud-analysis-section';
  const CONTAINER_CLASS = 'ud-analysis-container';
  let wrapping = false;

  function makeSummary() {
    const summary = document.createElement('summary');
    summary.className = 'ud-analysis-summary';
    summary.innerHTML = `
      <div>
        <span class="ud-kicker">تحلیل پیکره‌ای UD 2.18</span>
        <h2>تحلیل پیکره‌ای واژه</h2>
        <p>کاربرد واقعی، نقش دستوری، ساخت صرفی و مثال‌های این واژه در پیکره‌های فنلاندی</p>
      </div>`;
    return summary;
  }

  function wrapAnalysis(section) {
    if (!section || section.hidden || wrapping) return;
    if (section.querySelector(`:scope > details.${CONTAINER_CLASS}`)) return;
    if (!section.firstChild) return;

    wrapping = true;
    try {
      const details = document.createElement('details');
      details.className = CONTAINER_CLASS;

      const content = document.createElement('div');
      content.className = 'ud-analysis-content';
      while (section.firstChild) content.appendChild(section.firstChild);

      details.append(makeSummary(), content);
      section.appendChild(details);
    } finally {
      wrapping = false;
    }
  }

  function initialize() {
    const section = document.getElementById(SECTION_ID);
    if (!section) return;

    const observer = new MutationObserver(() => wrapAnalysis(section));
    observer.observe(section, { childList: true });
    wrapAnalysis(section);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
