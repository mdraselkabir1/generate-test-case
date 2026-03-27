# Testing Methodology Guide Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a slide-in side drawer to TestForge that serves as an expert-level in-app reference guide covering all 14 testing methodologies with purpose, process, checklist, tools, pitfalls, and external resources.

**Architecture:** Two new JS files (`methodology.js` for data, `methodology-ui.js` for drawer logic) are added alongside minimal changes to `index.html` (trigger button + drawer skeleton + script tags) and `css/styles.css` (drawer styles appended at the end). No changes to generator, parser, app, or storage.

**Tech Stack:** Vanilla JS (ES6, IIFE pattern), FontAwesome 6.5 icons, CSS custom properties, no build tools — open `index.html` directly in Chrome/Edge to test.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `test-case-generator/js/methodology.js` | Create | Pure data — `METHODOLOGY` array of 14 expert entries |
| `test-case-generator/js/methodology-ui.js` | Create | Drawer open/close, render, search, keyboard nav, focus trap |
| `test-case-generator/index.html` | Modify | Add trigger button in `.topbar-right` + drawer skeleton before `</body>` + two script tags |
| `test-case-generator/css/styles.css` | Modify | Append drawer, overlay, sidebar, and content styles at end of file |

---

## Chunk 1: Scaffolding — CSS and HTML

### Task 1: Drawer CSS Styles

**Files:**
- Modify: `test-case-generator/css/styles.css` (append after line 1593)

**Verify before starting:** Open `css/styles.css`. Confirm it ends around line 1593 with utility classes (`.text-center`, `.mt-2`, etc.). The new styles go after those.

- [ ] **Step 1: Verify current end of styles.css**

Open `test-case-generator/css/styles.css` and confirm the last few lines are utility classes. This ensures you append in the right place.

- [ ] **Step 2: Append drawer styles**

Add the following block at the very end of `css/styles.css`:

```css
/* ===================================================
   Testing Methodology Guide — Drawer
   =================================================== */

/* Backdrop overlay */
.guide-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 900;
  transition: opacity 0.3s ease;
}

/* Drawer — desktop default (slides in from right) */
.methodology-drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 480px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 950;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.methodology-drawer.active {
  transform: translateX(0);
}

/* Drawer header */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.drawer-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* Search bar */
.drawer-search {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.drawer-search input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  box-sizing: border-box;
}

.drawer-search input:focus {
  outline: none;
  border-color: var(--primary);
}

/* Drawer body: sidebar + content side-by-side */
.drawer-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Left sidebar — type list */
.guide-sidebar {
  width: 180px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
  padding: 0.5rem 0;
}

.guide-group-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  padding: 0.75rem 0.75rem 0.25rem;
}

.guide-sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--text-secondary);
  border-radius: 0;
  transition: background 0.15s, color 0.15s;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.guide-sidebar-item:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.guide-sidebar-item.active {
  background: var(--primary);
  color: #fff;
}

.guide-sidebar-item i {
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.guide-no-results {
  padding: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
}

/* Right content panel */
.guide-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
}

.guide-content-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Entry header */
.guide-entry-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.guide-badges {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.guide-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  background: var(--bg-primary);
}

.guide-badge.effort-low    { border-color: #22c55e; color: #16a34a; }
.guide-badge.effort-medium { border-color: #f59e0b; color: #d97706; }
.guide-badge.effort-high   { border-color: #f97316; color: #ea580c; }
.guide-badge.effort-expert { border-color: #ef4444; color: #dc2626; }

.guide-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.guide-tag {
  font-size: 0.68rem;
  padding: 0.15rem 0.45rem;
  border-radius: var(--border-radius-sm);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

/* Entry sections */
.guide-section {
  margin-bottom: 1.25rem;
}

.guide-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-secondary);
  margin: 0 0 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-color);
}

.guide-section p {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-primary);
  margin: 0;
}

/* Lists */
.guide-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.guide-list li {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-primary);
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.guide-list li .guide-icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
  font-size: 0.75rem;
}

.guide-icon-check   { color: #22c55e; }
.guide-icon-cross   { color: #ef4444; }
.guide-icon-warn    { color: #f59e0b; }
.guide-icon-step    { color: var(--primary); font-weight: 700; min-width: 1.2rem; }
.guide-icon-check-box { color: var(--primary); }
.guide-icon-obj     { color: var(--primary); font-weight: 700; min-width: 1.2rem; }

/* Tools table */
.guide-tools-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.guide-tools-table th {
  text-align: left;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.75rem;
}

.guide-tools-table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  vertical-align: top;
}

.guide-tools-table td:first-child {
  font-weight: 600;
  white-space: nowrap;
  color: var(--primary);
}

/* External resources */
.guide-resources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.guide-resources-list li a {
  font-size: 0.85rem;
  color: var(--primary);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.guide-resources-list li a:hover {
  text-decoration: underline;
}

/* Mobile: bottom sheet */
@media (max-width: 767px) {
  .methodology-drawer {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 85vh;
    border-radius: 16px 16px 0 0;
    border-left: none;
    border-top: 1px solid var(--border-color);
    transform: translateY(100%);
  }

  .methodology-drawer.active {
    transform: translateY(0);
  }

  .drawer-body {
    flex-direction: column;
  }

  .guide-sidebar {
    width: 100%;
    height: auto;
    max-height: 100px;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: row;
    padding: 0.5rem;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .guide-group-label {
    display: none;
  }

  .guide-sidebar-item {
    white-space: nowrap;
    border-radius: 999px;
    padding: 0.3rem 0.75rem;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
  }

  .guide-sidebar-item.active {
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
  }
}
```

- [ ] **Step 3: Verify visually**

