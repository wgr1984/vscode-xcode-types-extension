import type { FormatAdapter, ParseIssue, Row, TableModel } from './types'

const columns = [
  { key: 'key', label: 'Key' },
  { key: 'value', label: 'Value' },
]

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

function unescapeString(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

const PAIR =
  /^"((?:\\.|[^"\\])*)"\s*=\s*"((?:\\.|[^"\\])*)"\s*;\s*$/

// ponytail: drops comments on round-trip; line-based issues (no multi-line /* */)
export const stringsAdapter: FormatAdapter = {
  languageId: 'strings',

  parse(text: string): TableModel {
    const rows: Row[] = []
    const issues: ParseIssue[] = []
    const lines = text.split(/\n/)
    let i = 0

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].replace(/\r$/, '')
      const trimmed = line.trim()
      if (!trimmed) continue
      if (trimmed.startsWith('//')) continue
      if (/^\/\*[\s\S]*\*\/$/.test(trimmed)) continue

      const match = trimmed.match(PAIR)
      if (match) {
        rows.push({
          id: String(i++),
          cells: {
            key: unescapeString(match[1]),
            value: unescapeString(match[2]),
          },
        })
        continue
      }

      const lead = line.match(/^\s*/)?.[0].length ?? 0
      issues.push({
        message: 'Invalid .strings entry (expected "key" = "value";)',
        line: lineIdx,
        startCol: lead,
        endCol: line.length,
      })
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
            : `Failed to parse .strings (${issues.length} invalid lines)`,
      },
    }
  },

  serialize(model: TableModel): string {
    return (
      model.rows
        .map(
          (r) =>
            `"${escapeString(r.cells.key ?? '')}" = "${escapeString(r.cells.value ?? '')}";`,
        )
        .join('\n') + (model.rows.length ? '\n' : '')
    )
  },
}
