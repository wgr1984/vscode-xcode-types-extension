import { describe, expect, it } from 'vitest'
import { prismLangFor } from '../../src/webview/prismLang'

describe('prismLangFor', () => {
  it('maps known formats', () => {
    expect(prismLangFor('plist')).toBe('markup')
    expect(prismLangFor('xcstrings')).toBe('json')
    expect(prismLangFor('xcconfig')).toBe('properties')
    expect(prismLangFor('strings')).toBe('strings')
  })

  it('unknown → none', () => {
    expect(prismLangFor('typescript')).toBe('none')
  })
})

describe('strings Prism grammar', () => {
  it('tokenizes key/value and comments', async () => {
    const Prism = (await import('prismjs')).default
    // side-effect register
    await import('../../src/webview/prismLang')
    const html = Prism.highlight(
      '// hi\n"app.name" = "Demo";\n',
      Prism.languages.strings,
      'strings',
    )
    expect(html).toContain('token comment')
    expect(html).toContain('token string')
    expect(html).toContain('token operator')
    expect(html).toContain('token punctuation')
  })
})