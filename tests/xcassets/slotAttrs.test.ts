import { describe, expect, it } from 'vitest'
import { setSlotAttribute, slotFieldsFor } from '../../src/xcassets/slotAttrs'

describe('slotAttrs', () => {
  it('reads compression override', () => {
    const fields = slotFieldsFor(
      {
        images: [
          { idiom: 'universal', scale: '1x', 'compression-type': 'lossless' },
        ],
      },
      0,
    )
    const c = fields.find((f) => f.key === 'compression-type')
    expect(c?.type).toBe('select')
    if (c?.type === 'select') expect(c.value).toBe('lossless')
  })

  it('sets and clears slot scale', () => {
    const on = setSlotAttribute(
      { images: [{ idiom: 'universal' }] },
      0,
      'scale',
      '2x',
    ) as { images: { scale?: string }[] }
    expect(on.images[0].scale).toBe('2x')
    const off = setSlotAttribute(on, 0, 'scale', '') as {
      images: { scale?: string }[]
    }
    expect(off.images[0].scale).toBeUndefined()
  })
})
