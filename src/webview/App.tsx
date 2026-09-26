import { useEffect, useRef, useState } from 'react'
import type { Row, TableModel } from '../adapters/types'
import { Table } from './Table'

const vscodeApi = acquireVsCodeApi()

type HostMsg =
  | { type: 'init'; model: TableModel }
  | { type: 'update'; model: TableModel }

export function App() {
  const [model, setModel] = useState<TableModel | null>(null)
  const editingRef = useRef(false)

  useEffect(() => {
    const handler = (event: MessageEvent<HostMsg>) => {
      const msg = event.data
      // keep local order/focus while typing in a cell
      if (msg.type === 'update' && editingRef.current) return
      if (msg.type === 'init' || msg.type === 'update') {
        setModel(msg.model)
      }
    }
    window.addEventListener('message', handler)
    vscodeApi.postMessage({ type: 'ready' })
    return () => window.removeEventListener('message', handler)
  }, [])

  if (!model) {
    return <div className="p-3 opacity-70">Loading…</div>
  }

  const disabled = model.banner?.level === 'error'

  const onChange = (rows: Row[]) => {
    setModel({ ...model, rows })
    vscodeApi.postMessage({ type: 'edit', rows })
  }

  return (
    <div>
      {model.banner && (
        <div
          className={`px-3 py-2 ${
            model.banner.level === 'error'
              ? 'bg-[var(--vscode-inputValidation-errorBackground)] text-[var(--vscode-errorForeground)]'
              : 'bg-[var(--vscode-inputValidation-infoBackground)]'
          }`}
        >
          {model.banner.text}
        </div>
      )}
      <Table
        columns={model.columns}
        rows={model.rows}
        disabled={disabled}
        onChange={onChange}
        onEditingChange={(v) => {
          editingRef.current = v
          // own writes skip doc→webview; reparse once focus leaves table
          if (!v) vscodeApi.postMessage({ type: 'refresh' })
        }}
      />
    </div>
  )
}