Open `test-case-generator/index.html` in Chrome. The page should look identical to before — no visible changes yet (the drawer HTML doesn't exist yet).

- [ ] **Step 4: Commit**

```bash
cd test-case-generator
git add css/styles.css
git commit -m "feat: add methodology drawer CSS styles"
```

---

### Task 2: HTML — Trigger Button + Drawer Skeleton + Script Tags

**Files:**
- Modify: `test-case-generator/index.html`

Three separate insertions:
1. Trigger button inside `.topbar-right` (before `#themeToggle`)
2. Drawer skeleton + overlay (before `</body>`)
3. Two script tags (after `app.js` script tag, before `</body>`)

**Context:** The topbar-right currently contains `#quickGenerate` button and `#themeToggle`. The existing script tags at the bottom load: `storage.js`, `parser.js`, `generator.js`, `llm.js`, `exporter.js`, `app.js`.

- [ ] **Step 1: Add trigger button in `.topbar-right`**

Find the `.topbar-right` div (around line 71). Insert the `#openGuideBtn` button **between** `#quickGenerate` and `#themeToggle`:

```html
        <div class="topbar-right">
          <button class="btn btn-primary" id="quickGenerate">
            <i class="fas fa-plus"></i> Quick Generate
          </button>
          <button class="btn btn-sm btn-secondary" id="openGuideBtn" aria-expanded="false">
            <i class="fas fa-book"></i> Testing Guide
          </button>
          <div class="theme-toggle" id="themeToggle" title="Toggle theme">
            <i class="fas fa-moon"></i>
          </div>
        </div>
```

- [ ] **Step 2: Add overlay + drawer skeleton before `</body>`**

Find the closing `</body>` tag. Just before it (but after the toast container div), insert:

```html
  <!-- Methodology Guide Drawer -->
  <div id="guideOverlay" class="guide-overlay hidden"></div>
  <aside id="methodologyDrawer" class="methodology-drawer"
         role="dialog" aria-modal="true" aria-label="Testing Guide">
    <div class="drawer-header">
      <h2>Testing Guide</h2>
      <button id="closeGuideBtn" class="btn-icon" aria-label="Close guide">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="drawer-search">
      <input type="text" id="guideSearch" placeholder="Search methodologies…"
             aria-label="Search testing methodologies" />
    </div>
    <div class="drawer-body">
      <nav id="guideSidebar" class="guide-sidebar" aria-label="Test type list"></nav>
      <div id="guideContent" class="guide-content"></div>
    </div>
  </aside>
```

- [ ] **Step 3: Add script tags after `app.js`**

Find the existing script tags block at the bottom. After `<script src="js/app.js"></script>`, add:

```html
  <script src="js/methodology.js"></script>
  <script src="js/methodology-ui.js"></script>
```

- [ ] **Step 4: Verify in browser**

Open `index.html` in Chrome. You should see:
- A "Testing Guide" button in the top-right header bar (between Quick Generate and the theme toggle)
- Clicking the button does nothing yet (no JS)
- No console errors

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add testing guide trigger button and drawer skeleton"
```

---

## Chunk 2: Methodology Data — `js/methodology.js`

### Task 3: Methodology Data — Entries 1–7

**Files:**
- Create: `test-case-generator/js/methodology.js`

This file is pure data. No IIFE, no logic — just a `const METHODOLOGY` array. Write entries 1–7 in this task; entries 8–14 will be appended in Task 4 (you'll finalize and close the array then).

**Important:** Start the file but do NOT close the array (`];`) yet — Task 4 will add entries 8–14 and close it. Do NOT commit between Task 3 and Task 4.

- [ ] **Step 1: Create `js/methodology.js` with entries 1–7**

Create `test-case-generator/js/methodology.js` with this content (entries 8–14 and closing `];` will be added in Task 4):

```js
// Pure data — no IIFE, no logic. Accessed as global METHODOLOGY by methodology-ui.js.
const METHODOLOGY = [

  // ── 1. Functional Testing ──────────────────────────────────────────
  {
    id: 'functional',
    name: 'Functional Testing',
    icon: 'fa-check-circle',
    category: 'manual',
    standard: 'IEEE 829, ISO 25010',
    effortLevel: 'Medium',
    skillLevel: 'Mid',
    purpose: 'Functional testing verifies that the software behaves according to its specified requirements and business rules. It treats the system as a black box — testing what the system does rather than how it does it — by providing inputs and validating outputs against expected results. The goal is to confirm every user-facing feature works correctly under normal conditions.',
    whenToUse: [
      'For every new feature before it is merged or released',
      'After bug fixes, to confirm the fix works and nothing adjacent broke',
      'When validating acceptance criteria from user stories or requirements documents',
      'Before handing off a feature to QA from development',
      'During regression cycles to confirm stable areas remain intact',
      'When requirements change — re-test all affected workflows',
    ],
    whenNotToUse: [
      'As a substitute for unit or integration tests — functional tests verify behaviour, not internal implementation',
      'When requirements are not yet finalised — wait until acceptance criteria are stable',
      'For performance, security, or accessibility concerns — use dedicated test types for those',
    ],
    process: [
      'Review the requirements document, user story, or acceptance criteria to understand expected behaviour',
      'Identify all inputs, outputs, and system states for the feature under test',
      'Design positive test cases: valid inputs that should produce the expected output',
      'Design negative test cases: invalid or missing inputs that should produce appropriate error messages',
      'Design boundary cases: minimum and maximum allowed values, empty fields, maximum-length strings',
      'Execute each test case and record the actual result',
      'Compare actual vs. expected results; log any discrepancy as a defect with steps to reproduce',
      'Re-test after defects are fixed to confirm resolution (verify fix) and check for regressions',
    ],
    keyChecklist: [
      'Every acceptance criterion in the user story has at least one test case',
      'Happy path (valid input → expected output) is covered',
      'Each required and optional field is tested for missing/invalid input',
      'Error messages are correct, specific, and user-friendly',
      'Any conditional logic (if/else, feature flags, roles) is tested for each branch',
      'Data persists correctly after form submission (refresh, navigate away and back)',
      'All related workflows (upstream and downstream of the feature) are smoke-tested',
    ],
    commonPitfalls: [
      'Testing only the happy path — real users make mistakes; always test invalid inputs',
      'Skipping negative tests because the UI prevents them — API calls bypass UI validation',
      'Not testing after small "safe" changes — many regressions come from trivial code changes',
      'Missing role-based tests — admin, regular user, and guest often see different behaviour',
      'Assuming the fix for bug A did not affect feature B — always regression-test adjacent flows',
    ],
    tools: [
      { name: 'Selenium / Playwright', purpose: 'Automated browser-based functional test execution' },
      { name: 'Postman / Insomnia', purpose: 'API-level functional testing without UI' },
      { name: 'TestRail / Xray', purpose: 'Test case management, execution tracking, and reporting' },
      { name: 'JIRA', purpose: 'Defect logging, tracking, and linking to requirements' },
    ],
    sampleObjectives: [
      'Verify that submitting the registration form with valid data creates a new user account and redirects to the dashboard',
      'Verify that submitting the login form with an incorrect password shows the message "Invalid email or password" and does not authenticate the user',
      'Verify that the search results update correctly when the user applies the "Price: Low to High" sort filter',
      'Verify that deleting an item from the cart immediately updates the cart total and item count badge',
      'Verify that a user with the "viewer" role cannot access the /admin route and is redirected to /403',
    ],
    externalResources: [
      { title: 'IEEE 829 Standard for Software Test Documentation', url: 'https://standards.ieee.org/ieee/829/3787/' },
      { title: 'ISO 25010 Systems and Software Quality Requirements', url: 'https://www.iso.org/standard/35733.html' },
      { title: 'ISTQB Syllabus — Functional Testing Techniques', url: 'https://www.istqb.org/certifications/certified-tester-foundation-level' },
    ],
  },

  // ── 2. Unit Testing ───────────────────────────────────────────────
  {
    id: 'unit',
    name: 'Unit Testing',
    icon: 'fa-cube',
    category: 'technical',
    standard: 'IEEE 829, xUnit patterns',
    effortLevel: 'Low',
    skillLevel: 'Junior',
    purpose: 'Unit testing verifies individual functions, methods, or classes in isolation — completely decoupled from databases, networks, and external services (which are replaced by mocks or stubs). Each unit test covers one specific behaviour or code path. Fast to run and easy to diagnose, unit tests provide the first safety net against regressions and are the foundation of any test pyramid.',
    whenToUse: [
      'While writing new functions or methods (test-driven development)',
      'Whenever a function has conditional logic, error handling, or complex calculation',
      'For any pure function: given input X, always returns output Y',
      'When fixing a bug: write a failing test that reproduces the bug before fixing it',
      'Before refactoring: add tests to lock in current behaviour, then refactor with confidence',
      'For all utility/helper functions shared across the codebase',
    ],
    whenNotToUse: [
      'To test database queries or external API calls directly — mock those dependencies',
      'As a replacement for integration tests — units may pass individually but fail when connected',
      'For UI rendering or browser behaviour — use end-to-end tests for those',
      'When the function is a trivial one-liner with no logic (e.g., a getter) — the value is too low',
    ],
    process: [
      'Identify the function or method to test and its expected behaviour for each input combination',
      'Write a test for the happy path: call the function with valid input and assert the expected return value',
      'Run the test and confirm it passes (if writing tests for existing code) or fails (if TDD)',
      'Write a test for each error condition: null input, wrong type, out-of-range value',
      'Write a test for each branch of conditional logic (every if/else/switch path)',
      'Mock all external dependencies (database calls, HTTP requests, timers) using a mocking library',
      'Confirm all tests pass and code coverage for the function is ≥80%',
      'Add the test file to CI so it runs on every pull request',
    ],
    keyChecklist: [
      'Each test has one clear assertion (one reason to fail)',
      'Test names describe the scenario: "should return null when input is empty"',
      'All external dependencies are mocked — no real network or database calls',
      'Both the success path and each error/exception path have tests',
      'Edge cases tested: null, undefined, empty string, 0, negative numbers, max integer',
      'Tests are independent — running them in any order produces the same result',
      'No test shares mutable state with another test',
    ],
    commonPitfalls: [
      'Testing implementation details instead of behaviour — tests should not break when internal code is refactored without changing outputs',
      'Writing tests after the code is shipped — they tend to be weaker and miss edge cases',
      'Not mocking dependencies — a unit test that calls a real database is an integration test',
      'Over-mocking — if you mock everything, the test proves nothing; focus on the function\'s logic',
      'Ignoring flaky tests — a test that sometimes passes is worse than no test; fix or delete it',
    ],
    tools: [
      { name: 'Jest', purpose: 'JavaScript/TypeScript unit testing with built-in mocking' },
      { name: 'Vitest', purpose: 'Vite-native unit testing, Jest-compatible API' },
      { name: 'Mocha + Chai', purpose: 'Node.js unit testing with flexible assertion library' },
      { name: 'pytest', purpose: 'Python unit testing with fixtures and parameterisation' },
      { name: 'JUnit 5', purpose: 'Java unit testing framework' },
    ],
    sampleObjectives: [
      'Verify that `calculateDiscount(price, 0.2)` returns `price * 0.8` for any positive price',
      'Verify that `parseDate("")` throws an `InvalidInputError` with message "Date cannot be empty"',
      'Verify that `fetchUser(id)` calls the HTTP client exactly once with the correct URL and returns the parsed user object',
      'Verify that `formatCurrency(1234.5, "USD")` returns "$1,234.50"',
      'Verify that `validateEmail("not-an-email")` returns `false`',
    ],
    externalResources: [
      { title: 'xUnit Test Patterns — Gerard Meszaros', url: 'http://xunitpatterns.com/' },
      { title: 'Jest Documentation', url: 'https://jestjs.io/docs/getting-started' },
      { title: 'The Practical Test Pyramid — Martin Fowler', url: 'https://martinfowler.com/articles/practical-test-pyramid.html' },
    ],
  },

  // ── 3. Integration Testing ────────────────────────────────────────
  {
    id: 'integration',
    name: 'Integration Testing',
    icon: 'fa-project-diagram',
    category: 'technical',
    standard: 'IEEE 829, ISO 25010',
    effortLevel: 'Medium',
    skillLevel: 'Mid',
    purpose: 'Integration testing verifies that two or more components, modules, or services work correctly when connected together. Where unit tests confirm each piece works in isolation, integration tests confirm the pieces work together — covering real database queries, real HTTP calls, message queues, and third-party API interactions. They catch the category of bugs that only appear at the boundaries between components.',
    whenToUse: [
      'After unit tests pass but before end-to-end tests — integration tests close the gap',
      'When a new service or API integration is added to the system',
      'When the contract between two internal modules changes (e.g., a new parameter is added)',
      'When a third-party library or SDK is upgraded — verify integration points still work',
      'For critical data flows: user registration → email service → database → confirmation email',
      'When microservices communicate over HTTP or message queues',
    ],
    whenNotToUse: [
      'As a substitute for unit tests — always unit-test the component logic first',
      'When mocking is sufficient — if you can fully simulate the dependency, a unit test is faster and cheaper',
      'For UI-level verification — use end-to-end tests for that layer',
    ],
    process: [
      'Identify the two (or more) components to integrate and define the expected data flow between them',
      'Set up a real (or containerised) instance of all dependencies: test database, local mock server, or sandbox API',
      'Write a test that invokes one component and verifies the downstream component receives and processes the data correctly',
      'Test the success path: correct data flows through both components and produces the expected result',
      'Test failure paths: what happens when the downstream component is unavailable, returns an error, or returns unexpected data',
      'Test data transformation: verify that any mapping or serialisation between components is lossless',
      'Clean up test data after each test (or use transactions that roll back) to keep tests independent',
      'Run integration tests in CI against a real test database or containerised service (not production)',
    ],
    keyChecklist: [
      'Each integration test exercises a real dependency (not a mock of the dependency)',
      'Test database is seeded with known data before each test',
      'Tests clean up after themselves — no shared state between tests',
      'API contract verified: correct request format sent, correct response format parsed',
      'Error scenarios covered: timeout, 500 response, malformed payload from downstream',
      'Authentication/authorisation headers are correctly passed between services',
      'Data written to the database by one component is correctly read by another',
    ],
    commonPitfalls: [
      'Testing too many things at once — integration tests should test one boundary at a time, not the entire system',
      'Using production credentials or production databases in tests — always use a dedicated test environment',
      'Flaky tests caused by shared database state — seed and clean data per test',
      'Slow tests from real network calls — use local containers (Docker) for third-party services',
      'Not testing timeout and retry behaviour — real integrations fail; verify recovery logic works',
    ],
    tools: [
      { name: 'Supertest', purpose: 'Node.js HTTP integration testing for Express/Fastify APIs' },
      { name: 'WireMock', purpose: 'HTTP mock server for simulating third-party API responses' },
      { name: 'Testcontainers', purpose: 'Spin up real Docker containers (Postgres, Redis, etc.) for tests' },
      { name: 'Pact', purpose: 'Consumer-driven contract testing between services' },
      { name: 'Postman (Collection Runner)', purpose: 'Run API integration test suites against a live environment' },
    ],
    sampleObjectives: [
      'Verify that POST /api/users with valid data creates a row in the `users` table and returns 201 with the created user\'s id',
      'Verify that when the email service is unavailable, the registration endpoint returns 202 (accepted) and queues the email for retry',
      'Verify that the order service correctly reads inventory from the inventory service before confirming an order',
      'Verify that the authentication middleware rejects requests with expired JWT tokens with a 401 response',
      'Verify that a payment webhook from Stripe correctly updates the order status in the database from "pending" to "paid"',
    ],
    externalResources: [
      { title: 'Integration Testing — Martin Fowler', url: 'https://martinfowler.com/bliki/IntegrationTest.html' },
      { title: 'Testcontainers Documentation', url: 'https://testcontainers.com/' },
      { title: 'Pact — Consumer-Driven Contract Testing', url: 'https://docs.pact.io/' },
    ],
  },

  // ── 4. UI/UX Testing ─────────────────────────────────────────────
  {
    id: 'ui',
    name: 'UI/UX Testing',
    icon: 'fa-desktop',
    category: 'manual',
    standard: 'WCAG 2.1, Nielsen\'s 10 Heuristics',
    effortLevel: 'Medium',
    skillLevel: 'Mid',
    purpose: 'UI/UX testing evaluates the visual design, interaction patterns, and usability of the user interface. It goes beyond functional correctness to assess whether users can accomplish tasks efficiently, intuitively, and without confusion. Good UI/UX testing combines heuristic evaluation (expert review against established principles) with usability observation (watching real users attempt tasks).',
    whenToUse: [
      'Before launch of any new user-facing feature or redesign',
      'When analytics show high bounce rates, abandoned forms, or low task completion',
      'After significant layout changes to navigation, forms, or core workflows',
      'During design review — evaluate wireframes and prototypes before development',
      'When onboarding a new user type — their mental model may differ from existing users',
      'For responsive design: verify usability on mobile, tablet, and desktop breakpoints',
    ],
    whenNotToUse: [
      'As a substitute for accessibility testing — usability and accessibility overlap but are distinct',
      'To test functional correctness — use functional tests for that; UI testing focuses on the user experience',
      'When you have no clear user tasks or scenarios — usability testing needs realistic goals to be meaningful',
    ],
    process: [
      'Define 3–5 realistic user tasks that represent the most common or critical workflows',
      'Evaluate each screen against Nielsen\'s 10 Usability Heuristics: visibility of system status, match between system and real world, user control and freedom, consistency and standards, error prevention, recognition over recall, flexibility and efficiency, aesthetic minimalist design, help users recognise/recover from errors, help and documentation',
      'Test the responsive layout: resize the browser from 1440px down to 375px; verify no overflow, overlapping elements, or unreadable text',
      'Verify interactive feedback: every button, link, and form element shows a clear state change (hover, focus, active, disabled)',
      'Check loading states: every async action (form submission, data load) shows a spinner or progress indicator',
      'Verify error messages are positioned near the field that caused them and use plain language',
      'Test empty states: what does the user see when there is no data? Ensure it guides next action',
      'Document each issue with a screenshot and severity rating (critical/major/minor/cosmetic)',
    ],
    keyChecklist: [
      'All interactive elements (buttons, links, inputs) have visible focus states',
      'Form validation errors appear inline, near the offending field, not at page top only',
      'Loading/processing states are shown for all async operations',
      'Empty states explain what to do next (not just "No data")',
      'Destructive actions (delete, cancel) require confirmation',
      'Navigation shows current location (active state, breadcrumbs)',
      'Text contrast ratio meets WCAG AA minimum (4.5:1 for body text)',
      'Clickable targets are at least 44×44px on mobile',
      'No horizontal scroll on mobile viewports (320px–414px)',
      'Error recovery is always possible — no dead ends where the user is stuck',
    ],
    commonPitfalls: [
      'Testing only on your own device and browser — test on Chrome, Firefox, Safari, and mobile',
      'Ignoring empty and error states — these are the moments users most need clear guidance',
      'Confusing "looks good" with "works well" — aesthetic approval is not the same as usability',
      'Not testing with real content — placeholder "lorem ipsum" text hides layout problems that real content causes',
      'Over-designing forms — every extra field reduces completion rates; question if each field is truly needed',
    ],
    tools: [
      { name: 'Chrome DevTools', purpose: 'Responsive design testing, element inspection, and network simulation' },
      { name: 'Figma / Storybook', purpose: 'Design prototype review and component state documentation' },
      { name: 'Hotjar / FullStory', purpose: 'Session recording and heatmap analysis for real user behaviour' },
      { name: 'Maze / Lookback', purpose: 'Moderated and unmoderated usability testing with real users' },
      { name: 'axe DevTools', purpose: 'Automated accessibility check during UI review' },
    ],
    sampleObjectives: [
      'Verify that a first-time user can complete the registration flow in under 3 minutes without external help',
      'Verify that all form error messages are specific, positioned next to the offending field, and written in plain language',
      'Verify that the navigation correctly highlights the active page for all 5 main sections',
      'Verify that the application has no horizontal scroll at 375px viewport width on any page',
      'Verify that every button and link has a visible keyboard focus indicator',
    ],
    externalResources: [
      { title: 'Nielsen\'s 10 Usability Heuristics', url: 'https://www.nngroup.com/articles/ten-usability-heuristics/' },
      { title: 'WCAG 2.1 Guidelines', url: 'https://www.w3.org/TR/WCAG21/' },
      { title: 'Google Material Design Usability Guidelines', url: 'https://m3.material.io/foundations/overview' },
    ],
  },

  // ── 5. API Testing ────────────────────────────────────────────────
  {
    id: 'api',
    name: 'API Testing',
    icon: 'fa-code',
    category: 'technical',
    standard: 'OpenAPI Specification, RFC 7231, RFC 6749',
    effortLevel: 'High',
    skillLevel: 'Senior',
    purpose: 'API testing verifies that application programming interfaces function correctly, return the right data, enforce security rules, handle errors gracefully, and perform within acceptable response times. Unlike UI testing, API tests call endpoints directly — making them faster, more reliable, and able to test scenarios the UI does not expose. API tests are essential for any service that exposes or consumes REST, GraphQL, or gRPC interfaces.',
    whenToUse: [
      'For every API endpoint before it is deployed to production',
      'When adding or changing request/response schemas — verify backward compatibility',
      'After authentication or authorization logic changes',
      'When third-party consumers depend on your API — contract testing prevents breaking them',
      'For rate limiting and throttling verification',
      'For all microservice boundaries where services communicate over HTTP',
    ],
    whenNotToUse: [
      'As a replacement for database-level data integrity tests — API tests verify the HTTP contract, not the underlying data model',
      'For internal function logic — use unit tests for that',
      'When the UI is the only consumer — functional or end-to-end tests are more appropriate',
    ],
    process: [
      'Obtain or generate the API specification (OpenAPI/Swagger) for the endpoints under test',
      'Test each endpoint for the happy path: correct request → expected 2xx response with correct schema',
      'Test authentication: missing token → 401, invalid token → 401, expired token → 401, correct token → 200',
      'Test authorization: user role A cannot access resource belonging to role B (IDOR / privilege escalation)',
      'Test input validation: missing required fields → 400, wrong data types → 400, values out of range → 400 or 422',
      'Test error responses: verify error payloads include a machine-readable error code and human-readable message',
      'Test idempotency: for PUT/DELETE, calling twice produces the same result as calling once',
      'Measure response times: p50 and p95 under normal load; verify they meet SLA thresholds',
      'Test rate limiting: exceed the rate limit threshold and verify 429 with Retry-After header',
      'Test pagination: correct total count, correct page size, correct next/prev links',
    ],
    keyChecklist: [
      'All HTTP methods (GET, POST, PUT, PATCH, DELETE) tested for each resource',
      'Authentication tested: no token, invalid token, expired token, valid token',
      'Authorization tested: a user cannot access or modify another user\'s resources',
      'All 2xx, 4xx, and 5xx response codes documented and tested',
      'Response schema matches the OpenAPI spec (field names, types, required vs. optional)',
      'Rate limiting returns 429 with Retry-After header when threshold exceeded',
      'Pagination parameters (page, limit, cursor) are tested at boundaries (page 0, page beyond total)',
      'Large payloads and concurrent requests are smoke-tested',
      'CORS headers are correct for browser-facing APIs',
      'Sensitive data (passwords, tokens, PII) is not included in any response body or log',
    ],
    commonPitfalls: [
      'Testing only the happy path — error responses and edge cases are where bugs hide',
      'Using hardcoded IDs from the test database — use dynamic setup/teardown to create test data',
      'Skipping authorization tests — just because the UI hides a button does not mean the API endpoint is protected',
      'Ignoring response time — a correct but slow API breaks user experience and downstream services',
      'Not version-testing: when v2 is released, confirm v1 still works if clients have not migrated',
    ],
    tools: [
      { name: 'Postman / Newman', purpose: 'API request builder, collection runner, and CI integration' },
      { name: 'Insomnia', purpose: 'REST and GraphQL API client with environment variables' },
      { name: 'REST-assured (Java)', purpose: 'Fluent DSL for REST API testing in Java' },
      { name: 'Dredd', purpose: 'Validates API implementation against OpenAPI/API Blueprint spec' },
      { name: 'k6', purpose: 'API load and performance testing' },
    ],
    sampleObjectives: [
      'Verify that GET /api/products returns 200 with a JSON array matching the OpenAPI schema when authenticated',
      'Verify that POST /api/orders without an Authorization header returns 401 with error code "UNAUTHORIZED"',
      'Verify that a regular user cannot delete another user\'s order via DELETE /api/orders/:id (returns 403)',
      'Verify that POST /api/products with a missing required field "name" returns 400 with field-level validation errors',
      'Verify that the GET /api/products endpoint responds in under 200ms at the p95 for 50 concurrent requests',
    ],
    externalResources: [
      { title: 'OpenAPI Specification', url: 'https://spec.openapis.org/oas/latest.html' },
      { title: 'RFC 7231 — HTTP/1.1 Semantics', url: 'https://datatracker.ietf.org/doc/html/rfc7231' },
      { title: 'OWASP API Security Top 10', url: 'https://owasp.org/www-project-api-security/' },
    ],
  },

  // ── 6. Security Testing ───────────────────────────────────────────
  {
    id: 'security',
    name: 'Security Testing',
    icon: 'fa-shield-alt',
    category: 'technical',
    standard: 'OWASP Top 10, ISO 27001, NIST SP 800-53',
    effortLevel: 'Expert',
    skillLevel: 'Specialist',
    purpose: 'Security testing identifies vulnerabilities, threats, and risks in a system that could be exploited by attackers. It verifies that the system protects data and maintains intended functionality under adversarial conditions, covering authentication, authorization, input validation, data exposure, and dependency risks.',
    whenToUse: [
      'Before any public-facing release or major version bump',
      'After changes to authentication, authorization, or session management',
      'When integrating third-party libraries or APIs that handle sensitive data',
      'After infrastructure changes (new cloud services, updated dependencies)',
      'As part of every sprint for systems handling PII, payments, or health data',
      'When penetration testing is contractually required (SOC2, ISO 27001 audits)',
    ],
    whenNotToUse: [
      'As a substitute for secure design — security testing finds issues, it does not prevent them',
      'On a prototype that will be fully rewritten before production',
      'When the threat model has not been defined — test against real risks, not generic ones',
      'In isolation — combine with code review and static analysis for full coverage',
    ],
    process: [
      'Define the threat model: identify assets, entry points, trust boundaries, and adversary goals',
      'Map the attack surface: enumerate all inputs, endpoints, file uploads, and third-party integrations',
      'Test authentication: brute force, credential stuffing, token expiry, MFA bypass, password reset flows',
      'Test authorization: IDOR, privilege escalation, horizontal access, missing function-level checks',
      'Test input handling: SQL injection, XSS (reflected/stored/DOM), XXE, SSRF, command injection',
      'Test session management: session fixation, token entropy, secure/HttpOnly cookie flags, logout invalidation',
      'Test data exposure: sensitive data in logs, error messages, API responses, browser storage',
      'Test CSRF: verify anti-CSRF tokens on all state-changing requests',
      'Review dependencies: check CVEs for all third-party libraries (npm audit, OWASP Dependency-Check)',
      'Test file upload: MIME type validation, path traversal, malicious payload upload',
      'Verify transport security: HTTPS enforced, HSTS header, TLS 1.2+ only, no mixed content',
      'Document findings with severity (CVSS score), reproduction steps, and recommended fix',
    ],
    keyChecklist: [
      'OWASP Top 10 categories each have at least one test case',
      'All authentication endpoints tested for brute force and lockout',
      'All API endpoints tested for missing authorization (not just UI-accessible ones)',
      'Input validation tested with SQL, XSS, and command injection payloads',
      'Session tokens are cryptographically random and invalidated on logout',
      'Sensitive data (passwords, tokens, PII) never appears in logs or error responses',
      'Dependencies scanned for known CVEs',
      'Security headers present: CSP, X-Frame-Options, X-Content-Type-Options, HSTS',
    ],
    commonPitfalls: [
      'Testing only the happy path — attackers use unexpected inputs; test with malformed, empty, and oversized data',
      'Skipping API endpoints not visible in the UI — direct API calls bypass frontend validation',
      'Treating authentication testing as "just try wrong password" — test token lifecycle, refresh flows, concurrent sessions',
      'Ignoring third-party dependencies — most breaches involve known CVEs in libraries',
      'Over-relying on automated scanners — they miss business logic flaws; combine with manual testing',
      'Not testing after every deployment — a new dependency version can introduce a CVE',
    ],
    tools: [
      { name: 'OWASP ZAP', purpose: 'Automated vulnerability scanning and active attack simulation' },
      { name: 'Burp Suite', purpose: 'Manual HTTP interception, fuzzing, and security testing proxy' },
      { name: 'npm audit / Snyk', purpose: 'Dependency CVE scanning' },
      { name: 'sqlmap', purpose: 'Automated SQL injection detection and exploitation' },
      { name: 'jwt.io', purpose: 'JWT token inspection and algorithm confusion testing' },
      { name: 'OWASP Dependency-Check', purpose: 'Identify vulnerable third-party components' },
    ],
    sampleObjectives: [
      'Verify that the login endpoint locks out after 5 failed attempts within 10 minutes',
      'Confirm that user A cannot access or modify user B\'s resources via IDOR on /api/users/:id',
      'Verify that all form inputs reject SQL injection payloads (e.g., \' OR 1=1 --) without exposing database errors',
      'Confirm that the session token is invalidated server-side immediately after logout',
      'Verify that the application enforces HTTPS and redirects all HTTP requests',
    ],
    externalResources: [
      { title: 'OWASP Testing Guide v4.2', url: 'https://owasp.org/www-project-web-security-testing-guide/' },
      { title: 'OWASP Top 10 (2021)', url: 'https://owasp.org/www-project-top-ten/' },
      { title: 'NIST SP 800-115: Technical Guide to Information Security Testing', url: 'https://csrc.nist.gov/publications/detail/sp/800-115/final' },
      { title: 'CVSS v3.1 Scoring Calculator', url: 'https://www.first.org/cvss/calculator/3.1' },
    ],
  },

  // ── 7. Performance Testing ────────────────────────────────────────
  {
    id: 'performance',
    name: 'Performance Testing',
    icon: 'fa-tachometer-alt',
    category: 'non-functional',
    standard: 'ISO 25010, IEEE 829, ISTQB Performance Testing',
    effortLevel: 'Expert',
    skillLevel: 'Specialist',
    purpose: 'Performance testing measures a system\'s speed, responsiveness, stability, and scalability under various load conditions. It identifies bottlenecks before they reach users by simulating realistic and extreme traffic patterns. Performance testing encompasses load testing (normal traffic), stress testing (beyond normal limits), endurance testing (sustained load over time), and spike testing (sudden traffic bursts).',
    whenToUse: [
      'Before any major release, especially for systems expecting high traffic',
      'After significant architectural changes (new database, caching layer, message queue)',
      'After query optimisation or index changes — verify improvement is real and no regression introduced',
      'When SLA (Service Level Agreement) thresholds are defined — test that they are met',
      'After scaling infrastructure horizontally — verify new nodes take load correctly',
      'When performance bugs are reported in production — reproduce and measure in a controlled environment',
    ],
    whenNotToUse: [
      'In production — performance tests generate artificial load that will impact real users',
      'Without a realistic production-like dataset — testing against an empty database produces meaningless results',
      'Before functional correctness is established — performance testing a broken feature is wasteful',
      'Without defined SLA thresholds — you need a target before you can say "fast enough"',
    ],
    process: [
      'Define performance requirements: target response times (p50, p95, p99), throughput (requests/second), error rate threshold (<1%), and maximum concurrent users',
      'Prepare a production-like test environment and dataset (minimum 80% of production data volume)',
      'Write load test scripts simulating realistic user journeys (not just single endpoints)',
      'Run a baseline test at 1× expected load; record p50/p95/p99 response times and error rate',
      'Run load test at 2× expected load; confirm SLAs still met and no errors introduced',
      'Run stress test at 5–10× expected load; identify the breaking point and degradation behaviour',
      'Run endurance test at normal load for 4–8 hours; watch for memory leaks, connection pool exhaustion, or growing response times',
      'Run spike test: instant ramp from 0 to 10× load; verify the system recovers without data loss',
      'Analyse results: identify the slowest 10% of requests; profile the bottleneck (database, CPU, I/O, GC)',
      'Fix the top bottleneck, re-run the test, and compare against the baseline',
    ],
    keyChecklist: [
      'Test environment has production-like data volume and configuration',
      'SLA thresholds defined before testing begins (p95 < Xms, error rate < Y%)',
      'Baseline established at 1× load before testing higher loads',
      'p50, p95, and p99 response times recorded for each test run',
      'Memory and CPU usage monitored throughout (not just response time)',
      'Database slow query log reviewed after each load test',
      'Connection pool settings validated — no "too many connections" errors under load',
      'Results compared against previous runs — regressions detected automatically',
    ],
    commonPitfalls: [
      'Testing with an empty or tiny database — query performance degrades non-linearly as data volume grows; test at production scale',
      'Testing single endpoints instead of user journeys — real load is distributed across many endpoints; single-endpoint tests miss system-wide bottlenecks',
      'Not monitoring server-side metrics (CPU, memory, GC) — response time alone does not reveal the root cause',
      'Confusing load test results with production predictions — test environments differ; treat results as relative comparisons, not absolute guarantees',
      'Running performance tests in CI with too-tight thresholds — environment variability causes flaky failures; use performance tests for trend monitoring, not hard gates',
      'Ignoring endurance testing — memory leaks only appear after hours of sustained load',
    ],
    tools: [
      { name: 'k6', purpose: 'JavaScript-based load testing with cloud and CI integration' },
      { name: 'Gatling', purpose: 'Scala/Java load testing with detailed HTML reports' },
      { name: 'Apache JMeter', purpose: 'GUI-based load testing for HTTP, JDBC, and more' },
      { name: 'Lighthouse', purpose: 'Front-end performance audit: FCP, LCP, TTI, CLS metrics' },
      { name: 'Datadog / Grafana + Prometheus', purpose: 'Real-time server metrics during load tests' },
      { name: 'Artillery', purpose: 'YAML-based load testing for HTTP and WebSocket' },
    ],
    sampleObjectives: [
      'Verify that GET /api/products responds in under 200ms at p95 for 500 concurrent users',
      'Verify that the system maintains an error rate below 0.5% at 2× expected peak load (1,000 concurrent users)',
      'Verify that memory usage does not grow by more than 10% after 6 hours of sustained normal load (endurance test)',
      'Verify that the application recovers within 30 seconds of a traffic spike from 10 to 1,000 concurrent users',
      'Verify that Lighthouse performance score is ≥90 on a mid-range mobile device on a 4G connection',
    ],
    externalResources: [
      { title: 'k6 Documentation', url: 'https://k6.io/docs/' },
      { title: 'ISTQB Performance Testing Guide', url: 'https://www.istqb.org/certifications/performance-testing' },
      { title: 'Google Web Vitals', url: 'https://web.dev/articles/vitals' },
      { title: 'The Art of Capacity Planning — John Allspaw', url: 'https://www.oreilly.com/library/view/the-art-of/9780596518578/' },
    ],
  },
```

- [ ] **Step 2: Verify file created correctly**

Open `test-case-generator/js/methodology.js` in your editor. Confirm:
- File starts with the comment line
- Contains entries 1–7 (`functional` through `performance`)
- File is NOT yet closed (no `];` at the end — that comes in Task 4)

Do NOT commit yet.

---

### Task 4: Methodology Data — Entries 8–14 (Complete File)

**Files:**
- Modify: `test-case-generator/js/methodology.js` (append entries 8–14 and close the array)

- [ ] **Step 1: Append entries 8–14 and close the array**

Open `test-case-generator/js/methodology.js` and append the following after the entry 7 closing brace and comma:

```js
  // ── 8. Accessibility Testing ──────────────────────────────────────
  {
    id: 'accessibility',
    name: 'Accessibility Testing',
    icon: 'fa-universal-access',
    category: 'non-functional',
    standard: 'WCAG 2.1, Section 508, EN 301 549',
    effortLevel: 'High',
    skillLevel: 'Senior',
    purpose: 'Accessibility testing verifies that the application can be used by people with disabilities — including visual impairments (blind, low vision, colour blind), motor impairments (keyboard-only users, switch access), cognitive disabilities, and hearing impairments. Accessibility is both a legal requirement in many jurisdictions (ADA, EAA) and an ethical imperative. Testing follows the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA as the industry baseline.',
    whenToUse: [
      'Before any public-facing release — accessibility issues in production are legal liability',
      'When new UI components are added — each component must be independently accessible',
      'After major redesigns or theme changes — contrast ratios and focus styles often regress',
      'When targeting enterprise clients — many have internal accessibility mandates',
      'For public-sector or government clients — legal compliance (Section 508, EN 301 549) is mandatory',
      'During component library development — fix accessibility once, benefit everywhere it is used',
    ],
    whenNotToUse: [
      'As a one-time audit — accessibility requires ongoing testing; new features must be tested as they ship',
      'Using automated tools alone — automation catches ~30–40% of issues; manual testing with a screen reader is required for full coverage',
    ],
    process: [
      'Run automated scan with axe-core or Lighthouse: fix all Critical and Serious violations before manual testing',
      'Test keyboard navigation: Tab through every interactive element in logical order; verify nothing is skipped or trapped',
      'Verify all interactive elements have a visible focus indicator (not just browser default outline removed)',
      'Test with a screen reader (NVDA + Firefox on Windows, VoiceOver + Safari on Mac): navigate each page; verify every element is announced correctly',
      'Verify all images have meaningful alt text (or empty alt="" for decorative images)',
      'Verify all form inputs have associated <label> elements (not just placeholder text)',
      'Check colour contrast: body text ≥4.5:1, large text ≥3:1, UI components ≥3:1 against background',
      'Verify that no content relies on colour alone to convey information (e.g., red = error must also have an icon or text)',
      'Test zoom: at 200% browser zoom, no content is clipped or overlapping',
      'Verify ARIA roles and attributes are correct — misused ARIA is worse than no ARIA',
    ],
    keyChecklist: [
      'Zero automated violations at Critical and Serious severity (axe-core)',
      'All interactive elements reachable and operable by keyboard alone (no mouse required)',
      'All images have appropriate alt attributes',
      'All form fields have programmatically associated labels',
      'Colour contrast meets WCAG AA: 4.5:1 for normal text, 3:1 for large text and UI components',
      'Page has a logical heading hierarchy (h1 → h2 → h3, no skipped levels)',
      'Skip navigation link present for keyboard users to bypass repeated nav blocks',
      'No content flashes more than 3 times per second (seizure risk)',
      'All modal dialogs trap focus correctly and return focus on close',
      'Screen reader announces dynamic content updates (ARIA live regions where needed)',
    ],
    commonPitfalls: [
      'Relying solely on automated tools — they miss focus order issues, incorrect ARIA labels, and screen reader announcements',
      'Removing the browser\'s default focus outline without replacing it — keyboard users become invisible',
      'Using placeholder text as a label substitute — placeholder disappears on input and is not reliably announced',
      'Adding ARIA roles incorrectly — `role="button"` on a `<div>` without keyboard handling creates confusion',
      'Testing only in Chrome — screen reader + browser combinations have different behaviour; test in Firefox with NVDA',
      'Treating accessibility as a final-phase audit — it is far cheaper to build accessible components than to retrofit them',
    ],
    tools: [
      { name: 'axe DevTools', purpose: 'Automated WCAG violation detection in browser and CI' },
      { name: 'Lighthouse (Accessibility tab)', purpose: 'Accessibility score and automated checks' },
      { name: 'NVDA (Windows)', purpose: 'Free screen reader for Windows — test with Firefox' },
      { name: 'VoiceOver (Mac/iOS)', purpose: 'Built-in screen reader for Apple devices — test with Safari' },
      { name: 'Colour Contrast Analyser', purpose: 'Measure colour contrast ratios for any two colours' },
      { name: 'WAVE', purpose: 'Visual accessibility evaluation tool showing errors in-page' },
    ],
    sampleObjectives: [
      'Verify that the entire registration form can be completed and submitted using keyboard only (Tab, Shift+Tab, Enter, Space)',
      'Verify that VoiceOver announces the error message "Email is required" when the email field is left empty and the form is submitted',
      'Verify that all text in the application meets the 4.5:1 contrast ratio in both light and dark themes',
      'Verify that the modal dialog traps focus — Tab from the last element wraps to the first element inside the modal',
      'Verify that decorative images have empty alt attributes (alt="") and informational images have descriptive alt text',
    ],
    externalResources: [
      { title: 'WCAG 2.1 Guidelines', url: 'https://www.w3.org/TR/WCAG21/' },
      { title: 'WebAIM — Accessibility Resources', url: 'https://webaim.org/' },
      { title: 'axe-core Rules Documentation', url: 'https://dequeuniversity.com/rules/axe/' },
      { title: 'Accessible Rich Internet Applications (ARIA) Authoring Practices', url: 'https://www.w3.org/WAI/ARIA/apg/' },
    ],
  },

  // ── 9. Edge Case Testing ──────────────────────────────────────────
  {
    id: 'edge-cases',
    name: 'Edge Case Testing',
    icon: 'fa-exclamation-triangle',
    category: 'manual',
    standard: 'IEEE 829, Boundary Value Analysis, Equivalence Partitioning',
    effortLevel: 'Medium',
    skillLevel: 'Mid',
    purpose: 'Edge case testing probes the boundaries and extreme conditions of a system — the inputs and scenarios that are technically valid but unusual, at the limits of what the system is designed to handle, or at the intersection of multiple conditions. Bugs in edge cases are disproportionately common because developers optimise for the happy path. Edge case tests catch overflow errors, off-by-one bugs, unexpected character handling, and failure-mode behaviour.',
    whenToUse: [
      'For any input field: test minimum, maximum, and just-outside-maximum values',
      'When a field has a defined maximum length — test at exactly max, at max+1, and well above max',
      'For date and time inputs: test epoch boundaries, leap year dates (Feb 29), DST transitions',
      'For numeric calculations: test 0, negative numbers, very large numbers (integer overflow)',
      'For file uploads: test 0-byte files, max-size files, max-size+1 files',
      'For concurrent operations: two users editing the same record simultaneously',
    ],
    whenNotToUse: [
      'As a replacement for functional tests — edge cases complement, they do not replace, core happy-path coverage',
      'For every possible input combination — focus on boundaries and known risk areas, not exhaustive combinatorial testing',
    ],
    process: [
      'Apply Boundary Value Analysis: for each numeric or length-bounded input, identify the minimum, minimum+1, maximum-1, maximum, and maximum+1 values',
      'Apply Equivalence Partitioning: group inputs into classes that should behave identically; test one value from each class',
      'Identify special characters: test inputs with quotes (\', "), angle brackets (<>), ampersands (&), null bytes (\\0), emoji, and right-to-left Unicode',
      'Test empty and null inputs for every optional and required field',
      'Test maximum collection sizes: a user with 10,000 items in their cart, a search returning 100,000 results',
      'Test time-based edge cases: midnight, DST change, leap second, Feb 29, Jan 1',
      'Test concurrent modification: two requests modifying the same resource at the same time',
      'Test network interruption: cut the connection mid-upload or mid-transaction',
      'Document the boundary values tested and the expected vs. actual behaviour',
    ],
    keyChecklist: [
      'Min, max, and just-beyond-max tested for all bounded inputs',
      'Empty string, null, and undefined tested for all inputs',
      'Special characters tested: quotes, angle brackets, null bytes, emoji',
      'Date edge cases: Feb 29 (leap year), Dec 31 → Jan 1 transition, DST boundaries',
      'Numeric edge cases: 0, negative, integer overflow (2^31-1 for 32-bit, 2^53-1 for JS)',
      'Concurrent modification tested for shared resources',
      'File edge cases: 0-byte files, files at exactly the size limit',
      'Collection edge cases: empty list, single item, at maximum capacity',
    ],
    commonPitfalls: [
      'Only testing the exact maximum and forgetting max+1 — the off-by-one error is the most common boundary bug',
      'Assuming "the UI prevents invalid input" — APIs and backend must validate independently',
      'Skipping special character tests — SQL injection, XSS, and encoding bugs all originate here',
      'Not testing locale-specific edge cases: comma vs. period as decimal separator, date format DD/MM vs. MM/DD',
      'Treating "won\'t happen in practice" as "doesn\'t need testing" — defensive systems handle impossible inputs gracefully',
    ],
    tools: [
      { name: 'Postman / Insomnia', purpose: 'Send boundary-value payloads directly to the API' },
      { name: 'Faker.js / Bogus', purpose: 'Generate realistic test data at scale' },
      { name: 'OWASP ZAP Fuzzer', purpose: 'Automated fuzzing with malformed inputs' },
      { name: 'PairWise (AllPairs)', purpose: 'Generate minimal combinatorial test cases for multiple parameters' },
    ],
    sampleObjectives: [
      'Verify that a username field with exactly 50 characters (the maximum) is accepted, and 51 characters returns a 400 with a validation error',
      'Verify that a product price of 0.00 is accepted and displayed correctly throughout the purchase flow',
      'Verify that a file upload of exactly 10MB (the limit) succeeds and 10MB + 1 byte returns a clear error message',
      'Verify that a search query containing only SQL injection characters (e.g., \'; DROP TABLE users; --) returns an empty result set, not a 500 error',
      'Verify that two concurrent PUT requests to update the same order do not corrupt the order\'s final state',
    ],
    externalResources: [
      { title: 'Boundary Value Analysis — ISTQB', url: 'https://www.istqb.org/certifications/certified-tester-foundation-level' },
      { title: 'Equivalence Partitioning Explained', url: 'https://www.guru99.com/equivalence-partitioning-boundary-value-analysis.html' },
    ],
  },

  // ── 10. Data Integrity Testing ────────────────────────────────────
  {
    id: 'data-integrity',
    name: 'Data Integrity Testing',
    icon: 'fa-database',
    category: 'technical',
    standard: 'ISO 8000, DAMA-DMBOK, ACID properties',
    effortLevel: 'High',
    skillLevel: 'Senior',
    purpose: 'Data integrity testing verifies that data remains accurate, consistent, complete, and valid throughout its lifecycle — from creation through modification to deletion and archival. It ensures that database constraints enforce correctness, that concurrent operations do not corrupt shared data, that data transformations are lossless, and that referential integrity is maintained across related tables or services.',
    whenToUse: [
      'During any database schema change — new constraints, column renames, type changes',
      'After data migrations — verify no records were lost, truncated, or corrupted',
      'For any feature that writes to multiple tables in a single operation (requires transaction testing)',
      'When implementing soft-delete or archiving logic — verify data is correctly excluded from active queries',
      'For ETL pipelines and data warehouse loads — verify row counts, checksums, and transformations',
      'When two services share a database or exchange data — verify the contract at the boundary',
    ],
    whenNotToUse: [
      'As a substitute for application-level functional tests — data integrity tests operate at the database layer',
      'For read-only APIs with no data mutations — no mutation means no integrity risk',
    ],
    process: [
      'Document the data model: entity relationships, constraints (NOT NULL, UNIQUE, FOREIGN KEY, CHECK), and business rules',
      'Test NOT NULL constraints: attempt to insert a row missing each required field; verify the database rejects it',
      'Test UNIQUE constraints: attempt to insert a duplicate value; verify rejection with a meaningful error',
      'Test FOREIGN KEY constraints: attempt to delete a parent record that has child records; verify cascading behaviour or rejection',
      'Test CHECK constraints: attempt to insert values that violate business rules (e.g., end_date before start_date)',
      'Test ACID transactions: verify that if step 2 of a 3-step operation fails, steps 1 and 2 are rolled back',
      'Test concurrent writes: two sessions write to the same row simultaneously; verify last-write-wins or optimistic locking rejects the stale write',
      'Test data transformations: verify that values survive round-trips (write to DB, read back, compare) without truncation or encoding loss',
      'After data migration: compare row counts, checksums, and sample records between source and destination',
    ],
    keyChecklist: [
      'All NOT NULL, UNIQUE, and FOREIGN KEY constraints verified to be enforced',
      'Multi-step operations wrapped in transactions — partial failures roll back completely',
      'Concurrent write scenarios tested for race conditions',
      'Soft-delete records are excluded from all active queries',
      'Data type boundaries respected: VARCHAR lengths, DECIMAL precision, DATE ranges',
      'Referential integrity maintained — no orphaned child records',
      'ETL/migration: row counts match between source and destination',
      'Timestamps stored in UTC; displayed in user\'s local timezone',
    ],
    commonPitfalls: [
      'Trusting application-layer validation alone — always enforce constraints at the database level too',
      'Not testing rollback — if one step of a multi-step operation fails, the database must be returned to its pre-operation state',
      'Ignoring concurrent access — single-threaded tests pass; real production has many simultaneous writers',
      'Not testing soft-delete exclusion — soft-deleted records leaking into queries is a subtle, hard-to-detect bug',
      'Skipping null character and encoding tests — storing emoji or Unicode in a Latin-1 column causes silent truncation',
    ],
    tools: [
      { name: 'pgTAP / dbUnit', purpose: 'Database unit testing frameworks for PostgreSQL and Java' },
      { name: 'Great Expectations', purpose: 'Data quality and data contract testing for pipelines' },
      { name: 'dbt tests', purpose: 'Data quality tests built into dbt transformation pipelines' },
      { name: 'SQL scripts (manual)', purpose: 'Direct constraint and row-count verification queries' },
    ],
    sampleObjectives: [
      'Verify that inserting an order with a null `user_id` is rejected by the database with a NOT NULL violation error',
      'Verify that deleting a user who has associated orders is blocked by the FOREIGN KEY constraint (or cascades correctly if ON DELETE CASCADE is configured)',
      'Verify that two concurrent transactions updating the same inventory count do not produce a total greater than the starting quantity',
      'Verify that after a failed payment processing operation, neither the payment record nor the order status update persists in the database',
      'Verify that all timestamps in the `created_at` and `updated_at` columns are stored as UTC and displayed in the user\'s local timezone in the UI',
    ],
    externalResources: [
      { title: 'DAMA-DMBOK: Data Management Body of Knowledge', url: 'https://www.dama.org/cpages/body-of-knowledge' },
      { title: 'Great Expectations Documentation', url: 'https://docs.greatexpectations.io/' },
      { title: 'ACID Properties — Wikipedia', url: 'https://en.wikipedia.org/wiki/ACID' },
    ],
  },

  // ── 11. Regression Testing ────────────────────────────────────────
  {
    id: 'regression',
    name: 'Regression Testing',
    icon: 'fa-redo',
    category: 'manual',
    standard: 'IEEE 829, ISO 25010',
    effortLevel: 'Medium',
    skillLevel: 'Mid',
    purpose: 'Regression testing verifies that previously working functionality has not been broken by recent code changes — new features, bug fixes, refactoring, or dependency upgrades. It is the safety net that prevents "one step forward, two steps back" development cycles. An effective regression suite is selective (covering high-risk areas), fast (runs in CI on every pull request), and maintained (broken tests are fixed immediately).',
    whenToUse: [
      'On every pull request — run a smoke regression suite automatically in CI',
      'After every bug fix — the failing test that reproduced the bug becomes a permanent regression test',
      'Before every release — run the full regression suite against the release candidate',
      'After any dependency upgrade (framework, library, database driver)',
      'After infrastructure changes (database version, web server, container runtime)',
      'When merging long-lived feature branches — integration regressions are common',
    ],
    whenNotToUse: [
      'As the only form of testing — regression tests confirm existing behaviour is preserved; they do not verify new features are correct',
      'With a stale test suite — tests that are known to fail and are ignored provide false confidence; fix or delete them',
    ],
    process: [
      'Maintain a risk-based regression test suite: prioritise tests for core user journeys (login, checkout, data submission) and areas that change frequently',
      'After every bug fix, write a test that reproduces the bug and verify it fails before the fix',
      'Apply the fix; verify the new regression test passes',
      'Run the full regression suite; confirm no previously passing tests now fail',
      'Identify flaky tests (tests that sometimes fail without code changes) and fix or quarantine them immediately',
      'Review the regression suite quarterly: remove tests for deprecated features; add tests for high-risk new areas',
      'Track regression test pass rates over time — a declining trend indicates technical debt accumulating in the test suite',
    ],
    keyChecklist: [
      'All previously reported bugs have corresponding regression tests',
      'Core user journeys (login, primary workflow, data export) are covered',
      'Regression suite runs automatically in CI on every pull request',
      'No known-failing tests are ignored without a tracked issue',
      'Test suite completes in under 10 minutes for the smoke set (to not block PRs)',
      'All regression tests are independent — they do not depend on execution order',
      'Regression suite covers the most recently changed areas of the codebase',
    ],
    commonPitfalls: [
      'Running the entire regression suite manually — manual regression does not scale; automate the high-risk areas',
      'Not writing a regression test when fixing a bug — the bug will return; a test is the only reliable guarantee it doesn\'t',
      'Ignoring flaky tests — a test that sometimes fails is worse than no test; it erodes trust in the entire suite',
      'Over-broad regression suites that take hours — a slow suite is not run; keep the PR gate under 10 minutes',
      'Testing implementation details — regression tests should test observable behaviour, not internal function calls, so they survive refactoring',
    ],
    tools: [
      { name: 'Playwright / Cypress', purpose: 'End-to-end regression testing for browser-based features' },
      { name: 'Jest / Vitest', purpose: 'Unit and integration regression tests' },
      { name: 'GitHub Actions / GitLab CI', purpose: 'Automated regression suite execution on every push' },
      { name: 'BackstopJS', purpose: 'Visual regression testing — detects UI layout changes' },
    ],
    sampleObjectives: [
      'Verify that after deploying the new search feature, the existing user login flow still works end-to-end',
      'Verify that after the password hashing library upgrade, users can log in with their existing passwords',
      'Verify that the fix for "cart total shows wrong currency symbol" does not reoccur (reproduce the bug with a test, fix it, confirm test passes)',
      'Verify that the recent API refactoring did not break the mobile app\'s authentication flow',
      'Verify that all 47 previously passing regression tests still pass after the database schema migration',
    ],
    externalResources: [
      { title: 'Regression Testing — ISTQB Glossary', url: 'https://glossary.istqb.org/en_US/term/regression-testing' },
      { title: 'BackstopJS — Visual Regression Testing', url: 'https://garris.github.io/BackstopJS/' },
      { title: 'Growing Rails Applications in Practice — Keeping the Suite Fast', url: 'https://leanpub.com/growing-rails' },
    ],
  },

  // ── 12. Compatibility Testing ─────────────────────────────────────
  {
    id: 'compatibility',
    name: 'Compatibility Testing',
    icon: 'fa-th-large',
    category: 'non-functional',
    standard: 'ISO 25010, W3C Web Standards',
    effortLevel: 'High',
    skillLevel: 'Senior',
    purpose: 'Compatibility testing verifies that the application works correctly across the full range of browsers, operating systems, devices, screen sizes, and software versions it is expected to support. Compatibility issues are distinct from functional bugs — the feature works correctly in one environment but fails or looks broken in another due to rendering engine differences, API support gaps, or OS-level behaviour.',
    whenToUse: [
      'Before any major release — especially if your target audience uses a diverse range of devices',
      'When adding CSS features or JavaScript APIs that have partial browser support',
      'After a browser releases a major version update (Chrome, Firefox, Safari)',
      'When supporting older browsers (IE11, older Safari on iOS) is a stated requirement',
      'For mobile web applications — iOS Safari and Android Chrome have significant rendering differences',
      'When OS-level features are used: file system APIs, notifications, clipboard, geolocation',
    ],
    whenNotToUse: [
      'As a substitute for functional testing — run functional tests first; compatibility testing assumes the feature works, just not everywhere',
      'For internal tools where the browser is controlled (e.g., a corporate intranet with mandatory Chrome) — document the supported browser and test only that',
    ],
    process: [
      'Define the compatibility matrix: list all target browsers (Chrome, Firefox, Safari, Edge), OS (Windows, macOS, iOS, Android), and minimum versions',
      'Identify browser-specific risk areas: CSS Grid/Flexbox features, JS APIs (File System Access, Web Crypto, Intl), and CSS custom properties',
      'Test core user journeys in each target browser/OS combination',
      'Test responsive layout at defined breakpoints: 375px (iPhone SE), 768px (iPad), 1280px (laptop), 1920px (desktop)',
      'Verify all animations and transitions render correctly (some CSS transforms behave differently across browsers)',
      'Test form behaviour: autofill, date pickers, and file upload inputs behave differently across browsers',
      'Verify that progressive enhancement is applied: features using experimental APIs degrade gracefully in unsupported browsers',
      'Use cross-browser testing tools to automate regression across the compatibility matrix',
    ],
    keyChecklist: [
      'Compatibility matrix documented and agreed with stakeholders',
      'All core user journeys tested in Chrome, Firefox, Safari, and Edge',
      'Mobile tested on iOS Safari (iPhone and iPad) and Android Chrome',
      'No CSS property used without checking caniuse.com for support across target browsers',
      'JavaScript features use transpilation (Babel) or polyfills where needed for older targets',
      'All visual layouts verified at defined breakpoints on real or emulated devices',
      'Print stylesheet tested if print functionality is present',
      'Touch events tested on mobile: tap, swipe, pinch-to-zoom does not break layouts',
    ],
    commonPitfalls: [
      'Testing only in Chrome — Safari (especially iOS Safari) has significant WebKit-specific rendering differences and is the most common source of compatibility bugs',
      'Not specifying a minimum browser version — test against a moving target if you don\'t define boundaries',
      'Emulator-only testing — emulators miss real device quirks; test on at least one real iOS and one real Android device',
      'Ignoring older iOS versions — Apple users on older devices (iOS 14, iOS 15) represent a meaningful percentage of mobile traffic',
      'Not testing OS-level dark mode — CSS `prefers-color-scheme` behaves differently across browsers',
    ],
    tools: [
      { name: 'BrowserStack', purpose: 'Real device and browser cloud for cross-browser testing' },
      { name: 'Sauce Labs', purpose: 'Automated cross-browser test execution at scale' },
      { name: 'caniuse.com', purpose: 'Check browser support for any CSS or JavaScript feature' },
      { name: 'Playwright', purpose: 'Cross-browser automated testing (Chromium, Firefox, WebKit)' },
      { name: 'LambdaTest', purpose: 'Live interactive cross-browser testing' },
    ],
    sampleObjectives: [
      'Verify that the registration flow works identically on Chrome 120, Firefox 121, Safari 17, and Edge 120',
      'Verify that the date picker displays correctly and is functional on iOS Safari 16 on iPhone 14',
      'Verify that the drag-and-drop file upload falls back to a file input button on Firefox (which does not support showDirectoryPicker)',
      'Verify that the application layout at 375px viewport width renders correctly on Safari, Chrome, and Firefox mobile',
      'Verify that dark mode (via prefers-color-scheme: dark) displays correct colours on both Safari and Chrome on macOS',
    ],
    externalResources: [
      { title: 'Can I Use — Browser Support Tables', url: 'https://caniuse.com/' },
      { title: 'BrowserStack Cross-Browser Testing', url: 'https://www.browserstack.com/' },
      { title: 'MDN Browser Compatibility Data', url: 'https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Page_structures/Compatibility_tables' },
    ],
  },

  // ── 13. Error Recovery Testing ────────────────────────────────────
  {
    id: 'error-recovery',
    name: 'Error Recovery Testing',
    icon: 'fa-heart-broken',
    category: 'non-functional',
    standard: 'ISO 25010, Chaos Engineering Principles (Netflix), SRE practices',
    effortLevel: 'Expert',
    skillLevel: 'Specialist',
    purpose: 'Error recovery testing verifies that the system handles failures gracefully — continuing to operate in a degraded mode when possible, recovering without data loss, and providing clear feedback to users and operators when it cannot. Inspired by chaos engineering, it deliberately introduces failures (kill a service, corrupt a message, saturate a resource) to confirm the system\'s resilience assumptions hold under real-world failure conditions.',
    whenToUse: [
      'Before production launch of any critical service (payment processing, authentication, data storage)',
      'After adding retry logic, circuit breakers, or fallback mechanisms — verify they work',
      'When SRE reliability targets (SLO/SLA) are defined — validate the system meets them under failure',
      'After infrastructure changes: new load balancer, database replica, or message queue',
      'For any feature with an external dependency — test what happens when that dependency is unavailable',
      'As part of a GameDay exercise — deliberately fail components in a controlled environment',
    ],
    whenNotToUse: [
      'In production without a Chaos Engineering team and extensive safeguards — start in staging',
      'Before the system\'s normal (non-failure) paths are thoroughly tested — resilience testing assumes the happy path works',
      'Without monitoring and observability in place — you must be able to observe the system\'s reaction to failures',
    ],
    process: [
      'Define the failure scenarios to test: network partition, service unavailability, database connection exhaustion, memory pressure, disk full, slow responses (latency injection)',
      'Identify the expected resilient behaviour for each failure: retry with backoff, degrade gracefully, show maintenance page, queue for later',
      'Start with the smallest blast radius: test one component failing at a time before combining failures',
      'Simulate network failure: block network access to a dependency and verify the application returns a user-friendly error (not a 500 stack trace)',
      'Simulate slow dependency: add 5–10 second latency to a downstream API; verify the timeout is correctly configured and not infinite',
      'Simulate database unavailability: stop the database and verify the application fails fast (not after a 30-second hang)',
      'Test retry logic: verify the system retries failed operations with exponential backoff, and does not retry non-idempotent operations blindly',
      'Test circuit breakers: after N consecutive failures, verify the circuit opens and subsequent requests fail fast without hitting the broken dependency',
      'Test recovery: restore the failed component and verify the system resumes normal operation without manual intervention',
      'Verify data consistency: after recovery, confirm no data was lost or duplicated during the failure window',
    ],
    keyChecklist: [
      'Every external dependency has a timeout configured (not infinite)',
      'Retry logic uses exponential backoff with jitter (not fixed-interval retry)',
      'Circuit breakers prevent cascade failures when a dependency is slow or down',
      'Graceful degradation: core features work even when optional dependencies are unavailable',
      'All error states shown to users are human-readable, not stack traces',
      'Operations are idempotent or protected against double-execution on retry',
      'Recovery is automatic — no manual intervention required when the dependency comes back',
      'All failure and recovery events are logged with enough context to diagnose root cause',
    ],
    commonPitfalls: [
      'Infinite timeouts — a dependency that never responds hangs the entire request chain; always set explicit timeouts',
      'Retry storms — aggressive retry without backoff amplifies the failure; exponential backoff with jitter prevents this',
      'Non-idempotent retries — retrying a payment debit can charge the user twice; verify idempotency before implementing retry',
      'Testing only network failures and ignoring resource exhaustion — thread pool saturation, connection pool limits, and disk-full scenarios are equally common in production',
      'Skipping recovery testing — it is common to test the failure but not verify that the system correctly recovers; always test both',
    ],
    tools: [
      { name: 'Chaos Monkey / Chaos Toolkit', purpose: 'Randomly terminate instances to test resilience' },
      { name: 'Toxiproxy', purpose: 'Inject network latency, packet loss, and connection errors in test environments' },
      { name: 'Gremlin', purpose: 'Structured chaos engineering platform with attack library' },
      { name: 'tc (Linux traffic control)', purpose: 'Inject network delay and packet loss at the OS level' },
      { name: 'WireMock', purpose: 'Simulate slow or failing HTTP dependencies' },
    ],
    sampleObjectives: [
      'Verify that when the email service is unavailable, the registration endpoint returns 202 (accepted) and queues the welcome email; email is delivered within 5 minutes of service recovery',
      'Verify that adding 3-second latency to the payment gateway causes the checkout to display "Processing..." and eventually succeed (not hang or timeout silently)',
      'Verify that when the database is unavailable, all write operations return a user-friendly error and no partial writes are committed',
      'Verify that after 5 consecutive failures to a downstream API, the circuit opens and subsequent requests fail within 10ms (not waiting for the timeout)',
      'Verify that restarting the application server mid-upload does not corrupt the upload state — the user can resume or restart cleanly',
    ],
    externalResources: [
      { title: 'Principles of Chaos Engineering', url: 'https://principlesofchaos.org/' },
      { title: 'Google SRE Book — Chapter 22: Addressing Cascading Failures', url: 'https://sre.google/sre-book/cascading-failures/' },
      { title: 'Netflix Chaos Engineering Blog', url: 'https://netflixtechblog.com/tagged/chaos-engineering' },
      { title: 'Toxiproxy', url: 'https://github.com/Shopify/toxiproxy' },
    ],
  },

  // ── 14. Exploratory Testing ───────────────────────────────────────
  {
    id: 'exploratory',
    name: 'Exploratory Testing',
    icon: 'fa-compass',
    category: 'manual',
    standard: 'ISTQB, Session-Based Test Management (SBTM)',
    effortLevel: 'High',
    skillLevel: 'Senior',
    purpose: 'Exploratory testing is simultaneous learning, test design, and test execution — the tester freely investigates the application without a predefined script, using skill, intuition, and domain knowledge to discover defects that scripted tests miss. Unlike scripted testing, it adapts in real time: a discovered anomaly becomes the starting point for the next test. Structured through time-boxed sessions and charters, it is not random — it is systematic freedom.',
    whenToUse: [
      'When a new feature is delivered and you want to rapidly assess its quality before writing formal tests',
      'For bug hunting after a major refactoring — intuitive exploration finds regressions scripted tests miss',
      'When the product requirements are vague or incomplete and scripted tests cannot yet be written',
      'After automated tests pass but confidence in overall quality is low',
      'To supplement scripted regression tests with human intuition and creativity',
      'During beta or UAT phases when real users interact with the system unpredictably',
    ],
    whenNotToUse: [
      'As a replacement for scripted regression tests for high-risk workflows — exploration is one-time; regression tests run forever',
      'Without a defined charter — unstructured exploration without focus is just clicking around; always define a goal',
      'As the only test approach for compliance-regulated features — compliance requires traceable, documented test cases',
    ],
    process: [
      'Define a test charter: "Explore [area of the application] using [resources/tools] to discover [types of defects or information]" — keep it focused but not prescriptive',
      'Time-box the session: 60–90 minutes is optimal; set a timer',
      'Before starting, note your hypotheses: what risks or weak areas do you expect to find?',
      'Use a tour approach: take different perspectives — the "tourist" (try every feature), the "saboteur" (try to break things), the "supermodel" (only look at the UI), the "antisocial" (do things in the wrong order)',
      'Keep session notes in real time: what you tested, what you found, your questions and ideas',
      'When you find an anomaly, pause and explore it deeply before moving on — follow the thread',
      'Log each defect immediately with reproduction steps, screenshots, and severity',
      'At the end of the session, write a debrief: coverage achieved, issues found, areas that need scripted test coverage, remaining risks',
      'Repeat with a different charter targeting unexplored areas',
    ],
    keyChecklist: [
      'Charter defined before the session starts (area, resources, goal)',
      'Session time-boxed (60–90 minutes)',
      'Session notes taken in real time',
      'All found defects logged with reproduction steps',
      'Debrief written at session end: coverage, findings, risks remaining',
      'Charters cover both happy path and adversarial perspectives',
      'Findings used to inform which areas need additional scripted test coverage',
      'Sessions are varied — different testers and different charters reveal different issues',
    ],
    commonPitfalls: [
      'No charter — exploration without a goal is just ad-hoc clicking; it wastes time and misses systematic coverage',
      'Sessions too long — mental fatigue after 90 minutes reduces defect detection rate; time-box strictly',
      'Not taking notes during the session — critical observations are forgotten; notes are the only record of what was tested',
      'Always exploring the same areas — rotate charters to cover the entire application over time',
      'Treating exploration as a substitute for automation — exploratory testing finds issues; automated tests prevent them from returning',
      'Not sharing findings across the team — debriefs should be shared; one tester\'s exploration insight improves everyone\'s understanding',
    ],
    tools: [
      { name: 'Session notes (Markdown / Notion)', purpose: 'Real-time session notes and charter tracking' },
      { name: 'Rapid Reporter', purpose: 'Lightweight tool for structured session-based testing notes' },
      { name: 'Loom / OBS', purpose: 'Screen recording to capture unexpected findings during a session' },
      { name: 'Chrome DevTools', purpose: 'Network inspection, console monitoring, and element manipulation during exploration' },
      { name: 'JIRA / Linear', purpose: 'Defect logging during and after sessions' },
    ],
    sampleObjectives: [
      'Explore the checkout flow as an adversarial user: attempt to manipulate prices, quantities, and coupon codes to discover validation gaps',
      'Explore the file upload feature using unexpected file types (executable, zero-byte, extremely long filename) to discover error handling defects',
      'Explore the account settings page as a newly registered user discovering the UI for the first time — identify any confusing or misleading UI elements',
      'Explore all form submissions in the application without filling required fields — verify every form handles empty submission gracefully',
      'Explore the application\'s behaviour when network connectivity is lost mid-session — identify which operations fail silently vs. clearly',
    ],
    externalResources: [
      { title: 'Exploratory Testing Explained — James Bach', url: 'https://www.satisfice.com/exploratory-testing' },
      { title: 'Session-Based Test Management — Jonathan Bach', url: 'http://www.satisfice.com/sbtm/' },
      { title: 'Rapid Software Testing Methodology', url: 'https://rapid-software-testing.com/' },
      { title: 'ISTQB — Exploratory Testing', url: 'https://www.istqb.org/certifications/certified-tester-foundation-level' },
    ],
  },

];
```

- [ ] **Step 2: Verify the file structure**

Open `test-case-generator/js/methodology.js`. Confirm:
- File starts with `const METHODOLOGY = [`
- Contains exactly 14 entries (ids: `functional`, `unit`, `integration`, `ui`, `api`, `security`, `performance`, `accessibility`, `edge-cases`, `data-integrity`, `regression`, `compatibility`, `error-recovery`, `exploratory`)
- File ends with `];`
- No JavaScript syntax errors: open `index.html` in Chrome, open DevTools Console — no errors

- [ ] **Step 3: Commit**

```bash
git add js/methodology.js
git commit -m "feat: add methodology.js with 14 expert testing methodology entries"
```

---

## Chunk 3: Drawer UI Logic

### Task 5: `js/methodology-ui.js` — Core Drawer Logic

**Files:**
- Create: `test-case-generator/js/methodology-ui.js`

This file owns all drawer behaviour. It is an IIFE (matching `app.js` pattern). No exports — fully self-contained.

**Context:** `METHODOLOGY` is a global array (from `methodology.js`, loaded before this file). DOM IDs: `#openGuideBtn`, `#closeGuideBtn`, `#guideOverlay`, `#methodologyDrawer`, `#guideSidebar`, `#guideContent`, `#guideSearch`.

