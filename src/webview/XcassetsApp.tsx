import { useEffect, useState, type DragEvent } from 'react'
import { hexToRgba, rgbaCss, rgbaToHex } from './colorRgba'
import type {
  AppIconGridView,
  HostToWeb,
  ImageGridView,
  PropertyFieldView,
  Rgba,
  SlotView,
  WebToHost,
  XcassetsViewModel,
} from './xcassetsTypes'

declare function acquireVsCodeApi(): {
  postMessage(msg: WebToHost): void
}

const vscode = acquireVsCodeApi()

const FALLBACK_RGBA: Rgba = {
  red: '0.000',
  green: '0.000',
  blue: '0.000',
  alpha: '1.000',
}

const DEVICE_OPTIONS = [
  { id: 'universal', label: 'Universal' },
  { id: 'iphone', label: 'iPhone' },
  { id: 'ipad', label: 'iPad' },
  { id: 'mac-catalyst', label: 'Mac Catalyst' },
  { id: 'car', label: 'CarPlay' },
  { id: 'mac', label: 'Mac' },
  { id: 'vision', label: 'Apple Vision' },
  { id: 'watch', label: 'Apple Watch' },
  { id: 'tv', label: 'Apple TV' },
] as const

const MEMORY_OPTIONS = ['1GB', '2GB', '3GB', '4GB']
const GRAPHICS_OPTIONS = [
  'metal1v2',
  'metal1v3',
  'metal2v2',
  'metal2v3',
  'metal3v1',
  'metal3v2',
  'metal4v1',
]

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

function StringField({
  field,
  onCommit,
}: {
  field: Extract<PropertyFieldView, { type: 'string' }>
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(field.value)
  const listId = `sug-${field.key}`
  const suggestions = field.suggestions ?? []
  useEffect(() => {
    setDraft(field.value)
  }, [field.key, field.value])
  return (
    <label className="flex items-center gap-2 text-xs min-w-0">
      <span className="shrink-0 w-28 opacity-80">{field.label}</span>
      <input
        className="min-w-0 flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1"
        value={draft}
        placeholder={field.placeholder}
        list={suggestions.length > 0 ? listId : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== field.value) onCommit(draft)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (draft !== field.value) onCommit(draft)
          }
        }}
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </label>
  )
}

