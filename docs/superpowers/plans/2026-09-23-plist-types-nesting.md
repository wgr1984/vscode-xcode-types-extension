# Plist Types + Nesting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plist table gets a type `<select>` for all Apple plist types and round-trips nested `array`/`dictionary` via sorted path-flat rows.

**Architecture:** Extend shared `Column` with optional `editor`/`options`. Plist adapter emits container rows, sorts paths, rebuilds real XML trees on serialize. Webview renders selects and disables value for containers; type demotion drops descendant rows.

**Tech Stack:** Existing — TypeScript, React webview, Vitest. No new deps.

**Spec:** `docs/superpowers/specs/2026-09-23-plist-types-nesting-design.md`

## Global Constraints

- Path-flat only. No tree UI. No Add-child buttons.
- Types: `string` | `integer` | `real` | `boolean` | `date` | `data` | `array` | `dictionary`.
- Boolean UI type maps to `<true/>` / `<false/>`; Value cell is `true`/`false`.
- Empty containers = own row. Non-empty = container row + children.
- Keys with `.` or `[` in the key name: out of scope.
- Bad path / duplicate path: `serialize` throws; host already refuses overwrite (`TableEditorProvider`).
- Binary plist / parse fail: unchanged (D005).
- Keep hand XML parser; no xmldom.

---

## File structure (touch)

```
Modify: src/adapters/types.ts
Modify: src/adapters/plist.ts
Modify: src/webview/Table.tsx
Modify: tests/adapters/plist.test.ts
Modify: samples/demo.plist
Modify: docs/tasks.md
Modify: docs/superpowers/specs/2026-09-23-plist-types-nesting-design.md  # status → approved
```

No new files. Keep path helpers inside `plist.ts` (ponytail: split only if file > ~400 LOC and hurts).

---

### Task 1: Column editor meta + Table selects

**Files:**
- Modify: `src/adapters/types.ts`
- Modify: `src/webview/Table.tsx`
- Modify: `src/adapters/plist.ts` (type column options only; flatten/unflatten still old until Task 2–3)

**Interfaces:**
- Produces: `Column = { key, label, editable?, editor?: 'text' | 'select', options?: string[] }`
- Consumes: existing `Row` / `TableModel`

- [ ] **Step 1: Extend `Column` in `src/adapters/types.ts`**

Replace the `Column` type with:

```ts
export type Column = {
  key: string
  label: string
  editable?: boolean
  editor?: 'text' | 'select'
  options?: string[]
}
```

- [ ] **Step 2: Wire plist type column options**

In `src/adapters/plist.ts`, replace the `columns` const with:

```ts
const PLIST_TYPES = [
  'string',
  'integer',
  'real',
  'boolean',
  'date',
  'data',
  'array',
  'dictionary',
] as const

const columns = [
  { key: 'path', label: 'Path' },
  {
    key: 'type',
    label: 'Type',
    editor: 'select' as const,
    options: [...PLIST_TYPES],
  },
  { key: 'value', label: 'Value' },
]
```

- [ ] **Step 3: Update `Table.tsx` cell rendering**

Replace `src/webview/Table.tsx` with:

