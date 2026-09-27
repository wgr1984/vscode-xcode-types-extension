import { useEffect, useRef, useState } from 'react'
import type { Row, TableModel } from '../adapters/types'
import { RawEditor } from './RawEditor'
import { Table } from './Table'

const vscodeApi = acquireVsCodeApi()

type HostMsg =
  | { type: 'init'; model: TableModel; text: string; languageId: string }
  | { type: 'update'; model: TableModel; text: string; languageId: string }

type Mode = 'table' | 'raw'

export function App() {
  const [model, setModel] = useState<TableModel | null>(null)
  const [text, setText] = useState('')
  const [languageId, setLanguageId] = useState('plaintext')
  const [mode, setMode] = useState<Mode>('table')
  const editingRef = useRef(false)

  useEffect(() => {
    const handler = (event: MessageEvent<HostMsg>) => {
      const msg = event.data
      // keep local order/focus while typing in a cell
      if (msg.type === 'update' && editingRef.current) return
      if (msg.type === 'init' || msg.type === 'update') {
        setModel(msg.model)
        setText(msg.text)
        setLanguageId(msg.languageId)
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

  const onRawChange = (next: string) => {
    setText(next)
    vscodeApi.postMessage({ type: 'editRaw', text: next })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 gap-2 px-3 py-2 border-b border-[var(--vscode-panel-border)]">
        <button
          type="button"
          className={`px-2 py-0.5 ${mode === 'table' ? 'font-semibold underline' : 'opacity-70'}`}
          onClick={() => setMode('table')}
        >
          Table
        </button>
        <button
          type="button"
          className={`px-2 py-0.5 ${mode === 'raw' ? 'font-semibold underline' : 'opacity-70'}`}
          onClick={() => setMode('raw')}
        >
          Raw
        </button>
      </div>
      {model.banner && (
        <div
          className={`shrink-0 px-3 py-2 ${
            model.banner.level === 'error'
              ? 'bg-[var(--vscode-inputValidation-errorBackground)] text-[var(--vscode-errorForeground)]'
              : 'bg-[var(--vscode-inputValidation-infoBackground)]'
          }`}
        >
          {model.banner.text}
        </div>
      )}
      <div
        className={`min-h-0 flex-1 ${mode === 'table' ? 'overflow-auto' : ''}`}
      >
        {mode === 'table' ? (
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
        ) : (
          <RawEditor
            text={text}
            languageId={languageId}
            errorLines={model.issues?.map((i) => i.line)}
            onChange={onRawChange}
          />
        )}
      </div>
    </div>
  )
}
