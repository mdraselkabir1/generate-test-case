# Enhanced Generator — Methodology-Driven Expert Depth Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Expert" depth level to the TestForge generator that reads from the global `METHODOLOGY` array to produce 100-300 methodology-informed test cases with checklist, pitfall, and objective categories.

**Architecture:** A new `generateExpertCases(analysis, entry)` function converts any METHODOLOGY entry into test cases. It is wired into the existing `generateTestPlan()` orchestrator after all type-specific generators run. A `deduplicateByTitle()` utility prevents near-duplicate cases. HTML selects gain "Expert" depth and "Exploratory" type options.

**Tech Stack:** Vanilla JS (ES6, IIFE pattern), no build tools — open `index.html` directly in Chrome/Edge to test.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `test-case-generator/index.html` | Modify | Add Expert depth option to 2 selects, add Exploratory type option to 2 selects |
| `test-case-generator/js/generator.js` | Modify | Add expert to DEPTH_MAP, add `deduplicateByTitle()`, add `generateExpertCases()`, wire into `generateTestPlan()` |

---

## Chunk 1: HTML Changes and Generator Core

### Task 1: HTML — Add Expert Depth and Exploratory Type Options

**Files:**
- Modify: `test-case-generator/index.html`

Four insertions into existing `<select>` elements.

- [ ] **Step 1: Add Expert depth option to generator page `#depth` select**

Find the `#depth` select (around line 437). After the "Exhaustive" option, add:

```html
                        <option value="expert">Expert (100-300 cases)</option>
```

The select should now read:
```html
                      <select id="depth" class="form-input">
                        <option value="basic">Basic (5-10 cases)</option>
                        <option value="standard" selected>Standard (10-25 cases)</option>
                        <option value="comprehensive">Comprehensive (25-50 cases)</option>
                        <option value="exhaustive">Exhaustive (50+ cases)</option>
                        <option value="expert">Expert (100-300 cases)</option>
                      </select>
```

- [ ] **Step 2: Add Expert depth option to settings page `#defaultDepth` select**

Find the `#defaultDepth` select (around line 617). After the "Exhaustive" option, add:

```html
                    <option value="expert">Expert</option>
```

- [ ] **Step 3: Add Exploratory type option to generator page `#testType` select**

Find the `#testType` select (around line 403). After the "Edge Cases" option, add:

```html
                        <option value="exploratory">Exploratory</option>
```

- [ ] **Step 4: Add Exploratory type option to test cases page `#filterType` select**

Find the `#filterType` select (around line 562). After the "Edge Cases" option, add:

```html
                <option value="exploratory">Exploratory</option>
```

- [ ] **Step 5: Verify in browser**

Open `index.html` in Chrome. Go to the Generator page. Verify:
- The Depth dropdown has 5 options: Basic, Standard, Comprehensive, Exhaustive, Expert (100-300 cases)
- The Test Type dropdown has "Exploratory" at the end
- Go to Settings → General Settings → Default Generation Depth — verify "Expert" appears
- Go to Test Cases page — verify the type filter dropdown has "Exploratory"

- [ ] **Step 6: Commit**

```bash
git add test-case-generator/index.html
git commit -m "feat: add Expert depth and Exploratory type options to HTML selects"
```

---

### Task 2: Generator — Expert DEPTH_MAP Entry and Deduplication Utility

**Files:**
- Modify: `test-case-generator/js/generator.js`

- [ ] **Step 1: Add expert entry to DEPTH_MAP**

Find `DEPTH_MAP` (line 7-12 of `generator.js`). Add the expert entry after the exhaustive line:

```js
  const DEPTH_MAP = {
    basic:         { min: 5,  max: 10, edgeCases: false, negatives: false },
    standard:      { min: 10, max: 25, edgeCases: true,  negatives: true  },
    comprehensive: { min: 25, max: 50, edgeCases: true,  negatives: true  },
    exhaustive:    { min: 50, max: 200, edgeCases: true,  negatives: true  },
    expert:        { min: 100, max: 300, edgeCases: true,  negatives: true  },
  };
```

- [ ] **Step 2: Add deduplicateByTitle utility function**

