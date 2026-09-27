# Raw Edit Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Table/Raw toggle in the custom editor webview so users can edit document text with Prism highlighting and adapter validation banners (always write, never block).

**Architecture:** Host sends `{ model, text, languageId }` on init/update. Webview toggles modes. Raw mode posts `editRaw { text }`; host replaces full document via WorkspaceEdit then re-parses for banner. Raw UI = transparent textarea over Prism-highlighted `<pre>` with scroll sync.

**Tech Stack:** Existing TypeScript/React/Vite webview + new `prismjs` (+ `@types/prismjs` dev). Vitest for pure helpers.

**Spec:** `docs/superpowers/specs/2026-09-27-raw-edit-mode-design.md`

## Global Constraints

- Raw mode lives inside the custom editor webview (not reopen native text).
- Highlight = Prism approximate only; TextMate stays for native text editor.
- Invalid text: always write document; banner shows parse failure.
- Mode is session-local (not persisted).
- Out of scope: Problems panel diagnostics, Monaco, TextMate-in-webview, block-on-error, perfect strings/xcconfig grammars.
- Work only in worktree `feature/raw-edit-mode` until `/apply-worktree`.

---

## File structure (touch)

```
Create: src/webview/prismLang.ts
Create: src/webview/RawEditor.tsx
Create: tests/webview/prismLang.test.ts
Modify: package.json          # prismjs + @types/prismjs
Modify: package-lock.json     # npm install
Modify: src/editors/TableEditorProvider.ts
Modify: src/webview/App.tsx
Modify: docs/tasks.md
Modify: docs/superpowers/specs/2026-09-27-raw-edit-mode-design.md  # status → approved
```

No new Vite config unless Prism CSS import fails bundling (then import CSS from RawEditor or main).

---

### Task 1: Prism language helper + dep

**Files:**
- Create: `src/webview/prismLang.ts`
- Create: `tests/webview/prismLang.test.ts`
- Modify: `package.json` / lockfile via `npm install`

**Interfaces:**
- Produces: `prismLangFor(languageId: string): string`  
  Returns Prism language id: `markup` | `json` | `properties` | `none`
- Consumes: none

- [ ] **Step 1: Write failing test**

Create `tests/webview/prismLang.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { prismLangFor } from '../../src/webview/prismLang'

describe('prismLangFor', () => {
  it('maps known formats', () => {
    expect(prismLangFor('plist')).toBe('markup')
    expect(prismLangFor('xcstrings')).toBe('json')
    expect(prismLangFor('xcconfig')).toBe('properties')
    expect(prismLangFor('strings')).toBe('none')
  })

  it('unknown → none', () => {
    expect(prismLangFor('typescript')).toBe('none')
  })
})
```

- [ ] **Step 2: Run test — expect fail**

Run: `npm test -- tests/webview/prismLang.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement helper**

Create `src/webview/prismLang.ts`:

```ts
const MAP: Record<string, string> = {
  plist: 'markup',
  xcstrings: 'json',
  xcconfig: 'properties',
  strings: 'none',
}

/** Prism language id for approximate highlight; `none` = no tokenize. */
export function prismLangFor(languageId: string): string {
  return MAP[languageId] ?? 'none'
}
```

- [ ] **Step 4: Install Prism**

```bash
npm install prismjs
npm install -D @types/prismjs
```

- [ ] **Step 5: Run test — expect pass**

Run: `npm test -- tests/webview/prismLang.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/webview/prismLang.ts tests/webview/prismLang.test.ts
git commit -m "$(cat <<'EOF'
feat: add Prism language map for raw editor

EOF
)"
```

---

### Task 2: Host `editRaw` + richer init/update payload

**Files:**
- Modify: `src/editors/TableEditorProvider.ts`

**Interfaces:**
- Consumes: existing `parseDoc`, `WorkspaceEdit` pattern
- Produces host→webview:
  ```ts
  { type: 'init' | 'update', model: TableModel, text: string, languageId: string }
  ```
- Produces web→host union:
  ```ts
  | { type: 'ready' }
  | { type: 'edit'; rows: Row[] }
  | { type: 'editRaw'; text: string }
  ```

- [ ] **Step 1: Extend message types and `send`**

In `src/editors/TableEditorProvider.ts`, replace the `WebToHost` type and `send` helper with:

```ts
type WebToHost =
  | { type: 'ready' }
  | { type: 'edit'; rows: Row[] }
  | { type: 'editRaw'; text: string }

