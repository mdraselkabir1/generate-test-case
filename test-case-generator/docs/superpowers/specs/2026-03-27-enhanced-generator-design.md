# Design: Enhanced Generator — Methodology-Driven Expert Depth

**Date:** 2026-03-27
**Status:** Approved

## Summary

Enhance the TestForge test case generator with a new "Expert" depth level that reads from the global `METHODOLOGY` array (from `methodology.js`) to produce 100-300 highly specific, methodology-informed test cases. Existing depth levels (basic, standard, comprehensive, exhaustive) remain unchanged. The enhancement adds a universal `generateExpertCases()` function that converts any METHODOLOGY entry into three categories of test cases: checklist tests, pitfall tests, and objective tests.

## Architecture

Two files are modified:

- `js/generator.js` — Add "expert" to `DEPTH_MAP`, add `generateExpertCases(analysis, entry)` function, wire into `generateTestPlan()`.
- `index.html` — Add "Expert" `<option>` to both `#depth` and `#defaultDepth` `<select>` elements.

No changes to `methodology.js`, `methodology-ui.js`, `parser.js`, `app.js`, `storage.js`, `exporter.js`, `llm.js`, or `css/styles.css`.

### Runtime Data Flow

```
User selects "Expert" depth + test type (or "All Types")
  → generateTestPlan() detects expert depth
  → For each applicable type:
      1. Run existing type-specific generator (e.g., generateSecurityCases())
      2. Look up METHODOLOGY entry: METHODOLOGY.find(e => e.id === type)
      3. Call generateExpertCases(analysis, entry)
      4. Deduplicate by title similarity
      5. Append expert cases to results
  → Assign IDs, return plan
```

### Dependency

`generateExpertCases()` requires the global `METHODOLOGY` array. If `METHODOLOGY` is undefined (methodology.js not loaded), the function returns an empty array — expert depth degrades gracefully to the same output as exhaustive depth. A console warning is logged.

## Expert Depth Configuration

Add to `DEPTH_MAP`:

```js
expert: { min: 100, max: 300, includeEdgeCases: true, includeNegative: true }
```

## Test Case Generation: `generateExpertCases(analysis, entry)`

This function accepts the parsed analysis object and a single METHODOLOGY entry. It returns an array of test cases in the standard shape: `{title, type, priority, preconditions, steps, expectedResult, notes}`.

### Category 1: Checklist Tests (from `entry.keyChecklist`)

- **Source:** `keyChecklist` array (6-10 items per methodology entry)
- **Priority:** high
- **Title:** Derived from checklist item text (e.g., "Verify: Every acceptance criterion has at least one test case")
- **Steps:** First 3-4 items from `entry.process` become setup steps. The checklist item itself becomes the final verification step.
- **Expected result:** The checklist item rephrased as a pass/fail assertion
- **Preconditions:** Built from `entry.whenToUse[0]` to provide context on when this test applies
- **Notes:** Includes `entry.standard` (e.g., "Standards: OWASP Top 10, ISO 27001") and `entry.effortLevel` / `entry.skillLevel`

### Category 2: Pitfall Tests (from `entry.commonPitfalls`)

- **Source:** `commonPitfalls` array (4-8 items per methodology entry)
- **Priority:** medium
- **Type:** Negative tests — they test what happens when the pitfall scenario occurs
- **Title:** "Verify system avoids pitfall: {first 80 chars of pitfall description}"
- **Steps:**
  1. Set up the condition described in the pitfall
  2. Attempt the operation that would trigger the pitfall
  3. Observe system behavior
  4. Verify the system does NOT exhibit the pitfall behavior
- **Expected result:** System handles the scenario correctly, avoiding the described pitfall
- **Notes:** "Negative test — derived from common pitfall"

### Category 3: Objective Tests (from `entry.sampleObjectives`)

- **Source:** `sampleObjectives` array (4-6 items per methodology entry)
- **Priority:** critical
- **Title:** The objective text directly (e.g., "Verify that the login endpoint locks out after 5 failed attempts within 10 minutes")
- **Steps:** Broken down from the objective into 3-5 concrete action steps. The function parses the objective to extract: the subject being tested, the action to perform, and the expected outcome.
- **Expected result:** Extracted from the objective text (the clause after "returns," "shows," "is," or the entire objective if no such clause exists)
- **Notes:** Includes recommended tools from `entry.tools` formatted as "Recommended tools: {tool1} ({purpose}), {tool2} ({purpose})"

