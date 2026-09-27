import { describe, expect, it } from 'vitest'
import { prismLangFor } from '../../src/webview/prismLang'

describe('prismLangFor', () => {
  it('maps known formats', () => {
    expect(prismLangFor('plist')).toBe('markup')
    expect(prismLangFor('xcstrings')).toBe('json')
    expect(prismLangFor('xcconfig')).toBe('properties')
    expect(prismLangFor('strings')).toBe('none')
  })

  it('unknown → none', () => {
    expect(prismLangFor('typescript')).toBe('none')
  })
})
