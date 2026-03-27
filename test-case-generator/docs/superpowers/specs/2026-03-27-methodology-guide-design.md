# Design: In-App Testing Methodology Guide

**Date:** 2026-03-27
**Status:** Approved

## Summary

Add a slide-in side drawer to TestForge that serves as an expert-level reference guide for all 14 test types supported by the generator. The guide covers every methodology with purpose, when to use / not use, step-by-step process, key checklist, common pitfalls, tools, sample objectives, industry standards, and external resources. Content is authored as a static JS data module; a separate UI module owns rendering and interaction.

## Architecture

Two new files are introduced, following the existing pattern of separating data from UI logic:

- `js/methodology.js` — pure data; a global `METHODOLOGY` array of 14 entries
- `js/methodology-ui.js` — DOM rendering, drawer open/close, search, keyboard navigation

Existing files receive minimal additions:
- `index.html` — drawer HTML skeleton + "Testing Guide" button in `.topbar-right`
- `css/styles.css` — drawer, overlay, and methodology card styles

No changes to `generator.js`, `parser.js`, `app.js`, or storage/export logic.

## Data Structure

Each entry in `METHODOLOGY` has this shape:

```js
{
  id:                string,   // matches test type id in generator (e.g. 'security')
  name:              string,   // display name
  icon:              string,   // FontAwesome class (e.g. 'fa-shield-alt')
  category:          string,   // 'manual' | 'technical' | 'non-functional'
  standard:          string,   // comma-separated industry standards
  effortLevel:       string,   // 'Low' | 'Medium' | 'High' | 'Expert'
  skillLevel:        string,   // 'Junior' | 'Mid' | 'Senior' | 'Specialist'
  purpose:           string,   // one paragraph
  whenToUse:         string[], // 4–8 bullet points
  whenNotToUse:      string[], // 3–6 bullet points
  process:           string[], // numbered step-by-step (6–12 steps)
  keyChecklist:      string[], // 6–10 items
  commonPitfalls:    string[], // 4–8 items
  tools: {
    name:    string,
    purpose: string,
  }[],
  sampleObjectives:  string[], // 4–6 concrete test objective examples
  externalResources: {
    title: string,
    url:   string,
  }[],
}
```

### The 14 Entries

| id | Name | Category | Standard |
|---|---|---|---|
| `functional` | Functional Testing | manual | IEEE 829, ISO 25010 |
| `unit` | Unit Testing | technical | IEEE 829, xUnit patterns |
| `integration` | Integration Testing | technical | IEEE 829, ISO 25010 |
| `ui` | UI/UX Testing | manual | WCAG 2.1, Nielsen Heuristics |
| `api` | API Testing | technical | OpenAPI Spec, RFC 7231 |
| `security` | Security Testing | technical | OWASP Top 10, ISO 27001, NIST SP 800-53 |
| `performance` | Performance Testing | non-functional | ISO 25010, IEEE 829, ISTQB |
| `accessibility` | Accessibility Testing | non-functional | WCAG 2.1, Section 508, EN 301 549 |
| `edge-cases` | Edge Case Testing | manual | IEEE 829, boundary value analysis |
| `data-integrity` | Data Integrity Testing | technical | ISO 8000, DAMA-DMBOK |
| `regression` | Regression Testing | manual | IEEE 829, ISO 25010 |
| `compatibility` | Compatibility Testing | non-functional | ISO 25010, W3C standards |
| `error-recovery` | Error Recovery Testing | non-functional | ISO 25010, chaos engineering principles |
| `exploratory` | Exploratory Testing | manual | ISTQB, session-based test management (SBTM) |

> Note: `exploratory` is the 14th entry. It is not currently in the generator's test type dropdown — it is included in the guide only. Adding it to the generator dropdown is out of scope for this spec.

### Sample Entry (content standard)

The following fully-written entry for `security` establishes the expected tone, depth, and length for all 14 entries:

