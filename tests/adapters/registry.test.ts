import { describe, expect, it } from 'vitest'
import { getAdapter, registerAdapter } from '../../src/adapters/registry'
import type { FormatAdapter } from '../../src/adapters/types'

const stub: FormatAdapter = {
  languageId: 'strings',
  parse: () => ({ columns: [], rows: [] }),
  serialize: () => '',
}

describe('registry', () => {
  it('returns registered adapter by languageId', () => {
    registerAdapter(stub)
    expect(getAdapter('strings')).toBe(stub)
    expect(getAdapter('nope')).toBeUndefined()
  })
})
