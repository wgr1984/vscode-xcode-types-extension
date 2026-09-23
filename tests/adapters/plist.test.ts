import { describe, expect, it } from 'vitest'
import { isBinaryPlist, plistAdapter } from '../../src/adapters/plist'

const sample = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>name</key>
  <string>Demo</string>
  <key>count</key>
  <integer>3</integer>
</dict>
</plist>
`

describe('plistAdapter', () => {
  it('parses XML dict', () => {
    const model = plistAdapter.parse(sample)
    expect(model.banner).toBeUndefined()
    expect(model.rows.map((r) => r.cells.path)).toEqual(['name', 'count'])
    expect(model.rows[0].cells).toMatchObject({
      path: 'name',
      type: 'string',
      value: 'Demo',
    })
  })

  it('round-trips simple dict', () => {
    const out = plistAdapter.serialize(plistAdapter.parse(sample))
    const again = plistAdapter.parse(out)
    expect(again.rows.find((r) => r.cells.path === 'name')?.cells.value).toBe('Demo')
    expect(again.rows.find((r) => r.cells.path === 'count')?.cells.value).toBe('3')
  })

  it('binary sets banner', () => {
    expect(isBinaryPlist('bplist00....')).toBe(true)
    const model = plistAdapter.parse('bplist00abcd')
    expect(model.banner?.level).toBe('error')
    expect(model.rows).toHaveLength(0)
  })

  it('invalid XML sets banner', () => {
    const model = plistAdapter.parse('<not-a-plist>')
    expect(model.banner?.level).toBe('error')
  })
})
