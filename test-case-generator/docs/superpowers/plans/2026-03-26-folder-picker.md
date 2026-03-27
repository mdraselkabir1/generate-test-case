# Folder Picker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace zip upload in the Project tab with a native OS folder picker (File System Access API) plus a drag-and-drop folder fallback.

**Architecture:** Add `parseProjectFolder(files, options)` to `parser.js` that accepts pre-read `{name, path, text}` objects and returns the same `{text, stats}` shape as `parseProjectZip`. Rework `app.js` to walk `FileSystemDirectoryHandle` (button path) or `FileSystemDirectoryEntry` (drag-and-drop path) recursively, then patch stats and pass to the parser. Update `index.html` Project tab UI to remove zip upload and show folder picker button + drop zone.

**Tech Stack:** Vanilla JS (ES2020), File System Access API (`showDirectoryPicker`), File and Directory Entries API (`webkitGetAsEntry`), no build tools.

**Spec:** `docs/superpowers/specs/2026-03-26-folder-picker-design.md`

---

## Chunk 1: Parser — `parseProjectFolder`

**Files:**
- Modify: `js/parser.js` (add `parseProjectFolder` function and expose it in the return statement)

### Task 1: Add `parseProjectFolder` to `parser.js`

- [ ] **Step 1: Open `js/parser.js` and locate the return statement at the very end**

The last line of the IIFE is:
```js
return { parseFile, fetchUrl, analyzeContent, parseProjectZip };
```

- [ ] **Step 2: Add `parseProjectFolder` just above the return statement**

Insert this function between the closing `}` of `parseProjectZip` and the `return` statement:

```js
/**
 * Parse a project from pre-read file objects (from folder picker or drag-and-drop).
 * files: Array of { name, path, text } — already read and capped by app.js
 * options: { includeTests, includeDocs }
 * Returns { text, stats } — same shape as parseProjectZip.
 * Note: stats.totalFiles and stats.skippedErrors are initialised to 0 here;
 * app.js patches them in after calling this function.
 */
async function parseProjectFolder(files, options = {}) {
  const includeTests = options.includeTests || false;
  const includeDocs = options.includeDocs !== false;
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per file — matches parseProjectZip

  // Filter files
  const filtered = files.filter(({ path, text }) => {
    if (SKIP_DIRS.test(path + '/')) return false;
    if (SKIP_FILES.test(path)) return false;
    if (!includeTests && (TEST_FILE_PATTERN.test(path) || TEST_NAME_PATTERN.test(path))) return false;

    const ext = path.split('.').pop().toLowerCase();
    const baseName = path.split('/').pop().toLowerCase();
    const isCode = CODE_EXTENSIONS.has(ext) || CODE_EXTENSIONS.has(baseName);
    const isDoc = DOC_EXTENSIONS.has(ext) || /^readme/i.test(baseName) || /^changelog/i.test(baseName) || /^contributing/i.test(baseName);

    if (!isCode && !(isDoc && includeDocs)) return false;

    // Skip binary content (null bytes in first 500 chars)
    if (/\x00/.test(text.substring(0, 500))) return false;

    return true;
  });

  if (filtered.length === 0) {
    throw new Error('No supported source files found in this folder after filtering.');
  }

  // Sort: code first, then docs, alphabetical within each group
  filtered.sort((a, b) => {
    const extA = a.path.split('.').pop().toLowerCase();
    const extB = b.path.split('.').pop().toLowerCase();
    const baseA = a.path.split('/').pop().toLowerCase();
    const baseB = b.path.split('/').pop().toLowerCase();
    const aIsCode = CODE_EXTENSIONS.has(extA) || CODE_EXTENSIONS.has(baseA);
    const bIsCode = CODE_EXTENSIONS.has(extB) || CODE_EXTENSIONS.has(baseB);
    if (aIsCode !== bIsCode) return aIsCode ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  const stats = {
    totalFiles: 0,      // patched by app.js (total before cap)
    parsedFiles: 0,
    skippedLarge: 0,
    skippedErrors: 0,   // patched by app.js (read failures)
    byLanguage: {},
    byType: { code: 0, doc: 0 },
  };

  const parts = [];

  // Project structure overview
  parts.push('[PROJECT_STRUCTURE]');
  parts.push(`Total files: ${filtered.length}`);
  parts.push('Files:');
  filtered.forEach(f => parts.push(`  ${f.path}`));
  parts.push('[/PROJECT_STRUCTURE]');
  parts.push('');

  // Process each file
  for (const { path, text } of filtered) {
    const ext = path.split('.').pop().toLowerCase();
    const baseName = path.split('/').pop().toLowerCase();
    const isCode = CODE_EXTENSIONS.has(ext) || CODE_EXTENSIONS.has(baseName);

    let content = text;
    if (content.length > MAX_FILE_SIZE) {
      stats.skippedLarge++;
      parts.push(`\n${'='.repeat(60)}`);
      parts.push(`FILE: ${path} (TRUNCATED — ${Math.round(content.length / 1024)}KB > ${MAX_FILE_SIZE / 1024 / 1024}MB limit)`);
      parts.push('='.repeat(60));
      parts.push(annotateSourceCode(content.substring(0, MAX_FILE_SIZE), ext, path));
      // Count truncated files in stats so byType and byLanguage are not silently omitted
      if (isCode) {
        stats.byType.code++;
        const lang = detectLanguage(ext);
        stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
      } else {
        stats.byType.doc++;
      }
      stats.parsedFiles++;
      continue;
    }

    parts.push(`\n${'='.repeat(60)}`);
    parts.push(`FILE: ${path}`);
    parts.push('='.repeat(60));

    if (isCode) {
      parts.push(annotateSourceCode(content, ext, path));
      stats.byType.code++;
      const lang = detectLanguage(ext);
      stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
    } else {
      parts.push(content);
      stats.byType.doc++;
    }

    stats.parsedFiles++;
  }

  const text = parts.join('\n');
  if (text.trim().length < 100) {
    throw new Error('Could not extract meaningful content from the project folder.');
  }

  return { text, stats };
}
```

