import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { walkCatalogUri, type WalkFs } from '../../src/xcassets/walk'

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../samples/demo.xcassets',
)

function nodeWalkFs(): WalkFs {
  return {
    async readDirectory(uriPath) {
      const ents = await fs.readdir(uriPath, { withFileTypes: true })
      return ents.map((e) => [e.name, e.isDirectory() ? 'dir' : 'file'])
    },
    async readFile(uriPath) {
      return new TextEncoder().encode(await fs.readFile(uriPath, 'utf8'))
    },
  }
}

describe('walkCatalogUri', () => {
  it('finds editable + exotic + group', async () => {
    const tree = await walkCatalogUri(
      root,
      path.basename(root),
      nodeWalkFs(),
    )
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
