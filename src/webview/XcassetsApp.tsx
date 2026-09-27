import { useEffect, useState } from 'react'
import type { HostToWeb, WebToHost, XcassetsViewModel } from './xcassetsTypes'

declare function acquireVsCodeApi(): {
  postMessage(msg: WebToHost): void
}

const vscode = acquireVsCodeApi()

export function XcassetsApp() {
  const [model, setModel] = useState<XcassetsViewModel | null>(null)

  useEffect(() => {
    const onMsg = (e: MessageEvent<HostToWeb>) => {
      if (e.data?.type === 'init' || e.data?.type === 'update') {
        setModel(e.data.model)
      }
    }
    window.addEventListener('message', onMsg)
    vscode.postMessage({ type: 'ready' })
    return () => window.removeEventListener('message', onMsg)
  }, [])

  if (!model) {
    return <div className="p-3 text-sm opacity-70">Loading catalog…</div>
  }

  return (
    <div className="flex h-screen text-sm">
      <aside className="w-56 shrink-0 border-r border-[var(--vscode-panel-border,#444)] overflow-auto">
        {model.banner && (
          <div
            className={
              model.banner.level === 'error'
                ? 'p-2 bg-red-900/40 text-red-100'
                : 'p-2 bg-blue-900/40 text-blue-100'
            }
          >
            {model.banner.text}
          </div>
        )}
        <ul className="py-1">
          {model.assets.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className={`w-full text-left px-2 py-1 hover:bg-[var(--vscode-list-hoverBackground,#333)] ${
                  model.selectionId === a.id
                    ? 'bg-[var(--vscode-list-activeSelectionBackground,#094771)]'
                    : ''
                }`}
                style={{ paddingLeft: 8 + a.depth * 12 }}
                onClick={() => vscode.postMessage({ type: 'select', assetId: a.id })}
              >
                <span className="opacity-60 mr-1">{a.kind}</span>
                {a.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 p-4 overflow-auto">
        {!model.selectionId && <p className="opacity-70">Select asset</p>}
        {model.detail?.unsupported && (
          <p className="opacity-70">Unsupported subtype (stub).</p>
        )}
        {model.detail && !model.detail.unsupported && (
          <p className="opacity-70">
            {model.detail.kind} — {model.detail.slots.length} slot(s)
          </p>
        )}
      </main>
    </div>
  )
}