- [ ] **Step 1: Verify before starting**

Open `index.html` in Chrome. Click "Testing Guide" button — nothing should happen yet (no JS). The button should be visible in the topbar.

- [ ] **Step 2: Create `js/methodology-ui.js`**

```js
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
```

- [ ] **Step 3: Verify core functionality in browser**

Open `index.html` in Chrome. Verify:
1. Click "Testing Guide" → drawer slides in from the right with all 14 methodology types in the sidebar
2. Clicking a type in the sidebar shows its content on the right
3. Clicking × or the backdrop closes the drawer
4. Escape key closes the drawer
5. No console errors

- [ ] **Step 4: Commit**

```bash
git add js/methodology-ui.js
git commit -m "feat: add methodology-ui.js with drawer open/close, sidebar, and entry rendering"
```

---

### Task 6: `js/methodology-ui.js` — Keyboard Navigation and Focus Trap

**Files:**
- Modify: `test-case-generator/js/methodology-ui.js`

Add keyboard arrow navigation within the sidebar and focus trap to keep Tab within the drawer.

**Context:** The core drawer from Task 5 already works. This task adds: (1) arrow key navigation in the sidebar, (2) focus trap so Tab does not leave the open drawer.

- [ ] **Step 1: Add `focusTrap` function and keyboard sidebar navigation**