- [ ] **Step 3: Expose `parseProjectFolder` in the return statement**

Change the last line of the file from:
```js
return { parseFile, fetchUrl, analyzeContent, parseProjectZip };
```
to:
```js
return { parseFile, fetchUrl, analyzeContent, parseProjectZip, parseProjectFolder };
```

- [ ] **Step 4: Manually verify the function is accessible**

Open `index.html` in Chrome. Open DevTools → Console. Run:
```js
typeof Parser.parseProjectFolder
```
Expected: `"function"`

- [ ] **Step 5: Commit**

```bash
git add js/parser.js
git commit -m "feat: add Parser.parseProjectFolder for folder-based project input"
```

---

## Chunk 2: HTML — Project Tab UI

**Files:**
- Modify: `index.html` (lines 332–359 — the `#project-tab` section)

### Task 2: Rework the Project tab in `index.html`

- [ ] **Step 1: Replace the Project tab content**

Find and replace the entire `<!-- Project Tab (Folder / Zip Upload) -->` section (lines 332–359):

**Old:**
```html
<!-- Project Tab (Folder / Zip Upload) -->
<div class="tab-content" id="project-tab">
  <div class="upload-zone" id="projectUploadZone">
    <i class="fas fa-folder-open"></i>
    <h3>Upload Project Source Code</h3>
    <p>Drop a <strong>.zip file</strong> or click to browse</p>
    <small>Upload a .zip of your project source code. All supported code files will be analyzed together.</small>
    <input type="file" id="projectZipInput" accept=".zip" hidden>
  </div>
  <div class="project-upload-options">
    <label class="auth-toggle-label">
      <input type="checkbox" id="includeTests" class="form-checkbox">
      <i class="fas fa-vial"></i> Include existing test files in analysis
    </label>
    <label class="auth-toggle-label">
      <input type="checkbox" id="includeDocs" class="form-checkbox" checked>
      <i class="fas fa-file-alt"></i> Include documentation files (README, docs/)
    </label>
  </div>
  <div id="projectPreview" class="content-preview hidden">
    <div class="preview-header">
      <span id="projectName">project.zip</span>
      <span id="projectStats" class="project-stats"></span>
      <button class="btn-icon" id="clearProjectPreview"><i class="fas fa-times"></i></button>
    </div>
    <div class="preview-body" id="projectPreviewBody"></div>
  </div>
</div>
```

