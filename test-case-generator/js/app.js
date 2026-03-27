/**
 * App Controller — wires up UI, navigation, events, and renders all pages.
 */
(function () {
  'use strict';

  // ---------- State ----------
  let currentPage = 'dashboard';
  let parsedContent = '';
  let currentPlanForModal = null;

  // ---------- DOM Refs ----------
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadTheme();
    loadSettings();
    bindNavigation();
    bindGenerator();
    bindLLM();
    bindSettings();
    bindModal();
    bindMisc();
    initBookmarklet();
    updateDashboard();

    // Go to generator if URL has #generate
    if (location.hash === '#generate') navigateTo('generator');
  }

  // ============================================================
  // Theme
  // ============================================================
  function loadTheme() {
    const settings = Storage.getSettings();
    if (settings.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      $('#themeToggle i').className = 'fas fa-sun';
    }
    $('#themeToggle').addEventListener('click', toggleTheme);
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    $('#themeToggle i').className = isDark ? 'fas fa-moon' : 'fas fa-sun';
    const settings = Storage.getSettings();
    settings.theme = isDark ? 'light' : 'dark';
    Storage.saveSettings(settings);
  }

  // ============================================================
  // Navigation
  // ============================================================
  function bindNavigation() {
    document.addEventListener('click', e => {
      const navItem = e.target.closest('.nav-item[data-page]');
      if (navItem) {
        e.preventDefault();
        navigateTo(navItem.dataset.page);
      }
    });

    // Mobile menu
    $('#mobileMenuBtn').addEventListener('click', () => {
      $('#sidebar').classList.toggle('mobile-open');
    });

    // Sidebar toggle
    $('#sidebarToggle').addEventListener('click', () => {
      $('#sidebar').classList.toggle('collapsed');
    });

    // Quick generate
    $('#quickGenerate').addEventListener('click', () => navigateTo('generator'));
  }

  function navigateTo(page) {
    currentPage = page;

    // Update nav active state
    $$('.sidebar-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Show page
    $$('.page').forEach(p => p.classList.remove('active'));
    const pageEl = $(`#page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    // Update title
    const titles = {
      dashboard: 'Dashboard',
      generator: 'Generate Test Cases',
      'test-plans': 'Test Plans',
      'test-cases': 'Test Cases',
      history: 'History',
      settings: 'Settings',
    };
    $('#pageTitle').textContent = titles[page] || page;

    // Close mobile sidebar
    $('#sidebar').classList.remove('mobile-open');

    // Refresh page data
    if (page === 'dashboard') updateDashboard();
    if (page === 'test-plans') renderTestPlans();
    if (page === 'test-cases') renderTestCases();
    if (page === 'history') renderHistory();
  }

  // ============================================================
  // Dashboard
  // ============================================================
  function updateDashboard() {
    const stats = Storage.updateStats();
    $('#totalPlans').textContent = stats.totalPlans;
    $('#totalCases').textContent = stats.totalCases;
    $('#totalDocs').textContent = stats.totalDocs;
    $('#totalUrls').textContent = stats.totalUrls;
    $('#storageCount').textContent = `${stats.totalPlans} plan${stats.totalPlans !== 1 ? 's' : ''} stored`;

    renderRecentPlans();
    renderDashboardHistory();
  }

  function renderRecentPlans() {
    const plans = Storage.getPlans().slice(0, 5);
    const container = $('#recentPlans');
    if (plans.length === 0) {
      container.innerHTML = `
        <div class="empty-state small">
          <i class="fas fa-clipboard-list"></i>
          <p>No test plans yet. Generate your first one!</p>
          <button class="btn btn-primary nav-item" data-page="generator">Get Started</button>
        </div>`;
      return;
    }

    container.innerHTML = plans.map(plan => `
      <div class="plan-card" data-plan-id="${plan.id}">
        <div class="plan-info">
          <h3>${escapeHtml(plan.name)}</h3>
          <div class="plan-meta">
            <span><i class="fas fa-vial"></i> ${plan.testCases.length} cases</span>
            <span><i class="fas fa-clock"></i> ${timeAgo(plan.createdAt)}</span>
            <span><i class="fas fa-tag"></i> ${plan.testType}</span>
          </div>
        </div>
        <div class="plan-actions">
          <button class="btn btn-sm btn-secondary view-plan-btn" data-plan-id="${plan.id}" title="View">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.view-plan-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showPlanDetail(btn.dataset.planId);
      });
    });

    container.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', () => showPlanDetail(card.dataset.planId));
    });
  }

  function renderDashboardHistory() {
    const history = Storage.getHistory().slice(0, 5);
    const container = $('#historyTimeline');
    if (history.length === 0) {
      container.innerHTML = `<div class="empty-state small"><i class="fas fa-history"></i><p>No history yet</p></div>`;
      return;
    }
    container.innerHTML = history.map(h => renderHistoryItem(h)).join('');
  }

  // ============================================================
  // Generator
  // ============================================================
  function bindGenerator() {
    // Tab switching
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $$('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        $(`#${btn.dataset.tab}`).classList.add('active');

        // Auto-enable LLM when switching to Project tab
        if (btn.dataset.tab === 'project-tab') {
          const llmCheckbox = $('#useLLM');
          if (!llmCheckbox.checked) {
            llmCheckbox.checked = true;
            $('#llmQuickConfig').classList.remove('hidden');
            const cfg = LLM.getConfig();
            cfg.enabled = true;
            LLM.saveConfig(cfg);
          }
        }
      });
    });

    // URL fetch
    $('#fetchUrlBtn').addEventListener('click', fetchUrlContent);

    // Auth toggle
    $('#authToggle').addEventListener('change', () => {
      $('#authFields').classList.toggle('hidden', !$('#authToggle').checked);
    });

    // Auth method switching
    $('#authType').addEventListener('change', () => {
      const method = $('#authType').value;
      $$('.auth-method-fields').forEach(el => el.classList.add('hidden'));
      const fieldMap = { basic: 'authBasicFields', bearer: 'authBearerFields', cookie: 'authCookieFields', form: 'authFormFields' };
      if (fieldMap[method]) $(`#${fieldMap[method]}`).classList.remove('hidden');
    });

    // File upload
    const uploadZone = $('#uploadZone');
    const fileInput = $('#fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) handleFile(fileInput.files[0]);
    });

    // Clear previews
    $('#clearUrlPreview').addEventListener('click', () => {
      $('#urlPreview').classList.add('hidden');
      $('#urlPreviewBody').textContent = '';
      parsedContent = '';
    });
    $('#clearFilePreview').addEventListener('click', () => {
      $('#filePreview').classList.add('hidden');
      $('#filePreviewBody').textContent = '';
      parsedContent = '';
      $('#fileInput').value = '';
    });

    // Project folder picker
    bindProjectFolder();

    // Generate button
    $('#generateBtn').addEventListener('click', startGeneration);
  }

  // ============================================================
  // LLM Controls
  // ============================================================
  function bindLLM() {
    const useLLM = $('#useLLM');
    const quickCfg = $('#llmQuickConfig');
    const providerSel = $('#llmProvider');
    const modelSel = $('#llmModel');
    const apiKeyInput = $('#llmApiKey');
    const modeSel = $('#llmMode');
    const endpointWrap = $('#llmCustomEndpoint');
    const endpointInput = $('#llmEndpoint');

    // Load saved config
    const saved = LLM.getConfig();
    useLLM.checked = saved.enabled || false;
    quickCfg.classList.toggle('hidden', !saved.enabled);
    providerSel.value = saved.provider || 'openai';
    apiKeyInput.value = saved.apiKey || '';
    modeSel.value = saved.mode || 'llm-only';
    if (saved.endpoint) endpointInput.value = saved.endpoint;
    populateModels(providerSel, modelSel, saved.model);
    endpointWrap.classList.toggle('hidden', providerSel.value !== 'custom');

    // Toggle
    useLLM.addEventListener('change', () => {
      quickCfg.classList.toggle('hidden', !useLLM.checked);
      saveLLMConfig();
    });

    // Provider change
    providerSel.addEventListener('change', () => {
      populateModels(providerSel, modelSel);
      endpointWrap.classList.toggle('hidden', providerSel.value !== 'custom');
      saveLLMConfig();
    });

    // Save on any change
    [modelSel, modeSel].forEach(el => el.addEventListener('change', saveLLMConfig));
    [apiKeyInput, endpointInput].forEach(el => el.addEventListener('input', saveLLMConfig));

    // Also wire up the Settings page LLM fields
    const sp = $('#settingsLlmProvider');
    const sm = $('#settingsLlmModel');
    const sk = $('#settingsLlmApiKey');
    const smode = $('#settingsLlmMode');
    const se = $('#settingsLlmEndpoint');
    const seg = $('#settingsCustomEndpointGroup');

    if (sp) {
      sp.value = saved.provider || 'openai';
      sk.value = saved.apiKey || '';
      smode.value = saved.mode || 'llm-only';
      if (saved.endpoint) se.value = saved.endpoint;
      populateModels(sp, sm, saved.model);
      seg.style.display = sp.value === 'custom' ? '' : 'none';

      sp.addEventListener('change', () => {
        populateModels(sp, sm);
        seg.style.display = sp.value === 'custom' ? '' : 'none';
        syncLLMSettings('settings');
      });
      [sm, smode].forEach(el => el.addEventListener('change', () => syncLLMSettings('settings')));
      [sk, se].forEach(el => el.addEventListener('input', () => syncLLMSettings('settings')));
    }

    function syncLLMSettings(source) {
      // Sync between generator quick-config and settings page
      if (source === 'settings') {
        providerSel.value = sp.value;
        populateModels(providerSel, modelSel, sm.value);
        apiKeyInput.value = sk.value;
        modeSel.value = smode.value;
        endpointInput.value = se.value;
        endpointWrap.classList.toggle('hidden', sp.value !== 'custom');
      }
      saveLLMConfig();
    }

    function saveLLMConfig() {
      const cfg = {
        enabled: useLLM.checked,
        provider: providerSel.value,
        apiKey: apiKeyInput.value,
        model: modelSel.value,
        endpoint: endpointInput.value,
        mode: modeSel.value,
      };
      LLM.saveConfig(cfg);

      // Keep settings page in sync
      if (sp) {
        sp.value = cfg.provider;
        populateModels(sp, sm, cfg.model);
        sk.value = cfg.apiKey;
        smode.value = cfg.mode;
        se.value = cfg.endpoint;
        seg.style.display = cfg.provider === 'custom' ? '' : 'none';
      }
    }
  }

  function populateModels(providerSelect, modelSelect, savedModel) {
    const provider = providerSelect.value;
    const info = LLM.PROVIDERS[provider];
    if (!info) return;

    modelSelect.innerHTML = '';
    if (provider === 'custom') {
      // For custom, show a text-like input via a single editable option
      const opt = document.createElement('option');
      opt.value = savedModel || '';
      opt.textContent = savedModel || '(type model name in Settings)';
      modelSelect.appendChild(opt);
    } else {
      info.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        modelSelect.appendChild(opt);
      });
    }

    if (savedModel) modelSelect.value = savedModel;
    if (!modelSelect.value && info.defaultModel) modelSelect.value = info.defaultModel;
  }

  async function fetchUrlContent() {
    const url = $('#urlInput').value.trim();
    if (!url) { showToast('Please enter a URL', 'warning'); return; }

    try {
      // Validate URL format
      new URL(url);
    } catch {
      showToast('Please enter a valid URL', 'error');
      return;
    }

    // Build auth config
    let authConfig = { enabled: false };
    if ($('#authToggle').checked) {
      const authType = $('#authType').value;
      authConfig = { enabled: true, type: authType };

      switch (authType) {
        case 'basic':
          authConfig.username = $('#authUsername').value.trim();
          authConfig.password = $('#authPassword').value;
          if (!authConfig.username || !authConfig.password) {
            showToast('Please enter username and password', 'warning');
            return;
          }
          break;
        case 'bearer':
          authConfig.token = $('#authToken').value.trim();
          if (!authConfig.token) {
            showToast('Please enter a bearer token', 'warning');
            return;
          }
          break;
        case 'cookie':
          authConfig.cookie = $('#authCookie').value.trim();
          if (!authConfig.cookie) {
            showToast('Please enter session cookie', 'warning');
            return;
          }
          break;
        case 'form':
          authConfig.loginUrl = $('#authLoginUrl').value.trim();
          authConfig.username = $('#authFormUsername').value.trim();
          authConfig.password = $('#authFormPassword').value;
          if (!authConfig.loginUrl || !authConfig.username || !authConfig.password) {
            showToast('Please fill in all login fields', 'warning');
            return;
          }
          break;
      }
    }

    const btn = $('#fetchUrlBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';

    try {
      const settings = Storage.getSettings();
      const text = await Parser.fetchUrl(url, settings.corsProxy, authConfig);
      parsedContent = text;
      $('#urlPreview').classList.remove('hidden');
      $('#urlPreviewBody').textContent = text.substring(0, 5000) + (text.length > 5000 ? '\n\n... (truncated)' : '');
      showToast('URL content fetched successfully', 'success');
    } catch (err) {
      showToast(`Failed to fetch URL: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-download"></i> Fetch';
    }
  }

  async function handleFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showToast('File too large (max 10MB)', 'error');
      return;
    }

    try {
      const text = await Parser.parseFile(file);
      parsedContent = text;
      $('#fileName').textContent = file.name;
      $('#filePreview').classList.remove('hidden');
      $('#filePreviewBody').textContent = text.substring(0, 5000) + (text.length > 5000 ? '\n\n... (truncated)' : '');
      showToast(`File "${file.name}" parsed successfully`, 'success');
    } catch (err) {
      showToast(`Failed to parse file: ${err.message}`, 'error');
    }
  }


  async function startGeneration() {
    // Determine content
    const activeTab = $('.tab-btn.active').dataset.tab;
    let content = '';
    let sourceType = 'text';
    let sourceRef = '';

    if (activeTab === 'url-tab') {
      content = parsedContent || '';
      sourceType = 'url';
      sourceRef = $('#urlInput').value.trim();
      if (!content && sourceRef) {
        showToast('Please fetch the URL first', 'warning');
        return;
      }
    } else if (activeTab === 'file-tab') {
      content = parsedContent || '';
      sourceType = 'file';
      sourceRef = $('#fileName').textContent;
    } else if (activeTab === 'project-tab') {
      content = parsedContent || '';
      sourceType = 'project';
      sourceRef = $('#projectName').textContent || 'local folder';
      if (!content) {
        showToast('Please select a project folder first', 'warning');
        return;
      }
    } else {
      content = $('#textInput').value.trim();
      sourceType = 'text';
    }

    if (!content) {
      showToast('Please provide content to generate test cases from', 'warning');
      return;
    }

    const options = {
      planName: $('#planName').value.trim(),
      testType: $('#testType').value,
      priority: $('#priority').value,
      depth: $('#depth').value,
      sourceType,
      sourceRef,
    };

    // LLM config
    const llmCfg = LLM.getConfig();
    const useLLM = $('#useLLM').checked && llmCfg.apiKey;
    const llmMode = llmCfg.mode || 'llm-only';
    const isProject = sourceType === 'project';

    // Project folders REQUIRE LLM — block if not configured
    if (isProject && !llmCfg.apiKey) {
      showToast('Project folder analysis requires an AI/LLM provider. Please configure your API key in the AI section below.', 'error');
      // Auto-open the LLM config UI to guide the user
      $('#useLLM').checked = true;
      $('#llmQuickConfig').classList.remove('hidden');
      LLM.saveConfig({ ...llmCfg, enabled: true });
      return;
    }

    // Show progress
    const progressCard = $('#progressCard');
    progressCard.classList.remove('hidden');
    $('#generateBtn').disabled = true;

    try {
      await animateProgress('step-parse', 0, 'Parsing content...');
      const analysis = Parser.analyzeContent(content);

      const analyzeMsg = analysis.codeAnalysis && analysis.codeAnalysis.isSourceCode
        ? `Found ${analysis.codeAnalysis.functions.length} functions, ${analysis.codeAnalysis.classes.length} classes, ${analysis.codeAnalysis.apiRoutes.length} routes in ${analysis.codeAnalysis.language}...`
        : `Found ${analysis.actions.length} actions, ${analysis.entities.length} entities, ${analysis.requirements.length} requirements...`;
      await animateProgress('step-analyze', 30, analyzeMsg);

      let plan;

      if (isProject) {
        // --- PROJECT FOLDER: always use LLM with project-specific prompts ---
        await animateProgress('step-generate', 50, `Analyzing full codebase with ${LLM.PROVIDERS[llmCfg.provider]?.name || 'AI'}...`);

        try {
          const llmCases = await LLM.generateProjectTestCases(analysis, content, options, llmCfg);

          llmCases.forEach((tc, i) => { tc.id = `TC-${String(i + 1).padStart(3, '0')}`; });
          plan = {
            id: Storage.generateId(),
            name: (options.planName || `Project: ${sourceRef}`) + ' (AI-Analyzed)',
            createdAt: new Date().toISOString(),
            source: sourceType,
            sourceRef: sourceRef,
            testType: options.testType,
            depth: options.depth,
            testCases: llmCases,
            summary: { total: llmCases.length, byType: countByField(llmCases, 'type'), byPriority: countByField(llmCases, 'priority') },
          };
        } catch (llmErr) {
          showToast(`AI project analysis failed: ${llmErr.message}`, 'error');
          progressCard.classList.add('hidden');
          resetProgress();
          $('#generateBtn').disabled = false;
          return;
        }

      } else if (useLLM && (llmMode === 'llm-only' || llmMode === 'hybrid')) {
        // --- LLM-based generation ---
        await animateProgress('step-generate', 50, `Calling ${LLM.PROVIDERS[llmCfg.provider]?.name || 'AI'}...`);

        try {
          const llmCases = await LLM.generateTestCases(analysis, content, options, llmCfg);

          if (llmMode === 'hybrid') {
            // Hybrid: combine rule-based + LLM
            await animateProgress('step-generate', 70, 'Merging rule-based + AI test cases...');
            const rulePlan = Generator.generateTestPlan(analysis, options);
            // Merge: rule-based first, then LLM (deduplicated by title similarity)
            const ruleTitles = new Set(rulePlan.testCases.map(tc => tc.title.toLowerCase()));
            const uniqueLLM = llmCases.filter(tc => !ruleTitles.has(tc.title.toLowerCase()));
            rulePlan.testCases.push(...uniqueLLM);
            rulePlan.testCases.forEach((tc, i) => { tc.id = `TC-${String(i + 1).padStart(3, '0')}`; });
            rulePlan.summary = { total: rulePlan.testCases.length, byType: countByField(rulePlan.testCases, 'type'), byPriority: countByField(rulePlan.testCases, 'priority') };
            rulePlan.name = rulePlan.name + ' (Hybrid)';
            plan = rulePlan;
          } else {
            // LLM-only: wrap in plan structure
            llmCases.forEach((tc, i) => { tc.id = `TC-${String(i + 1).padStart(3, '0')}`; });
            plan = {
              id: Storage.generateId(),
              name: (options.planName || 'AI-Generated Test Plan'),
              createdAt: new Date().toISOString(),
              source: sourceType,
              sourceRef: sourceRef,
              testType: options.testType,
              depth: options.depth,
              testCases: llmCases,
              summary: { total: llmCases.length, byType: countByField(llmCases, 'type'), byPriority: countByField(llmCases, 'priority') },
            };
          }
        } catch (llmErr) {
          // If LLM fails, fall back to rule-based
          showToast(`AI generation failed: ${llmErr.message}. Falling back to rule-based.`, 'warning');
          plan = Generator.generateTestPlan(analysis, options);
        }
      } else if (useLLM && llmMode === 'enhance') {
        // --- Enhance mode: generate rule-based first, then ask LLM to improve ---
        await animateProgress('step-generate', 50, 'Generating rule-based cases...');
        plan = Generator.generateTestPlan(analysis, options);

        await animateProgress('step-generate', 65, `Enhancing with ${LLM.PROVIDERS[llmCfg.provider]?.name || 'AI'}...`);
        try {
          const enhancePrompt = `Here are rule-based test cases. Improve them: make steps more specific, add missing edge cases, improve expected results, and add any critical test cases that are missing. Keep the same JSON format.\n\nCurrent test cases:\n${JSON.stringify(plan.testCases.slice(0, 30), null, 2)}`;
          const systemPrompt = `You are an expert QA engineer. You will receive existing test cases. Improve them and add missing ones. Output ONLY a JSON array of test case objects with fields: title, type, priority, preconditions, steps (array), expectedResult, notes. No markdown fences.`;

          const resp = await LLM.generateTestCases(
            analysis,
            enhancePrompt,
            options,
            llmCfg
          );

          resp.forEach((tc, i) => { tc.id = `TC-${String(i + 1).padStart(3, '0')}`; });
          plan.testCases = resp;
          plan.name = plan.name + ' (AI-Enhanced)';
          plan.summary = { total: resp.length, byType: countByField(resp, 'type'), byPriority: countByField(resp, 'priority') };
        } catch (llmErr) {
          showToast(`AI enhancement failed: ${llmErr.message}. Using rule-based output.`, 'warning');
        }
      } else {
        // --- Rule-based only ---
        await animateProgress('step-generate', 60, 'Generating test cases...');
        plan = Generator.generateTestPlan(analysis, options);
      }

      await animateProgress('step-review', 90, `Generated ${plan.testCases.length} test cases!`);

      // Save
      Storage.savePlan(plan);
      Storage.addHistory({
        sourceType,
        sourceRef,
        planId: plan.id,
        planName: plan.name,
        casesCount: plan.testCases.length,
      });

      // Complete
      await animateProgress(null, 100, 'Done! ');

      setTimeout(() => {
        progressCard.classList.add('hidden');
        resetProgress();
        showToast(`Test plan "${plan.name}" generated with ${plan.testCases.length} test cases!`, 'success');

        // Auto-export if enabled
        const settings = Storage.getSettings();
        if (settings.autoExport) {
          const result = Exporter.exportPlan(plan, settings.exportFormat);
          Exporter.download(result);
        }

        // Navigate to plan detail
        showPlanDetail(plan.id);
      }, 800);

    } catch (err) {
      showToast(`Generation failed: ${err.message}`, 'error');
      progressCard.classList.add('hidden');
      resetProgress();
    } finally {
      $('#generateBtn').disabled = false;
    }
  }

  /** Count occurrences of a field value in an array of objects */
  function countByField(arr, field) {
    return arr.reduce((acc, item) => { acc[item[field]] = (acc[item[field]] || 0) + 1; return acc; }, {});
  }

  function animateProgress(stepId, percent, text) {
    return new Promise(resolve => {
      setTimeout(() => {
        // Update step
        ['step-parse', 'step-analyze', 'step-generate', 'step-review'].forEach(id => {
          const el = $(`#${id}`);
          if (id === stepId) {
            el.classList.add('active');
            el.classList.remove('completed');
          } else if (stepId && getStepOrder(id) < getStepOrder(stepId)) {
            el.classList.remove('active');
            el.classList.add('completed');
          }
        });
        $('#progressFill').style.width = percent + '%';
        $('#progressText').textContent = text;
        resolve();
      }, 500);
    });
  }

  function getStepOrder(id) {
    const order = { 'step-parse': 0, 'step-analyze': 1, 'step-generate': 2, 'step-review': 3 };
    return order[id] ?? -1;
  }

  function resetProgress() {
    ['step-parse', 'step-analyze', 'step-generate', 'step-review'].forEach(id => {
      $(`#${id}`).classList.remove('active', 'completed');
    });
    $(`#step-parse`).classList.add('active');
    $('#progressFill').style.width = '0%';
    $('#progressText').textContent = 'Starting...';
  }

  // ============================================================
  // Test Plans Page
  // ============================================================
  function renderTestPlans(filter = '') {
    let plans = Storage.getPlans();
    if (filter) {
      const f = filter.toLowerCase();
      plans = plans.filter(p => p.name.toLowerCase().includes(f));
    }

    const container = $('#testPlansList');
    if (plans.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p>${filter ? 'No matching test plans found' : 'No test plans created yet'}</p>
          <button class="btn btn-primary nav-item" data-page="generator">Create First Plan</button>
        </div>`;
      return;
    }

    container.innerHTML = plans.map(plan => `
      <div class="plan-card" data-plan-id="${plan.id}">
        <div class="plan-info">
          <h3>${escapeHtml(plan.name)}</h3>
          <div class="plan-meta">
            <span><i class="fas fa-vial"></i> ${plan.testCases.length} cases</span>
            <span><i class="fas fa-clock"></i> ${timeAgo(plan.createdAt)}</span>
            <span><i class="fas fa-tag"></i> ${plan.testType}</span>
            <span><i class="fas fa-layer-group"></i> ${plan.depth}</span>
            <span><i class="fas fa-${plan.source === 'url' ? 'link' : plan.source === 'file' ? 'file-alt' : plan.source === 'project' ? 'folder-open' : 'keyboard'}"></i> ${plan.source}</span>
          </div>
        </div>
        <div class="plan-actions">
          <button class="btn btn-sm btn-secondary view-plan-btn" data-plan-id="${plan.id}" title="View">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-secondary export-plan-btn" data-plan-id="${plan.id}" title="Export">
            <i class="fas fa-download"></i>
          </button>
          <button class="btn btn-sm btn-danger delete-plan-btn" data-plan-id="${plan.id}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

    // Event listeners
    container.querySelectorAll('.view-plan-btn').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); showPlanDetail(btn.dataset.planId); });
    });
    container.querySelectorAll('.export-plan-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const plan = Storage.getPlanById(btn.dataset.planId);
        if (plan) {
          const settings = Storage.getSettings();
          Exporter.download(Exporter.exportPlan(plan, settings.exportFormat));
          showToast('Plan exported!', 'success');
        }
      });
    });
    container.querySelectorAll('.delete-plan-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this test plan?')) {
          Storage.deletePlan(btn.dataset.planId);
          renderTestPlans();
          updateDashboard();
          showToast('Plan deleted', 'info');
        }
      });
    });
    container.querySelectorAll('.plan-card').forEach(card => {
      card.addEventListener('click', () => showPlanDetail(card.dataset.planId));
    });

    // Bind search
    const searchInput = $('#searchPlans');
    searchInput.removeEventListener('input', searchInput._handler);
    searchInput._handler = () => renderTestPlans(searchInput.value.trim());
    searchInput.addEventListener('input', searchInput._handler);
  }

  // ============================================================
  // Test Cases Page
  // ============================================================
  function renderTestCases() {
    const allCases = Storage.getAllCases();
    const search = ($('#searchCases')?.value || '').toLowerCase();
    const filterPlan = $('#filterPlan').value;
    const filterType = $('#filterType').value;
    const filterPriority = $('#filterPriority').value;

    // Populate plan filter
    const plans = Storage.getPlans();
    const planSelect = $('#filterPlan');
    const currentVal = planSelect.value;
    planSelect.innerHTML = '<option value="">All Plans</option>' +
      plans.map(p => `<option value="${p.id}" ${p.id === currentVal ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');

    // Filter
    let filtered = allCases;
    if (search) filtered = filtered.filter(tc =>
      tc.title.toLowerCase().includes(search) || tc.id.toLowerCase().includes(search)
    );
    if (filterPlan) filtered = filtered.filter(tc => tc.planId === filterPlan);
    if (filterType) filtered = filtered.filter(tc => tc.type === filterType);
    if (filterPriority) filtered = filtered.filter(tc => tc.priority === filterPriority);

    const container = $('#testCasesList');
    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-vial"></i><p>No test cases found</p></div>`;
      return;
    }

    container.innerHTML = filtered.map(tc => `
      <div class="case-card" data-case-id="${tc.id}">
        <div class="case-header">
          <div class="case-header-left">
            <span class="case-id">${tc.id}</span>
            <span class="case-title">${escapeHtml(tc.title)}</span>
          </div>
          <div class="case-badges">
            <span class="badge badge-${tc.type}">${tc.type}</span>
            <span class="badge badge-${tc.priority}">${tc.priority}</span>
            <i class="fas fa-chevron-down case-expand-icon"></i>
          </div>
        </div>
        <div class="case-body">
          <div class="case-section">
            <h4>Plan</h4>
            <p style="font-size:0.85rem;color:var(--text-secondary)">${escapeHtml(tc.planName)}</p>
          </div>
          <div class="case-section">
            <h4>Preconditions</h4>
            <p style="font-size:0.85rem;color:var(--text-secondary)">${escapeHtml(tc.preconditions)}</p>
          </div>
          <div class="case-section">
            <h4>Steps</h4>
            <ol class="case-steps">${tc.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
          </div>
          <div class="case-section">
            <h4>Expected Result</h4>
            <div class="expected-result">${escapeHtml(tc.expectedResult)}</div>
          </div>
          ${tc.notes ? `<div class="case-section"><h4>Notes</h4><p style="font-size:0.85rem;color:var(--text-secondary)">${escapeHtml(tc.notes)}</p></div>` : ''}
        </div>
      </div>
    `).join('');

    // Expand/collapse
    container.querySelectorAll('.case-header').forEach(header => {
      header.addEventListener('click', () => {
        header.closest('.case-card').classList.toggle('expanded');
      });
    });

    // Bind filters
    ['searchCases', 'filterPlan', 'filterType', 'filterPriority'].forEach(id => {
      const el = $(`#${id}`);
      el.removeEventListener('input', el._tcHandler);
      el.removeEventListener('change', el._tcHandler);
      el._tcHandler = () => renderTestCases();
      el.addEventListener(id === 'searchCases' ? 'input' : 'change', el._tcHandler);
    });
  }

  // ============================================================
  // History Page
  // ============================================================
  function renderHistory() {
    const history = Storage.getHistory();
    const container = $('#fullHistory');

    if (history.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><p>No generation history yet</p></div>`;
      return;
    }

    container.innerHTML = history.map(h => renderHistoryItem(h)).join('');
  }

  function renderHistoryItem(h) {
    const iconClass = h.sourceType === 'url' ? 'url' : h.sourceType === 'file' ? 'file' : h.sourceType === 'project' ? 'project' : 'text';
    const iconName = h.sourceType === 'url' ? 'fa-link' : h.sourceType === 'file' ? 'fa-file-alt' : h.sourceType === 'project' ? 'fa-folder-open' : 'fa-keyboard';
    return `
      <div class="history-item">
        <div class="history-icon ${iconClass}"><i class="fas ${iconName}"></i></div>
        <div class="history-info">
          <h4>${escapeHtml(h.planName || 'Test Plan')}</h4>
          <p>${h.casesCount || 0} test cases generated from ${h.sourceType}${h.sourceRef ? ': ' + escapeHtml(h.sourceRef.substring(0, 60)) : ''}</p>
          <span class="history-date">${h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}</span>
        </div>
      </div>`;
  }

  // ============================================================
  // Plan Detail Modal
  // ============================================================
  function bindModal() {
    // Close buttons
    $$('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => closeModal());
    });
    $('.modal-overlay').addEventListener('click', closeModal);

    // Export from modal
    $('#modalExportBtn').addEventListener('click', () => {
      if (currentPlanForModal) {
        const settings = Storage.getSettings();
        Exporter.download(Exporter.exportPlan(currentPlanForModal, settings.exportFormat));
        showToast('Plan exported!', 'success');
      }
    });

    // Delete from modal
    $('#modalDeleteBtn').addEventListener('click', () => {
      if (currentPlanForModal && confirm('Delete this test plan?')) {
        Storage.deletePlan(currentPlanForModal.id);
        closeModal();
        updateDashboard();
        renderTestPlans();
        showToast('Plan deleted', 'info');
      }
    });
  }

  function showPlanDetail(planId) {
    const plan = Storage.getPlanById(planId);
    if (!plan) return;

    currentPlanForModal = plan;
    $('#modalPlanName').textContent = plan.name;

    const body = $('#modalPlanBody');
    body.innerHTML = `
      <div class="plan-summary-grid">
        <div class="plan-summary-item"><label>Created</label><span>${new Date(plan.createdAt).toLocaleString()}</span></div>
        <div class="plan-summary-item"><label>Source</label><span>${plan.source}${plan.sourceRef ? ': ' + escapeHtml(plan.sourceRef.substring(0, 50)) : ''}</span></div>
        <div class="plan-summary-item"><label>Total Cases</label><span>${plan.testCases.length}</span></div>
        <div class="plan-summary-item"><label>Depth</label><span>${plan.depth}</span></div>
      </div>

      <h3 class="mb-2" style="font-size:0.95rem;">Test Cases</h3>
      <table class="plan-detail-table">
        <thead>
          <tr><th>ID</th><th>Title</th><th>Type</th><th>Priority</th></tr>
        </thead>
        <tbody>
          ${plan.testCases.map(tc => `
            <tr>
              <td>${tc.id}</td>
              <td>${escapeHtml(tc.title)}</td>
              <td><span class="badge badge-${tc.type}">${tc.type}</span></td>
              <td><span class="badge badge-${tc.priority}">${tc.priority}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    $('#planDetailModal').classList.add('active');
  }

  function closeModal() {
    $('#planDetailModal').classList.remove('active');
    currentPlanForModal = null;
  }

  // ============================================================
  // Settings
  // ============================================================
  function loadSettings() {
    const settings = Storage.getSettings();
    if ($('#defaultDepth')) $('#defaultDepth').value = settings.defaultDepth || 'standard';
    if ($('#defaultType')) $('#defaultType').value = settings.defaultType || 'all';
    if ($('#autoExport')) $('#autoExport').checked = settings.autoExport || false;
    if ($('#exportFormat')) $('#exportFormat').value = settings.exportFormat || 'markdown';
    if ($('#corsProxy')) $('#corsProxy').value = settings.corsProxy || 'https://api.allorigins.win/raw?url=';
  }

  function bindSettings() {
    // Save settings on change
    ['defaultDepth', 'defaultType', 'exportFormat', 'corsProxy'].forEach(id => {
      $(`#${id}`).addEventListener('change', saveCurrentSettings);
    });
    $('#autoExport').addEventListener('change', saveCurrentSettings);

    // Export data
    $('#exportDataBtn').addEventListener('click', () => {
      const data = Storage.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'testforge-data-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Data exported!', 'success');
    });

    // Import data
    $('#importDataBtn').addEventListener('click', () => $('#importFileInput').click());
    $('#importFileInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.plans && !data.history) throw new Error('Invalid data file');
        Storage.importData(data);
        loadSettings();
        updateDashboard();
        showToast('Data imported successfully!', 'success');
      } catch (err) {
        showToast(`Import failed: ${err.message}`, 'error');
      }
      e.target.value = '';
    });

    // Clear data
    $('#clearDataBtn').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
        Storage.clearAll();
        updateDashboard();
        showToast('All data cleared', 'info');
      }
    });
  }

  function saveCurrentSettings() {
    const settings = Storage.getSettings();
    settings.defaultDepth = $('#defaultDepth').value;
    settings.defaultType = $('#defaultType').value;
    settings.autoExport = $('#autoExport').checked;
    settings.exportFormat = $('#exportFormat').value;
    settings.corsProxy = $('#corsProxy').value;
    Storage.saveSettings(settings);
    showToast('Settings saved', 'success');
  }

  // ============================================================
  // Misc Bindings
  // ============================================================
  function bindMisc() {
    // Export all from dashboard
    $('#exportAllBtn').addEventListener('click', () => {
      const settings = Storage.getSettings();
      const result = Exporter.exportAllPlans(settings.exportFormat);
      if (result) {
        Exporter.download(result);
        showToast('All plans exported!', 'success');
      } else {
        showToast('No plans to export', 'warning');
      }
    });

    // Clear all from dashboard
    $('#clearAllBtn').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
        Storage.clearAll();
        updateDashboard();
        showToast('All data cleared', 'info');
      }
    });

    // Clear history
    $('#clearHistoryBtn').addEventListener('click', () => {
      if (confirm('Clear all generation history?')) {
        Storage.clearHistory();
        renderHistory();
        showToast('History cleared', 'info');
      }
    });
  }

  // ============================================================
  // Page Grabber Bookmarklet
  // ============================================================
  function initBookmarklet() {
    // Build the bookmarklet JS (runs on the target page)
    const bookmarkletCode = `
(function(){
  try {
    var removeTags = ['script','style','nav','footer','header','iframe','noscript','svg'];
    var clone = document.body.cloneNode(true);
    removeTags.forEach(function(t){ clone.querySelectorAll(t).forEach(function(e){ e.remove(); }); });
    var lines = [];
    lines.push('# ' + document.title);
    lines.push('URL: ' + location.href);
    lines.push('');
    function walk(node) {
      if (node.nodeType === 3) {
        var t = node.textContent.trim();
        if (t) lines.push(t);
      } else if (node.nodeType === 1) {
        var tag = node.tagName.toLowerCase();
        if (['h1','h2','h3','h4','h5','h6'].indexOf(tag) >= 0) {
          lines.push('');
          lines.push('## ' + node.textContent.trim());
        } else if (tag === 'li') {
          lines.push('- ' + node.textContent.trim());
        } else if (tag === 'tr') {
          var cells = [];
          node.querySelectorAll('td,th').forEach(function(c){ cells.push(c.textContent.trim()); });
          if (cells.length) lines.push('| ' + cells.join(' | ') + ' |');
        } else if (['table','thead','tbody'].indexOf(tag) >= 0) {
          node.childNodes.forEach(walk);
        } else if (['p','div','section','article','main'].indexOf(tag) >= 0) {
          node.childNodes.forEach(walk);
          lines.push('');
        } else {
          node.childNodes.forEach(walk);
        }
      }
    }
    var main = clone.querySelector('main,article,[role=main],.content,.main,#content,#main');
    walk(main || clone);
    var text = lines.join('\\n').replace(/\\n{3,}/g,'\\n\\n').trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function(){
        alert('Page content copied to clipboard! (' + text.length + ' chars)\\n\\nNow go to Test Case Generator → Text Input tab and paste (Ctrl+V / Cmd+V).');
      }, function(){
        prompt('Auto-copy failed. Select all text below and copy manually:', text.substring(0, 5000));
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      alert('Page content copied! (' + text.length + ' chars)\\n\\nGo to Test Case Generator → Text Input tab and paste.');
    }
  } catch(e) {
    alert('Grab Page error: ' + e.message);
  }
})();`.trim();

    const encoded = 'javascript:' + encodeURIComponent(bookmarkletCode);
    const el = $('#grabPageBookmarklet');
    if (el) {
      el.href = encoded;
    }
  }

  // ============================================================
  // Toast Notifications
  // ============================================================
  function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ============================================================
  // Utilities
  // ============================================================
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return new Date(dateStr).toLocaleDateString();
  }

  // ============================================================
  // Project Folder Picker
  // ============================================================

  function bindProjectFolder() {
    const btn = $('#selectFolderBtn');
    const dropZone = $('#projectDropZone');
    const fallbackNote = $('#folderPickerFallbackNote');
    const pickerSection = $('#folderPickerSection');

    // Feature-detect File System Access API
    if (typeof window.showDirectoryPicker !== 'function') {
      if (pickerSection) pickerSection.classList.add('hidden');
      if (fallbackNote) fallbackNote.classList.remove('hidden');
    }

    // Button click → showDirectoryPicker
    if (btn) {
      btn.addEventListener('click', async () => {
        if (typeof window.showDirectoryPicker !== 'function') return;
        try {
          const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
          await handleProjectFolder(dirHandle);
        } catch (err) {
          if (err.name === 'AbortError') return; // user cancelled
          if (err.name === 'NotAllowedError') {
            showToast('Folder access denied. Please allow access when prompted.', 'error');
            return;
          }
          showToast(`Failed to open folder: ${err.message}`, 'error');
        }
      });
    }

    // Drag-and-drop
    if (dropZone) {
      dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', async e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const item = e.dataTransfer.items && e.dataTransfer.items[0];
        if (!item) return;
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (!entry) {
          showToast('Unable to read dropped item', 'error');
          return;
        }
        if (!entry.isDirectory) {
          showToast('Please drop a folder, not a file', 'warning');
          return;
        }
        try {
          await handleProjectFolderEntry(entry);
        } catch (err) {
          showToast(`Failed to read folder: ${err.message}`, 'error');
        }
      });
    }

    // Clear button
    const clearBtn = $('#clearProjectPreview');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        $('#projectPreview').classList.add('hidden');
        $('#projectPreviewBody').textContent = '';
        $('#projectStats').textContent = '';
        $('#projectName').textContent = 'No folder selected';
        parsedContent = '';
      });
    }
  }

  /**
   * Walk a FileSystemDirectoryHandle recursively (File System Access API).
   * Returns array of { name, path, file: File }.
   */
  async function walkDirectoryHandle(dirHandle, basePath = '') {
    const results = [];
    // Use .entries() for correct [name, handle] destructuring
    for await (const [name, handle] of dirHandle.entries()) {
      const path = basePath ? `${basePath}/${name}` : name;
      if (handle.kind === 'directory') {
        try {
          const children = await walkDirectoryHandle(handle, path);
          results.push(...children);
        } catch {
          // Skip directories that cannot be traversed (permission denied, etc.)
        }
      } else {
        try {
          results.push({ name, path, file: await handle.getFile() });
        } catch {
          // Skip files that cannot be read (permissions, locked files, etc.)
        }
      }
    }
    return results;
  }

  /**
   * Walk a FileSystemDirectoryEntry recursively (legacy drag-and-drop API).
   * Returns array of { name, path, file: File }.
   */
  async function walkDirectoryEntry(dirEntry, basePath = '') {
    const results = [];
    const reader = dirEntry.createReader();

    // readEntries is paginated (max 100 per call) — loop until empty
    async function readAllEntries() {
      const entries = [];
      let batch;
      do {
        batch = await new Promise((res, rej) => reader.readEntries(res, rej));
        entries.push(...batch);
      } while (batch.length > 0);
      return entries;
    }

    const entries = await readAllEntries();
    for (const entry of entries) {
      const path = basePath ? `${basePath}/${entry.name}` : entry.name;
      if (entry.isDirectory) {
        try {
          const children = await walkDirectoryEntry(entry, path);
          results.push(...children);
        } catch {
          // Skip directories that cannot be traversed (permission denied, etc.)
        }
      } else {
        try {
          const file = await new Promise((res, rej) => entry.file(res, rej));
          results.push({ name: entry.name, path, file });
        } catch {
          // Skip files that cannot be read (permissions, locked files, etc.)
        }
      }
    }
    return results;
  }

  /**
   * Shared processing: cap, read to text, call parser, render preview.
   * folderName: display name for the folder
   * allHandles: array of { name, path, file: File } — full unsorted list
   */
  async function processProjectHandles(folderName, allHandles) {
    const btn = $('#selectFolderBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reading folder\u2026'; }

    const MAX_FILES = 200000;

    try {
      const totalFiles = allHandles.length;

      if (totalFiles === 0) {
        showToast('No files found in this folder', 'warning');
        return;
      }

      // Sort code files first (then docs), alphabetical — so the cap preserves the most
      // important files when projects exceed MAX_FILES. The parser will re-sort the filtered
      // list using its own extension sets, which is a stable no-op for already-sorted input.
      const DOC_EXTS = new Set(['md', 'mdx', 'rst', 'adoc', 'txt', 'rtf', 'log', 'feature', 'story', 'spec']);
      allHandles.sort((a, b) => {
        const extA = a.path.split('.').pop().toLowerCase();
        const extB = b.path.split('.').pop().toLowerCase();
        const aIsDoc = DOC_EXTS.has(extA);
        const bIsDoc = DOC_EXTS.has(extB);
        if (aIsDoc !== bIsDoc) return aIsDoc ? 1 : -1; // code first
        return a.path.localeCompare(b.path);
      });
      const capped = allHandles.slice(0, MAX_FILES);

      if (totalFiles > MAX_FILES) {
        showToast(`Large project detected — only the first ${MAX_FILES} files will be analyzed`, 'warning');
      }

      // Read each file to text with per-file error isolation
      let skippedErrors = 0;
      const files = [];
      for (const { name, path, file } of capped) {
        try {
          const text = await file.text();
          files.push({ name, path, text });
        } catch {
          skippedErrors++;
        }
      }

      if (files.length === 0) {
        showToast('Could not read any files from this folder', 'error');
        return;
      }

      const includeTests = $('#includeTests').checked;
      const includeDocs = $('#includeDocs').checked;

      const result = await Parser.parseProjectFolder(files, { includeTests, includeDocs });

      // Patch stats fields that only app.js knows
      result.stats.totalFiles = totalFiles;
      result.stats.skippedErrors = skippedErrors;

      parsedContent = result.text;
      $('#projectName').textContent = folderName;

      const langList = Object.entries(result.stats.byLanguage)
        .sort((a, b) => b[1] - a[1])
        .map(([lang, count]) => `${lang}: ${count}`)
        .join(', ');
      $('#projectStats').textContent = `${result.stats.parsedFiles} files parsed (${result.stats.byType.code} code, ${result.stats.byType.doc} docs)`;

      const preview = [
        `Folder: ${folderName}`,
        `Files: ${result.stats.parsedFiles} of ${totalFiles} total`,
        langList ? `Languages: ${langList}` : '',
        result.stats.skippedLarge > 0 ? `(${result.stats.skippedLarge} files truncated due to size)` : '',
        result.stats.skippedErrors > 0 ? `(${result.stats.skippedErrors} files could not be read)` : '',
        '',
        '--- Content Preview ---',
        result.text.substring(0, 8000),
        result.text.length > 8000 ? '\n\n... (truncated preview \u2014 full content will be analyzed)' : '',
      ].filter(Boolean).join('\n');

      $('#projectPreview').classList.remove('hidden');
      $('#projectPreviewBody').textContent = preview;
      showToast(`Folder "${folderName}" read: ${result.stats.parsedFiles} files (${langList || 'no languages detected'})`, 'success');

    } catch (err) {
      showToast(`Failed to read project: ${err.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-folder-open"></i> Select Project Folder'; }
    }
  }

  /**
   * Handle a FileSystemDirectoryHandle (File System Access API button path).
   */
  async function handleProjectFolder(dirHandle) {
    const allHandles = await walkDirectoryHandle(dirHandle);
    await processProjectHandles(dirHandle.name, allHandles);
  }

  /**
   * Handle a FileSystemDirectoryEntry (drag-and-drop fallback path).
   */
  async function handleProjectFolderEntry(entry) {
    const allHandles = await walkDirectoryEntry(entry);
    // entry.name is the folder name; entry.fullPath starts with "/"
    await processProjectHandles(entry.name, allHandles);
  }

})();
