# Xcode Types Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a VS Code/Cursor extension that opens `.plist`, `.strings`, `.xcstrings`, and `.xcconfig` in a table custom editor (default) with TextMate highlighting in text mode.

**Architecture:** One `TableEditorProvider` + `FormatAdapter` registry. Document text is source of truth. Webview (React + Tailwind) shows `TableModel`; edits post full rows; host serializes via adapter into a `WorkspaceEdit`.

**Tech Stack:** TypeScript, Vite (extension + webview builds), React 18, Tailwind 3, Vitest (adapter unit tests), `@vscode/vsce` for packaging.

**Spec:** `docs/superpowers/specs/2026-09-23-xcode-types-extension-design.md`

## Global Constraints

- Custom editor `priority: default` for all four types (D004).
- Binary plist: detect → error banner, no edit (D005). No `plutil`.
- Plist nesting: path-flat only. No tree UI. No row virtualization v1.
- Comments/`#include`: preserve in `meta` when possible; not editable columns.
- React/Tailwind only in webview. Extension host = plain TS.
- Fewest deps: no XML framework unless `DOMParser`/hand parse fails; prefer hand parsers for strings/xcconfig; `JSON.parse` for xcstrings.
- Tests: Vitest on adapters only. No webview E2E v1.

---

## File structure (create)

```
package.json
tsconfig.json
tsconfig.webview.json
vite.config.ts              # extension (node/cjs) + webview (iife) builds
vitest.config.ts
.eslintrc.cjs               # optional — skip if not needed
.gitignore
.vscode/launch.json
.vscode/tasks.json
src/extension.ts
src/editors/TableEditorProvider.ts
src/editors/webviewHtml.ts
src/adapters/types.ts
src/adapters/registry.ts
src/adapters/strings.ts
src/adapters/xcconfig.ts
src/adapters/plist.ts
src/adapters/xcstrings.ts
src/webview/main.tsx
src/webview/App.tsx
src/webview/Table.tsx
src/webview/styles.css
media/                     # empty placeholder ok; built webview lands in dist/webview
syntaxes/plist.tmLanguage.json
syntaxes/strings.tmLanguage.json
syntaxes/xcstrings.tmLanguage.json
syntaxes/xcconfig.tmLanguage.json
samples/demo.strings
samples/demo.xcconfig
samples/demo.plist
samples/demo.xcstrings
tests/adapters/strings.test.ts
tests/adapters/xcconfig.test.ts
tests/adapters/plist.test.ts
tests/adapters/xcstrings.test.ts
```

---

### Task 1: Scaffold package + Vite dual build

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.webview.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore`, `.vscode/launch.json`, `.vscode/tasks.json`
- Create: `src/extension.ts` (stub activate)

**Interfaces:**
- Produces: npm scripts `build`, `watch`, `test`, `package`; `dist/extension.js` + `dist/webview/webview.js`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "xcode-types",
  "displayName": "Xcode Types",
  "description": "Table editors and highlighting for plist, strings, xcstrings, xcconfig",
  "version": "0.0.1",
  "publisher": "local",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Programming Languages", "Other"],
  "activationEvents": [],
  "main": "./dist/extension.js",
  "contributes": {
    "languages": [
      { "id": "plist", "aliases": ["Property List"], "extensions": [".plist"] },
      { "id": "strings", "aliases": ["Strings"], "extensions": [".strings"] },
      { "id": "xcstrings", "aliases": ["String Catalog"], "extensions": [".xcstrings"] },
      { "id": "xcconfig", "aliases": ["Xcode Config"], "extensions": [".xcconfig"] }
    ],
    "customEditors": [
      {
        "viewType": "xcodeTypes.table",
        "displayName": "Xcode Types Table",
        "selector": [
          { "filenamePattern": "*.plist" },
          { "filenamePattern": "*.strings" },
          { "filenamePattern": "*.xcstrings" },
          { "filenamePattern": "*.xcconfig" }
        ],
        "priority": "default"
      }
    ]
  },
  "scripts": {
    "build": "vite build",
    "watch": "vite build --watch",
    "test": "vitest run",
    "package": "npm run build && vsce package --no-dependencies"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@types/vscode": "^1.85.0",
    "@vscode/vsce": "^2.22.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.12",
    "vitest": "^1.2.1"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json` (extension host)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "skipLibCheck": true,
    "types": ["node", "vscode"],
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/webview/**"]
}
```

- [ ] **Step 3: Write `tsconfig.webview.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "types": []
  },
  "include": ["src/webview/**/*", "src/adapters/types.ts"]
}
```

- [ ] **Step 4: Write `vite.config.ts` (two builds)**

```ts
import { defineConfig } from 'vite'
import path from 'node:path'

