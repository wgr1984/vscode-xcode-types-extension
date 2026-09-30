import { describe, expect, it } from 'vitest'
import {
  setColorComponents,
  setDataSlotFilename,
  setImageSlotFilename,
} from '../../src/xcassets/mutations'

describe('mutations', () => {
  it('sets and clears image filename without changing length', () => {
    const base = {
      images: [{ idiom: 'universal', scale: '1x' }, { scale: '2x' }],
      info: { version: 1 },
    }
    const withFile = setImageSlotFilename(base, 0, 'a.png') as {
      images: { filename?: string }[]
    }
    expect(withFile.images).toHaveLength(2)
    expect(withFile.images[0].filename).toBe('a.png')
    const cleared = setImageSlotFilename(withFile, 0, undefined) as {
      images: { filename?: string }[]
    }
    expect(cleared.images[0].filename).toBeUndefined()
    expect(cleared.images).toHaveLength(2)
  })

  it('sets color components', () => {
    const base = {
      colors: [{ idiom: 'universal', color: { 'color-space': 'srgb' } }],
    }
    const next = setColorComponents(base, 0, {
      red: '0.1',
      green: '0.2',
      blue: '0.3',
      alpha: '1.000',
    }) as {
      colors: { color: { components: Record<string, string> } }[]
    }
    expect(next.colors[0].color.components).toEqual({
      red: '0.1',
      green: '0.2',
      blue: '0.3',
      alpha: '1.000',
    })
  })

  it('sets data filename', () => {
    const base = { data: [{ idiom: 'universal' }] }
    const next = setDataSlotFilename(base, 0, 'blob.bin') as {
      data: { filename?: string }[]
    }
    expect(next.data[0].filename).toBe('blob.bin')
  })
})
