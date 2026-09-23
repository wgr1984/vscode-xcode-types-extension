# Vision

**Product:** VS Code extension (also Cursor) for `.plist`, `.strings`, `.xcstrings`, `.xcconfig`.

**Why:** Text editing these formats is error-prone. Want table UI + highlighting.

## Scope (v1)

| Format | Table edit | Highlight | Notes |
|--------|------------|-----------|-------|
| `.plist` | yes | yes | XML plist first; binary later if needed |
| `.strings` | yes | yes | key → value rows |
| `.xcstrings` | yes | yes | String Catalog JSON → flat/filterable table |
| `.xcconfig` | yes | yes | key/value (+ includes as rows or separate section) |

## Out of scope (v1)

- Binary plist round-trip (unless trivial via existing lib)
- Full Xcode project / pbxproj
- i18n workflow beyond table edit (export, sync services)
- Publishing Marketplace until MVP works in Cursor + VS Code

## Success

1. Open any of 4 types → custom editor (table) available.
2. Edits write back valid file.
3. Text editor still works; language grammar for highlight when in text mode.
4. One `vsix` / `npm run package` builds for both hosts.

## Stack (intent)

- TypeScript
- Vite (extension + webview bundle)
- React + Tailwind only where UI needs it (custom editors / webviews)
- `@vscode/webview-ui-toolkit` or plain HTML/Tailwind — pick in decision note