### Context Enrichment

When `analysis` contains detected entities, actions, forms, or APIs, the generator substitutes them into test case templates to make tests more specific:

- If analysis has `entities` (e.g., "User", "Product"), generic references like "the resource" become the actual entity name
- If analysis has `actions` (e.g., "delete", "upload"), generic action references use the real action
- If analysis has `forms`, form-related checklist items get form-specific preconditions
- If analysis has `apis`, API-related tests reference the actual endpoints

If no analysis context is available, the test cases use the METHODOLOGY text as-is (which is already specific and actionable).

## Integration into `generateTestPlan()`

### Orchestration Logic

When depth is "expert," after all existing type-specific generators have run:

```
if (depth === 'expert' && typeof METHODOLOGY !== 'undefined') {
  const typesToGenerate = options.testType === 'all'
    ? METHODOLOGY.map(e => e.id)
    : [options.testType];

  for (const typeId of typesToGenerate) {
    const entry = METHODOLOGY.find(e => e.id === typeId);
    if (!entry) continue;
    const expertCases = generateExpertCases(analysis, entry);
    // Deduplicate against existing cases
    allCases.push(...deduplicateByTitle(expertCases, allCases));
  }
}
```

### The `exploratory` Type

`exploratory` exists in METHODOLOGY but not in the existing generator's type-specific functions. When expert depth is selected with "All Types," the `exploratory` methodology entry generates test cases via `generateExpertCases()` just like all other types. No new type-specific generator function is needed.

### Deduplication

A lightweight `deduplicateByTitle(newCases, existingCases)` function prevents near-duplicate test cases:

- Normalize both titles: lowercase, strip punctuation, collapse whitespace
- Compare using word overlap: if >80% of words in the new title appear in an existing title (or vice versa), skip the new case
- This catches cases like "Verify SQL injection protection" (existing) vs. "Verify: Input validation tested with SQL injection payloads" (expert) — these are similar enough to deduplicate

### Filtering and Capping

After expert cases are appended:

1. Priority filter still applies (if user selected a specific priority)
2. Total cases are capped at `DEPTH_MAP.expert.max` (300)
3. When capping, critical cases are preserved first, then high, then medium, then low

## HTML Changes

### Generator Page (`#depth` select)

Add after the "Exhaustive" option:

```html
<option value="expert">Expert (100-300 cases)</option>
```

### Settings Page (`#defaultDepth` select)

Add after the "Exhaustive" option:

```html
<option value="expert">Expert</option>
```

## Test Case Output Shape

Expert-generated test cases use the exact same shape as all other test cases:

```js
{
  id: "TC-XXX",          // assigned by generateTestPlan()
  title: "...",           // from checklist/pitfall/objective
  type: "security",       // from entry.id
  priority: "critical",   // critical for objectives, high for checklist, medium for pitfalls
  preconditions: "...",   // from whenToUse + analysis context
  steps: ["...", "..."],  // from process + checklist/pitfall/objective
  expectedResult: "...",  // from checklist/pitfall/objective text
  notes: "..."            // standards, tools, effort level
}
```

This ensures full compatibility with existing storage, export (CSV, JSON, Markdown, HTML), filtering, and LLM enhancement features.

## Graceful Degradation

- If `METHODOLOGY` is undefined: log `console.warn('METHODOLOGY not loaded — expert depth falls back to exhaustive')`, use exhaustive depth config
- If a specific methodology entry is not found for a type: skip that type's expert generation, no error
- If analysis has no detected entities/actions: use METHODOLOGY text as-is (still produces good test cases)

## Volume Estimates

Per methodology entry, `generateExpertCases()` produces approximately:
- Checklist tests: 6-10 cases
- Pitfall tests: 4-8 cases
- Objective tests: 4-6 cases
- **Total per type: ~15-24 cases**

For "All Types" (14 entries): ~210-336 raw cases, capped at 300 after deduplication.

For a single type: ~15-24 expert cases + existing generator cases (4-12) = ~20-36 total.
