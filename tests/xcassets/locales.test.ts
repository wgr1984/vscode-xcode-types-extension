import { describe, expect, it } from 'vitest'
import {
  localesFromXcstringsText,
  toLocaleOptions,
} from '../../src/xcassets/locales'

describe('locales', () => {
  it('reads sourceLanguage and localization keys from xcstrings', () => {
    const text = JSON.stringify({
      sourceLanguage: 'en',
      strings: {
        hello: {
          localizations: {
            en: { stringUnit: { value: 'Hi' } },
            de: { stringUnit: { value: 'Hallo' } },
            fr: { stringUnit: { value: 'Bonjour' } },
          },
        },
      },
    })
    expect(localesFromXcstringsText(text)).toEqual(['de', 'en', 'fr'])
  })

  it('returns empty on invalid json', () => {
    expect(localesFromXcstringsText('{')).toEqual([])
  })

  it('labels known ids', () => {
    expect(toLocaleOptions(['de', 'en'])).toEqual([
      { id: 'en', label: 'English' },
      { id: 'de', label: 'German' },
    ])
  })
})
