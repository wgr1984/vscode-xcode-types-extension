import { describe, expect, it } from 'vitest'
import { xcconfigAdapter } from '../../src/adapters/xcconfig'

describe('xcconfigAdapter', () => {
  it('parses assignments', () => {
    const text = `PRODUCT_NAME = Demo\nSWIFT_VERSION = 5.0\n`
    const model = xcconfigAdapter.parse(text)
    expect(model.columns.map((c) => c.key)).toEqual(['key', 'value'])
    expect(model.rows).toHaveLength(2)
    expect(model.rows[0].cells).toEqual({ key: 'PRODUCT_NAME', value: 'Demo' })
  })

  it('round-trips', () => {
    const text = `FOO = bar\n`
    const out = xcconfigAdapter.serialize(xcconfigAdapter.parse(text))
    expect(xcconfigAdapter.parse(out).rows[0].cells).toEqual({
      key: 'FOO',
      value: 'bar',
    })
  })

  it('parse failure sets banner', () => {
    const model = xcconfigAdapter.parse(`not an assignment`)
    expect(model.banner?.level).toBe('error')
    expect(model.issues?.[0].line).toBe(0)
  })

  it('flags bad line while keeping valid assignments', () => {
    const model = xcconfigAdapter.parse(
      `PRODUCT_NAME = Demo\ntetest 4534534\n`,
    )
    expect(model.banner?.level).toBe('error')
    expect(model.rows).toHaveLength(1)
    expect(model.issues).toEqual([expect.objectContaining({ line: 1 })])
  })
})