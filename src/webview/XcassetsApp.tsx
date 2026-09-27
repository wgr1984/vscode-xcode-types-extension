import { useEffect, useState, type DragEvent } from 'react'
import type {
  HostToWeb,
  Rgba,
  SlotView,
  WebToHost,
  XcassetsViewModel,
} from './xcassetsTypes'

declare function acquireVsCodeApi(): {
  postMessage(msg: WebToHost): void
}

const vscode = acquireVsCodeApi()

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('read failed'))
        return
      }
      const i = result.indexOf(',')
      resolve(i >= 0 ? result.slice(i + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

function Well({
  assetId,
  slot,
  kind,
}: {
  assetId: string
  slot: SlotView
  kind: string
}) {
  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const bytesBase64 = await fileToBase64(file)
    vscode.postMessage({
      type: 'drop',
      assetId,
      slotIndex: slot.index,
      fileName: file.name,
      bytesBase64,
    })
  }

  if (kind === 'colorset') {
    const rgba = slot.rgba ?? {
      red: '0',
      green: '0',
      blue: '0',
      alpha: '1',
    }
    const set = (patch: Partial<Rgba>) => {
      const next = { ...rgba, ...patch }
      vscode.postMessage({
        type: 'setColor',
        assetId,
        slotIndex: slot.index,
        rgba: next,
      })
    }
    const swatch = `rgba(${Number(rgba.red) * 255},${Number(rgba.green) * 255},${Number(rgba.blue) * 255},${rgba.alpha})`
    return (
      <div className="border border-[var(--vscode-panel-border,#555)] p-2 w-40">
        <div className="text-xs opacity-70 mb-1">{slot.label}</div>
        <div
          className="h-12 w-full mb-2 border border-black/30"
          style={{ background: swatch }}
        />
        {(['red', 'green', 'blue', 'alpha'] as const).map((k) => (
          <label key={k} className="flex gap-1 text-xs mb-1 items-center">
            <span className="w-10">{k}</span>
            <input
              className="flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1"
              value={rgba[k]}
              onChange={(e) => set({ [k]: e.target.value })}
            />
          </label>
        ))}
      </div>
    )
  }

  return (
    <div
      className="border border-dashed border-[var(--vscode-panel-border,#555)] p-2 w-36 min-h-[8rem] flex flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => void onDrop(e)}
    >
      <div className="text-xs opacity-70 mb-1">{slot.label}</div>
      {slot.previewUri ? (
        <img
          src={slot.previewUri}
          alt={slot.filename ?? ''}
          className="max-h-20 object-contain mx-auto mb-1"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs opacity-50">
          Drop file
        </div>
      )}
      <div className="text-[10px] truncate opacity-60" title={slot.filename}>
        {slot.filename ?? '(empty)'}
      </div>
      {slot.filename && (
        <button
          type="button"
          className="text-xs mt-1 underline opacity-80"
          onClick={() =>
            vscode.postMessage({
              type: 'clearSlot',
              assetId,
              slotIndex: slot.index,
            })
          }
        >
          Clear
        </button>
      )}
    </div>
  )
}

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

  const detail = model.detail

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
        <div className="flex gap-1 p-2 border-b border-[var(--vscode-panel-border,#444)]">
          <select
            id="add-kind"
            className="flex-1 text-xs bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)]"
            defaultValue="imageset"
          >
            <option value="imageset">imageset</option>
            <option value="appiconset">appiconset</option>
            <option value="colorset">colorset</option>
            <option value="dataset">dataset</option>
            <option value="launchimage">launchimage</option>
            <option value="group">group</option>
          </select>
          <button
            type="button"
            className="px-2 text-xs border border-[var(--vscode-button-border,#555)]"
            onClick={() => {
              const sel = document.getElementById(
                'add-kind',
              ) as HTMLSelectElement | null
              const kind = sel?.value ?? 'imageset'
              const name = window.prompt('Asset name (no extension)', 'NewAsset')
              if (!name) return
              const parent =
                model.assets.find((a) => a.id === model.selectionId)?.kind ===
                'group'
                  ? model.selectionId!
                  : '.'
              vscode.postMessage({
                type: 'addAsset',
                parentId: parent,
                kind,
                name,
              })
            }}
          >
            +
          </button>
        </div>
        <ul className="py-1">
          {model.assets.map((a) => (
            <li key={a.id} className="flex items-center group">
              <button
                type="button"
                className={`flex-1 text-left px-2 py-1 hover:bg-[var(--vscode-list-hoverBackground,#333)] ${
                  model.selectionId === a.id
                    ? 'bg-[var(--vscode-list-activeSelectionBackground,#094771)]'
                    : ''
                }`}
                style={{ paddingLeft: 8 + a.depth * 12 }}
                onClick={() =>
                  vscode.postMessage({ type: 'select', assetId: a.id })
                }
              >
                <span className="opacity-60 mr-1 text-[10px]">{a.kind}</span>
                {a.name.replace(/\.[^.]+$/, '')}
                {a.parseError ? ' ⚠' : ''}
              </button>
              {a.kind !== 'catalog' && (
                <button
                  type="button"
                  className="px-1 text-xs opacity-50 hover:opacity-100"
                  title="Delete"
                  onClick={() => {
                    if (window.confirm(`Delete ${a.name}?`)) {
                      vscode.postMessage({
                        type: 'deleteAsset',
                        assetId: a.id,
                      })
                    }
                  }}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 p-4 overflow-auto">
        {!model.selectionId && <p className="opacity-70">Select asset</p>}
        {detail?.kind === 'group' && (
          <p className="opacity-70">Group — select a child asset.</p>
        )}
        {detail?.unsupported && (
          <p className="opacity-70">Unsupported subtype (read-only stub).</p>
        )}
        {detail && !detail.unsupported && detail.kind !== 'group' && (
          <>
            <h2 className="text-base mb-3 font-medium">{detail.kind}</h2>
            <div className="flex flex-wrap gap-3">
              {detail.slots.map((slot) => (
                <Well
                  key={slot.index}
                  assetId={detail.id}
                  slot={slot}
                  kind={detail.kind}
                />
              ))}
            </div>
            {detail.slots.length === 0 && (
              <p className="opacity-70">No slots in Contents.json</p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
