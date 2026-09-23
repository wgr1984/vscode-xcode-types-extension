# Ideas (approaches)

## Architecture options

### A — Custom editors + TextMate (recommended)

- One `CustomTextEditorProvider` pattern (shared shell, format adapters).
- Webview = React table.
- Document = raw text; parse → rows → edit → serialize → `WorkspaceEdit`.
- TextMate grammars for text-editor highlight.

**Pros:** Standard VS Code path, works Cursor, undo/save native.  
**Cons:** Webview message bridge boilerplate.

### B — Notebook-style / virtual docs

Overkill for key-value files. Skip.

### C — Tree view only (no custom editor)

Sidebar tree ≠ “table editing”. Skip for main UX.

**Pick A.** Shared provider + 4 parsers/serializers.

## Table model (shared)

```ts
type Row = { id: string; cells: Record<string, string>; meta?: unknown }
type Column = { key: string; label: string; editable?: boolean }
```

| Format | Columns (v1) |
|--------|----------------|
| plist | Path / Key, Type, Value |
| strings | Key, Value, Comment? |
| xcstrings | Key, Locale, Value, State |
| xcconfig | Key, Value, Comment / Include |

Filter + add/delete row. Nested plist = path column (`a.b[0].c`) or expandable — start path-flat.

## Highlight

TextMate JSON under `syntaxes/`. Ship basic scopes; polish later. No Tree-sitter unless TextMate fails hard.

## Parse strategy (ponytail)

| Format | First try |
|--------|-----------|
| plist XML | `DOMParser` in extension host *or* small XML lib |
| strings | hand regex/parser (format small) |
| xcstrings | `JSON.parse` |
| xcconfig | line parser (key=value, `//`, `#include`) |

Round-trip must preserve enough structure that users don’t lose comments where format allows.

## Risks

- Binary `.plist` → refuse or convert via `plutil` (macOS only). Decision needed.
- Large `.xcstrings` → virtualize table rows.
- Webview CSP + Vite asset loading — follow VS Code webview Vite recipe once.