```js
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
    'Confirm that user A cannot access or modify user B\'s resources via IDOR on the /api/users/:id endpoint',
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
}
```

All other 13 entries must match this depth. Content should be specific and actionable — avoid generic advice like "test all inputs"; prefer "test with SQL injection payloads (e.g., `' OR 1=1 --`) and verify the application returns a 400 or generic error, not a database stack trace."

## UI — Drawer

### Trigger

A "Testing Guide" button with a book icon (`fa-book`) is added to `.topbar-right` in `index.html`, **before** the existing `#themeToggle` div. This places it in the top-right header bar, always visible regardless of active tab.

```html
<!-- Add inside .topbar-right, before #themeToggle -->
<button class="btn btn-sm btn-secondary" id="openGuideBtn">
  <i class="fas fa-book"></i> Testing Guide
</button>
```

### Layout

```
┌──────────────────────────────────────────────────────┐
│  Testing Guide                              [×] Close │
│  ┌────────────────────────────────────────────────┐  │
│  │ 🔍 Search methodologies...                     │  │
│  └────────────────────────────────────────────────┘  │
│ ┌──────────────┬───────────────────────────────────┐ │
│ │ MANUAL       │  Security Testing         ★ High  │ │
│ │ • Functional │  OWASP Top 10, ISO 27001           │ │
│ │ • Unit       │  Skill: Specialist                 │ │
│ │ TECHNICAL    │                                    │ │
│ │ • Security ◀ │  Purpose ────────────────────────  │ │
│ │ • API        │  [content]                         │ │
│ │ NON-FUNC     │  When to Use ────────────────────  │ │
│ │ • Performance│  ✓ item                            │ │
│ │   ...        │  When NOT to Use ────────────────  │ │
│ └──────────────┴───────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Left Sidebar

- Types grouped under three headings: **Manual**, **Technical**, **Non-functional**
- Each item shows the type icon + name
- Clicking an item selects it and renders its content in the right panel
- First item in the list is selected by default when the drawer opens
- Search filters the list in real time (see Search section); groups with no matching items are hidden

### Right Panel (scrollable)

Renders the selected entry in this order:

1. **Header** — name, effort badge (`★ Low/Medium/High/Expert`), skill level badge
2. **Standard** — comma-separated standards as small tags
3. **Purpose** — one paragraph
4. **When to Use** — bulleted list with ✓ icons
5. **When NOT to Use** — bulleted list with ✗ icons
6. **Process** — numbered steps
7. **Key Checklist** — checkbox-style list (visual only, not interactive)
8. **Common Pitfalls** — bulleted list with ⚠ icons
9. **Tools** — two-column table: Tool Name | Purpose
10. **Sample Objectives** — numbered list of concrete test objective examples
11. **External Resources** — linked list (opens in `target="_blank" rel="noopener noreferrer"`)

### Search

The search input filters the left sidebar list in real time. Matching runs against **metadata fields only**: `name`, `standard`, `category`, `id`. It does not search inside `purpose`, `whenToUse`, or other content fields. The match is case-insensitive substring. When no results match, the sidebar shows: _"No results for '[query]'"_ (no groups, no items).

### Dismiss

- × button in drawer header
- `Escape` key (document-level keydown listener, active only when drawer is open)
- Clicking the semi-transparent backdrop overlay (`#guideOverlay`)

Open/close is implemented by toggling the `hidden` class on `#guideOverlay` and the `active` class on `#methodologyDrawer` — no DOM insertion or removal.

### Keyboard Navigation

- `Escape` — close drawer
- `↑` / `↓` arrow keys — navigate the type list when focus is inside `#guideSidebar`; wraps at top and bottom

### Accessibility

