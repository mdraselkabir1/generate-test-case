(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────────
  const openBtn     = document.getElementById('openGuideBtn');
  const closeBtn    = document.getElementById('closeGuideBtn');
  const overlay     = document.getElementById('guideOverlay');
  const drawer      = document.getElementById('methodologyDrawer');
  const sidebar     = document.getElementById('guideSidebar');
  const content     = document.getElementById('guideContent');
  const searchInput = document.getElementById('guideSearch');

  // ── State ─────────────────────────────────────────────────────────
  let currentId = null;
  let focusTrapActive = false;

  // ── Category display order and labels ────────────────────────────
  const CATEGORY_ORDER = ['manual', 'technical', 'non-functional'];
  const CATEGORY_LABELS = {
    manual:           'Manual',
    technical:        'Technical',
    'non-functional': 'Non-Functional',
  };

  // ── Effort badge CSS class ────────────────────────────────────────
  function effortClass(level) {
    return { Low: 'effort-low', Medium: 'effort-medium', High: 'effort-high', Expert: 'effort-expert' }[level] || '';
  }

  // ── Escape HTML ───────────────────────────────────────────────────
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Open drawer ───────────────────────────────────────────────────
  function openGuide() {
    if (typeof METHODOLOGY === 'undefined' || !METHODOLOGY.length) {
      content.innerHTML = '<p class="guide-content-placeholder">Guide content unavailable. Please reload the page.</p>';
      overlay.classList.remove('hidden');
      drawer.classList.add('active');
      openBtn.setAttribute('aria-expanded', 'true');
      return;
    }
    searchInput.value = '';
    renderSidebar('');
    const firstId = METHODOLOGY[0].id;
    selectEntry(firstId);
    overlay.classList.remove('hidden');
    drawer.classList.add('active');
    openBtn.setAttribute('aria-expanded', 'true');
    searchInput.focus();
    activateFocusTrap();
  }

  // ── Close drawer ──────────────────────────────────────────────────
  function closeGuide() {
    overlay.classList.add('hidden');
    drawer.classList.remove('active');
    openBtn.setAttribute('aria-expanded', 'false');
    deactivateFocusTrap();
    openBtn.focus();
  }

  // ── Render sidebar ────────────────────────────────────────────────
  function renderSidebar(filter) {
    const q = filter.toLowerCase().trim();
    const filtered = q
      ? METHODOLOGY.filter(e =>
          [e.name, e.standard, e.category, e.id].some(f => f.toLowerCase().includes(q))
        )
      : METHODOLOGY;

    if (filtered.length === 0) {
      sidebar.innerHTML = `<div class="guide-no-results">No results for "${esc(filter)}"</div>`;
      content.innerHTML = '<p class="guide-content-placeholder">No matching methodologies.</p>';
      currentId = null;
      return;
    }

    // Group by category in defined order
    const groups = {};
    CATEGORY_ORDER.forEach(cat => { groups[cat] = []; });
    filtered.forEach(e => {
      if (groups[e.category]) groups[e.category].push(e);
    });

    let html = '';
    CATEGORY_ORDER.forEach(cat => {
      if (!groups[cat].length) return;
      html += `<div class="guide-group-label">${esc(CATEGORY_LABELS[cat])}</div>`;
      groups[cat].forEach(e => {
        const active = e.id === currentId ? ' active' : '';
        html += `<button class="guide-sidebar-item${active}" data-id="${esc(e.id)}" tabindex="0">
          <i class="fas ${esc(e.icon)}"></i> ${esc(e.name)}
        </button>`;
      });
    });

    sidebar.innerHTML = html;

    // Wire sidebar item clicks
    sidebar.querySelectorAll('.guide-sidebar-item').forEach(btn => {
      btn.addEventListener('click', () => selectEntry(btn.dataset.id));
    });
  }

  // ── Select entry ──────────────────────────────────────────────────
  function selectEntry(id) {
    const entry = METHODOLOGY.find(e => e.id === id) || METHODOLOGY[0];
    currentId = entry.id;

    // Update active state in sidebar
    sidebar.querySelectorAll('.guide-sidebar-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.id === currentId);
    });

    renderEntry(entry);
    content.scrollTop = 0;
  }

  // ── Render entry (right panel) ────────────────────────────────────
  function renderEntry(e) {
    const standardTags = e.standard.split(',').map(s =>
      `<span class="guide-tag">${esc(s.trim())}</span>`
    ).join('');

    const whenToUseItems = e.whenToUse.map(item =>
      `<li><span class="guide-icon guide-icon-check"><i class="fas fa-check"></i></span>${esc(item)}</li>`
    ).join('');

    const whenNotItems = e.whenNotToUse.map(item =>
      `<li><span class="guide-icon guide-icon-cross"><i class="fas fa-times"></i></span>${esc(item)}</li>`
    ).join('');

    const processItems = e.process.map((step, i) =>
      `<li><span class="guide-icon guide-icon-step">${i + 1}.</span>${esc(step)}</li>`
    ).join('');

    const checklistItems = e.keyChecklist.map(item =>
      `<li><span class="guide-icon guide-icon-check-box"><i class="fas fa-square-check"></i></span>${esc(item)}</li>`
    ).join('');

    const pitfallItems = e.commonPitfalls.map(item =>
      `<li><span class="guide-icon guide-icon-warn"><i class="fas fa-triangle-exclamation"></i></span>${esc(item)}</li>`
    ).join('');

    const toolRows = e.tools.map(t =>
      `<tr><td>${esc(t.name)}</td><td>${esc(t.purpose)}</td></tr>`
    ).join('');

    const objectiveItems = e.sampleObjectives.map((obj, i) =>
      `<li><span class="guide-icon guide-icon-obj">${i + 1}.</span>${esc(obj)}</li>`
    ).join('');

    const resourceItems = e.externalResources.map(r =>
      `<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">
        <i class="fas fa-external-link-alt"></i> ${esc(r.title)}
      </a></li>`
    ).join('');

    content.innerHTML = `
      <h2 class="guide-entry-name">${esc(e.name)}</h2>
      <div class="guide-badges">
        <span class="guide-badge ${effortClass(e.effortLevel)}">★ ${esc(e.effortLevel)} effort</span>
        <span class="guide-badge">Skill: ${esc(e.skillLevel)}</span>
      </div>
      <div class="guide-tags">${standardTags}</div>

      <div class="guide-section">
        <h3 class="guide-section-title">Purpose</h3>
        <p>${esc(e.purpose)}</p>
      </div>

      <div class="guide-section">
        <h3 class="guide-section-title">When to Use</h3>
        <ul class="guide-list">${whenToUseItems}</ul>
      </div>

      <div class="guide-section">
        <h3 class="guide-section-title">When NOT to Use</h3>
        <ul class="guide-list">${whenNotItems}</ul>
      </div>

      <div class="guide-section">
        <h3 class="guide-section-title">Process</h3>
        <ul class="guide-list">${processItems}</ul>
      </div>

      <div class="guide-section">
        <h3 class="guide-section-title">Key Checklist</h3>
        <ul class="guide-list">${checklistItems}</ul>
      </div>

      <div class="guide-section">
        <h3 class="guide-section-title">Common Pitfalls</h3>
        <ul class="guide-list">${pitfallItems}</ul>
      </div>

      <div class="guide-section">
        <h3 class="guide-section-title">Tools</h3>
        <table class="guide-tools-table">
          <thead><tr><th>Tool</th><th>Purpose</th></tr></thead>
          <tbody>${toolRows}</tbody>
        </table>
      </div>

      <div class="guide-section">
        <h3 class="guide-section-title">Sample Objectives</h3>
        <ul class="guide-list">${objectiveItems}</ul>
      </div>

      <div class="guide-section">
        <h3 class="guide-section-title">External Resources</h3>
        <ul class="guide-resources-list">${resourceItems}</ul>
      </div>
    `;
  }

  // ── Search ────────────────────────────────────────────────────────
  searchInput.addEventListener('input', () => {
    const q = searchInput.value;
    renderSidebar(q);
    // Select first visible item after filter
    const firstItem = sidebar.querySelector('.guide-sidebar-item');
    if (firstItem) selectEntry(firstItem.dataset.id);
  });

  // ── Focus trap stubs (replaced in Task 6) ────────────────────────
  // These must exist so openGuide/closeGuide work after Task 5.
  // Task 6 will replace this entire block with the full implementation.
  function activateFocusTrap() { focusTrapActive = true; }
  function deactivateFocusTrap() { focusTrapActive = false; }
  function getFocusable() { return []; }

  // ── Keyboard: Escape closes drawer ────────────────────────────────
  // Task 6 will DELETE this listener and replace it with the combined
  // Escape + Tab-trap + arrow-key listener.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('active')) {
      closeGuide();
    }
  });

  // ── Wire trigger buttons ──────────────────────────────────────────
  openBtn.addEventListener('click', openGuide);
  closeBtn.addEventListener('click', closeGuide);
  overlay.addEventListener('click', closeGuide);

  // ── Wire initialisation on DOM ready ─────────────────────────────
  // (Script loads after DOM via defer or end-of-body placement)

})();
