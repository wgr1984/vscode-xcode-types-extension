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

  const nested = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>kids</key>
  <array>
    <string>Ada</string>
    <dict>
      <key>age</key>
      <integer>9</integer>
    </dict>
  </array>
  <key>meta</key>
  <dict>
    <key>city</key>
    <string>Berlin</string>
  </dict>
  <key>emptyArr</key>
  <array/>
  <key>emptyDict</key>
  <dict/>
  <key>on</key>
  <true/>
</dict>
</plist>
`

  it('flattens containers, boolean, and sorts parent before children', () => {
    const model = plistAdapter.parse(nested)
    expect(model.banner).toBeUndefined()
    const paths = model.rows.map((r) => r.cells.path)
    expect(paths).toEqual([
      'kids',
      'kids[0]',
      'kids[1]',
      'kids[1].age',
      'meta',
      'meta.city',
      'emptyArr',
      'emptyDict',
      'on',
    ])
    expect(model.rows.find((r) => r.cells.path === 'kids')?.cells.type).toBe('array')
    expect(model.rows.find((r) => r.cells.path === 'meta')?.cells.type).toBe(
      'dictionary',
    )
    expect(model.rows.find((r) => r.cells.path === 'emptyArr')?.cells).toMatchObject({
      type: 'array',
      value: '',
    })
    expect(model.rows.find((r) => r.cells.path === 'on')?.cells).toMatchObject({
      type: 'boolean',
      value: 'true',
    })
  })

  it('round-trips nested dict/array/empty/boolean', () => {
    const out = plistAdapter.serialize(plistAdapter.parse(nested))
    const again = plistAdapter.parse(out)
    expect(again.rows.map((r) => r.cells.path)).toEqual([
      'kids',
      'kids[0]',
      'kids[1]',
      'kids[1].age',
      'meta',
      'meta.city',
      'emptyArr',
      'emptyDict',
      'on',
    ])
    expect(again.rows.find((r) => r.cells.path === 'kids[0]')?.cells.value).toBe(
      'Ada',
    )
    expect(again.rows.find((r) => r.cells.path === 'kids[1].age')?.cells.value).toBe(
      '9',
    )
    expect(again.rows.find((r) => r.cells.path === 'on')?.cells.value).toBe('true')
    expect(out).toContain('<array/>')
    expect(out).toContain('<true/>')
  })

  it('serialize throws on duplicate path', () => {
    const { columns } = plistAdapter.parse(sample)
    expect(() =>
      plistAdapter.serialize({
        columns,
        rows: [
          { id: '1', cells: { path: 'a', type: 'string', value: '1' } },
          { id: '2', cells: { path: 'a', type: 'string', value: '2' } },
        ],
      }),
    ).toThrow(/duplicate/i)
  })

  it('compacts sparse array indices on serialize', () => {
    const { columns } = plistAdapter.parse(sample)
    const out = plistAdapter.serialize({
      columns,
      rows: [
        { id: '0', cells: { path: 'test', type: 'array', value: '' } },
        { id: '1', cells: { path: 'test[0]', type: 'string', value: 'a' } },
        { id: '2', cells: { path: 'test[2]', type: 'string', value: 'c' } },
      ],
    })
    const again = plistAdapter.parse(out)
    expect(again.rows.map((r) => r.cells.path)).toEqual([
      'test',
      'test[0]',
      'test[1]',
    ])
    expect(again.rows.find((r) => r.cells.path === 'test[1]')?.cells.value).toBe(
      'c',
    )
    expect(out).not.toMatch(/<string><\/string>\s*<string>c<\/string>/)
  })
})