- `#methodologyDrawer` has `role="dialog"`, `aria-modal="true"`, `aria-label="Testing Guide"`
- `#openGuideBtn` has `aria-expanded="false"` (updated to `"true"` when drawer is open)
- `#guideSearch` has `aria-label="Search testing methodologies"`
- When the drawer opens, focus moves to `#guideSearch`
- When the drawer closes, focus returns to `#openGuideBtn`
- Focus is trapped inside the drawer while it is open: Tab and Shift+Tab cycle through focusable elements within `#methodologyDrawer`; focus does not escape to background content

### Responsive

**Desktop (≥768px):**
- Drawer: `position: fixed; top: 0; right: 0; height: 100%; width: 480px; transform: translateX(100%)`
- Active state: `transform: translateX(0)`
- Overlay: full-screen backdrop

**Mobile (<768px):**
- Drawer: `position: fixed; bottom: 0; left: 0; right: 0; width: 100%; height: 85vh; border-radius: 16px 16px 0 0; transform: translateY(100%)`
- Active state: `transform: translateY(0)`
- On mobile the two-panel layout collapses: sidebar becomes a **horizontally scrolling strip** of icon+name chips at the top of the drawer; the content panel fills the remaining height below it

## Implementation

### `js/methodology.js`

```js
// Pure data — no IIFE, no logic. Accessed as global METHODOLOGY by methodology-ui.js.
const METHODOLOGY = [
  { /* functional entry */ },
  { /* unit entry */ },
  // ... 14 entries total
];
```

The file deliberately omits the IIFE wrapper used in other modules because it contains no logic and no risk of variable conflicts — it is a single `const` assignment.

### `js/methodology-ui.js`

Wrapped in an IIFE (matching the codebase pattern). Fully self-contained — exposes nothing externally. Responsibilities:

1. On `DOMContentLoaded`, wire `#openGuideBtn` click → `openGuide()`
2. `openGuide()`:
   - Remove `hidden` from `#guideOverlay`
   - Add `active` to `#methodologyDrawer`
   - Set `aria-expanded="true"` on `#openGuideBtn`
   - Clear `#guideSearch` value to `''`; call `renderSidebar('')`; call `selectEntry(METHODOLOGY[0].id)`
   - Move focus to `#guideSearch`
   - Activate focus trap
3. `closeGuide()`:
   - Add `hidden` to `#guideOverlay`
   - Remove `active` from `#methodologyDrawer`
   - Set `aria-expanded="false"` on `#openGuideBtn`
   - Deactivate focus trap
   - Return focus to `#openGuideBtn`
4. `renderSidebar(filter)` — build sidebar from `METHODOLOGY`, grouped by category, filtered by `filter` (case-insensitive substring match on `name`, `standard`, `category`, `id`)
5. `selectEntry(id)` — highlight sidebar item; call `renderEntry`; scroll right panel to top
6. `renderEntry(entry)` — build right panel HTML in the specified section order
7. Search `input` event → `renderSidebar(value)`; re-select first visible item (or show no-results message)
8. Document `keydown` (active only when open): `Escape` → `closeGuide()`
9. Sidebar `keydown`: `ArrowUp`/`ArrowDown` → move selection; wraps at ends
10. Focus trap: intercept `Tab`/`Shift+Tab` within `#methodologyDrawer` to keep focus inside

### `index.html`

**Add inside `.topbar-right`, before `#themeToggle`:**
```html
<button class="btn btn-sm btn-secondary" id="openGuideBtn" aria-expanded="false">
  <i class="fas fa-book"></i> Testing Guide
</button>
```

**Add before `</body>` (after existing `<script>` tags):**
```html
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
    <input type="text" id="guideSearch" placeholder="Search methodologies..."
           aria-label="Search testing methodologies" />
  </div>
  <div class="drawer-body">
    <nav id="guideSidebar" class="guide-sidebar" aria-label="Test type list"></nav>
    <div id="guideContent" class="guide-content"></div>
  </div>
</aside>
```

**Add script tags before `</body>`, after all existing `<script>` tags:**
```html
<script src="js/methodology.js"></script>
<script src="js/methodology-ui.js"></script>
```