**New:**
```html
<!-- Project Tab (Folder Picker) -->
<div class="tab-content" id="project-tab">
  <!-- Folder picker button (Chrome/Edge only) -->
  <div id="folderPickerSection">
    <button class="btn btn-secondary btn-lg btn-block" id="selectFolderBtn">
      <i class="fas fa-folder-open"></i> Select Project Folder
    </button>
    <small class="form-hint" style="display:block;text-align:center;margin-top:0.5rem;">
      Opens a native folder browser — no zipping required
    </small>
  </div>

  <!-- Fallback note shown when showDirectoryPicker is not available -->
  <div id="folderPickerFallbackNote" class="hidden">
    <div class="auth-note">
      <i class="fas fa-info-circle"></i>
      <span>Use drag-and-drop below to select your project folder (Firefox users: drag the folder from your file manager)</span>
    </div>
  </div>

  <!-- Drag-and-drop zone (always visible as fallback) -->
  <div class="upload-zone" id="projectDropZone" style="margin-top:1rem;">
    <i class="fas fa-folder-plus"></i>
    <h3>Or drop your project folder here</h3>
    <p>Drag a folder from your file manager onto this area</p>
    <small>All supported source files will be read recursively</small>
  </div>

  <div class="project-upload-options">
    <label class="auth-toggle-label">
      <input type="checkbox" id="includeTests" class="form-checkbox">
      <i class="fas fa-vial"></i> Include existing test files in analysis
    </label>
    <label class="auth-toggle-label">
      <input type="checkbox" id="includeDocs" class="form-checkbox" checked>
      <i class="fas fa-file-alt"></i> Include documentation files (README, docs/)
    </label>
  </div>

  <div id="projectPreview" class="content-preview hidden">
    <div class="preview-header">
      <span id="projectName">No folder selected</span>
      <span id="projectStats" class="project-stats"></span>
      <button class="btn-icon" id="clearProjectPreview"><i class="fas fa-times"></i></button>
    </div>
    <div class="preview-body" id="projectPreviewBody"></div>
  </div>
</div>
```

- [ ] **Step 2: Manually verify the UI renders**

Open `index.html` in Chrome → Generator tab → Project tab.
Expected:
- "Select Project Folder" button is visible
- Drop zone is visible below it
- No zip-related text anywhere in this tab
- Preview area shows "No folder selected"

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: rework Project tab UI for folder picker (remove zip upload)"
```

---

## Chunk 3: App.js — Folder Picker Logic

**Files:**
- Modify: `js/app.js`
  - Replace `handleProjectZip` and its bindings in `bindGenerator` with new `bindProjectFolder`, `handleProjectFolder`, `handleProjectFolderEntry` functions
  - Fix `startGeneration` toast and sourceRef fallback string

### Task 3: Remove zip bindings from `bindGenerator`

> ⚠️ **Note:** Steps 1 and 3 of this task (HTML element removal + `app.js` cleanup) must be completed in the same working session without committing between them. Committing after the HTML change but before removing `handleProjectZip` from `app.js` will leave the app in a broken state: the `#projectUploadZone` element no longer exists in the DOM, and `handleProjectZip` (which writes to `zone.innerHTML`) will throw a `TypeError` if called.

- [ ] **Step 1: Find and remove the zip-related block in `bindGenerator` (lines 243–264)**