Find the IIFE in `js/methodology-ui.js`. Add the following two functions and one event listener **after the `selectEntry` function and before the `renderEntry` function**:

```js
  // ── Focus trap ────────────────────────────────────────────────────
  function getFocusable() {
    return Array.from(drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.disabled && el.offsetParent !== null);
  }

  function activateFocusTrap() {
    focusTrapActive = true;
  }

  function deactivateFocusTrap() {
    focusTrapActive = false;
  }

  // ── Tab focus trap (enforced via keydown on document) ─────────────
  // Already listening on document for Escape — extend that listener.
```

Then **delete the stub functions block and the old Escape listener** — find and remove the entire section from `// ── Focus trap stubs` through the closing `});` of the old keydown listener (these were added as stubs in Task 5). Replace that deleted block with the full implementation:

```js
  // ── Keyboard: Escape closes, Tab trapped, arrows navigate sidebar ─
  document.addEventListener('keydown', e => {
    if (!drawer.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeGuide();
      return;
    }

    // Tab focus trap
    if (e.key === 'Tab' && focusTrapActive) {
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }

    // Arrow key navigation inside the sidebar
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = Array.from(sidebar.querySelectorAll('.guide-sidebar-item'));
      if (!items.length) return;
      const current = items.findIndex(i => i.dataset.id === currentId);
      let next = e.key === 'ArrowDown'
        ? (current + 1) % items.length
        : (current - 1 + items.length) % items.length;
      e.preventDefault();
      selectEntry(items[next].dataset.id);
      items[next].focus();
    }
  });
```