function FieldControls({
  fields,
  onChange,
}: {
  fields: PropertyFieldView[]
  onChange: (key: string, value: boolean | string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {fields.map((f) =>
        f.type === 'boolean' ? (
          <label key={f.key} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={f.value}
              onChange={(e) => onChange(f.key, e.target.checked)}
            />
            <span>{f.label}</span>
          </label>
        ) : f.type === 'string' ? (
          <StringField
            key={f.key}
            field={f}
            onCommit={(value) => onChange(f.key, value)}
          />
        ) : (
          <label key={f.key} className="flex items-center gap-2 text-xs min-w-0">
            <span className="shrink-0 w-28 opacity-80">{f.label}</span>
            <select
              className="min-w-0 flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1"
              value={f.value}
              onChange={(e) => onChange(f.key, e.target.value)}
            >
              {f.options.map((o) => (
                <option key={o.value || 'default'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ),
      )}
    </div>
  )
}

function PropertiesPanel({
  assetId,
  fields,
}: {
  assetId: string
  fields: PropertyFieldView[]
}) {
  return (
    <section className="mb-4 p-3 border border-[var(--vscode-panel-border,#555)] rounded-sm max-w-lg">
      <h3 className="text-xs font-medium opacity-80 mb-2">Properties</h3>
      <FieldControls
        fields={fields}
        onChange={(key, value) =>
          vscode.postMessage({ type: 'setProperty', assetId, key, value })
        }
      />
    </section>
  )
}

function SlotPropertiesPanel({
  assetId,
  slotIndex,
  fields,
}: {
  assetId: string
  slotIndex: number
  fields: PropertyFieldView[]
}) {
  return (
    <section className="mb-4 p-3 border border-[var(--vscode-focusBorder,#007fd4)] rounded-sm max-w-lg">
      <h3 className="text-xs font-medium opacity-80 mb-2">
        Image slot #{slotIndex}
      </h3>
      <FieldControls
        fields={fields}
        onChange={(key, value) =>
          vscode.postMessage({
            type: 'setSlotProperty',
            assetId,
            slotIndex,
            key,
            value,
          })
        }
      />
    </section>
  )
}

function toggleList(list: string[], id: string, on: boolean): string[] {
  if (on) return list.includes(id) ? list : [...list, id]
  return list.filter((x) => x !== id)
}

function AppIconGridPanel({
  assetId,
  grid,
}: {
  assetId: string
  grid: AppIconGridView
}) {
  const push = (next: AppIconGridView) =>
    vscode.postMessage({ type: 'setAppIconGrid', assetId, grid: next })

  return (
    <section className="mb-4 p-3 border border-[var(--vscode-panel-border,#555)] rounded-sm max-w-lg space-y-3">
      <h3 className="text-xs font-medium opacity-80">App Icon</h3>
      <label className="flex items-center gap-2 text-xs min-w-0">
        <span className="w-28 shrink-0 opacity-80">iOS</span>
        <select
          className="min-w-0 flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1"
          value={grid.ios}
          onChange={(e) =>
            push({ ...grid, ios: e.target.value as AppIconGridView['ios'] })
          }
        >
          <option value="none">None</option>
          <option value="single">Single Size</option>
          <option value="all">All Sizes (Xcode 13)</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs min-w-0">
        <span className="w-28 shrink-0 opacity-80">macOS</span>
        <select
          className="min-w-0 flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1"
          value={grid.macos}
          onChange={(e) =>
            push({
              ...grid,
              macos: e.target.value as AppIconGridView['macos'],
            })
          }
        >
          <option value="none">None</option>
          <option value="all">All Sizes</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs min-w-0">
        <span className="w-28 shrink-0 opacity-80">watchOS</span>
        <select
          className="min-w-0 flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1"
          value={grid.watchos}
          onChange={(e) =>
            push({
              ...grid,
              watchos: e.target.value as AppIconGridView['watchos'],
            })
          }
        >
          <option value="none">None</option>
          <option value="all">All Sizes</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs min-w-0">
        <span className="w-28 shrink-0 opacity-80">Appearances</span>
        <select
          className="min-w-0 flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1"
          value={grid.appearances}
          onChange={(e) =>
            push({
              ...grid,
              appearances: e.target.value as AppIconGridView['appearances'],
            })
          }
        >
          <option value="any">None</option>
          <option value="any-dark">Any, Dark</option>
          <option value="any-dark-tinted">Any, Dark, Tinted</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs min-w-0">
        <span className="w-28 shrink-0 opacity-80">Gamut</span>
        <select
          className="min-w-0 flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1"
          value={grid.gamut}
          onChange={(e) =>
            push({
              ...grid,
              gamut: e.target.value as AppIconGridView['gamut'],
            })
          }
        >
          <option value="any">Any</option>
          <option value="both">sRGB and Display P3</option>
        </select>
      </label>
    </section>
  )
}

function GridPanel({
  assetId,
  grid,
  mode,
}: {
  assetId: string
  grid: ImageGridView
  mode: 'imageset' | 'colorset'
}) {
  const push = (next: ImageGridView) =>
    vscode.postMessage({ type: 'setGrid', assetId, grid: next })
  const imageOnly = mode === 'imageset'

  return (
    <section className="mb-4 p-3 border border-[var(--vscode-panel-border,#555)] rounded-sm max-w-lg space-y-3">
      <h3 className="text-xs font-medium opacity-80">Devices & variants</h3>
      <div>
        <div className="text-[10px] uppercase opacity-60 mb-1">Devices</div>
        <div className="flex flex-col gap-1">
          {DEVICE_OPTIONS.map((d) => (
            <label key={d.id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={grid.devices.includes(d.id)}
                onChange={(e) =>
                  push({
                    ...grid,
                    devices: toggleList(grid.devices, d.id, e.target.checked),
                  })
                }
              />
              {d.label}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs min-w-0">
        <span className="w-28 shrink-0 opacity-80">Appearances</span>
        <select
          className="min-w-0 flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1"
          value={grid.appearances}
          onChange={(e) =>
            push({
              ...grid,
              appearances: e.target.value as ImageGridView['appearances'],
            })
          }
        >
          <option value="any">None</option>
          <option value="any-dark">Any, Dark</option>
          <option value="light-dark">Any, Light and Dark</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={grid.highContrast}
          onChange={(e) => push({ ...grid, highContrast: e.target.checked })}
        />
        High Contrast
      </label>
      {imageOnly && (
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={grid.individualScales}
            onChange={(e) =>
              push({ ...grid, individualScales: e.target.checked })
            }
          />
          Individual Scales
        </label>
      )}
      <label className="flex items-center gap-2 text-xs min-w-0">
        <span className="w-28 shrink-0 opacity-80">Gamut</span>
        <select
          className="min-w-0 flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1"
          value={grid.gamut}
          onChange={(e) =>
            push({ ...grid, gamut: e.target.value as ImageGridView['gamut'] })
          }
        >
          <option value="any">Any</option>
          <option value="both">sRGB and Display P3</option>
        </select>
      </label>
      {imageOnly && (
        <>
          <label className="flex items-center gap-2 text-xs min-w-0">
            <span className="w-28 shrink-0 opacity-80">Direction</span>
            <select
              className="min-w-0 flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1"
              value={grid.direction}
              onChange={(e) =>
                push({
                  ...grid,
                  direction: e.target.value as ImageGridView['direction'],
                })
              }
            >
              <option value="fixed">Fixed</option>
              <option value="both">Left and Right</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={grid.widthClass}
              onChange={(e) => push({ ...grid, widthClass: e.target.checked })}
            />
            Width Class (compact / regular)
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={grid.heightClass}
              onChange={(e) => push({ ...grid, heightClass: e.target.checked })}
            />
            Height Class (compact / regular)
          </label>
          <div>
            <div className="text-[10px] uppercase opacity-60 mb-1">Memory</div>
            <div className="flex flex-wrap gap-2">
              {MEMORY_OPTIONS.map((m) => (
                <label key={m} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={grid.memory.includes(m)}
                    onChange={(e) =>
                      push({
                        ...grid,
                        memory: toggleList(grid.memory, m, e.target.checked),
                      })
                    }
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 mb-1">Graphics</div>
            <div className="flex flex-wrap gap-2">
              {GRAPHICS_OPTIONS.map((g) => (
                <label key={g} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={grid.graphics.includes(g)}
                    onChange={(e) =>
                      push({
                        ...grid,
                        graphics: toggleList(grid.graphics, g, e.target.checked),
                      })
                    }
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function ColorWell({
  assetId,
  slot,
  selected,
}: {
  assetId: string
  slot: SlotView
  selected?: boolean
}) {
  const remote = slot.rgba ?? FALLBACK_RGBA
  const [rgba, setRgba] = useState(remote)
  const [hexDraft, setHexDraft] = useState(() => rgbaToHex(remote))

  useEffect(() => {
    setRgba(remote)
    setHexDraft(rgbaToHex(remote))
  }, [assetId, slot.index, remote.red, remote.green, remote.blue, remote.alpha])

  const commit = (next: Rgba) => {
    setRgba(next)
    setHexDraft(rgbaToHex(next))
    vscode.postMessage({
      type: 'setColor',
      assetId,
      slotIndex: slot.index,
      rgba: next,
    })
  }

  const applyHex = () => {
    const parsed = hexToRgba(hexDraft, rgba.alpha)
    if (!parsed) {
      setHexDraft(rgbaToHex(rgba))
      return
    }
    commit(parsed)
  }

  return (
    <div
      className={`border p-2 w-44 box-border overflow-hidden cursor-pointer ${
        selected
          ? 'border-[var(--vscode-focusBorder,#007fd4)]'
          : 'border-[var(--vscode-panel-border,#555)]'
      }`}
      onClick={() =>
        vscode.postMessage({
          type: 'selectSlot',
          assetId,
          slotIndex: slot.index,
        })
      }
    >
      <div className="text-xs opacity-70 mb-2 truncate" title={slot.label}>
        {slot.label}
      </div>
      <div className="flex gap-2 items-center mb-2 min-w-0">
        <input
          type="color"
          className="h-9 w-9 shrink-0 cursor-pointer bg-transparent border-0 p-0"
          value={rgbaToHex(rgba)}
          onChange={(e) => {
            const parsed = hexToRgba(e.target.value, rgba.alpha)
            if (parsed) commit(parsed)
          }}
          title="Pick color"
        />
        <div
          className="h-9 min-w-0 flex-1 rounded-sm border border-black/30"
          style={{ background: rgbaCss(rgba) }}
        />
      </div>
      <label className="flex gap-1 text-xs mb-1 items-center min-w-0">
        <span className="w-8 shrink-0">hex</span>
        <input
          className="min-w-0 w-0 flex-1 font-mono bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1 box-border"
          value={hexDraft}
          spellCheck={false}
          onChange={(e) => setHexDraft(e.target.value)}
          onBlur={applyHex}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              applyHex()
            }
          }}
        />
      </label>
      <label className="flex gap-1 text-xs items-center min-w-0">
        <span className="w-8 shrink-0">alpha</span>
        <input
          className="min-w-0 w-0 flex-1 bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)] px-1 box-border"
          value={rgba.alpha}
          onChange={(e) => setRgba({ ...rgba, alpha: e.target.value })}
          onBlur={() => {
            const a = Number(rgba.alpha)
            const alpha = Number.isFinite(a)
              ? Math.min(1, Math.max(0, a)).toFixed(3)
              : '1.000'
            commit({ ...rgba, alpha })
          }}
        />
      </label>
    </div>
  )
}

function Well({
  assetId,
  slot,
  kind,
  selected,
}: {
  assetId: string
  slot: SlotView
  kind: string
  selected?: boolean
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
    return <ColorWell assetId={assetId} slot={slot} selected={selected} />
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`border border-dashed p-2 w-36 min-h-[8rem] flex flex-col cursor-pointer ${
        selected
          ? 'border-[var(--vscode-focusBorder,#007fd4)]'
          : 'border-[var(--vscode-panel-border,#555)]'
      }`}
      onClick={() =>
        vscode.postMessage({
          type: 'selectSlot',
          assetId,
          slotIndex: slot.index,
        })
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          vscode.postMessage({
            type: 'selectSlot',
            assetId,
            slotIndex: slot.index,
          })
        }
      }}
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
          onClick={(e) => {
            e.stopPropagation()
            vscode.postMessage({
              type: 'clearSlot',
              assetId,
              slotIndex: slot.index,
            })
          }}
        >
          Clear
        </button>
      )}
    </div>
  )
}

export function XcassetsApp() {
  const [model, setModel] = useState<XcassetsViewModel | null>(null)
  const [addKind, setAddKind] = useState('imageset')

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
            className="flex-1 text-xs bg-[var(--vscode-input-background,#1e1e1e)] border border-[var(--vscode-input-border,#555)]"
            value={addKind}
            onChange={(e) => setAddKind(e.target.value)}
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
            title="Add asset (name via VS Code input)"
            onClick={() => {
              const parent =
                model.assets.find((a) => a.id === model.selectionId)?.kind ===
                'group'
                  ? model.selectionId!
                  : '.'
              vscode.postMessage({
                type: 'addAsset',
                parentId: parent,
                kind: addKind,
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
          <>
            <p className="opacity-70 mb-3">Group — select a child asset.</p>
            {detail.properties && detail.properties.length > 0 && (
              <PropertiesPanel assetId={detail.id} fields={detail.properties} />
            )}
          </>
        )}
        {detail?.unsupported && (
          <p className="opacity-70">Unsupported subtype (read-only stub).</p>
        )}
        {detail && !detail.unsupported && detail.kind !== 'group' && (
          <>
            <h2 className="text-base mb-3 font-medium">{detail.kind}</h2>
            {detail.properties && detail.properties.length > 0 && (
              <PropertiesPanel assetId={detail.id} fields={detail.properties} />
            )}
            {detail.appIconGrid && (
              <AppIconGridPanel
                assetId={detail.id}
                grid={detail.appIconGrid}
              />
            )}
            {detail.grid && detail.gridKind && (
              <GridPanel
                assetId={detail.id}
                grid={detail.grid}
                mode={detail.gridKind}
              />
            )}
            {detail.slotProperties &&
              detail.selectedSlotIndex !== undefined && (
                <SlotPropertiesPanel
                  assetId={detail.id}
                  slotIndex={detail.selectedSlotIndex}
                  fields={detail.slotProperties}
                />
              )}
            <div className="flex flex-wrap gap-3">
              {detail.slots.map((slot) => (
                <Well
                  key={slot.index}
                  assetId={detail.id}
                  slot={slot}
                  kind={detail.kind}
                  selected={detail.selectedSlotIndex === slot.index}
                />
              ))}
            </div>
            {detail.slots.length === 0 && (
              <p className="opacity-70">No slots in Contents.json</p>
            )}
            {(detail.kind === 'imageset' ||
              detail.kind === 'colorset' ||
              detail.kind === 'appiconset') && (
              <p className="text-[10px] opacity-50 mt-3">
                Click a well to edit that slot. Grid toggles reshape all wells.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
