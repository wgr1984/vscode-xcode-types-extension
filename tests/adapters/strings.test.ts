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
    expect(model.issues?.[0].line).toBe(0)
  })

  it('flags only garbage lines when some pairs parse', () => {
    const model = stringsAdapter.parse(`"a" = "b";\nasdas = asdfsa\n`)
    expect(model.banner?.level).toBe('error')
    expect(model.rows).toHaveLength(1)
    expect(model.rows[0].cells).toEqual({ key: 'a', value: 'b' })
    expect(model.issues).toEqual([
      expect.objectContaining({ line: 1 }),
    ])
  })
})