```tsx
import type { Column, Row } from '../adapters/types'

type Props = {
  columns: Column[]
  rows: Row[]
  disabled?: boolean
  onChange: (rows: Row[]) => void
}

function isDescendant(childPath: string, parentPath: string): boolean {
  if (!parentPath) return childPath.length > 0
  return (
    childPath.startsWith(parentPath + '.') ||
    childPath.startsWith(parentPath + '[')
  )
}

export function Table({ columns, rows, disabled, onChange }: Props) {
  const updateCell = (rowId: string, key: string, value: string) => {
    const target = rows.find((r) => r.id === rowId)
    if (!target) return

    if (key === 'type') {
      const path = target.cells.path ?? ''
      const next = rows
        .filter((r) => r.id === rowId || !isDescendant(r.cells.path ?? '', path))
        .map((r) => {
          if (r.id !== rowId) return r
          const cells = { ...r.cells, type: value }
          if (value === 'array' || value === 'dictionary') {
            cells.value = ''
          } else if (value === 'boolean' && cells.value !== 'true' && cells.value !== 'false') {
            cells.value = 'false'
          }
          return { ...r, cells }
        })
      onChange(next)
      return
    }

    onChange(
      rows.map((r) =>
        r.id === rowId ? { ...r, cells: { ...r.cells, [key]: value } } : r,
      ),
    )
  }

  const addRow = () => {
    const cells: Record<string, string> = {}
    for (const c of columns) cells[c.key] = ''
    if (columns.some((c) => c.key === 'type')) cells.type = 'string'
    onChange([...rows, { id: `new-${Date.now()}`, cells }])
  }

  const deleteRow = (rowId: string) => {
    onChange(rows.filter((r) => r.id !== rowId))
  }

  const renderCell = (row: Row, c: Column) => {
    const type = row.cells.type ?? 'string'
    const val = row.cells[c.key] ?? ''
    const common =
      'w-full bg-transparent px-1 py-0.5 outline-none focus:bg-[var(--vscode-input-background)]'

    if (c.editor === 'select' && c.options) {
      return (
        <select
          className={common}
          disabled={disabled || c.editable === false}
          value={val || c.options[0]}
          onChange={(e) => updateCell(row.id, c.key, e.target.value)}
        >
          {c.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    }

    if (c.key === 'value' && type === 'boolean') {
      return (
        <select
          className={common}
          disabled={disabled}
          value={val === 'true' ? 'true' : 'false'}
          onChange={(e) => updateCell(row.id, c.key, e.target.value)}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      )
    }

    if (c.key === 'value' && (type === 'array' || type === 'dictionary')) {
      return <input className={common} disabled value="" readOnly />
    }

    return (
      <input
        className={common}
        disabled={disabled || c.editable === false}
        value={val}
        onChange={(e) => updateCell(row.id, c.key, e.target.value)}
      />
    )
  }

  return (
    <div className="p-3">
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          disabled={disabled}
          className="rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-background)] px-2 py-1 text-[var(--vscode-button-foreground)] disabled:opacity-50"
          onClick={addRow}
        >
          Add row
        </button>
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="border-b border-[var(--vscode-panel-border)] px-2 py-1"
              >
                {c.label}
              </th>
            ))}
            <th className="border-b border-[var(--vscode-panel-border)] px-2 py-1 w-20">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="border-b border-[var(--vscode-panel-border)] px-1 py-0.5"
                >
                  {renderCell(row, c)}
                </td>
              ))}
              <td className="border-b border-[var(--vscode-panel-border)] px-1">
                <button
                  type="button"
                  disabled={disabled}
                  className="text-[var(--vscode-errorForeground)] disabled:opacity-50"
                  onClick={() => deleteRow(row.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Build webview**

Run: `npm run build`  
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add src/adapters/types.ts src/adapters/plist.ts src/webview/Table.tsx
git commit -m "$(cat <<'EOF'
feat: type select column meta for plist table

EOF
)"
```

---

### Task 2: Flatten container rows, boolean cells, sort

**Files:**
- Modify: `src/adapters/plist.ts` (`flatten`, leaf boolean mapping, sort after flatten)
- Test: `tests/adapters/plist.test.ts`

**Interfaces:**
- Consumes: existing `PlistValue` tree from parser
- Produces: rows with container paths; `type: 'boolean'` + `value: 'true'|'false'`; sorted parent→child

- [ ] **Step 1: Write failing tests**

Append to `tests/adapters/plist.test.ts` (keep existing tests):

