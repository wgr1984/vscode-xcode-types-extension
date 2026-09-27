import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { walkCatalogFromPaths } from '../../src/xcassets/walk'

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../samples/demo.xcassets',
)

describe('walkCatalogFromPaths', () => {
  it('finds editable + exotic + group', async () => {
    const tree = await walkCatalogFromPaths(root, {
      readDir: (p) => fs.readdir(p, { withFileTypes: true }),
      readText: (p) => fs.readFile(p, 'utf8'),
    })
    expect(tree.kind).toBe('catalog')
    const names = (tree.children ?? []).map((c) => c.name).sort()
    expect(names).toContain('LaunchIcon.imageset')
    expect(names).toContain('Mark.symbolset')
    expect(names).toContain('Grouped')
    const exotic = (tree.children ?? []).find((c) => c.name === 'Mark.symbolset')
    expect(exotic?.kind).toBe('exotic')
    const group = (tree.children ?? []).find((c) => c.name === 'Grouped')
    expect(group?.kind).toBe('group')
    expect((group?.children ?? []).some((c) => c.name === 'Nested.imageset')).toBe(
      true,
    )
  })
})
