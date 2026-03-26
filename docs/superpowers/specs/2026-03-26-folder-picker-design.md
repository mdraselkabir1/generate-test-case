# Design: Local Folder Picker for Project Tab

**Date:** 2026-03-26
**Status:** Approved

## Summary

Replace the zip file upload in the Project tab with a native OS folder picker using the File System Access API (`showDirectoryPicker`). Drag-and-drop of a folder is kept as a fallback for browsers that don't support the API (Firefox). The rest of the pipeline — content parsing, analysis, test generation — is unchanged.

## Architecture

The Project tab UI is reworked to present a "Select Folder" button. Clicking it invokes `window.showDirectoryPicker()`, which opens the OS-native folder browser. The returned `FileSystemDirectoryHandle` is walked recursively to collect all matching source files. Collected files are assembled into the same `{text, stats}` bundle that `parseProjectZip` currently produces, keeping all downstream code untouched.

## Components

### `index.html` — Project tab UI

- Remove zip upload zone (`#projectUploadZone`, `#projectZipInput`)
- Add "Select Folder" button (`#selectFolderBtn`) — hidden on unsupported browsers
- Add drag-and-drop zone (`#projectDropZone`) for folder drag as fallback
- Show selected folder name and path once chosen
- Keep "Include tests" / "Include docs" checkboxes unchanged
- Keep `#projectPreview`, `#projectStats`, `#projectName` preview area unchanged

### `js/app.js` — Event wiring

- `bindProjectFolder()` replaces the current zip-related bindings
  - Detects `showDirectoryPicker` support; hides button and shows fallback note if absent
  - Button click → `showDirectoryPicker()` → calls `handleProjectFolder(dirHandle)`
  - Drop zone `drop` event → reads `DataTransferItem.webkitGetAsEntry()` → calls `handleProjectFolderEntry(entry)`
  - `handleProjectFolder(dirHandle)` — walks `FileSystemDirectoryHandle` recursively, collects `{name, path, file}` objects, passes to `Parser.parseProjectFolder`
  - `handleProjectFolderEntry(entry)` — walks `FileSystemDirectoryEntry` recursively (fallback path), same output shape

### `js/parser.js` — New function `parseProjectFolder(files, options)`

- Accepts `files`: array of `{name, path, text}` objects (already read into strings)
- Reuses existing file-type detection (`getFileType`, `getLanguage`, extension lists) from `parseProjectZip`
- Applies same filtering: skip binary files, respect `includeTests` / `includeDocs` options
- Returns `{text, stats}` — identical shape to `parseProjectZip` return value
- `parseProjectZip` remains in place (unchanged) since it may be used independently

## Data Flow

```
User clicks "Select Folder"
  → showDirectoryPicker() → FileSystemDirectoryHandle
  → walkDirectoryHandle() → [{name, path, file}]
  → Promise.all(file.text()) → [{name, path, text}]
  → Parser.parseProjectFolder(files, options) → {text, stats}
  → parsedContent = text  (same variable used by startGeneration)
  → render preview UI
```

Fallback (drag-and-drop):
```
User drags folder onto drop zone
  → DataTransferItem.webkitGetAsEntry() → FileSystemDirectoryEntry
  → walkDirectoryEntry() → [{name, path, file}]
  → (same path from here)
```

## Error Handling

| Scenario | Behavior |
|---|---|
| `showDirectoryPicker` not supported | Button hidden; drag-and-drop zone shown with Firefox note |
| User cancels picker (`AbortError`) | Silently ignored, UI unchanged |
| File read error (permissions) | File skipped; count tracked in `stats.skippedErrors` |
| File > 500KB | Content truncated to 500KB; `stats.skippedLarge` incremented |
| Folder contains > 500 files | Warning toast shown; first 500 processed |
| Empty folder (0 matching files) | Error toast: "No supported source files found in this folder" |

## Browser Compatibility

| Browser | Folder Picker Button | Drag-and-drop Fallback |
|---|---|---|
| Chrome / Edge | Yes | Yes |
| Firefox | Hidden | Yes (webkitGetAsEntry) |
| Safari | Hidden | Partial (limited webkitGetAsEntry) |

## Files Changed

- `test-case-generator/index.html` — Project tab UI
- `test-case-generator/js/app.js` — `bindProjectFolder`, `handleProjectFolder`, `handleProjectFolderEntry`
- `test-case-generator/js/parser.js` — `parseProjectFolder`

## Out of Scope

- No backend server
- No changes to URL, file, or text input tabs
- No changes to generation, storage, or export logic
- `parseProjectZip` is not removed (kept as-is)