Find the `countBy` function (around line 1216). Add `deduplicateByTitle` **before** it (after `findContextForKeyword`):

```js
  // ============================================================
  // Deduplication — used by expert depth to avoid near-duplicate cases
  // ============================================================
  const STOP_WORDS = new Set([
    'verify', 'that', 'the', 'is', 'a', 'an', 'and', 'or', 'for', 'with',
    'system', 'should', 'must', 'does', 'are', 'be', 'to', 'of', 'in', 'on',
    'it', 'not', 'no', 'can', 'has', 'have', 'do', 'all', 'by', 'from',
  ]);

  function normalizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  }

  function deduplicateByTitle(newCases, existingCases) {
    const existingWordSets = existingCases.map(tc => new Set(normalizeTitle(tc.title)));
    return newCases.filter(nc => {
      const newWords = normalizeTitle(nc.title);
      if (newWords.length === 0) return true;
      for (const existingWords of existingWordSets) {
        if (existingWords.size === 0) continue;
        const overlap = newWords.filter(w => existingWords.has(w)).length;
        const overlapRatio = Math.max(
          overlap / newWords.length,
          overlap / existingWords.size
        );
        if (overlapRatio > 0.8) return false;
      }
      return true;
    });
  }
```

- [ ] **Step 3: Verify no syntax errors**

Open `index.html` in Chrome. Open DevTools Console. There should be no errors. Generate a test plan at "Standard" depth to confirm existing functionality still works.

- [ ] **Step 4: Commit**

```bash
git add test-case-generator/js/generator.js
git commit -m "feat: add expert depth config and deduplication utility to generator"
```

---

### Task 3: Generator — `generateExpertCases()` Function

**Files:**
- Modify: `test-case-generator/js/generator.js`

This is the core new function. Add it after the `generateCodeIntegrationCases` function (after line ~1180) and before the utility functions section.

- [ ] **Step 1: Add generateExpertCases function**

Find the closing `}` of `generateCodeIntegrationCases` (around line 1180). Add the following after it:

