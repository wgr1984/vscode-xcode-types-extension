import type { AssetKind } from './kinds'
import { isEditableKind } from './kinds'
import type { CatalogNode } from './walk'

export type FlatAsset = {
  id: string
  name: string
  kind: AssetKind
  depth: number
  editable: boolean
  parseError?: string
}

export type SlotInfo = {
  index: number
  label: string
  filename?: string
  locale?: string
  rgba?: { red: string; green: string; blue: string; alpha: string }
}

export function flattenAssets(
  node: CatalogNode,
  depth = 0,
  out: FlatAsset[] = [],
): FlatAsset[] {
  if (node.kind !== 'catalog') {
    out.push({
      id: node.id,
      name: node.name,
      kind: node.kind,
      depth,
      editable: isEditableKind(node.kind) && node.kind !== 'group',
      parseError: node.parseError,
    })
  }
  for (const child of node.children ?? []) {
    flattenAssets(child, node.kind === 'catalog' ? 0 : depth + 1, out)
  }
  return out
}

export function findNode(
  root: CatalogNode,
  id: string,
): CatalogNode | undefined {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const found = findNode(child, id)
    if (found) return found
  }
  return undefined
}

function appearanceLabel(slot: Record<string, unknown>): string {
  const apps = slot.appearances
  if (!Array.isArray(apps) || apps.length === 0) return 'Any'
  const first = apps[0] as { value?: string }
  return first?.value ? String(first.value) : 'Any'
}

function slotLabel(kind: AssetKind, slot: Record<string, unknown>): string {
  const parts: string[] = [appearanceLabel(slot)]
  if (typeof slot.idiom === 'string') parts.push(slot.idiom)
  if (typeof slot.scale === 'string') parts.push(slot.scale)
  if (typeof slot.size === 'string') parts.push(slot.size)
  if (typeof slot.platform === 'string') parts.push(slot.platform)
  if (typeof slot.role === 'string') parts.push(slot.role)
  if (typeof slot.orientation === 'string') parts.push(slot.orientation)
  if (kind === 'colorset') parts.push('color')
  return parts.join(' · ')
}

export function slotsFromContents(
  kind: AssetKind,
  contents: unknown,
): SlotInfo[] {
  if (!contents || typeof contents !== 'object') return []
  const root = contents as Record<string, unknown>
  let key: 'images' | 'colors' | 'data' | undefined
  if (kind === 'imageset' || kind === 'appiconset' || kind === 'launchimage') {
    key = 'images'
  } else if (kind === 'colorset') key = 'colors'
  else if (kind === 'dataset') key = 'data'
  if (!key) return []
  const arr = root[key]
  if (!Array.isArray(arr)) return []
  return arr.map((item, index) => {
    const slot = (item && typeof item === 'object'
      ? item
      : {}) as Record<string, unknown>
    const info: SlotInfo = {
      index,
      label: slotLabel(kind, slot),
      filename: typeof slot.filename === 'string' ? slot.filename : undefined,
      locale: typeof slot.locale === 'string' ? slot.locale : undefined,
    }
    if (kind === 'colorset') {
      const color = slot.color as Record<string, unknown> | undefined
      const components = color?.components as Record<string, string> | undefined
      if (components) {
        info.rgba = {
          red: String(components.red ?? '0'),
          green: String(components.green ?? '0'),
          blue: String(components.blue ?? '0'),
          alpha: String(components.alpha ?? '1'),
        }
      }
    }
    return info
  })
}
