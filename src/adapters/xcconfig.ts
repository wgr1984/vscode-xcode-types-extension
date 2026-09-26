import type { FormatAdapter, Row, TableModel } from './types'

const columns = [
  { key: 'key', label: 'Key' },
  { key: 'value', label: 'Value' },
]

// ponytail: rebuild assignment lines only; drops #include/comments
export const xcconfigAdapter: FormatAdapter = {
  languageId: 'xcconfig',

  parse(text: string): TableModel {
    const rows: Row[] = []
    const lines = text.split(/\r?\n/)
    let i = 0
    let bad = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
        continue
      }
      const eq = trimmed.indexOf('=')
      if (eq === -1) {
        bad = true
        continue
      }
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      // empty key = draft row from Add; keep so round-trip doesn't wipe UI
      rows.push({ id: String(i++), cells: { key, value } })
    }

    if (bad && rows.length === 0) {
      return {
        columns,
        rows: [],
        banner: { level: 'error', text: 'Failed to parse .xcconfig' },
      }
    }

    return { columns, rows }
  },

  serialize(model: TableModel): string {
    return (
      model.rows
        .map((r) => `${r.cells.key ?? ''} = ${r.cells.value ?? ''}`)
        .join('\n') + (model.rows.length ? '\n' : '')
    )
  },
}