const extension = defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/extension.ts'),
      formats: ['cjs'],
      fileName: () => 'extension.js',
    },
    rollupOptions: {
      external: ['vscode'],
    },
    sourcemap: true,
    minify: false,
    target: 'node18',
  },
})

const webview = defineConfig({
  build: {
    outDir: 'dist/webview',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/webview/main.tsx'),
      output: {
        entryFileNames: 'webview.js',
        assetFileNames: 'webview.[ext]',
      },
    },
    sourcemap: true,
    minify: false,
    target: 'es2022',
  },
})

// Default export used by `vite build` — run both via script or sequential configs.
// Use: package.json "build": "vite build --config vite.extension.ts && vite build --config vite.webview.ts"
export default extension
```

Prefer split configs to avoid dual-export pain:

- Create `vite.extension.ts` = extension config above (default export).
- Create `vite.webview.ts` = webview config above (default export).
- Set `"build": "vite build -c vite.extension.ts && vite build -c vite.webview.ts"`.
- Delete unused combined `vite.config.ts` or leave as alias to extension.

- [ ] **Step 5: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 6: Write `.gitignore`**

```
node_modules/
dist/
*.vsix
.DS_Store
```

- [ ] **Step 7: Stub `src/extension.ts`**

```ts
import * as vscode from 'vscode'

export function activate(_context: vscode.ExtensionContext): void {
  console.log('xcode-types activated')
}

export function deactivate(): void {}
```

- [ ] **Step 8: Stub webview entry so webview build succeeds**

Create `src/webview/main.tsx`:

```tsx
document.body.textContent = 'xcode-types webview'
```

- [ ] **Step 9: `.vscode/launch.json` + `tasks.json`**

`launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "npm: watch"
    }
  ]
}
```

`tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "watch",
      "problemMatcher": "$tsc-watch",
      "isBackground": true,
      "label": "npm: watch"
    }
  ]
}
```

Set `"watch": "vite build -c vite.extension.ts --watch"` for F5; rebuild webview on demand until Task 4.

- [ ] **Step 10: Install + build**

Run:

```bash
npm install
npm run build
```

Expected: `dist/extension.js` and `dist/webview/webview.js` exist; no errors.

- [ ] **Step 11: Commit**

```bash
git add package.json tsconfig.json tsconfig.webview.json vite.extension.ts vite.webview.ts vitest.config.ts .gitignore .vscode src/extension.ts src/webview/main.tsx
git commit -m "chore: scaffold extension Vite dual build"
```

---

### Task 2: Shared types + adapter registry

**Files:**
- Create: `src/adapters/types.ts`, `src/adapters/registry.ts`
- Test: `tests/adapters/registry.test.ts`

**Interfaces:**
- Produces:

```ts
export type Column = { key: string; label: string; editable?: boolean }
export type Row = { id: string; cells: Record<string, string>; meta?: unknown }
export type Banner = { level: 'error' | 'info'; text: string }
export type TableModel = { columns: Column[]; rows: Row[]; banner?: Banner }

export interface FormatAdapter {
  readonly languageId: string
  parse(text: string): TableModel
  serialize(model: TableModel): string
}
```

- `getAdapter(languageId: string): FormatAdapter | undefined`

- [ ] **Step 1: Write failing registry test**

```ts
import { describe, expect, it } from 'vitest'
import { getAdapter, registerAdapter } from '../../src/adapters/registry'
import type { FormatAdapter, TableModel } from '../../src/adapters/types'

const stub: FormatAdapter = {
  languageId: 'strings',
  parse: () => ({ columns: [], rows: [] }),
  serialize: () => '',
}