```js
  // ============================================================
  // Expert-level test cases — driven by METHODOLOGY data
  // ============================================================
  function generateExpertCases(analysis, entry) {
    const cases = [];
    const entryType = entry.id;

    // --- Context enrichment helpers ---
    const entities = (analysis.entities || []);
    const actions = (analysis.actions || []);
    const primaryEntity = entities.length > 0 ? entities[0] : null;
    const primaryAction = actions.length > 0 ? actions[0] : null;

    function enrichText(text) {
      let result = text;
      if (primaryEntity) {
        result = result.replace(/\bthe resource\b/gi, primaryEntity);
        result = result.replace(/\bthe system\b/gi, `the ${primaryEntity} system`);
      }
      if (primaryAction) {
        result = result.replace(/\bthe operation\b/gi, `the ${primaryAction} operation`);
      }
      return result;
    }

    // --- Category 1: Checklist Tests ---
    const setupSteps = entry.process.slice(0, Math.min(3, entry.process.length));

    entry.keyChecklist.forEach(item => {
      const enrichedItem = enrichText(item);
      cases.push({
        title: `Verify: ${enrichedItem.length > 120 ? enrichedItem.substring(0, 117) + '...' : enrichedItem}`,
        type: entryType,
        priority: 'high',
        preconditions: enrichText(entry.whenToUse[0] || 'System is available and configured for testing'),
        steps: [
          ...setupSteps.map(s => enrichText(s)),
          `Verify: ${enrichedItem}`,
        ],
        expectedResult: `Confirmed: ${enrichedItem}`,
        notes: `Standards: ${entry.standard} | Effort: ${entry.effortLevel} | Skill: ${entry.skillLevel}`,
      });
    });

    // --- Category 2: Pitfall Tests ---
    entry.commonPitfalls.forEach(pitfall => {
      const enrichedPitfall = enrichText(pitfall);
      const shortPitfall = enrichedPitfall.length > 80
        ? enrichedPitfall.substring(0, 77) + '...'
        : enrichedPitfall;

      cases.push({
        title: `Verify system avoids pitfall: ${shortPitfall}`,
        type: entryType,
        priority: 'medium',
        preconditions: enrichText(entry.whenToUse[0] || 'System is available and configured for testing'),
        steps: [
          `Set up the condition: ${enrichedPitfall}`,
          'Attempt the operation that would trigger this pitfall',
          'Observe system behavior and response',
          'Verify the system does NOT exhibit the described pitfall behavior',
        ],
        expectedResult: `System handles the scenario correctly, avoiding: ${shortPitfall}`,
        notes: 'Negative test — derived from common pitfall',
      });
    });

    // --- Category 3: Objective Tests ---
    const toolsNote = entry.tools.length > 0
      ? 'Recommended tools: ' + entry.tools.slice(0, 3).map(t => `${t.name} (${t.purpose})`).join(', ')
      : '';

    entry.sampleObjectives.forEach(objective => {
      const enrichedObj = enrichText(objective);

      // Parse objective into steps
      const steps = parseObjectiveIntoSteps(enrichedObj);

      // Extract expected result from objective
      const expectedResult = extractExpectedResult(enrichedObj);

      cases.push({
        title: enrichedObj.length > 150 ? enrichedObj.substring(0, 147) + '...' : enrichedObj,
        type: entryType,
        priority: 'critical',
        preconditions: enrichText(entry.whenToUse[0] || 'System is available and configured for testing'),
        steps: steps,
        expectedResult: expectedResult,
        notes: toolsNote,
      });
    });

    return cases;
  }

  // ── Objective parsing helpers ────────────────────────────────────
  function parseObjectiveIntoSteps(objective) {
    // Try to extract subject, action, and expected outcome
    const steps = [];

    // Step 1: Identify what is being tested
    const verifyMatch = objective.match(/^Verify that (.+?)(?:\s+(?:returns|shows|displays|responds|creates|produces|is|does|can|has|locks|maintains|meets|traps|announces))/i);
    if (verifyMatch) {
      steps.push(`Identify the component under test: ${verifyMatch[1].trim()}`);
    } else {
      steps.push('Identify the component or feature under test');
    }

    // Step 2: Set up test conditions
    const conditionMatch = objective.match(/(?:when|with|after|for|at|using|without)\s+(.+?)(?:\s+(?:returns|shows|and|is\s|does|,))/i);
    if (conditionMatch) {
      steps.push(`Set up test condition: ${conditionMatch[1].trim()}`);
    } else {
      steps.push('Set up the required test conditions and prerequisites');
    }

    // Step 3: Execute the action
    steps.push('Execute the test action as described in the objective');

    // Step 4: Observe result
    steps.push('Observe and record the system response');

    // Step 5: Compare against expected
    steps.push('Compare actual result against the expected outcome');

    return steps;
  }

  function extractExpectedResult(objective) {
    // Try to extract the expected outcome clause
    const patterns = [
      /(?:returns|shows|displays|responds with|produces|creates)\s+(.+)$/i,
      /(?:is\s+(?:redirected|rejected|blocked|accepted|created|updated|deleted))\s*(.*)$/i,
      /(?:does not|cannot|should not)\s+(.+)$/i,
      /(?:locks out|maintains|meets|traps|announces)\s+(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = objective.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    // Fallback: use the full objective as the expected result
    return objective;
  }
```

- [ ] **Step 2: Verify no syntax errors**

Open `index.html` in Chrome. Open DevTools Console — no errors.

- [ ] **Step 3: Commit**

```bash
git add test-case-generator/js/generator.js
git commit -m "feat: add generateExpertCases function for methodology-driven test generation"
```

---

### Task 4: Generator — Wire Expert Generation into `generateTestPlan()`

**Files:**
- Modify: `test-case-generator/js/generator.js`

- [ ] **Step 1: Add expert generation block after existing generators**

Find the section where user stories and requirements are generated (around lines 74-82). After the requirements block and before the "Filter by priority" comment (around line 84), insert the expert generation block:

Find this code:
```js
    // --- Generate from requirements ---
    if (analysis.requirements.length > 0) {
      testCases.push(...generateFromRequirements(analysis, depthConfig));
    }

    // Filter by priority if specified
```

