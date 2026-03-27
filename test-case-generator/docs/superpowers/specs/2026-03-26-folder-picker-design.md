# Design: Local Folder Picker for Project Tab

**Date:** 2026-03-26
**Status:** Approved

## Summary

Replace the zip file upload in the Project tab with a native OS folder picker using the File System Access API (`showDirectoryPicker`). Drag-and-drop of a folder is kept as a fallback for browsers that don't support the API (Firefox). The rest of the pipeline — content parsing, analysis, test generation — is unchanged.

## Architecture

The Project tab UI is reworked to present a "Select Folder" button. Clicking it invokes `window.showDirectoryPicker()`, which opens the OS-native folder browser. The returned `FileSystemDirectoryHandle` is walked recursively to collect all matching source files. Collected files are assembled into the same `{text, stats}` bundle that `parseProjectZip` currently produces, keeping all downstream code untouched.

Since `showDirectoryPicker` is Chrome/Edge only, we keep drag-and-drop as a fallback for Firefox users (using `webkitGetAsEntry`).

## Components

### `index.html` — Project tab UI

- Remove zip upload zone (`#projectUploadZone`, `#projectZipInput`)
- Add "Select Folder" button (`#selectFolderBtn`) — hidden when `showDirectoryPicker` is not available
- When button is hidden, show a fallback note in its place: _"Use drag-and-drop below to select your project folder (Firefox users: drag the folder from your file manager)"_
- Add drag-and-drop zone (`#projectDropZone`) for folder drag as fallback — always visible
- `#projectName` default/cleared text: `"No folder selected"` (replaces the old `"project.zip"` default)
- Keep "Include tests" / "Include docs" checkboxes unchanged
- Keep `#projectPreview`, `#projectStats`, `#projectName`, `#clearProjectPreview` preview area unchanged

### `js/app.js` — Event wiring (`bindProjectFolder`)

Replaces the current zip-related bindings. Responsibilities:

- Detect `showDirectoryPicker` support; show/hide button and fallback note accordingly

**Button click path:**
1. Disable `#selectFolderBtn` and show spinner text _"Reading folder…"_ while processing
2. Call `showDirectoryPicker()`
3. **Walk the entire directory tree** via `handle.values()` recursively, constructing a relative path by concatenating directory names (e.g. `src/utils/helpers.js`). Collect all matching `File` handles into a flat array — the complete walk must finish before any sorting or capping. Record `totalFiles = allHandles.length` at this point (total before cap).
4. Sort all handles: code files first, then doc files, alphabetical within each group. Then `slice(0, 500)` to apply the cap.
5. Read each of the (up to 500) `File` handles to text using **individual `try/catch` per file** (not `Promise.all`) so a single unreadable file skips rather than aborting the batch; track `skippedErrors` count for each failure.
6. Pass `[{name, path, text}]` to `Parser.parseProjectFolder(files, options)` → `{text, stats}`
7. **After the call**, patch the returned stats: `stats.skippedErrors = skippedErrors; stats.totalFiles = totalFiles` (the parser only sees the capped list and cannot know these values independently)
8. Set `parsedContent`, render preview, set `#projectName` to the folder's `.name`
9. Re-enable `#selectFolderBtn` and restore button label in all exit paths (success and error)

**Drag-and-drop fallback path:**
1. On `drop`, check `e.dataTransfer.items[0].webkitGetAsEntry()`
2. If the entry is not a directory (`entry.isDirectory === false`), show error toast: _"Please drop a folder, not a file"_ and return
3. **Walk the entire directory tree** via the `FileSystemDirectoryEntry` API:
   - Use `entry.createReader().readEntries(callback)` — **call `readEntries` in a loop until the callback receives an empty array** (the API is paginated, returning at most 100 entries per call; without the loop, directories with > 100 entries silently lose items)
   - The API is callback-based; wrap in Promises: `new Promise((res, rej) => reader.readEntries(res, rej))`
   - Use `entry.fullPath` (e.g. `/myproject/src/helpers.js`) as the `path` field — trim the leading slash
   - **Complete the full walk before sorting or capping.** Record `totalFiles` at this point.
4. Sort all entries (code first, alphabetical), then `slice(0, 500)` to apply the cap
5. Read each file using promisified `entry.file()`: `new Promise((res, rej) => entry.file(res, rej))`, then `.text()` — **individual `try/catch` per file** same as button path; track `skippedErrors`
6. Pass to `Parser.parseProjectFolder` → same steps 6–9 as button path above

**Clear button (`#clearProjectPreview`):**
- Hide preview, clear `parsedContent = ''`, reset `#projectName` text to `"No folder selected"`
- No file input to reset (zip input removed)