const send = (type: 'init' | 'update', model: TableModel) => {
  const languageId = resolveLanguageId(document)
  webviewPanel.webview.postMessage({
    type,
    model,
    text: document.getText(),
    languageId,
  })
}
```

Keep `parseDoc` / `applyRows` as they are.

- [ ] **Step 2: Add `applyRaw` and wire message handler**

Add next to `applyRows`:

```ts
const applyRaw = async (text: string) => {
  applying = true
  const edit = new vscode.WorkspaceEdit()
  const full = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length),
  )
  edit.replace(document.uri, full, text)
  await vscode.workspace.applyEdit(edit)
  applying = false
  // Always re-send so banner updates even when applying skipped change events
  send('update', parseDoc())
}
```

Replace the `onDidReceiveMessage` body with:

```ts
webviewPanel.webview.onDidReceiveMessage(async (msg: WebToHost) => {
  if (msg.type === 'ready') {
    send('init', parseDoc())
  } else if (msg.type === 'edit') {
    await applyRows(msg.rows)
  } else if (msg.type === 'editRaw') {
    await applyRaw(msg.text)
  }
})
```

Leave `onDidChangeTextDocument` unchanged (still `send('update', parseDoc())` when not applying).

Note: `applyRaw` always writes (even if parse will fail). After edit, explicit `send('update')` covers the case where `applying` suppressed the change listener.

- [ ] **Step 3: Build extension**

Run: `npm run build`  
Expected: success (webview still old types — OK until Task 3)

- [ ] **Step 4: Commit**

```bash
git add src/editors/TableEditorProvider.ts
git commit -m "$(cat <<'EOF'
feat: host editRaw path and text payload for webview

EOF
)"
```

---

### Task 3: `RawEditor` + App toggle

**Files:**
- Create: `src/webview/RawEditor.tsx`
- Modify: `src/webview/App.tsx`

**Interfaces:**
- Consumes: `prismLangFor`, host msgs with `text` + `languageId`
- Produces: `editRaw` posts; local mode `table | raw`

- [ ] **Step 1: Create `RawEditor.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-properties'
import { prismLangFor } from './prismLang'

type Props = {
  text: string
  languageId: string
  onChange: (text: string) => void
}

export function RawEditor({ text, languageId, onChange }: Props) {
  const [local, setLocal] = useState(text)
  const dirty = useRef(false)
  const preRef = useRef<HTMLPreElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!dirty.current) setLocal(text)
  }, [text])

  const lang = prismLangFor(languageId)

  const html = useMemo(() => {
    const code = local.endsWith('\n') ? local : local + '\n'
    if (lang === 'none' || !Prism.languages[lang]) {
      return Prism.util.encode(code) as string
    }
    return Prism.highlight(code, Prism.languages[lang], lang)
  }, [local, lang])

  const syncScroll = () => {
    const ta = taRef.current
    const pre = preRef.current
    if (!ta || !pre) return
    pre.scrollTop = ta.scrollTop
    pre.scrollLeft = ta.scrollLeft
  }

  const emit = (next: string) => {
    setLocal(next)
    dirty.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onChange(next)
      dirty.current = false
    }, 120)
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const shared =
    'absolute inset-0 m-0 p-3 box-border w-full h-full overflow-auto font-mono text-sm leading-5 whitespace-pre-wrap break-words'

  return (
    <div className="relative h-[calc(100vh-6rem)] min-h-[12rem] bg-[var(--vscode-editor-background)]">
      <pre
        ref={preRef}
        aria-hidden
        className={`${shared} pointer-events-none text-[var(--vscode-editor-foreground)]`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <textarea
        ref={taRef}
        value={local}
        spellCheck={false}
        onScroll={syncScroll}
        onChange={(e) => emit(e.target.value)}
        className={`${shared} resize-none bg-transparent text-transparent caret-[var(--vscode-editorCursor-foreground)] outline-none`}
      />
    </div>
  )
}
```

If Prism default theme is wanted, also add at top of file (optional, skip if ugly in dark UI):

```ts
// ponytail: no Prism theme CSS — rely on unstyled tokens + editor fg; add theme later if needed
```

- [ ] **Step 2: Wire `App.tsx`**

Replace `src/webview/App.tsx` contents with:

```tsx
import { useEffect, useState } from 'react'
import type { Row, TableModel } from '../adapters/types'
import { RawEditor } from './RawEditor'
import { Table } from './Table'

const vscodeApi = acquireVsCodeApi()

type HostMsg =
  | { type: 'init'; model: TableModel; text: string; languageId: string }
  | { type: 'update'; model: TableModel; text: string; languageId: string }

type Mode = 'table' | 'raw'

