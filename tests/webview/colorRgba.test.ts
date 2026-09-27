import { describe, expect, it } from 'vitest'
import { hexToRgba, rgbaToHex } from '../../src/webview/colorRgba'

describe('colorRgba', () => {
  it('round-trips hex', () => {
    const rgba = hexToRgba('#007A00', '1.000')
    expect(rgba).not.toBeNull()
    expect(rgbaToHex(rgba!)).toBe('#007A00')
  })

  it('accepts short hex', () => {
    const rgba = hexToRgba('#0f0', '1')
    expect(rgbaToHex(rgba!)).toBe('#00FF00')
  })

  it('rejects junk', () => {
    expect(hexToRgba('nope', '1')).toBeNull()
  })

  it('formats from 0–1 components', () => {
    expect(
      rgbaToHex({
        red: '0.000',
        green: '0.478',
        blue: '0.000',
        alpha: '1.000',
      }),
    ).toBe('#007A00')
  })
})