**`startGeneration` updates:**
- Change the `sourceRef` fallback from `'project.zip'` to `'local folder'`
- Change the warning toast from `'Please upload a project zip file first'` to `'Please select a project folder first'`

### `js/parser.js` — New function `parseProjectFolder(files, options)`

- Accepts `files`: array of `{name, path, text}` objects (strings already read and capped in `app.js`)
- Reuses existing file-type detection (`getFileType`, `getLanguage`, extension lists) from `parseProjectZip`
- Applies same filtering: skip binary/unsupported extensions, respect `includeTests` / `includeDocs` options
- **Sort order:** code files first, then doc files, each group sorted alphabetically by path — matching `parseProjectZip` behavior
- **Per-file size limit:** truncate content at **2MB** per file (matching `parseProjectZip`)
- Returns `{text, stats}` with the following stats shape:

```js
{
  totalFiles: Number,      // patched in by app.js after the call (total handles before cap)
  parsedFiles: Number,     // files successfully included after filtering (computed inside parser)
  skippedLarge: Number,    // files truncated due to 2MB size limit (computed inside parser)
  skippedErrors: Number,   // patched in by app.js after the call (read failures tracked during text() reads)
  byLanguage: { [lang]: Number },
  byType: { code: Number, doc: Number }
}
```

`parseProjectFolder` initialises `totalFiles` and `skippedErrors` to `0` in its returned stats object. After the call, `app.js` overwrites them: `result.stats.totalFiles = totalFiles; result.stats.skippedErrors = skippedErrors`.

- `parseProjectZip` is not removed (kept as-is)

## Data Flow

```
User clicks "Select Folder"
  → showDirectoryPicker() → FileSystemDirectoryHandle
  → walkDirectoryHandle() (full tree) → allHandles[]          // in app.js
  → sort (code first, alpha) → slice(0, 500)                  // in app.js; totalFiles = allHandles.length
  → per-file try/catch .text() reads → [{name, path, text}], skippedErrors  // in app.js
  → Parser.parseProjectFolder(files, options) → {text, stats}
  → app.js patches: stats.totalFiles = totalFiles; stats.skippedErrors = skippedErrors
  → parsedContent = text  (same variable used by startGeneration)
  → render preview UI

Fallback (folder drag-and-drop):
  → DataTransferItem.webkitGetAsEntry() → FileSystemDirectoryEntry
  → promisified walkDirectoryEntry() with paginated readEntries loop (full tree)
    → allEntries[]                                             // in app.js; totalFiles = allEntries.length
  → sort → slice(0, 500)                                       // in app.js
  → per-file try/catch .text() reads → [{name, path, text}], skippedErrors
  → Parser.parseProjectFolder(files, options) → {text, stats}
  → app.js patches stats → (same from here)
```

## Error Handling

| Scenario | Behavior |
|---|---|
| `showDirectoryPicker` not supported (Firefox) | Button hidden; fallback note shown above drop zone |
| User cancels picker (`AbortError`) | Silently ignored, UI unchanged |
| User denies folder permissions (`NotAllowedError`) | Toast: _"Folder access denied. Please allow access when prompted."_ |
| User drops a file instead of a folder | Toast: _"Please drop a folder, not a file"_ |
| File read error (permissions, I/O) | File skipped; `skippedErrors` incremented; rest of files continue |
| File > 2MB | Content truncated to 2MB; `stats.skippedLarge` incremented |
| Folder contains > 500 files | Warning toast: _"Large project detected — only the first 500 files will be analyzed"_; cap applied during walk phase in sort order (code first, alphabetical) |
| Empty folder (0 matching files after filtering) | Error toast: _"No supported source files found in this folder"_ |

## Browser Compatibility

| Browser | Folder Picker Button | Drag-and-drop Fallback |
|---|---|---|
| Chrome / Edge | Yes (`showDirectoryPicker`) | Yes (`webkitGetAsEntry` with paginated loop) |
| Firefox | Hidden (API not supported) | Yes (`webkitGetAsEntry` with paginated loop) |
| Safari | Hidden (API not supported) | Limited — `webkitGetAsEntry` works for shallow structures; deeply nested folders (5+ levels) or large entry counts may behave inconsistently. Works for typical projects up to ~200 files. |

## Files Changed

- `test-case-generator/index.html` — Project tab UI
- `test-case-generator/js/app.js` — `bindProjectFolder`, `handleProjectFolder`, `handleProjectFolderEntry`
- `test-case-generator/js/parser.js` — `parseProjectFolder`

## Out of Scope

- No backend server
- No changes to URL, file, or text input tabs
- No changes to generation, storage, or export logic
- `parseProjectZip` is not removed (kept as-is)
