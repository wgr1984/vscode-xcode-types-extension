export type AssetKind =
  | 'catalog'
  | 'group'
  | 'imageset'
  | 'appiconset'
  | 'colorset'
  | 'dataset'
  | 'launchimage'
  | 'exotic'

const EXT: Record<string, AssetKind> = {
  xcassets: 'catalog',
  imageset: 'imageset',
  appiconset: 'appiconset',
  colorset: 'colorset',
  dataset: 'dataset',
  launchimage: 'launchimage',
}

export function kindFromFolderName(name: string): AssetKind {
  const i = name.lastIndexOf('.')
  if (i < 0) return 'group'
  const ext = name.slice(i + 1).toLowerCase()
  return EXT[ext] ?? 'exotic'
}

export function isEditableKind(kind: AssetKind): boolean {
  return (
    kind === 'imageset' ||
    kind === 'appiconset' ||
    kind === 'colorset' ||
    kind === 'dataset' ||
    kind === 'launchimage' ||
    kind === 'group'
  )
}
