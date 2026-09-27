import { describe, expect, it } from 'vitest'

/** Mirrors resolveCatalogUri path walk (no vscode import). */
function walkToCatalog(path: string): string | undefined {
  let cur = path.replace(/\/$/, '')
  for (let i = 0; i < 12; i++) {
    const name = cur.split('/').pop() ?? ''
    if (name.endsWith('.xcassets')) return cur
    const idx = cur.lastIndexOf('/')
    if (idx <= 0) break
    cur = cur.slice(0, idx)
  }
  return undefined
}

describe('catalog path walk', () => {
  it('finds catalog from nested Contents.json', () => {
    expect(
      walkToCatalog('/proj/samples/demo.xcassets/AccentColor.colorset/Contents.json'),
    ).toBe('/proj/samples/demo.xcassets')
    expect(walkToCatalog('/proj/samples/demo.xcassets')).toBe(
      '/proj/samples/demo.xcassets',
    )
    expect(walkToCatalog('/proj/samples')).toBeUndefined()
  })
})
