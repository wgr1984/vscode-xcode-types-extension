import type { FormatAdapter, Row, TableModel } from './types'

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

export function isBinaryPlist(text: string): boolean {
  return text.startsWith('bplist')
}

type PlistValue =
  | { type: 'string' | 'integer' | 'real' | 'true' | 'false' | 'data' | 'date'; value: string }
  | { type: 'dict'; entries: { key: string; value: PlistValue }[] }
  | { type: 'array'; items: PlistValue[] }

function skipWs(s: string, i: number): number {
  while (i < s.length && /\s/.test(s[i])) i++
  return i
}

function parseTag(
  s: string,
  i: number,
): { name: string; selfClosing: boolean; i: number } | null {
  i = skipWs(s, i)
  if (s[i] !== '<') return null
  i++
  if (s[i] === '/' || s[i] === '!' || s[i] === '?') return null
  let name = ''
  while (i < s.length && /[A-Za-z0-9_-]/.test(s[i])) name += s[i++]
  while (i < s.length && s[i] !== '>' && s[i] !== '/') i++
  const selfClosing = s[i] === '/'
  if (selfClosing) i++
  if (s[i] === '>') i++
  return { name, selfClosing, i }
}

function parseClose(s: string, i: number, name: string): number | null {
  i = skipWs(s, i)
  const close = `</${name}>`
  if (s.slice(i, i + close.length) !== close) return null
  return i + close.length
}

function parseText(s: string, i: number): { text: string; i: number } {
  let text = ''
  while (i < s.length && s[i] !== '<') text += s[i++]
  return { text, i }
}

function parseValue(s: string, i: number): { value: PlistValue; i: number } | null {
  i = skipWs(s, i)
  const tag = parseTag(s, i)
  if (!tag) return null
  i = tag.i

  if (tag.name === 'true' || tag.name === 'false') {
    return { value: { type: tag.name, value: tag.name }, i }
  }

  if (tag.selfClosing) {
    if (tag.name === 'array') return { value: { type: 'array', items: [] }, i }
    if (tag.name === 'dict') return { value: { type: 'dict', entries: [] }, i }
    return {
      value: { type: tag.name as 'string', value: '' },
      i,
    }
  }

  if (tag.name === 'dict') {
    const entries: { key: string; value: PlistValue }[] = []
    for (;;) {
      i = skipWs(s, i)
      if (s.slice(i, i + 7) === '</dict>') {
        i += 7
        break
      }
      const keyTag = parseTag(s, i)
      if (!keyTag || keyTag.name !== 'key') return null
      i = keyTag.i
      const keyText = parseText(s, i)
      i = keyText.i
      const keyClose = parseClose(s, i, 'key')
      if (keyClose == null) return null
      i = keyClose
      const child = parseValue(s, i)
      if (!child) return null
      i = child.i
      entries.push({ key: keyText.text, value: child.value })
    }
    return { value: { type: 'dict', entries }, i }
  }

  if (tag.name === 'array') {
    const items: PlistValue[] = []
    for (;;) {
      i = skipWs(s, i)
      if (s.slice(i, i + 8) === '</array>') {
        i += 8
        break
      }
      const child = parseValue(s, i)
      if (!child) return null
      i = child.i
      items.push(child.value)
    }
    return { value: { type: 'array', items }, i }
  }

  const text = parseText(s, i)
  i = text.i
  const close = parseClose(s, i, tag.name)
  if (close == null) return null
  return {
    value: {
      type: tag.name as 'string' | 'integer' | 'real' | 'data' | 'date',
      value: text.text,
    },
    i: close,
  }
}

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

function leaf(type: string, val: string): PlistValue {
  if (type === 'boolean') {
    return val === 'true'
      ? { type: 'true', value: 'true' }
      : { type: 'false', value: 'false' }
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

function arrayIndexNeeded(
  pathPrefix: string,
  index: number,
  explicit: Set<string>,
): boolean {
  const p = `${pathPrefix}[${index}]`
  for (const e of explicit) {
    if (e === p || e.startsWith(p + '.') || e.startsWith(p + '[')) return true
  }
  return false
}

/** Drop sparse array holes (e.g. deleted middle index) so they don't serialize as empty. */
function densify(v: PlistValue, path: string, explicit: Set<string>): PlistValue {
  if (v.type === 'dict') {
    return {
      type: 'dict',
      entries: v.entries.map((e) => ({
        key: e.key,
        value: densify(e.value, path ? `${path}.${e.key}` : e.key, explicit),
      })),
    }
  }
  if (v.type === 'array') {
    const items: PlistValue[] = []
    for (let i = 0; i < v.items.length; i++) {
      if (!arrayIndexNeeded(path, i, explicit)) continue
      items.push(densify(v.items[i], `${path}[${i}]`, explicit))
    }
    return { type: 'array', items }
  }
  return v
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
    if (type === 'array' || type === 'dictionary') {
      ensurePathContainer(root, segs, type === 'array' ? 'array' : 'dict')
    } else {
      setAt(root, segs, leaf(type, val))
    }
  }
  return densify(root, '', seen)
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function serializeValue(v: PlistValue, indent: string): string {
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
  if (v.type === 'true' || v.type === 'false') return `${indent}<${v.type}/>`
  return `${indent}<${v.type}>${escapeXml(v.value)}</${v.type}>`
}

export const plistAdapter: FormatAdapter = {
  languageId: 'plist',

  parse(text: string): TableModel {
    if (isBinaryPlist(text)) {
      return {
        columns,
        rows: [],
        banner: {
          level: 'error',
          text: 'Binary plist not supported. Convert to XML (e.g. plutil -convert xml1) then reopen.',
        },
      }
    }

    const plistStart = text.indexOf('<plist')
    if (plistStart === -1) {
      return {
        columns,
        rows: [],
        banner: { level: 'error', text: 'Failed to parse .plist (no <plist>)' },
      }
    }

    let i = text.indexOf('>', plistStart) + 1
    const root = parseValue(text, i)
    if (!root) {
      return {
        columns,
        rows: [],
        banner: { level: 'error', text: 'Failed to parse .plist XML' },
      }
    }

    const rows: Row[] = []
    flatten(root.value, '', rows, { n: 0 })
    return { columns, rows: sortRows(rows) }
  },

  serialize(model: TableModel): string {
    const root = unflatten(model.rows)
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n` +
      `<plist version="1.0">\n` +
      `${serializeValue(root, '')}\n` +
      `</plist>\n`
    )
  },
}
