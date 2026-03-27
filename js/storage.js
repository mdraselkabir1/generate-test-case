/**
 * Storage Module — handles all localStorage operations for test plans, cases, history, and settings.
 */
const Storage = (() => {
  const KEYS = {
    PLANS: 'testforge_plans',
    HISTORY: 'testforge_history',
    SETTINGS: 'testforge_settings',
    STATS: 'testforge_stats',
  };

  function _get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  }

  // ---------- Plans ----------
  function getPlans() {
    return _get(KEYS.PLANS) || [];
  }

  function savePlan(plan) {
    const plans = getPlans();
    plans.unshift(plan);
    _set(KEYS.PLANS, plans);
    updateStats();
    return plan;
  }

  function getPlanById(id) {
    return getPlans().find(p => p.id === id) || null;
  }

  function deletePlan(id) {
    const plans = getPlans().filter(p => p.id !== id);
    _set(KEYS.PLANS, plans);
    updateStats();
  }

  function updatePlan(id, updates) {
    const plans = getPlans();
    const idx = plans.findIndex(p => p.id === id);
    if (idx !== -1) {
      plans[idx] = { ...plans[idx], ...updates };
      _set(KEYS.PLANS, plans);
    }
  }

  function getAllCases() {
    const plans = getPlans();
    return plans.flatMap(p => (p.testCases || []).map(tc => ({ ...tc, planId: p.id, planName: p.name })));
  }

  // ---------- History ----------
  function getHistory() {
    return _get(KEYS.HISTORY) || [];
  }

  function addHistory(entry) {
    const history = getHistory();
    history.unshift({
      ...entry,
      id: generateId(),
      timestamp: new Date().toISOString(),
    });
    // Keep last 100 entries
    if (history.length > 100) history.length = 100;
    _set(KEYS.HISTORY, history);
  }

  function clearHistory() {
    _set(KEYS.HISTORY, []);
  }

  // ---------- Stats ----------
  function getStats() {
    return _get(KEYS.STATS) || { totalPlans: 0, totalCases: 0, totalDocs: 0, totalUrls: 0 };
  }

  function updateStats() {
    const plans = getPlans();
    const history = getHistory();
    const stats = {
      totalPlans: plans.length,
      totalCases: plans.reduce((sum, p) => sum + (p.testCases ? p.testCases.length : 0), 0),
      totalDocs: history.filter(h => h.sourceType === 'file').length,
      totalUrls: history.filter(h => h.sourceType === 'url').length,
    };
    _set(KEYS.STATS, stats);
    return stats;
  }

  // ---------- Settings ----------
  function getSettings() {
    return _get(KEYS.SETTINGS) || {
      defaultDepth: 'standard',
      defaultType: 'all',
      autoExport: false,
      exportFormat: 'markdown',
      corsProxy: 'https://api.allorigins.win/raw?url=',
      theme: 'light',
    };
  }

  function saveSettings(settings) {
    _set(KEYS.SETTINGS, settings);
  }

  // ---------- Export / Import ----------
  function exportAllData() {
    return {
      plans: getPlans(),
      history: getHistory(),
      settings: getSettings(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  function importData(data) {
    if (data.plans) _set(KEYS.PLANS, data.plans);
    if (data.history) _set(KEYS.HISTORY, data.history);
    if (data.settings) _set(KEYS.SETTINGS, data.settings);
    updateStats();
  }

  function clearAll() {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  }

  // ---------- Utilities ----------
  function generateId() {
    return 'tf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  return {
    getPlans, savePlan, getPlanById, deletePlan, updatePlan, getAllCases,
    getHistory, addHistory, clearHistory,
    getStats, updateStats,
    getSettings, saveSettings,
    exportAllData, importData, clearAll,
    generateId,
  };
})();
