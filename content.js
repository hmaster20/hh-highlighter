(() => {
  'use strict';
  const HIGHLIGHT_COLOR = '#808080'; // Заменен красный цвет на серый
  // ===== Стили =====
  const style = document.createElement('style');
  style.textContent = `
    /* Ссылка и её потомки */
    a.hh-visited, .hh-visited a, a.hh-visited:visited, .hh-visited a:visited,
    a.hh-visited *, .hh-visited a * {
      color: ${HIGHLIGHT_COLOR} !important;
      text-decoration: underline !important;
    }
    /* Заголовок вакансии внутри отмеченной карточки (CSS-слой) */
    .hh-visited-card [data-qa="serp-item__title"],
    .hh-visited-card [data-qa="serp-item__title"] *,
    .hh-visited-card [data-qa="serp-item__title-text"],
    .hh-visited-card [data-qa="serp-item__title-text"] * {
      color: ${HIGHLIGHT_COLOR} !important;
      text-decoration: underline !important;
    }
    /* Рамка */
    .hh-visited-card {
      position: relative !important;
      outline: 2px solid ${HIGHLIGHT_COLOR} !important;
      outline-offset: 6px !important;
      border-radius: 6px !important;
    }
    /* Полупрозрачное затемнение внутри рамки (20% серым) */
    .hh-visited-card::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(128, 128, 128, 0.2) !important;
      pointer-events: none;
      z-index: 1;
      border-radius: 6px;
    }
    /* Поднимаем содержимое над затемнением */
    .hh-visited-card > * {
      position: relative !important;
      z-index: 2 !important;
    }
  `;
  document.documentElement.appendChild(style);
  // ===== Утилиты =====
  const LINK_SELECTORS = [
    'a[data-qa="serp-item__title"]',
    'a[href*="/vacancy/"]',
    'a[href*="/resume/"]',
    'a.magritte-link_enable-visited___Biyib_6-0-5',
  ];
  const PROCESSED_LINKS = new WeakSet();
  const PROCESSED_CARDS = new WeakSet();
  function extractIdFromHref(href) {
    try {
      const u = new URL(href, location.origin);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && (parts[0] === 'vacancy' || parts[0] === 'resume')) {
        return `${parts[0]}:${parts[1]}`;
      }
      const qid = u.searchParams.get('vacancyId');
      if (qid) return `vacancy:${qid}`;
    } catch {}
    return null;
  }
  function closestCard(el) {
    return el.closest?.('[data-qa="serp-item"]')
      || el.closest?.('[data-qa="vacancy-serp__vacancy"]')
      || el.closest?.('[class*="vacancy-card"]')
      || el.closest?.('[data-qa*="vacancy-serp"]')
      || el.closest?.('article, li, div');
  }
  function getCardId(card) {
    if (!card) return null;
    if (card.__hhId) return card.__hhId;
    const cached = card.getAttribute('data-hh-id');
    if (cached) { card.__hhId = cached; return cached; }
    const btn = card.querySelector('a[data-qa="vacancy-serp__vacancy_response"][href*="vacancyId="]');
    if (btn) {
      const id = extractIdFromHref(btn.href);
      if (id) { card.setAttribute('data-hh-id', id); card.__hhId = id; return id; }
    }
    const aVac = card.querySelector('a[href*="/vacancy/"]');
    if (aVac) {
      const id = extractIdFromHref(aVac.href);
      if (id) { card.setAttribute('data-hh-id', id); card.__hhId = id; return id; }
    }
    return null;
  }
  // Рекламные ссылки → канон
  function canonicalizeAdsLinkOnce(a, card) {
    if (a.__hhCanonDone) return;
    if (/adsrv\.hh\.ru\/click/.test(a.href)) {
      const id = getCardId(card);
      if (id) {
        const vid = id.split(':')[1];
        a.href = `${location.origin}/vacancy/${vid}`;
      }
    }
    a.__hhCanonDone = true;
  }
  const key = id => `hh-visited:${id}`;
  const markVisitedId = id => id && localStorage.setItem(key(id), '1');
  const isVisited = id => !!id && localStorage.getItem(key(id)) === '1';
  (function markCurrentPage() {
    const id = extractIdFromHref(location.href);
    if (id) markVisitedId(id);
  })();
  function paintTitleStrong(card) {
    if (!card) return;
    const nodes = card.querySelectorAll('[data-qa="serp-item__title"], [data-qa="serp-item__title-text"]');
    if (!nodes.length) return;
    const paint = () => {
      nodes.forEach(n => {
        n.style.setProperty('color', HIGHLIGHT_COLOR, 'important');
        n.style.setProperty('text-decoration', 'underline', 'important');
      });
    };
    paint();
    requestAnimationFrame(paint);
    setTimeout(paint, 50);
  }
  function markCardAndLink(card, a) {
    if (card && !PROCESSED_CARDS.has(card)) {
      card.classList.add('hh-visited-card');
      PROCESSED_CARDS.add(card);
    }
    if (a) a.classList.add('hh-visited');
    // ключевое: красим заголовок внутри карточки
    paintTitleStrong(card);
  }
  function applyHighlightToLink(a) {
    const card = closestCard(a);
    let id = card ? getCardId(card) : null;
    if (!id) id = extractIdFromHref(a.href);
    if (!id || !isVisited(id)) return;
    markCardAndLink(card, a);
  }
  function wireLink(a) {
    if (PROCESSED_LINKS.has(a)) return;
    PROCESSED_LINKS.add(a);
    const card = closestCard(a);
    if (card) canonicalizeAdsLinkOnce(a, card);
    const markNow = () => {
      const c = closestCard(a);
      let id = c ? getCardId(c) : null;
      if (!id) id = extractIdFromHref(a.href);
      if (id) { markVisitedId(id); markCardAndLink(c, a); }
    };
    a.addEventListener('mousedown', markNow, { capture: true });
    a.addEventListener('auxclick',  markNow, { capture: true });
    a.addEventListener('click',     markNow, { capture: true });
    applyHighlightToLink(a);
  }
  function processNode(node) {
    if (node.nodeType !== 1) return;
    if (node.matches?.(LINK_SELECTORS.join(','))) {
      wireLink(node);
      return;
    }
    node.querySelectorAll?.(LINK_SELECTORS.join(',')).forEach(wireLink);
  }
  // Старт
  document.querySelectorAll(LINK_SELECTORS.join(',')).forEach(wireLink);
  let queued = false;
  const queueProcess = (targets) => {
    if (queued) return;
    queued = true;
    (window.requestIdleCallback || window.requestAnimationFrame)(() => {
      queued = false;
      targets.forEach(t => {
        if (t.matches?.('[data-qa="serp-item__title"], [data-qa="serp-item__title-text"]')) {
          const card = closestCard(t);
          if (card && isVisited(getCardId(card))) paintTitleStrong(card);
        } else {
          processNode(t);
        }
      });
    });
  };
  const mo = new MutationObserver(muts => {
    const targets = [];
    for (const m of muts) {
      if (m.type === 'childList') {
        m.addedNodes && m.addedNodes.forEach(n => { if (n.nodeType === 1) targets.push(n); });
      } else if (m.type === 'attributes') {
        const t = m.target;
        if (!t) continue;
        if (t.matches?.('[data-qa="serp-item__title"], [data-qa="serp-item__title-text"], ' + LINK_SELECTORS.join(','))) {
          targets.push(t);
        }
      }
    }
    if (targets.length) queueProcess(targets);
  });
  mo.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
  window.addEventListener('pageshow', () => {
    document.querySelectorAll(LINK_SELECTORS.join(',')).forEach(applyHighlightToLink);
  });
})();
