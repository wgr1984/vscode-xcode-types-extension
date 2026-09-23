import { describe, expect, it } from 'vitest'
import { stringsAdapter } from '../../src/adapters/strings'

describe('stringsAdapter', () => {
  it('parses key value pairs', () => {
    const text = `"hello" = "world";\n"a" = "b";\n`
    const model = stringsAdapter.parse(text)
    expect(model.columns.map((c) => c.key)).toEqual(['key', 'value'])
    expect(model.rows).toHaveLength(2)
    expect(model.rows[0].cells).toEqual({ key: 'hello', value: 'world' })
  })

  it('round-trips', () => {
    const text = `"x" = "y";\n`
    const out = stringsAdapter.serialize(stringsAdapter.parse(text))
    expect(stringsAdapter.parse(out).rows[0].cells).toEqual({ key: 'x', value: 'y' })
  })

  it('parse failure sets banner', () => {
    const model = stringsAdapter.parse(`"unterminated`)
    expect(model.banner?.level).toBe('error')
  })
})
