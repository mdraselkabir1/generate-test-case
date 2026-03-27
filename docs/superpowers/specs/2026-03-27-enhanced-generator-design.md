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

**Script load order:** In `index.html`, `generator.js` loads before `methodology.js`. This is safe because `generateExpertCases()` only accesses `METHODOLOGY` at call time (inside `generateTestPlan()`), not at module-load time. The `typeof METHODOLOGY !== 'undefined'` guard must remain a runtime check inside the function, never moved to module scope.

## Expert Depth Configuration

Add to `DEPTH_MAP`:

```js
expert: { min: 100, max: 300, edgeCases: true, negatives: true }
```

> Note: `min` is advisory/display-only — the existing code does not enforce a minimum case count. The generator produces as many cases as the methodology data and analysis yield; `min` serves as a UI hint for the expected range.

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

### Types Without Existing Generator Functions

Five METHODOLOGY types have no corresponding `generate*Cases()` function in the existing generator: `data-integrity`, `regression`, `compatibility`, `error-recovery`, and `exploratory`. Four of these (`data-integrity`, `regression`, `compatibility`, `error-recovery`) already appear in the `#testType` and `#filterType` HTML selects. `exploratory` does not appear in either select.

For all five types, `generateExpertCases()` is the sole source of test cases at expert depth. No new type-specific generator functions are needed — the methodology data is rich enough to produce quality test cases without type-specific logic.

**HTML update for `exploratory`:** Add `<option value="exploratory">Exploratory</option>` to both the `#testType` select (generator page) and `#filterType` select (test cases page) so exploratory test cases are selectable and filterable.

### Deduplication

A lightweight `deduplicateByTitle(newCases, existingCases)` function prevents near-duplicate test cases:

- Normalize both titles: lowercase, strip punctuation, collapse whitespace
- Remove stop words before comparison: "verify", "that", "the", "is", "a", "an", "and", "or", "for", "with", "system", "should", "must", "does"
- Compare using word overlap: if >80% of remaining significant words in the new title appear in an existing title (or vice versa), skip the new case
- This catches cases like "Verify SQL injection protection" (existing) vs. "Verify: Input validation tested with SQL injection payloads" (expert) — these share "sql" and "injection" which is >80% of significant words

### Filtering and Capping

After expert cases are appended:

1. Priority filter still applies (if user selected a specific priority)
2. Total cases are capped at `DEPTH_MAP.expert.max` (300)
3. **New behavior (expert depth only):** When capping, use priority-aware sorting — critical cases first, then high, then medium, then low — before slicing. The existing `.slice(0, max)` approach is preserved for all other depths to avoid behavior changes.

> Note: The existing code uses a naive `.slice(0, depthConfig.max)` for capping. Priority-aware capping is added only for expert depth to ensure the most important expert-generated cases survive the cap.

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

### Generator Page (`#testType` select)

Add after the "Edge Cases" option:

```html
<option value="exploratory">Exploratory</option>
```

### Test Cases Page (`#filterType` select)

Add after the "Edge Cases" option:

```html
<option value="exploratory">Exploratory</option>
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

For "All Types" (14 entries): ~210-336 raw cases, capped at 300 after deduplication. If entries are added to METHODOLOGY in the future, the 300 cap bounds the output regardless.

For a single type: ~15-24 expert cases + existing generator cases (4-12) = ~20-36 total. This is below the advisory `min` of 100 — that is expected. The `min` value reflects the "All Types" scenario and serves as a UI range hint, not an enforced minimum.

### Unit and Integration Types

The existing `unit` and `integration` generators only run when `analysis.codeAnalysis.isSourceCode` is true. At expert depth, `generateExpertCases()` produces methodology-based test cases for these types regardless of input type. This is intentional — methodology-informed unit/integration tests provide testing guidance even when the input is not source code (e.g., requirements text that mentions "unit test coverage" or "integration points").

### LLM Enhancement Interaction

When LLM mode is active (hybrid or enhance), the LLM receives the final capped test case array as input. At expert depth this may be up to 300 cases. No special truncation or batching is needed — the existing LLM integration already handles variable-length inputs, and the LLM prompt includes only titles and types, not full test case bodies.
