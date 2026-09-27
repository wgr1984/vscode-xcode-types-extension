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
  | {
      key: string
      label: string
      type: 'string'
      value: string
      placeholder?: string
      /** Filename suggestions from asset folder */
      suggestions?: string[]
    }

export type ImageGridView = {
  devices: string[]
  appearances: 'any' | 'any-dark' | 'light-dark'
  highContrast: boolean
  individualScales: boolean
  gamut: 'any' | 'both'
  direction: 'fixed' | 'both'
  widthClass: boolean
  heightClass: boolean
  memory: string[]
  graphics: string[]
}

export type AppIconGridView = {
  ios: 'none' | 'single' | 'all'
  macos: 'none' | 'all'
  watchos: 'none' | 'all'
  appearances: 'any' | 'any-dark' | 'any-dark-tinted'
  gamut: 'any' | 'both'
}

export type AssetDetail = {
  id: string
  kind: string
  slots: SlotView[]
  unsupported?: boolean
  properties?: PropertyFieldView[]
  /** imageset / colorset grid inspector */
  grid?: ImageGridView
  gridKind?: 'imageset' | 'colorset'
  appIconGrid?: AppIconGridView
  selectedSlotIndex?: number
  slotProperties?: PropertyFieldView[]
  /** Non-Contents.json files in the selected asset folder */
  folderFiles?: string[]
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
  | { type: 'selectSlot'; assetId: string; slotIndex: number | undefined }
  | { type: 'clearSlot'; assetId: string; slotIndex: number }
  | { type: 'setColor'; assetId: string; slotIndex: number; rgba: Rgba }
  | {
      type: 'drop'
      assetId: string
      slotIndex: number
      fileName: string
      bytesBase64: string
    }
  | { type: 'addAsset'; parentId: string; kind: string; name?: string }
  | { type: 'deleteAsset'; assetId: string }
  | {
      type: 'setProperty'
      assetId: string
      key: string
      value: boolean | string
    }
  | {
      type: 'setGrid'
      assetId: string
      grid: ImageGridView
    }
  | {
      type: 'setAppIconGrid'
      assetId: string
      grid: AppIconGridView
    }
  | {
      type: 'setSlotProperty'
      assetId: string
      slotIndex: number
      key: string
      value: boolean | string
    }
