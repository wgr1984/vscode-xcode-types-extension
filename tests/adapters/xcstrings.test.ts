import { describe, expect, it } from 'vitest'
import { xcstringsAdapter } from '../../src/adapters/xcstrings'

const sample = JSON.stringify(
  {
    sourceLanguage: 'en',
    version: '1.0',
    strings: {
      hello: {
        localizations: {
          en: { stringUnit: { state: 'translated', value: 'Hello' } },
          de: { stringUnit: { state: 'translated', value: 'Hallo' } },
        },
      },
    },
  },
  null,
  2,
)

describe('xcstringsAdapter', () => {
  it('flattens key x locale', () => {
    const model = xcstringsAdapter.parse(sample)
    expect(model.rows).toHaveLength(2)
    expect(model.rows.map((r) => r.cells.locale).sort()).toEqual(['de', 'en'])
    expect(
      model.rows.find((r) => r.cells.locale === 'en')?.cells.value,
    ).toBe('Hello')
  })

  it('round-trips values', () => {
    const out = xcstringsAdapter.serialize(xcstringsAdapter.parse(sample))
    const again = xcstringsAdapter.parse(out)
    expect(
      again.rows.find((r) => r.cells.locale === 'de')?.cells.value,
    ).toBe('Hallo')
  })

  it('invalid JSON sets banner', () => {
    const model = xcstringsAdapter.parse('{')
    expect(model.banner?.level).toBe('error')
  })
})
