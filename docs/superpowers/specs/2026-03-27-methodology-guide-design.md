# Design: In-App Testing Methodology Guide

**Date:** 2026-03-27
**Status:** Approved

## Summary

Add a slide-in side drawer to TestForge that serves as an expert-level reference guide for all 14 test types supported by the generator. The guide covers every methodology with purpose, when to use / not use, step-by-step process, key checklist, common pitfalls, tools, sample objectives, industry standards, and external resources. Content is authored as a static JS data module; a separate UI module owns rendering and interaction.

## Architecture

Two new files are introduced, following the existing pattern of separating data from UI logic:

- `js/methodology.js` — pure data; exports a `METHODOLOGY` array of 14 entries
- `js/methodology-ui.js` — DOM rendering, drawer open/close, search, keyboard navigation

Existing files receive minimal additions:
- `index.html` — drawer HTML skeleton + "Testing Guide" nav button
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

> Note: `exploratory` is added as a 15th test type to the generator's type list; it is not currently in the dropdown but is the most common unrepresented advanced manual methodology.

## UI — Drawer

### Trigger

A "Testing Guide" button with a book icon (`fa-book`) is added to the top navigation bar, positioned after the existing nav links. It is always visible regardless of active tab.

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
- Search filters the list in real time; groups with no matching items are hidden

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
11. **External Resources** — linked list (opens in new tab)

### Dismiss

- × button in drawer header
- `Escape` key
- Clicking the semi-transparent backdrop overlay

### Keyboard Navigation

- `Escape` — close drawer
- `↑` / `↓` arrow keys — navigate the type list (when focus is inside the sidebar)

### Responsive

- Desktop (≥768px): drawer is 480px wide, slides in from the right
- Mobile (<768px): drawer is 100% width, slides up from the bottom

## Implementation

### `js/methodology.js`

```js
const METHODOLOGY = [ /* 14-15 full entries */ ];
```

No IIFE needed — loaded before `methodology-ui.js` via a `<script>` tag in `index.html`. Accessed as a global `METHODOLOGY`.

### `js/methodology-ui.js`

Wrapped in an IIFE (matching the codebase pattern). Exposes nothing externally — fully self-contained. Responsibilities:

1. On `DOMContentLoaded`, wire the "Testing Guide" button click → open drawer
2. `openGuide()` — add `active` class to drawer, add overlay, set focus to search input
3. `closeGuide()` — remove `active` class, remove overlay
4. `renderSidebar(filter)` — build sidebar list from `METHODOLOGY`, grouped by category, filtered by `filter` string (matches name, standard, category, id)
5. `selectEntry(id)` — highlight sidebar item, render right panel content
6. `renderEntry(entry)` — build the right panel HTML from the entry object
7. Search input `input` event → `renderSidebar(searchValue)`, re-select first visible item
8. Keyboard events on sidebar → navigate items

### `index.html`

Add inside `<nav>`:
```html
<button class="btn btn-sm btn-secondary nav-guide-btn" id="openGuideBtn">
  <i class="fas fa-book"></i> Testing Guide
</button>
```

Add before `</body>`:
```html
<div id="guideOverlay" class="guide-overlay hidden"></div>
<aside id="methodologyDrawer" class="methodology-drawer">
  <div class="drawer-header">
    <h2>Testing Guide</h2>
    <button id="closeGuideBtn" class="btn-icon"><i class="fas fa-times"></i></button>
  </div>
  <div class="drawer-search">
    <input type="text" id="guideSearch" placeholder="Search methodologies..." />
  </div>
  <div class="drawer-body">
    <nav id="guideSidebar" class="guide-sidebar"></nav>
    <div id="guideContent" class="guide-content"></div>
  </div>
</aside>
```

### `css/styles.css`

New styles for:
- `.methodology-drawer` — fixed position, right: 0, transform: translateX(100%), transition; `.methodology-drawer.active` — translateX(0)
- `.guide-overlay` — fixed full-screen semi-transparent backdrop
- `.guide-sidebar` — left panel, 180px wide, scrollable
- `.guide-content` — right panel, flex: 1, scrollable
- `.guide-entry-*` — section headings, badges, tool table, checklist items
- Mobile breakpoint — width: 100%, bottom-sheet behaviour

## Error Handling

| Scenario | Behaviour |
|---|---|
| `METHODOLOGY` not loaded | `openGuide()` shows inline error: "Guide content unavailable" |
| Entry `id` not found in `selectEntry` | Silently selects first entry |
| Search matches nothing | Shows "No results for X" message in sidebar |
| External resource link | Opens in `target="_blank" rel="noopener noreferrer"` |

## Files Changed

- `test-case-generator/js/methodology.js` — **New**
- `test-case-generator/js/methodology-ui.js` — **New**
- `test-case-generator/index.html` — Add nav button + drawer skeleton
- `test-case-generator/css/styles.css` — Add drawer styles

## Out of Scope

- No changes to test case generation logic (that is a separate follow-up spec)
- No persistence of selected methodology between sessions
- No editing of methodology content from within the app
- No export of the guide as PDF or markdown
- Exploratory testing is added to the guide as entry id `exploratory` but is **not** added to the generator's test type dropdown in this spec (that is generator-enhancement scope)
