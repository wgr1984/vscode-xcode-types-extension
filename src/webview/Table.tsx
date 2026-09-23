import type { Column, Row } from '../adapters/types'

type Props = {
  columns: Column[]
  rows: Row[]
  disabled?: boolean
  onChange: (rows: Row[]) => void
}

export function Table({ columns, rows, disabled, onChange }: Props) {
  const updateCell = (rowId: string, key: string, value: string) => {
    onChange(
      rows.map((r) =>
        r.id === rowId ? { ...r, cells: { ...r.cells, [key]: value } } : r,
      ),
    )
  }

  const addRow = () => {
    const cells: Record<string, string> = {}
    for (const c of columns) cells[c.key] = ''
    onChange([...rows, { id: `new-${Date.now()}`, cells }])
  }

  const deleteRow = (rowId: string) => {
    onChange(rows.filter((r) => r.id !== rowId))
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
                  <input
                    className="w-full bg-transparent px-1 py-0.5 outline-none focus:bg-[var(--vscode-input-background)]"
                    disabled={disabled || c.editable === false}
                    value={row.cells[c.key] ?? ''}
                    onChange={(e) => updateCell(row.id, c.key, e.target.value)}
                  />
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