- [ ] **Step 2: Verify focus trap in browser**

Open `index.html` in Chrome. Open the drawer. Press Tab repeatedly — focus should cycle through: search input → sidebar items → close button → back to search input. It must NOT reach elements behind the drawer. Press Escape — drawer closes and focus returns to the "Testing Guide" button.

- [ ] **Step 3: Verify arrow key navigation**

Open the drawer. Click on any sidebar item to focus it. Press ↓ — next item is selected and highlighted. Press ↑ — previous item. Press ↓ on the last item — wraps to the first. Press ↑ on the first item — wraps to the last.

- [ ] **Step 4: Verify screen reader accessibility (VoiceOver on Mac)**

Open the drawer. With VoiceOver enabled (`Cmd+F5`), navigate the drawer with the keyboard. VoiceOver should announce "Testing Guide dialog" when the drawer opens. Tab through elements — each button and input is announced with its label. Press Escape — VoiceOver announces focus returning to "Testing Guide" button.

- [ ] **Step 5: Commit**

```bash
git add js/methodology-ui.js
git commit -m "feat: add focus trap and arrow key navigation to methodology drawer"
```

---

## Final Verification Checklist

After all 6 tasks are complete, verify the complete feature end-to-end:

- [ ] "Testing Guide" button visible in the top-right header bar on all pages (dashboard, generator, test plans, etc.)
- [ ] Clicking the button opens the drawer; it slides in from the right (desktop) or up from the bottom (mobile)
- [ ] All 14 methodology types appear in the sidebar, grouped by Manual / Technical / Non-functional
- [ ] Searching "security" filters the sidebar to show "Security Testing"
- [ ] Searching "xyz" shows the no-results message
- [ ] Clicking each of the 14 items renders its full expert content in the right panel
- [ ] All 11 sections render for each entry: Purpose, When to Use, When NOT to Use, Process, Key Checklist, Common Pitfalls, Tools, Sample Objectives, External Resources
- [ ] External resource links open in a new tab
- [ ] Dark theme: switch theme toggle — drawer renders correctly in dark mode with no hard-coded colours visible
- [ ] Mobile (resize to 375px): drawer opens as a bottom sheet; sidebar is a horizontal scrolling strip
- [ ] Escape closes the drawer; focus returns to the trigger button
- [ ] Tab does not escape the drawer while it is open
- [ ] No console errors in Chrome DevTools

---

## Commit Summary

| Commit | Message |
|---|---|
| Task 1 | `feat: add methodology drawer CSS styles` |
| Task 2 | `feat: add testing guide trigger button and drawer skeleton` |
| Tasks 3+4 | `feat: add methodology.js with 14 expert testing methodology entries` |
| Task 5 | `feat: add methodology-ui.js with drawer open/close, sidebar, and entry rendering` |
| Task 6 | `feat: add focus trap and arrow key navigation to methodology drawer` |
