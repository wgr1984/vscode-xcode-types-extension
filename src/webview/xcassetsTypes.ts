export type Rgba = { red: string; green: string; blue: string; alpha: string }

export type SlotView = {
  index: number
  label: string
  filename?: string
  previewUri?: string
  /** colorset only */
  rgba?: Rgba
}

export type FlatAsset = {
  id: string
  name: string
  kind: string
  depth: number
  editable: boolean
  parseError?: string
}

export type AssetDetail = {
  id: string
  kind: string
  slots: SlotView[]
  unsupported?: boolean
}

export type XcassetsViewModel = {
  rootPath: string
  assets: FlatAsset[]
  selectionId?: string
  detail?: AssetDetail
  banner?: { level: 'error' | 'info'; text: string }
}

export type HostToWeb =
  | { type: 'init' | 'update'; model: XcassetsViewModel }

export type WebToHost =
  | { type: 'ready' }
  | { type: 'select'; assetId: string }
  | { type: 'clearSlot'; assetId: string; slotIndex: number }
  | { type: 'setColor'; assetId: string; slotIndex: number; rgba: Rgba }
  | {
      type: 'drop'
      assetId: string
      slotIndex: number
      fileName: string
      bytesBase64: string
    }
  | { type: 'addAsset'; parentId: string; kind: string; name: string }
  | { type: 'deleteAsset'; assetId: string }
