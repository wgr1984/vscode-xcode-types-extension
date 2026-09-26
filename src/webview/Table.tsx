import type { Column, Row } from '../adapters/types'

type Props = {
  columns: Column[]
  rows: Row[]
  disabled?: boolean
  onChange: (rows: Row[]) => void
  onEditingChange?: (editing: boolean) => void
}

/** True only when child is under parent path. Empty parent → no descendants (avoids wipe). */
function isDescendant(childPath: string, parentPath: string): boolean {
  if (!parentPath) return false
  return (
    childPath.startsWith(parentPath + '.') ||
    childPath.startsWith(parentPath + '[')
  )
}

function nextArrayIndex(rows: Row[], parentPath: string): number {
  const prefix = parentPath + '['
  let max = -1
  for (const r of rows) {
    const p = r.cells.path ?? ''
    if (!p.startsWith(prefix)) continue
    const rest = p.slice(prefix.length)
    const close = rest.indexOf(']')
    if (close < 0) continue
    const n = Number(rest.slice(0, close))
    if (Number.isInteger(n) && n > max) max = n
  }
  return max + 1
}

function nextDictKey(rows: Row[], parentPath: string): string {
  let n = 0
  for (;;) {
    const key = n === 0 ? 'key' : `key${n}`
    const childPath = parentPath ? `${parentPath}.${key}` : key
    if (!rows.some((r) => r.cells.path === childPath)) return key
    n++
  }
}

export function Table({
  columns,
  rows,
  disabled,
  onChange,
  onEditingChange,
}: Props) {
  const hasTypeCol = columns.some((c) => c.key === 'type')

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
    if (hasTypeCol) cells.type = 'string'
    onChange([...rows, { id: `new-${Date.now()}`, cells }])
  }

  const addChild = (parent: Row) => {
    const path = parent.cells.path ?? ''
    if (!path) return
    const type = parent.cells.type ?? ''
    let childPath: string
    if (type === 'array') {
      childPath = `${path}[${nextArrayIndex(rows, path)}]`
    } else if (type === 'dictionary') {
      childPath = `${path}.${nextDictKey(rows, path)}`
    } else {
      return
    }
    const cells: Record<string, string> = { path: childPath, value: '' }
    if (hasTypeCol) cells.type = 'string'
    const idx = rows.findIndex((r) => r.id === parent.id)
    let insertAt = idx + 1
    while (
      insertAt < rows.length &&
      isDescendant(rows[insertAt].cells.path ?? '', path)
    ) {
      insertAt++
    }
    const next = [...rows]
    next.splice(insertAt, 0, { id: `new-${Date.now()}`, cells })
    onChange(next)
  }

  const deleteRow = (rowId: string) => {
    const target = rows.find((r) => r.id === rowId)
    const path = target?.cells.path ?? ''
    let next = rows.filter(
      (r) => r.id !== rowId && !isDescendant(r.cells.path ?? '', path),
    )
    const slot = path.match(/^(.*)\[(\d+)\]$/)
    if (slot) {
      const parent = slot[1]
      const deleted = Number(slot[2])
      const prefix = parent + '['
      next = next.map((r) => {
        const p = r.cells.path ?? ''
        if (!p.startsWith(prefix)) return r
        const rest = p.slice(prefix.length)
        const close = rest.indexOf(']')
        if (close < 0) return r
        const n = Number(rest.slice(0, close))
        if (!Number.isInteger(n) || n <= deleted) return r
        const suffix = rest.slice(close + 1)
        return {
          ...r,
          cells: { ...r.cells, path: `${parent}[${n - 1}]${suffix}` },
        }
      })
    }
    onChange(next)
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
    <div
      className="p-3"
      onFocus={() => onEditingChange?.(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onEditingChange?.(false)
        }
      }}
    >
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
            <th className="border-b border-[var(--vscode-panel-border)] px-2 py-1 w-28">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const type = row.cells.type ?? ''
            const canAddChild =
              hasTypeCol &&
              (type === 'array' || type === 'dictionary') &&
              Boolean(row.cells.path)
            return (
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
                  <div className="flex gap-2">
                    {canAddChild && (
                      <button
                        type="button"
                        disabled={disabled}
                        className="text-[var(--vscode-textLink-foreground)] disabled:opacity-50"
                        onClick={() => addChild(row)}
                      >
                        + child
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={disabled}
                      className="text-[var(--vscode-errorForeground)] disabled:opacity-50"
                      onClick={() => deleteRow(row.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
