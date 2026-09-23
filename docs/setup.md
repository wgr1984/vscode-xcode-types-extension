# Project setup (ideas)

Empty repo → scaffold after design approval.

## Layout (proposed)

```
/
  package.json          # extension manifest fields + scripts
  tsconfig.json
  vite.config.ts        # multi-entry: extension host + webview(s)
  src/
    extension.ts        # activate, register editors + languages
    parsers/            # plist | strings | xcstrings | xcconfig
    editors/            # CustomTextEditorProvider per type (or one generic)
    webview/            # React table UI
  syntaxes/             # TextMate grammars (highlight)
  language-configuration/
  docs/                 # this folder
```

## Scripts (minimal)

| Script | Purpose |
|--------|---------|
| `dev` | watch Vite, rebuild extension + webview |
| `build` | production bundles |
| `package` | `vsce package` / `@vscode/vsce` |
| `test` | unit tests for parsers (no UI first) |

## Deps (lean)

- `vscode` types (`@types/vscode`)
- Vite + `vite-plugin-vscode` *or* plain Vite dual build (prefer known-good template)
- React + ReactDOM + Tailwind (webview only)
- Parser libs only if stdlib/XML too painful — decide per format

## Extension points (`package.json` contributes)

1. `languages` — id + extensions for each format
2. `grammars` — TextMate for highlight
3. `customEditors` — table UI, `priority: default` or `option` (decision)
4. Commands: “Open With…” if priority is option

## Cursor notes

Cursor = VS Code fork. Same extension API for custom editors + webviews. Test in both before claim “works”. No Cursor-specific API needed for v1.