export function App() {
  const [model, setModel] = useState<TableModel | null>(null)
  const [text, setText] = useState('')
  const [languageId, setLanguageId] = useState('plaintext')
  const [mode, setMode] = useState<Mode>('table')

  useEffect(() => {
    const handler = (event: MessageEvent<HostMsg>) => {
      const msg = event.data
      if (msg.type === 'init' || msg.type === 'update') {
        setModel(msg.model)
        setText(msg.text)
        setLanguageId(msg.languageId)
      }
    }
    window.addEventListener('message', handler)
    vscodeApi.postMessage({ type: 'ready' })
    return () => window.removeEventListener('message', handler)
  }, [])

  if (!model) {
    return <div className="p-3 opacity-70">Loading…</div>
  }

  const disabled = model.banner?.level === 'error'

  const onChange = (rows: Row[]) => {
    setModel({ ...model, rows })
    vscodeApi.postMessage({ type: 'edit', rows })
  }

  const onRawChange = (next: string) => {
    setText(next)
    vscodeApi.postMessage({ type: 'editRaw', text: next })
  }

  return (
    <div>
      <div className="flex gap-2 px-3 py-2 border-b border-[var(--vscode-panel-border)]">
        <button
          type="button"
          className={`px-2 py-0.5 ${mode === 'table' ? 'font-semibold underline' : 'opacity-70'}`}
          onClick={() => setMode('table')}
        >
          Table
        </button>
        <button
          type="button"
          className={`px-2 py-0.5 ${mode === 'raw' ? 'font-semibold underline' : 'opacity-70'}`}
          onClick={() => setMode('raw')}
        >
          Raw
        </button>
      </div>
      {model.banner && (
        <div
          className={`px-3 py-2 ${
            model.banner.level === 'error'
              ? 'bg-[var(--vscode-inputValidation-errorBackground)] text-[var(--vscode-errorForeground)]'
              : 'bg-[var(--vscode-inputValidation-infoBackground)]'
          }`}
        >
          {model.banner.text}
        </div>
      )}
      {mode === 'table' ? (
        <Table
          columns={model.columns}
          rows={model.rows}
          disabled={disabled}
          onChange={onChange}
        />
      ) : (
        <RawEditor text={text} languageId={languageId} onChange={onRawChange} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build + unit tests**

Run:

```bash
npm test
npm run build
```

Expected: all tests pass; both Vite builds succeed. If Rollup fails on Prism CJS, add to `vite.webview.ts`:

```ts
optimizeDeps: { include: ['prismjs'] },
```

or

```ts
build: {
  commonjsOptions: { include: [/prismjs/, /node_modules/] },
  // ...existing
}
```

Fix only if build errors.

- [ ] **Step 4: Manual F5 smoke checklist**

1. Open `samples/demo.plist` in Extension Development Host.
2. Toggle **Raw** — see XML text; rough markup coloring OK.
3. Break a tag → error banner; document still dirty/saved with bad XML.
4. Fix XML → banner clears; toggle **Table** → rows OK.
5. Open `samples/demo.xcconfig` (or xcstrings) → Raw still editable; properties/json highlight OK.

- [ ] **Step 5: Commit**

```bash
git add src/webview/App.tsx src/webview/RawEditor.tsx vite.webview.ts
git commit -m "$(cat <<'EOF'
feat: Table/Raw toggle with Prism-highlighted raw editor

EOF
)"
```

---

### Task 4: Docs close-out

**Files:**
- Modify: `docs/superpowers/specs/2026-09-27-raw-edit-mode-design.md` — Status → `approved 2026-09-27`
- Modify: `docs/tasks.md` — T8.0–T8.4 → done (T8.4 manual note if you deferred F5)

- [ ] **Step 1: Mark spec approved**

Change header Status line to:

```md
**Status:** approved 2026-09-27
```

- [ ] **Step 2: Update tasks**

Set Phase 8 rows:

| ID | Status |
|----|--------|
| T8.0 | done |
| T8.1 | done |
| T8.2 | done |
| T8.3 | done |
| T8.4 | done or todo with note |

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-09-27-raw-edit-mode-design.md docs/tasks.md
git commit -m "$(cat <<'EOF'
docs: approve raw edit mode and mark phase 8 done

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| In-webview Table/Raw toggle | 3 |
| Prism approximate highlight | 1 + 3 |
| Always write invalid text | 2 `applyRaw` |
| Banner validation | 2 send after parse |
| `editRaw` / text+languageId msgs | 2 + 3 |
| Binary plist unchanged | no change (D005) |
| Sync text when not dirty | 3 RawEditor `dirty` ref |
| ~120ms debounce | 3 |
| Out of scope items skipped | — |
| Manual F5 | 3 Step 4 |

No placeholders. Types consistent across tasks.
