import { describe, expect, it } from 'vitest'
import { colorizePrismHtml } from '../../src/webview/RawEditor'

describe('colorizePrismHtml', () => {
  it('adds inline color for token classes', () => {
    const out = colorizePrismHtml(
      '<span class="token comment">&lt;!-- x --&gt;</span>',
    )
    expect(out).toContain('style="color:#6a9955"')
    expect(out).toContain('class="token comment"')
  })

  it('colors property tokens', () => {
    const out = colorizePrismHtml(
      '<span class="token property">"a"</span>',
    )
    expect(out).toContain('style="color:#9cdcfe"')
  })
})
