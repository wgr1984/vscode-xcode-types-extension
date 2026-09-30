import { describe, expect, it } from 'vitest'
import { defaultContentsJson, folderNameFor } from '../../src/xcassets/templates'

describe('templates', () => {
  it('folder names', () => {
    expect(folderNameFor('imageset', 'Foo')).toBe('Foo.imageset')
    expect(folderNameFor('group', 'Bar')).toBe('Bar')
  })

  it('imageset has three scales', () => {
    const c = defaultContentsJson('imageset') as { images: unknown[] }
    expect(c.images).toHaveLength(3)
  })
})
