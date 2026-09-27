import { describe, expect, it } from 'vitest'
import {
  applyImageGrid,
  inferImageGrid,
  slotIdentity,
  type ImageGridConfig,
} from '../../src/xcassets/grid'

const baseConfig = (): ImageGridConfig => ({
  devices: ['universal'],
  appearances: 'any',
  highContrast: false,
  individualScales: true,
  gamut: 'any',
  direction: 'fixed',
  widthClass: false,
  heightClass: false,
  memory: [],
  graphics: [],
})

describe('grid', () => {
  it('builds universal 1x/2x/3x', () => {
    const next = applyImageGrid({ images: [], info: { version: 1 } }, baseConfig()) as {
      images: { idiom: string; scale: string }[]
    }
    expect(next.images).toHaveLength(3)
    expect(next.images.map((i) => i.scale)).toEqual(['1x', '2x', '3x'])
  })

  it('adds dark appearance rows and keeps filenames', () => {
    const prev = {
      images: [
        { idiom: 'universal', scale: '2x', filename: 'a.png' },
        {
          idiom: 'universal',
          scale: '2x',
          appearances: [{ appearance: 'luminosity', value: 'dark' }],
          filename: 'a-dark.png',
        },
      ],
    }
    const cfg = { ...baseConfig(), appearances: 'any-dark' as const }
    const next = applyImageGrid(prev, cfg) as {
      images: { filename?: string; scale: string; appearances?: unknown }[]
    }
    expect(next.images.filter((i) => i.scale === '2x')).toHaveLength(2)
    const any2 = next.images.find((i) => i.scale === '2x' && !i.appearances)
    const dark2 = next.images.find((i) => i.scale === '2x' && i.appearances)
    expect(any2?.filename).toBe('a.png')
    expect(dark2?.filename).toBe('a-dark.png')
  })

  it('infers any-dark + individual scales', () => {
    const g = inferImageGrid({
      images: [
        { idiom: 'universal', scale: '1x' },
        {
          idiom: 'universal',
          scale: '1x',
          appearances: [{ appearance: 'luminosity', value: 'dark' }],
        },
      ],
    })
    expect(g.appearances).toBe('any-dark')
    expect(g.individualScales).toBe(true)
    expect(g.devices).toContain('universal')
  })

  it('single scale omits scale key', () => {
    const next = applyImageGrid(
      { images: [] },
      { ...baseConfig(), individualScales: false },
    ) as { images: { scale?: string }[] }
    expect(next.images).toHaveLength(1)
    expect(next.images[0].scale).toBeUndefined()
  })

  it('slotIdentity stable for dark', () => {
    const a = slotIdentity({
      idiom: 'universal',
      scale: '2x',
      appearances: [{ appearance: 'luminosity', value: 'dark' }],
    })
    const b = slotIdentity({
      scale: '2x',
      idiom: 'universal',
      appearances: [{ appearance: 'luminosity', value: 'dark' }],
    })
    expect(a).toBe(b)
  })
})
