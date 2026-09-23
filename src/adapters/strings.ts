import type { FormatAdapter, Row, TableModel } from './types'

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

// ponytail: drops comments on round-trip; preserve when needed
export const stringsAdapter: FormatAdapter = {
  languageId: 'strings',

  parse(text: string): TableModel {
    const rows: Row[] = []
    const re = /"((?:\\.|[^"\\])*)"\s*=\s*"((?:\\.|[^"\\])*)"\s*;/g
    let match: RegExpExecArray | null
    let i = 0
    while ((match = re.exec(text)) !== null) {
      rows.push({
        id: String(i++),
        cells: {
          key: unescapeString(match[1]),
          value: unescapeString(match[2]),
        },
      })
    }

    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .replace(re, '')
      .replace(/\s+/g, '')

    if (stripped.length > 0 && rows.length === 0) {
      return {
        columns,
        rows: [],
        banner: { level: 'error', text: 'Failed to parse .strings' },
      }
    }

    return { columns, rows }
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