Find this block in `bindGenerator`:
```js
// Project (zip) upload
const projectZone = $('#projectUploadZone');
const projectInput = $('#projectZipInput');
if (projectZone && projectInput) {
  projectZone.addEventListener('click', () => projectInput.click());
  projectZone.addEventListener('dragover', e => { e.preventDefault(); projectZone.classList.add('dragover'); });
  projectZone.addEventListener('dragleave', () => projectZone.classList.remove('dragover'));
  projectZone.addEventListener('drop', e => {
    e.preventDefault();
    projectZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleProjectZip(e.dataTransfer.files[0]);
  });
  projectInput.addEventListener('change', () => {
    if (projectInput.files.length) handleProjectZip(projectInput.files[0]);
  });
  $('#clearProjectPreview').addEventListener('click', () => {
    $('#projectPreview').classList.add('hidden');
    $('#projectPreviewBody').textContent = '';
    $('#projectStats').textContent = '';
    parsedContent = '';
    projectInput.value = '';
  });
}
```

Replace it with a single call:
```js
// Project folder picker
bindProjectFolder();
```

- [ ] **Step 2: Fix the `startGeneration` function — update sourceRef fallback and warning toast**

Find in `startGeneration` (around lines 569–574):
```js
} else if (activeTab === 'project-tab') {
  content = parsedContent || '';
  sourceType = 'project';
  sourceRef = $('#projectName').textContent || 'project.zip';
  if (!content) {
    showToast('Please upload a project zip file first', 'warning');
    return;
  }
```

Change to:
```js
} else if (activeTab === 'project-tab') {
  content = parsedContent || '';
  sourceType = 'project';
  sourceRef = $('#projectName').textContent || 'local folder';
  if (!content) {
    showToast('Please select a project folder first', 'warning');
    return;
  }
```

- [ ] **Step 3: Remove the `handleProjectZip` function**

Find and delete the entire `handleProjectZip` function (lines 488–548 in `app.js`). It starts with:
```js
async function handleProjectZip(file) {
```
and ends with the closing `}` after the `finally` block that restores the upload zone. Delete the whole function.

- [ ] **Step 4: Commit this cleanup**

```bash
git add js/app.js
git commit -m "refactor: remove zip upload bindings and handleProjectZip from app.js"
```

### Task 4: Add `bindProjectFolder` and helper functions

- [ ] **Step 1: Add the new functions at the end of `app.js`, just before the closing `})();`**

```js
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
      await handleProjectFolderEntry(entry);
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
      const children = await walkDirectoryHandle(handle, path);
      results.push(...children);
    } else {
      results.push({ name, path, file: await handle.getFile() });
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
      const children = await walkDirectoryEntry(entry, path);
      results.push(...children);
    } else {
      const file = await new Promise((res, rej) => entry.file(res, rej));
      results.push({ name: entry.name, path, file });
    }
  }
  return results;
}

/**
 * Shared processing: sort, cap, read to text, call parser, render preview.
 * folderName: display name for the folder
 * allHandles: array of { name, path, file: File } — full unsorted list
 */
async function processProjectHandles(folderName, allHandles) {
  const btn = $('#selectFolderBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reading folder…'; }

  const MAX_FILES = 500;

  try {
    const totalFiles = allHandles.length;

    if (totalFiles === 0) {
      showToast('No files found in this folder', 'warning');
      return;
    }

    // Cap at MAX_FILES — no pre-sort here; Parser.parseProjectFolder owns the sort order
    // using its own CODE_EXTENSIONS / DOC_EXTENSIONS constants.
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
      result.text.length > 8000 ? '\n\n... (truncated preview — full content will be analyzed)' : '',
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
```

- [ ] **Step 2: Manually verify end-to-end — button path (Chrome)**

1. Open `index.html` in Chrome
2. Go to Generator → Project tab
3. Click "Select Project Folder"
4. Pick any local folder with source files (e.g. the `test-case-generator` folder itself)
5. Expected:
   - Button shows spinner while reading
   - Preview panel appears with file stats
   - `#projectName` shows the folder name (not "project.zip" or empty)
   - "Generate Test Cases" button works with the loaded content