describe('registry', () => {
  it('returns registered adapter by languageId', () => {
    registerAdapter(stub)
    expect(getAdapter('strings')).toBe(stub)
    expect(getAdapter('nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

```bash
npm test -- tests/adapters/registry.test.ts
```

- [ ] **Step 3: Implement types + registry**

`src/adapters/types.ts` — types as above.

`src/adapters/registry.ts`:

```ts
import type { FormatAdapter } from './types'

const adapters = new Map<string, FormatAdapter>()

export function registerAdapter(adapter: FormatAdapter): void {
  adapters.set(adapter.languageId, adapter)
}

export function getAdapter(languageId: string): FormatAdapter | undefined {
  return adapters.get(languageId)
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- tests/adapters/registry.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/adapters/types.ts src/adapters/registry.ts tests/adapters/registry.test.ts
git commit -m "feat: add FormatAdapter types and registry"
```

---

### Task 3: `.strings` adapter (TDD)

**Files:**
- Create: `src/adapters/strings.ts`
- Test: `tests/adapters/strings.test.ts`
- Create: `samples/demo.strings`

**Interfaces:**
- Consumes: `FormatAdapter`, `TableModel`
- Produces: `stringsAdapter` with `languageId: 'strings'`
- Columns: `key`, `value`
- Parse classic `"key" = "value";` lines; skip `/* */` and `//` by storing in row `meta` or file-level later — v1: strip comments on parse OK if noted; prefer keep non-entry lines in `model.meta.preservedLines` array for serialize rebuild.

**Serialize strategy (v1):** rebuild only key/value lines from rows; drop comments (ponytail). Document in adapter file comment: `// ponytail: drops comments on round-trip; preserve when needed`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { stringsAdapter } from '../../src/adapters/strings'

describe('stringsAdapter', () => {
  it('parses key value pairs', () => {
    const text = `"hello" = "world";\n"a" = "b";\n`
    const model = stringsAdapter.parse(text)
    expect(model.columns.map((c) => c.key)).toEqual(['key', 'value'])
    expect(model.rows).toHaveLength(2)
    expect(model.rows[0].cells).toEqual({ key: 'hello', value: 'world' })
  })

  it('round-trips', () => {
    const text = `"x" = "y";\n`
    const out = stringsAdapter.serialize(stringsAdapter.parse(text))
    expect(stringsAdapter.parse(out).rows[0].cells).toEqual({ key: 'x', value: 'y' })
  })

  it('parse failure sets banner', () => {
    const model = stringsAdapter.parse(`"unterminated`)
    expect(model.banner?.level).toBe('error')
  })
})
```

- [ ] **Step 2: Run — FAIL**

```bash
npm test -- tests/adapters/strings.test.ts
```

- [ ] **Step 3: Implement `stringsAdapter`**

Minimal regex loop for `"..." = "...";`. On unrecoverable garbage → `{ columns, rows: [], banner: { level: 'error', text: 'Failed to parse .strings' } }`.

Serialize:

```ts
rows.map(r => `"${escape(r.cells.key)}" = "${escape(r.cells.value)}";`).join('\n') + '\n'
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Add `samples/demo.strings`**

```
"app.name" = "Demo";
"app.ok" = "OK";
```

- [ ] **Step 6: Commit**

```bash
git add src/adapters/strings.ts tests/adapters/strings.test.ts samples/demo.strings
git commit -m "feat: parse and serialize .strings"
```

---

### Task 4: TableEditorProvider + webview HTML bridge

**Files:**
- Create: `src/editors/webviewHtml.ts`, `src/editors/TableEditorProvider.ts`
- Modify: `src/extension.ts` — register provider + `stringsAdapter`
- Modify: `src/webview/main.tsx` — listen for messages, post `ready`

**Interfaces:**
- Consumes: `getAdapter`, `TableModel`
- Message types:

```ts
type HostToWeb = { type: 'init' | 'update'; model: TableModel }
type WebToHost = { type: 'ready' } | { type: 'edit'; rows: Row[] }
```

- [ ] **Step 1: `webviewHtml.ts`**

Return HTML with CSP, script `webview.js`, nonce, `acquireVsCodeApi()`.

```ts
import * as vscode from 'vscode'

export function getWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'webview.js'),
  )
  const nonce = String(Date.now())
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
}
```

- [ ] **Step 2: `TableEditorProvider.ts`**

Implement `CustomTextEditorProvider`:
- `resolveCustomTextEditor`: set HTML; on `ready` send `init` with `adapter.parse(document.getText())`
- on `edit`: `adapter.serialize({ ...model, rows })` → replace full range via `WorkspaceEdit`
- `onDidChangeTextDocument`: if same doc and not from self, re-parse → `update`
- If `!adapter`: banner “Unsupported language”
- If `model.banner` and empty rows: still show UI with banner

- [ ] **Step 3: Register in `extension.ts`**

```ts
import { stringsAdapter } from './adapters/strings'
import { registerAdapter } from './adapters/registry'
import { TableEditorProvider } from './editors/TableEditorProvider'

export function activate(context: vscode.ExtensionContext): void {
  registerAdapter(stringsAdapter)
  context.subscriptions.push(
    TableEditorProvider.register(context, 'xcodeTypes.table'),
  )
}
```

- [ ] **Step 4: Webview posts `ready`**

```tsx
const vscodeApi = acquireVsCodeApi()
vscodeApi.postMessage({ type: 'ready' })
window.addEventListener('message', (e) => {
  document.body.textContent = JSON.stringify(e.data)
})
```

Declare `acquireVsCodeApi` in a small `src/webview/vscode.d.ts`.

- [ ] **Step 5: Manual smoke**

`npm run build`, F5, open `samples/demo.strings`. Expect custom editor; body shows init JSON with rows.

- [ ] **Step 6: Commit**

```bash
git add src/editors src/extension.ts src/webview
git commit -m "feat: custom text editor bridge for table view"
```

---

### Task 5: React table UI + Tailwind

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`, `src/webview/styles.css`, `src/webview/App.tsx`, `src/webview/Table.tsx`
- Modify: `src/webview/main.tsx`, `vite.webview.ts` (postcss), `webviewHtml.ts` if CSS asset needed

**Interfaces:**
- Consumes: `TableModel` via messages
- Produces: `edit` messages on cell blur / add / delete

- [ ] **Step 1: Tailwind config**

`tailwind.config.js`:

```js
module.exports = {
  content: ['./src/webview/**/*.{tsx,ts,html}'],
  theme: { extend: {} },
  plugins: [],
}
```

`postcss.config.js`:

```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

`styles.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Ensure webview build emits CSS; link in HTML via `webview.asWebviewUri` for `dist/webview/webview.css`.

- [ ] **Step 2: `Table.tsx`**

Simple HTML table: header from `columns`, cells as `<input>` when editable (default true). Buttons: Add row, Delete selected. On any change → call `onChange(rows)`.

- [ ] **Step 3: `App.tsx`**

Hold `model` state; show banner if present; disable inputs when `banner?.level === 'error'`; wire `onChange` → `postMessage({ type: 'edit', rows })`.

- [ ] **Step 4: `main.tsx` mount React**

```tsx
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(<App />)
```

- [ ] **Step 5: Manual smoke** — edit cell in `.strings`, save, reopen; file content updated.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.js postcss.config.js src/webview src/editors/webviewHtml.ts
git commit -m "feat: React table UI for custom editor"
```

---

### Task 6: `.xcconfig` adapter

**Files:**
- Create: `src/adapters/xcconfig.ts`, `tests/adapters/xcconfig.test.ts`, `samples/demo.xcconfig`
- Modify: `src/extension.ts` — `registerAdapter(xcconfigAdapter)`

**Interfaces:**
- Columns: `key`, `value`
- Lines `KEY = VALUE`; `#include` / `//` comments: stash in `meta` or drop on round-trip (ponytail: drop includes as non-rows; parse `#include` into rows with key=`#include` value=path if easy — prefer drop for v1 serialize rebuild of assignment lines only)

- [ ] **Step 1: Failing tests** — parse assignments, round-trip, bad input banner  
- [ ] **Step 2: Implement + PASS**  
- [ ] **Step 3: Register + sample**  
- [ ] **Step 4: Commit** `feat: parse and serialize .xcconfig`

---

### Task 7: `.plist` XML adapter + binary detect

**Files:**
- Create: `src/adapters/plist.ts`, `tests/adapters/plist.test.ts`, `samples/demo.plist`
- Modify: `src/extension.ts`

**Interfaces:**
- Columns: `path`, `type`, `value`
- `isBinaryPlist(text: string | Uint8Array): boolean` — magic `bplist`
- Binary / empty parse: `banner` error per D005; `serialize` must not be called when banner error from binary (provider skips apply)

**Parse:** XML plist via regex/DOM. In Node extension host use `npm` dep only if needed — prefer:

```ts
import { DOMParser } from '@xmldom/xmldom'
```

If adding dependency, pin `@xmldom/xmldom`. Flatten dict/array to path keys.

- [ ] **Step 1: Tests** — XML round-trip simple dict; binary string starting `bplist00` → banner; invalid XML → banner  
- [ ] **Step 2: Implement**  
- [ ] **Step 3: Register + sample XML plist**  
- [ ] **Step 4: Commit** `feat: XML plist table adapter with binary guard`

---

### Task 8: `.xcstrings` adapter

**Files:**
- Create: `src/adapters/xcstrings.ts`, `tests/adapters/xcstrings.test.ts`, `samples/demo.xcstrings`
- Modify: `src/extension.ts`

**Interfaces:**
- Columns: `key`, `locale`, `value`, `state`
- Parse String Catalog JSON (`sourceLanguage`, `strings` map). Flatten each key × locale localizations to rows.
- Serialize: rebuild JSON; preserve unknown fields on keys via `meta` when possible — ponytail: rebuild minimal structure from rows if full preserve is hard (`// ponytail: minimal xcstrings rebuild`).

- [ ] **Step 1: Tests** — flatten one key two locales; round-trip values; invalid JSON banner  
- [ ] **Step 2: Implement + register + sample**  
- [ ] **Step 3: Commit** `feat: parse and serialize .xcstrings`

---

### Task 9: TextMate grammars

**Files:**
- Create: `syntaxes/*.tmLanguage.json` (4 files)
- Modify: `package.json` `contributes.grammars`

**Interfaces:**
- Each grammar `scopeName` + `path`; basic patterns enough (strings quotes, xcconfig keywords, plist tags, xcstrings as `source.json` injection or copy JSON grammar scope).

- [ ] **Step 1: Add four minimal tmLanguage JSON files**  
- [ ] **Step 2: Wire grammars in `package.json`**  

```json
"grammars": [
  { "language": "plist", "scopeName": "source.plist", "path": "./syntaxes/plist.tmLanguage.json" },
  { "language": "strings", "scopeName": "source.strings", "path": "./syntaxes/strings.tmLanguage.json" },
  { "language": "xcstrings", "scopeName": "source.xcstrings", "path": "./syntaxes/xcstrings.tmLanguage.json" },
  { "language": "xcconfig", "scopeName": "source.xcconfig", "path": "./syntaxes/xcconfig.tmLanguage.json" }
]
```

- [ ] **Step 3: Manual** — Reopen With text editor; confirm non-plaintext highlighting  
- [ ] **Step 4: Commit** `feat: TextMate grammars for four Xcode file types`

---

### Task 10: Package + dual-host smoke

**Files:**
- Modify: `docs/tasks.md` — mark phases done
- Optional: root `README.md` (human install) — only if needed for smoke notes

- [ ] **Step 1: `npm test` — all green**  
- [ ] **Step 2: `npm run package` — produces `xcode-types-0.0.1.vsix`**  
- [ ] **Step 3: Install vsix in VS Code + Cursor; open each `samples/*`; edit/save**  
- [ ] **Step 4: Update `docs/tasks.md` statuses for Phases 1–5**  
- [ ] **Step 5: Commit** `chore: mark v1 smoke complete`

---

## Self-review

1. **Spec coverage:** Goal, D001–D005, architecture, components, messages, errors, tests/ship, four formats, TextMate — each has a task (1–10).  
2. **Placeholders:** None intentional; Task 6–8 mirror Task 3 pattern with explicit columns/behavior.  
3. **Types:** `TableModel` / `FormatAdapter` / message shapes consistent across tasks.

---

## Execution

Plan saved to `docs/superpowers/plans/2026-09-23-xcode-types-extension.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — same session via executing-plans, checkpoint reviews  

Which approach?
