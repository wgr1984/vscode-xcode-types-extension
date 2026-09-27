import type { FormatAdapter, ParseIssue, Row, TableModel } from './types'

const columns = [
  { key: 'key', label: 'Key' },
  { key: 'value', label: 'Value' },
]

// ponytail: rebuild assignment lines only; drops #include/comments
export const xcconfigAdapter: FormatAdapter = {
  languageId: 'xcconfig',

  parse(text: string): TableModel {
    const rows: Row[] = []
    const issues: ParseIssue[] = []
    const lines = text.split(/\n/)
    let i = 0

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].replace(/\r$/, '')
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
        continue
      }
      const eq = trimmed.indexOf('=')
      if (eq === -1) {
        const lead = line.match(/^\s*/)?.[0].length ?? 0
        issues.push({
          message: 'Invalid .xcconfig line (expected KEY = value)',
          line: lineIdx,
          startCol: lead,
          endCol: line.length,
        })
        continue
      }
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      // empty key = draft row from Add; keep so round-trip doesn't wipe UI
      rows.push({ id: String(i++), cells: { key, value } })
    }

    if (issues.length === 0) {
      return { columns, rows }
    }

    return {
      columns,
      rows,
      issues,
      banner: {
        level: 'error',
        text:
          issues.length === 1
            ? issues[0].message
            : `Failed to parse .xcconfig (${issues.length} invalid lines)`,
      },
    }
  },

  serialize(model: TableModel): string {
    return (
      model.rows
        .map((r) => `${r.cells.key ?? ''} = ${r.cells.value ?? ''}`)
        .join('\n') + (model.rows.length ? '\n' : '')
    )
  },
}