- [ ] **Step 3: Manually verify — drag-and-drop path**

1. Open `index.html` in Chrome or Firefox
2. Go to Generator → Project tab
3. Drag a folder from Finder/Explorer onto the drop zone
4. Expected: same result as step 2 above

- [ ] **Step 4: Manually verify — unsupported browser (simulate)**

In Chrome DevTools Console:
```js
// Temporarily remove showDirectoryPicker to simulate Firefox
const orig = window.showDirectoryPicker;
delete window.showDirectoryPicker;
location.reload();
```
Expected:
- "Select Project Folder" button is hidden
- Fallback note is visible above drop zone

Restore: `window.showDirectoryPicker = orig`

- [ ] **Step 5: Manually verify — error states**

a) Drop a single file (not a folder) onto the drop zone
   Expected: toast "Please drop a folder, not a file"

b) Click "Select Project Folder" and cancel the dialog
   Expected: nothing happens, no toast, button re-enables

c) Click clear button after loading a folder
   Expected: preview hidden, `#projectName` resets to "No folder selected", parsedContent cleared

- [ ] **Step 6: Commit**

```bash
git add js/app.js
git commit -m "feat: add folder picker logic (bindProjectFolder, walk helpers, processProjectHandles)"
```

---

## Chunk 4: Final Wiring Check & Polish

**Files:**
- Possibly `js/app.js` (minor fix if `bindProjectFolder` isn't called from `bindGenerator`)

### Task 5: Verify `bindProjectFolder` is called and full flow works

- [ ] **Step 1: Confirm `bindProjectFolder()` is called in `bindGenerator`**

In `js/app.js`, the `bindGenerator` function should now contain `bindProjectFolder();` where the old zip block was. Verify this is present. If missing, add it.

- [ ] **Step 2: Full end-to-end generation test**

1. Open `index.html` in Chrome
2. Generator → Project tab → Select Folder → pick a folder
3. Set Test Type = "All Types", Depth = "Standard"
4. Click "Generate Test Cases"
5. Expected:
   - Progress bar runs through all 4 steps
   - Toast: "Test plan '...' generated with N test cases!"
   - Modal opens with test cases listed
   - Dashboard stats update (Documents Processed counter increments)

- [ ] **Step 3: Verify History page shows `project` source type**

Go to History page. The entry for the folder-based generation should show:
- Source type icon: folder (currently falls back to keyboard icon — that's acceptable, or update `renderHistoryItem` in `app.js` to handle `'project'` → `fa-folder-open`)

Update `renderHistoryItem` (lines 949–961 in `app.js`) to add `project` to the icon/class mapping:

Find:
```js
const iconClass = h.sourceType === 'url' ? 'url' : h.sourceType === 'file' ? 'file' : 'text';
const iconName = h.sourceType === 'url' ? 'fa-link' : h.sourceType === 'file' ? 'fa-file-alt' : 'fa-keyboard';
```

Replace:
```js
const iconClass = h.sourceType === 'url' ? 'url' : h.sourceType === 'file' ? 'file' : h.sourceType === 'project' ? 'file' : 'text';
const iconName = h.sourceType === 'url' ? 'fa-link' : h.sourceType === 'file' ? 'fa-file-alt' : h.sourceType === 'project' ? 'fa-folder-open' : 'fa-keyboard';
```

Also update the icon in `renderTestPlans` (around line 796 in `app.js`):

Find:
```js
<span><i class="fas fa-${plan.source === 'url' ? 'link' : plan.source === 'file' ? 'file-alt' : 'keyboard'}"></i> ${plan.source}</span>
```

Replace:
```js
<span><i class="fas fa-${plan.source === 'url' ? 'link' : plan.source === 'file' ? 'file-alt' : plan.source === 'project' ? 'folder-open' : 'keyboard'}"></i> ${plan.source}</span>
```

- [ ] **Step 4: Final commit**

```bash
git add js/app.js
git commit -m "feat: wire up project folder picker end-to-end; fix history icon for project source"
```