### `css/styles.css`

All new styles must use existing CSS custom properties (`--bg-secondary`, `--bg-primary`, `--text-primary`, `--text-secondary`, `--border-color`, `--primary`, `--transition`, etc.) to ensure automatic dark theme compatibility. No hard-coded colour values, with one exception: the overlay backdrop uses `rgba(0, 0, 0, 0.4)` — a semi-transparent black overlay that correctly inverts for dark themes without needing a custom property.

**Z-index hierarchy** (existing values: sidebar=100, topbar=50, modal=1000, toast=2000):
- `.guide-overlay`: `z-index: 900` (above sidebar and topbar, below modal)
- `.methodology-drawer`: `z-index: 950` (above overlay)

**Desktop styles (default):**
```css
.guide-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 900;
  transition: var(--transition);
}
.methodology-drawer {
  position: fixed; top: 0; right: 0;
  height: 100%; width: 480px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 950;
  display: flex; flex-direction: column;
}
.methodology-drawer.active { transform: translateX(0); }
.drawer-body { display: flex; flex: 1; overflow: hidden; }
.guide-sidebar { width: 180px; overflow-y: auto; border-right: 1px solid var(--border-color); }
.guide-content { flex: 1; overflow-y: auto; padding: 1.5rem; }
```

**Mobile breakpoint (`@media (max-width: 767px)`):**
```css
.methodology-drawer {
  top: auto; bottom: 0; left: 0; right: 0;
  width: 100%; height: 85vh;
  border-radius: 16px 16px 0 0;
  border-left: none;
  border-top: 1px solid var(--border-color);
  transform: translateY(100%);
}
.methodology-drawer.active { transform: translateY(0); }
.drawer-body { flex-direction: column; }
.guide-sidebar {
  width: 100%; height: auto;
  overflow-x: auto; overflow-y: hidden;
  border-right: none;
  border-bottom: 1px solid var(--border-color);
  display: flex; flex-direction: row;
  padding: 0.5rem;
  gap: 0.5rem;
}
/* On mobile, hide category group headings in the sidebar */
.guide-sidebar .guide-group-label { display: none; }
```

Additional styles needed (implementer writes the exact CSS):
- `.guide-entry-*` — section headings within the right panel
- `.guide-badge` — effort and skill level badges
- `.guide-tag` — standard tags
- `.guide-checklist` — checklist items with checkbox icon
- `.guide-pitfall` — pitfall items with warning icon
- `.guide-tools-table` — two-column tool table
- `.guide-sidebar-item` — individual type items; `.guide-sidebar-item.active` for selected state
- `.guide-group-label` — category group headings in sidebar

## Error Handling

| Scenario | Behaviour |
|---|---|
| `METHODOLOGY` not loaded (script tag missing) | `openGuide()` shows inline error in `#guideContent`: _"Guide content unavailable. Please reload the page."_ |
| `typeof METHODOLOGY === 'undefined'` | Same as above |
| Entry `id` not found in `selectEntry` | Silently selects `METHODOLOGY[0]` (first entry) |
| Search matches nothing | Sidebar shows: _"No results for '[query]'"_ in place of the list |
| External resource link | Opens in `target="_blank" rel="noopener noreferrer"` |

## Files Changed

- `test-case-generator/js/methodology.js` — **New** (data only)
- `test-case-generator/js/methodology-ui.js` — **New** (UI logic)
- `test-case-generator/index.html` — Add trigger button in `.topbar-right` + drawer skeleton before `</body>` + two script tags
- `test-case-generator/css/styles.css` — Add drawer, overlay, sidebar, and content styles

## Out of Scope

- No changes to test case generation logic (separate follow-up spec)
- No persistence of selected methodology between sessions
- No editing of methodology content from within the app
- No export of the guide as PDF or markdown
- `exploratory` is included in the guide data only — it is **not** added to the generator's test type dropdown in this spec
