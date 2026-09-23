# Xcode Types Extension — Design Spec

**Date:** 2026-09-23  
**Status:** approved 2026-09-23  
**Host:** VS Code + Cursor

## Goal

VS Code/Cursor extension: table-based graphical editing + TextMate highlighting for `.plist`, `.strings`, `.xcstrings`, `.xcconfig`.

## Decisions (accepted)

| ID | Decision |
|----|----------|
| D001 | TypeScript, Vite, React+Tailwind (webview only), TextMate |
| D002 | CustomTextEditor + webview table (not notebook/sidebar-only) |
| D003 | Shared TableModel; per-format adapters |
| D004 | Custom editor `priority: default` (table opens first) |
| D005 | Binary plist → error banner, no edit until XML |

## Architecture

```
activate
  → languages + TextMate grammars
  → TableEditorProvider (one) + FormatAdapter registry by languageId

open / change document
  → adapter.parse(text) → TableModel | error banner
  → postMessage → webview

user edits table
  → postMessage full rows → adapter.serialize → WorkspaceEdit on text doc

save
  → normal editor save (text buffer is source of truth)
```

Text mode still available via Reopen Editor With. Highlight applies in text editor.

## Components

| Piece | Responsibility |
|-------|----------------|
| `src/extension.ts` | activate; register contributes |
| `src/editors/TableEditorProvider.ts` | CustomTextEditor lifecycle, message bridge |
| `src/adapters/types.ts` | `FormatAdapter`, `TableModel`, `Column`, `Row` |
| `src/adapters/{plist,strings,xcstrings,xcconfig}.ts` | parse / serialize / binary detect |
| `src/webview/` | React table UI (Tailwind) |
| `syntaxes/*.tmLanguage.json` | highlight |
| `package.json` contributes | languages, grammars, customEditors |

### TableModel

```ts
type Column = { key: string; label: string; editable?: boolean }
type Row = { id: string; cells: Record<string, string>; meta?: unknown }
type Banner = { level: 'error' | 'info'; text: string }
type TableModel = { columns: Column[]; rows: Row[]; banner?: Banner }
```

### Format columns (v1)

| Format | Columns |
|--------|---------|
| plist | path, type, value |
| strings | key, value |
| xcstrings | key, locale, value, state |
| xcconfig | key, value |

Plist nesting: path-flat (`a.b[0].c`). No tree UI in v1.  
Comments / `#include` lines: preserve on round-trip when parser keeps them in `meta`; not shown as editable columns in v1.  
No row virtualization in v1 (add if large `.xcstrings` hurts).

## Data flow

| Direction | Message | Payload |
|-----------|---------|---------|
| host → web | `init` / `update` | `TableModel` |
| web → host | `ready` | — |
| web → host | `edit` | `{ rows: Row[] }` (full model replace) |

External file change → re-parse → `update`.

## Errors

| Case | Behavior |
|------|----------|
| Binary plist | banner error; table disabled |
| Parse failure | banner; do not overwrite file |
| Serialize failure | show error; keep webview state |

## Testing + ship

- Unit tests: adapter parse/serialize goldens + one bad input each; binary detect.
- Manual: F5 smoke each type; edit/save/reopen; text highlight.
- Package with `@vscode/vsce`; smoke install VS Code + Cursor.
- Out of scope v1: webview E2E, Marketplace publish pipeline, binary convert via `plutil`, nested tree UI.

## Layout (target)

```
/
  package.json
  tsconfig.json
  vite.config.ts
  src/extension.ts
  src/editors/
  src/adapters/
  src/webview/
  syntaxes/
  docs/
```

## Related docs

- [vision](../vision.md) · [setup](../setup.md) · [ideas](../ideas.md) · [tasks](../tasks.md) · [decisions](../decisions/)