Replace with:
```js
    // --- Generate from requirements ---
    if (analysis.requirements.length > 0) {
      testCases.push(...generateFromRequirements(analysis, depthConfig));
    }

    // --- Expert depth: methodology-driven generation ---
    if (depth === 'expert' && typeof METHODOLOGY !== 'undefined') {
      const typesToGenerate = testType === 'all'
        ? METHODOLOGY.map(e => e.id)
        : [testType];

      for (const typeId of typesToGenerate) {
        const entry = METHODOLOGY.find(e => e.id === typeId);
        if (!entry) continue;
        const expertCases = generateExpertCases(analysis, entry);
        testCases.push(...deduplicateByTitle(expertCases, testCases));
      }
    } else if (depth === 'expert') {
      console.warn('METHODOLOGY not loaded — expert depth falls back to exhaustive');
    }

    // Filter by priority if specified
```

- [ ] **Step 2: Add priority-aware capping for expert depth**

Find the existing capping code (around line 93):

```js
    // Trim to max count
    const finalCases = filtered.slice(0, depthConfig.max);
```

Replace with:

```js
    // Trim to max count (priority-aware for expert depth)
    let finalCases;
    if (depth === 'expert' && filtered.length > depthConfig.max) {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const sorted = [...filtered].sort((a, b) =>
        (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
      );
      finalCases = sorted.slice(0, depthConfig.max);
    } else {
      finalCases = filtered.slice(0, depthConfig.max);
    }
```

- [ ] **Step 3: Verify end-to-end in browser**

Open `index.html` in Chrome. Test the following:

1. Go to Generator page
2. Paste some text in the Text tab (e.g., "The application allows users to register, login, upload files, and manage their profile. Users can create, update, and delete items.")
3. Set Depth to "Expert (100-300 cases)"
4. Set Test Type to "All Types"
5. Click Generate
6. Verify: many test cases are generated (should be 100+)
7. Check that test cases include types like "security", "performance", "exploratory"
8. Verify test cases have detailed steps and notes mentioning standards and tools
9. Check DevTools Console — no errors

Also test:
- Expert depth with a single type (e.g., "Security") — should produce ~20-36 cases
- Standard depth — should work exactly as before (no regressions)
- Test Cases page → filter by "Exploratory" type — should show only exploratory cases

- [ ] **Step 4: Commit**

```bash
git add test-case-generator/js/generator.js
git commit -m "feat: wire expert methodology generation into generateTestPlan with priority-aware capping"
```

---

## Final Verification Checklist

After all 4 tasks are complete, verify the complete feature end-to-end:

- [ ] Expert depth option visible in Generator page depth dropdown
- [ ] Expert depth option visible in Settings page default depth dropdown
- [ ] Exploratory type option visible in Generator page test type dropdown
- [ ] Exploratory type option visible in Test Cases page filter dropdown
- [ ] Generating at Expert depth with "All Types" produces 100+ test cases
- [ ] Expert cases include all 14 methodology types (functional through exploratory)
- [ ] Each expert test case has: title, type, priority, preconditions, steps (array), expectedResult, notes
- [ ] Checklist-derived cases have priority "high" and include standards in notes
- [ ] Pitfall-derived cases have priority "medium" and note "Negative test"
- [ ] Objective-derived cases have priority "critical" and include recommended tools
- [ ] Standard/Comprehensive/Exhaustive depths still work identically (no regression)
- [ ] Basic depth still produces 5-10 cases
- [ ] Expert depth with a single type (e.g., Security) produces cases only for that type
- [ ] No console errors at any depth
- [ ] Export (CSV, JSON, Markdown) works with expert-generated cases
- [ ] Dark theme renders all pages correctly (no visual regression)

---

## Commit Summary

| Commit | Message |
|---|---|
| Task 1 | `feat: add Expert depth and Exploratory type options to HTML selects` |
| Task 2 | `feat: add expert depth config and deduplication utility to generator` |
| Task 3 | `feat: add generateExpertCases function for methodology-driven test generation` |
| Task 4 | `feat: wire expert methodology generation into generateTestPlan with priority-aware capping` |
