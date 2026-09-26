# Raw Edit Mode — Design Spec

**Date:** 2026-09-27  
**Status:** approved 2026-09-27  
**Branch / worktree:** `feature/raw-edit-mode`

## Goal

Toggle inside the custom table editor webview to edit the raw document text. Raw mode provides approximate syntax highlighting (Prism) and adapter validation banners only — no table editing in that mode.

## Decisions (accepted in brainstorm)

| Choice | Decision |
|--------|----------|
| Location | Inside webview (not reopen native text editor) |
| Highlight | Prism approximate colors (textarea + mirrored `<pre>`) |
| Invalid text | Always write to document; banner shows parse failure |
| Approach | Textarea + Prism overlay (not contenteditable, not Monaco) |

## Architecture

```
webview toolbar: Table | Raw

Raw keystroke
  → postMessage editRaw { text }
  → host WorkspaceEdit (full replace)
  → adapter.parse(text) → update { model, text, languageId }
  → banner reflects validation

Table edits unchanged: edit { rows } → serialize → WorkspaceEdit
```

Document text remains source of truth (same as table path). Native TextMate grammars stay for “Open With…” text editor; webview does not load TextMate.

## Components

| Piece | Responsibility |
|-------|----------------|
| `src/webview/App.tsx` | Mode state `table \| raw`; toggle; route to Table or RawEditor |
| `src/webview/RawEditor.tsx` | Transparent textarea over Prism-highlighted `<pre>`; scroll sync |
| `src/editors/TableEditorProvider.ts` | Handle `editRaw`; include `text` + `languageId` on init/update |
| `prismjs` (dep) | Tokenize for approximate highlight |

### Prism language map

| Format | Prism language |
|--------|----------------|
| plist | `markup` |
| strings | plain / closest available (no custom grammar v1) |
| xcstrings | `json` |
| xcconfig | plain / `properties` if available |

`ponytail:` approximate highlight OK; polish grammars later if needed.

### Messages

**Web → host**

- `ready`
- `edit { rows }` (table)
- `editRaw { text }` (raw)

**Host → web**

- `init \| update { model, text, languageId }`

## Edge cases

- Binary plist: show document text as-is; existing D005 banner; no special raw path.
- External / undo doc change: sync `text` into raw editor when not locally dirty.
- Mode is webview-session local (not persisted).
- Optional ~100–150ms debounce on `editRaw` writes to reduce thrash.

## Out of scope

- VS Code Problems panel diagnostics
- Monaco / TextMate-in-webview
- Blocking save or write on parse error
- Persisting Table/Raw mode across sessions
- Perfect Prism grammars for `.strings` / `.xcconfig`

## Testing

- Manual F5: toggle, Prism colors, break XML → error banner, fix → table usable again.
- Prefer small host-level check that `editRaw` replaces document text (only if easy without VS Code mock harness); otherwise manual smoke is enough for v1.

## Success criteria

1. User can toggle Table ↔ Raw in the custom editor.
2. Raw edits update the underlying text document and dirty/save work normally.
3. Parse failures surface via existing banner; writes are not blocked.
4. Raw view shows approximate Prism highlighting for at least plist (markup) and xcstrings (json).