```ts
const nested = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>kids</key>
  <array>
    <string>Ada</string>
    <dict>
      <key>age</key>
      <integer>9</integer>
    </dict>
  </array>
  <key>meta</key>
  <dict>
    <key>city</key>
    <string>Berlin</string>
  </dict>
  <key>emptyArr</key>
  <array/>
  <key>emptyDict</key>
  <dict/>
  <key>on</key>
  <true/>
</dict>
</plist>
`

it('flattens containers, boolean, and sorts parent before children', () => {
  const model = plistAdapter.parse(nested)
  expect(model.banner).toBeUndefined()
  const paths = model.rows.map((r) => r.cells.path)
  expect(paths).toEqual([
    'kids',
    'kids[0]',
    'kids[1]',
    'kids[1].age',
    'meta',
    'meta.city',
    'emptyArr',
    'emptyDict',
    'on',
  ])
  expect(model.rows.find((r) => r.cells.path === 'kids')?.cells.type).toBe('array')
  expect(model.rows.find((r) => r.cells.path === 'meta')?.cells.type).toBe('dictionary')
  expect(model.rows.find((r) => r.cells.path === 'emptyArr')?.cells).toMatchObject({
    type: 'array',
    value: '',
  })
  expect(model.rows.find((r) => r.cells.path === 'on')?.cells).toMatchObject({
    type: 'boolean',
    value: 'true',
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run tests/adapters/plist.test.ts`  
Expected: FAIL — missing container rows / wrong boolean type / empty self-close not parsed yet

- [ ] **Step 3: Replace `flatten` + add path sort helpers**

In `src/adapters/plist.ts`, add/replace:

```ts
function flatten(value: PlistValue, path: string, rows: Row[], id: { n: number }) {
  if (value.type === 'dict') {
    if (path) {
      rows.push({
        id: String(id.n++),
        cells: { path, type: 'dictionary', value: '' },
      })
    }
    for (const e of value.entries) {
      const p = path ? `${path}.${e.key}` : e.key
      flatten(e.value, p, rows, id)
    }
    return
  }
  if (value.type === 'array') {
    if (path) {
      rows.push({
        id: String(id.n++),
        cells: { path, type: 'array', value: '' },
      })
    }
    value.items.forEach((item, idx) => {
      flatten(item, `${path}[${idx}]`, rows, id)
    })
    return
  }
  if (value.type === 'true' || value.type === 'false') {
    rows.push({
      id: String(id.n++),
      cells: { path, type: 'boolean', value: value.type },
    })
    return
  }
  rows.push({
    id: String(id.n++),
    cells: { path, type: value.type, value: value.value },
  })
}

type Seg = { kind: 'key'; name: string } | { kind: 'index'; n: number }

function parsePath(path: string): Seg[] | null {
  if (!path) return []
  const segs: Seg[] = []
  let i = 0
  while (i < path.length) {
    if (path[i] === '[') {
      const close = path.indexOf(']', i)
      if (close < 0) return null
      const n = Number(path.slice(i + 1, close))
      if (!Number.isInteger(n) || n < 0) return null
      segs.push({ kind: 'index', n })
      i = close + 1
      if (i < path.length && path[i] === '.') i++
      continue
    }
    let j = i
    while (j < path.length && path[j] !== '.' && path[j] !== '[') j++
    const name = path.slice(i, j)
    if (!name) return null
    segs.push({ kind: 'key', name })
    i = j
    if (path[i] === '.') i++
  }
  return segs
}

function pathOrder(a: string, b: string): number {
  const as = parsePath(a)
  const bs = parsePath(b)
  if (!as || !bs) return a.localeCompare(b)
  const n = Math.min(as.length, bs.length)
  for (let i = 0; i < n; i++) {
    const x = as[i]
    const y = bs[i]
    if (x.kind !== y.kind) return x.kind === 'key' ? -1 : 1
    if (x.kind === 'key' && y.kind === 'key') {
      if (x.name !== y.name) return 0 // stable: keep flatten/edit order for siblings
    } else if (x.kind === 'index' && y.kind === 'index') {
      if (x.n !== y.n) return x.n - y.n
    }
  }
  return as.length - bs.length
}

function sortRows(rows: Row[]): Row[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const c = pathOrder(a.r.cells.path ?? '', b.r.cells.path ?? '')
      return c !== 0 ? c : a.i - b.i
    })
    .map((x) => x.r)
}
```

Also fix self-closing empty containers in `parseValue` (needed for empty fixtures):

```ts
  if (tag.selfClosing) {
    if (tag.name === 'array') return { value: { type: 'array', items: [] }, i }
    if (tag.name === 'dict') return { value: { type: 'dict', entries: [] }, i }
    return {
      value: { type: tag.name as 'string', value: '' },
      i,
    }
  }
```

(`true`/`false` already handled before this.)

In `parse()`, after flatten:

```ts
const rows: Row[] = []
flatten(root.value, '', rows, { n: 0 })
return { columns, rows: sortRows(rows) }
```

- [ ] **Step 4: Run tests — expect PASS for flatten test**

Run: `npx vitest run tests/adapters/plist.test.ts`  
Expected: PASS for flatten; nest round-trip still fails until Task 3 if added early — do not add round-trip test until Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/plist.ts tests/adapters/plist.test.ts
git commit -m "$(cat <<'EOF'
feat: flatten plist containers and boolean rows

EOF
)"
```

---

### Task 3: Unflatten nest rebuild + validation

**Files:**
- Modify: `src/adapters/plist.ts` (`unflatten`, `leaf`, empty `serializeValue`)
- Test: `tests/adapters/plist.test.ts`

**Interfaces:**
- Consumes: flat `Row[]` with paths
- Produces: nested `PlistValue`; throws on bad/duplicate paths

- [ ] **Step 1: Write failing tests**

Append (reuse `nested` from Task 2):

```ts
it('round-trips nested dict/array/empty/boolean', () => {
  const out = plistAdapter.serialize(plistAdapter.parse(nested))
  const again = plistAdapter.parse(out)
  expect(again.rows.map((r) => r.cells.path)).toEqual([
    'kids',
    'kids[0]',
    'kids[1]',
    'kids[1].age',
    'meta',
    'meta.city',
    'emptyArr',
    'emptyDict',
    'on',
  ])
  expect(again.rows.find((r) => r.cells.path === 'kids[0]')?.cells.value).toBe('Ada')
  expect(again.rows.find((r) => r.cells.path === 'kids[1].age')?.cells.value).toBe('9')
  expect(again.rows.find((r) => r.cells.path === 'on')?.cells.value).toBe('true')
  expect(out).toContain('<array/>')
  expect(out).toContain('<true/>')
})

it('serialize throws on duplicate path', () => {
  const { columns } = plistAdapter.parse(sample)
  expect(() =>
    plistAdapter.serialize({
      columns,
      rows: [
        { id: '1', cells: { path: 'a', type: 'string', value: '1' } },
        { id: '2', cells: { path: 'a', type: 'string', value: '2' } },
      ],
    }),
  ).toThrow(/duplicate/i)
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/adapters/plist.test.ts`  
Expected: FAIL on nest round-trip

- [ ] **Step 3: Implement `unflatten` / `leaf` / empty serialize**

Replace `leaf` and `unflatten`. Add helpers:

```ts
function leaf(type: string, val: string): PlistValue {
  if (type === 'boolean') {
    return val === 'true' ? { type: 'true', value: 'true' } : { type: 'false', value: 'false' }
  }
  if (type === 'true' || type === 'false') return { type, value: type }
  if (type === 'integer' || type === 'real' || type === 'data' || type === 'date') {
    return { type, value: val }
  }
  if (type === 'array') return { type: 'array', items: [] }
  if (type === 'dictionary' || type === 'dict') return { type: 'dict', entries: [] }
  return { type: 'string', value: val }
}

function ensureChild(
  parent: PlistValue,
  seg: Seg,
  hint?: 'array' | 'dict',
): PlistValue {
  if (seg.kind === 'key') {
    if (parent.type !== 'dict') throw new Error(`path: expected dict for key ${seg.name}`)
    let e = parent.entries.find((x) => x.key === seg.name)
    if (!e) {
      const empty: PlistValue =
        hint === 'array' ? { type: 'array', items: [] } : { type: 'dict', entries: [] }
      e = { key: seg.name, value: empty }
      parent.entries.push(e)
    }
    return e.value
  }
  if (parent.type !== 'array') throw new Error(`path: expected array for index ${seg.n}`)
  while (parent.items.length <= seg.n) {
    parent.items.push(
      hint === 'array' ? { type: 'array', items: [] } : { type: 'dict', entries: [] },
    )
  }
  return parent.items[seg.n]
}

function setAt(root: PlistValue, segs: Seg[], value: PlistValue) {
  if (segs.length === 0) {
    throw new Error('path: empty path not allowed for set')
  }
  let cur = root
  for (let i = 0; i < segs.length - 1; i++) {
    const next = segs[i + 1]
    const hint = next.kind === 'index' ? 'array' : 'dict'
    cur = ensureChild(cur, segs[i], hint)
  }
  const last = segs[segs.length - 1]
  if (last.kind === 'key') {
    if (cur.type !== 'dict') throw new Error('path: expected dict')
    const idx = cur.entries.findIndex((e) => e.key === last.name)
    if (idx >= 0) cur.entries[idx].value = value
    else cur.entries.push({ key: last.name, value })
  } else {
    if (cur.type !== 'array') throw new Error('path: expected array')
    while (cur.items.length <= last.n) {
      cur.items.push({ type: 'string', value: '' })
    }
    cur.items[last.n] = value
  }
}

function unflatten(rows: Row[]): PlistValue {
  const paths = rows.map((r) => r.cells.path ?? '')
  const seen = new Set<string>()
  for (const p of paths) {
    if (!p) throw new Error('path: empty path')
    if (seen.has(p)) throw new Error(`duplicate path: ${p}`)
    seen.add(p)
    if (parsePath(p) == null) throw new Error(`bad path: ${p}`)
  }

  const root: PlistValue = { type: 'dict', entries: [] }
  const ordered = sortRows(rows)

  for (const r of ordered) {
    const path = r.cells.path ?? ''
    const segs = parsePath(path)!
    const type = r.cells.type ?? 'string'
    const val = r.cells.value ?? ''
    const node = leaf(type, val)
    setAt(root, segs, node)
  }
  return root
}
```

Update `serializeValue` empty containers:

```ts
  if (v.type === 'dict') {
    if (v.entries.length === 0) return `${indent}<dict/>`
    const body = v.entries
      .map(
        (e) =>
          `${indent}  <key>${escapeXml(e.key)}</key>\n${serializeValue(e.value, indent + '  ')}`,
      )
      .join('\n')
    return `${indent}<dict>\n${body}\n${indent}</dict>`
  }
  if (v.type === 'array') {
    if (v.items.length === 0) return `${indent}<array/>`
    const body = v.items.map((item) => serializeValue(item, indent + '  ')).join('\n')
    return `${indent}<array>\n${body}\n${indent}</array>`
  }
```

**Nesting note:** When both a container row and children exist, `setAt` for the container first sets empty array/dict, then children `setAt` mutate/`replace` into that node via `ensureChild` finding existing entry. Order = `sortRows` (parent before children) — required.

When processing a container row after children were already created by inference, `setAt` replaces the node with `leaf('array'|'dictionary')` empty — **would wipe children**. Avoid: if type is array/dictionary, only `setAt` when node missing or leave existing:

```ts
    const node = leaf(type, val)
    if (type === 'array' || type === 'dictionary') {
      // ensure path exists as container; do not wipe if children already placed
      ensurePathContainer(root, segs, type === 'array' ? 'array' : 'dict')
    } else {
      setAt(root, segs, node)
    }
```

Implement `ensurePathContainer`:

```ts
function ensurePathContainer(
  root: PlistValue,
  segs: Seg[],
  kind: 'array' | 'dict',
) {
  let cur = root
  for (let i = 0; i < segs.length - 1; i++) {
    const next = segs[i + 1]
    const hint = next.kind === 'index' ? 'array' : 'dict'
    cur = ensureChild(cur, segs[i], hint)
  }
  const last = segs[segs.length - 1]
  const empty: PlistValue =
    kind === 'array' ? { type: 'array', items: [] } : { type: 'dict', entries: [] }
  if (last.kind === 'key') {
    if (cur.type !== 'dict') throw new Error('path: expected dict')
    const e = cur.entries.find((x) => x.key === last.name)
    if (!e) cur.entries.push({ key: last.name, value: empty })
    else if (e.value.type !== (kind === 'array' ? 'array' : 'dict')) e.value = empty
  } else {
    if (cur.type !== 'array') throw new Error('path: expected array')
    while (cur.items.length <= last.n) cur.items.push(empty)
    const existing = cur.items[last.n]
    if (existing.type !== (kind === 'array' ? 'array' : 'dict')) cur.items[last.n] = empty
  }
}
```

Then in `unflatten` loop use container branch above. Process **leaves first or parents first?** Spec sort = parent before children. With `ensurePathContainer` (no wipe), parent-first is safe. Children then `setAt` into existing containers.

- [ ] **Step 4: Run tests — all PASS**

Run: `npx vitest run tests/adapters/plist.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapters/plist.ts tests/adapters/plist.test.ts
git commit -m "$(cat <<'EOF'
feat: rebuild nested plist XML from path rows

EOF
)"
```

---

### Task 4: Sample + docs status

**Files:**
- Modify: `samples/demo.plist`
- Modify: `docs/tasks.md`
- Modify: `docs/superpowers/specs/2026-09-23-plist-types-nesting-design.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Enrich sample**

Write `samples/demo.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>name</key>
  <string>Demo</string>
  <key>count</key>
  <integer>3</integer>
  <key>kids</key>
  <array>
    <string>Ada</string>
    <string>Bea</string>
  </array>
  <key>emptyArr</key>
  <array/>
  <key>enabled</key>
  <true/>
</dict>
</plist>
```

- [ ] **Step 2: Mark docs**

- Spec status → `approved 2026-09-23`
- `docs/tasks.md` T6.0–T6.6 → `done` after F5 smoke (or `done` for code tasks, T3.4 still pending if needed)
- `docs/README.md` status → Phase 6 implemented / smoke pending

- [ ] **Step 3: Manual F5 smoke**

Extension Development Host → open `samples/demo.plist` → type dropdown, sorted nest paths, toggle boolean, save, reopen.

- [ ] **Step 4: Commit**

```bash
git add samples/demo.plist docs/tasks.md docs/superpowers/specs/2026-09-23-plist-types-nesting-design.md docs/README.md
git commit -m "$(cat <<'EOF'
docs: approve plist nesting spec and refresh sample

EOF
)"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Type `<select>` all 8 types | 1 |
| Boolean value select | 1 |
| Container value disabled | 1 |
| Container→leaf drops children | 1 |
| Flatten container rows | 2 |
| Sort parent→child | 2 |
| Empty array/dict rows | 2 |
| Unflatten nest rebuild | 3 |
| Infer missing parents | 3 (`ensureChild`) |
| Bad/duplicate path refuse | 3 (throw) |
| Tests listed in spec | 2–3 |
| Sample / docs | 4 |
| No tree / Add-child | omitted (YAGNI) |

---

## Self-review notes

- Self-closing `<array/>`/`<dict/>` parse fixed in Task 2.
- Container row + children: `ensurePathContainer` avoids wipe.
- Serialize errors = throw; host already blocks overwrite.
- Sibling key order: stable sort + `return 0` for unequal key names.
