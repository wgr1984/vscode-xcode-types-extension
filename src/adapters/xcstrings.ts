import type { FormatAdapter, ParseIssue, Row, TableModel } from './types'

const columns = [
  { key: 'key', label: 'Key' },
  { key: 'locale', label: 'Locale' },
  { key: 'value', label: 'Value' },
  { key: 'state', label: 'State' },
]

type Catalog = {
  sourceLanguage?: string
  strings?: Record<
    string,
    {
      extractionState?: string
      localizations?: Record<
        string,
        { stringUnit?: { state?: string; value?: string } }
      >
    }
  >
  version?: string
}

function jsonParseIssue(text: string, err: unknown): ParseIssue {
  const message = 'Failed to parse .xcstrings JSON'
  const msg = err instanceof Error ? err.message : ''
  const lc = /line\s+(\d+)\s+column\s+(\d+)/i.exec(msg)
  if (lc) {
    const line = Math.max(0, Number(lc[1]) - 1)
    const startCol = Math.max(0, Number(lc[2]) - 1)
    const lineText = text.split(/\n/)[line] ?? ''
    return { message, line, startCol, endCol: Math.max(startCol + 1, lineText.length) }
  }
  const pos = /position\s+(\d+)/i.exec(msg)
  if (pos) {
    let line = 0
    let col = 0
    const offset = Math.min(Number(pos[1]), text.length)
    for (let i = 0; i < offset; i++) {
      if (text[i] === '\n') {
        line++
        col = 0
      } else {
        col++
      }
    }
    const lineText = text.split(/\n/)[line] ?? ''
    return { message, line, startCol: col, endCol: Math.max(col + 1, lineText.length) }
  }
  return { message, line: 0, startCol: 0, endCol: Math.min(1, text.length) || 1 }
}

// ponytail: minimal xcstrings rebuild
export const xcstringsAdapter: FormatAdapter = {
  languageId: 'xcstrings',

  parse(text: string): TableModel {
    let data: Catalog
    try {
      data = JSON.parse(text) as Catalog
    } catch (err) {
      return {
        columns,
        rows: [],
        banner: { level: 'error', text: 'Failed to parse .xcstrings JSON' },
        issues: [jsonParseIssue(text, err)],
      }
    }

    const rows: Row[] = []
    let i = 0
    const strings = data.strings ?? {}
    for (const [key, entry] of Object.entries(strings)) {
      const locs = entry.localizations ?? {}
      const locales = Object.keys(locs)
      if (locales.length === 0) {
        rows.push({
          id: String(i++),
          cells: {
            key,
            locale: data.sourceLanguage ?? '',
            value: '',
            state: entry.extractionState ?? '',
          },
        })
        continue
      }
      for (const locale of locales) {
        const unit = locs[locale]?.stringUnit
        rows.push({
          id: String(i++),
          cells: {
            key,
            locale,
            value: unit?.value ?? '',
            state: unit?.state ?? '',
          },
        })
      }
    }

    return { columns, rows }
  },

  serialize(model: TableModel): string {
    const strings: NonNullable<Catalog['strings']> = {}
    for (const r of model.rows) {
      const key = r.cells.key ?? ''
      const locale = r.cells.locale ?? ''
      // empty key = draft row from Add; keep entry so round-trip doesn't wipe UI
      if (!strings[key]) strings[key] = { localizations: {} }
      if (!strings[key].localizations) strings[key].localizations = {}
      if (locale) {
        strings[key].localizations![locale] = {
          stringUnit: {
            state: r.cells.state || 'translated',
            value: r.cells.value ?? '',
          },
        }
      }
    }

    const catalog: Catalog = {
      sourceLanguage: 'en',
      version: '1.0',
      strings,
    }
    return JSON.stringify(catalog, null, 2) + '\n'
  },
}
