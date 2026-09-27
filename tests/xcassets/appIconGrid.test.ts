import { describe, expect, it } from 'vitest'
import {
  applyAppIconGrid,
  inferAppIconGrid,
} from '../../src/xcassets/appIconGrid'

describe('appIconGrid', () => {
  it('builds single-size ios with dark+tinted', () => {
    const next = applyAppIconGrid(
      { images: [], info: { version: 1 } },
      {
        ios: 'single',
        macos: 'none',
        watchos: 'none',
        appearances: 'any-dark-tinted',
        gamut: 'any',
      },
    ) as { images: { size: string; appearances?: { value: string }[] }[] }
    expect(next.images).toHaveLength(3)
    expect(next.images.every((i) => i.size === '1024x1024')).toBe(true)
    expect(inferAppIconGrid(next)).toMatchObject({
      ios: 'single',
      appearances: 'any-dark-tinted',
    })
  })

  it('builds all-sizes ios matrix and keeps filename', () => {
    const prev = {
      images: [
        {
          idiom: 'iphone',
          size: '60x60',
          scale: '2x',
          filename: 'app.png',
        },
      ],
    }
    const next = applyAppIconGrid(prev, {
      ios: 'all',
      macos: 'none',
      watchos: 'none',
      appearances: 'any',
      gamut: 'any',
    }) as { images: { filename?: string; idiom: string }[] }
    expect(next.images.length).toBeGreaterThan(10)
    const hit = next.images.find(
      (i) => i.idiom === 'iphone' && (i as { scale?: string }).scale === '2x',
    )
    // find 60x60 2x specifically
    const app = next.images.find(
      (i) =>
        (i as { size?: string }).size === '60x60' &&
        (i as { scale?: string }).scale === '2x',
    )
    expect(app?.filename).toBe('app.png')
    expect(hit).toBeTruthy()
  })

  it('infers macos from mac idiom', () => {
    const g = inferAppIconGrid({
      images: [{ idiom: 'mac', size: '16x16', scale: '1x' }],
    })
    expect(g.macos).toBe('all')
    expect(g.ios).toBe('none')
  })
})
