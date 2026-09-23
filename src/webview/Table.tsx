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
          } else if (
            value === 'boolean' &&
            cells.value !== 'true' &&
            cells.value !== 'false'
          ) {
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
