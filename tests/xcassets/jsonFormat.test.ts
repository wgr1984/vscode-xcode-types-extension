import { describe, expect, it } from 'vitest'
import { parseContentsJson, stringifyContentsJson } from '../../src/xcassets/jsonFormat'

describe('contents json', () => {
  it('pretty prints with trailing newline', () => {
    expect(stringifyContentsJson({ info: { version: 1 } })).toBe(
      '{\n  "info": {\n    "version": 1\n  }\n}\n',
    )
  })

  it('parse ok / fail', () => {
    expect(parseContentsJson('{"a":1}').ok).toBe(true)
    expect(parseContentsJson('{').ok).toBe(false)
  })
})
