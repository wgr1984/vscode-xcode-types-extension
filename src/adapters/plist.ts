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

function unflatten(rows: Row[]): PlistValue {
  // ponytail: only flat string values under root dict keys (no nested rebuild from paths)
  const entries: { key: string; value: PlistValue }[] = []
  for (const r of rows) {
    const path = r.cells.path ?? ''
    const type = (r.cells.type ?? 'string') as PlistValue['type']
    const val = r.cells.value ?? ''
    if (path.includes('.') || path.includes('[')) {
      // keep as top-level string key with full path — coarse but round-trips simple files
      entries.push({
        key: path,
        value: leaf(type, val),
      })
      continue
    }
    entries.push({ key: path, value: leaf(type, val) })
  }
  return { type: 'dict', entries }
}

function leaf(type: string, val: string): PlistValue {
  if (type === 'true' || type === 'false') return { type, value: type }
  if (type === 'integer' || type === 'real' || type === 'data' || type === 'date') {
    return { type, value: val }
  }
  return { type: 'string', value: val }
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
    const body = v.entries
      .map(
        (e) =>
          `${indent}  <key>${escapeXml(e.key)}</key>\n${serializeValue(e.value, indent + '  ')}`,
      )
      .join('\n')
    return `${indent}<dict>\n${body}\n${indent}</dict>`
  }
  if (v.type === 'array') {
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
