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
  properties?: PropertyFieldView[]
}

export type PropertyFieldView =
  | {
      key: string
      label: string
      type: 'boolean'
      value: boolean
    }
  | {
      key: string
      label: string
      type: 'select'
      value: string
      options: { value: string; label: string }[]
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
  | {
      type: 'setProperty'
      assetId: string
      key: string
      value: boolean | string
    }
