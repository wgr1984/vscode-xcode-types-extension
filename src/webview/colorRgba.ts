import type { Rgba } from './xcassetsTypes'

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function componentToByte(s: string): number {
  return Math.round(clamp01(Number(s)) * 255)
}

function byteToComponent(n: number): string {
  return (clamp01(n / 255)).toFixed(3)
}

/** `#RRGGBB` from 0–1 component strings (alpha ignored). */
export function rgbaToHex(rgba: Rgba): string {
  const r = componentToByte(rgba.red)
  const g = componentToByte(rgba.green)
  const b = componentToByte(rgba.blue)
  return (
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

/** Parse `#RGB` / `#RRGGBB` (optional `#`). Keeps existing alpha. */
export function hexToRgba(hex: string, alpha: string): Rgba | null {
  let h = hex.trim()
  if (h.startsWith('#')) h = h.slice(1)
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(h)) return null
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return {
    red: byteToComponent(r),
    green: byteToComponent(g),
    blue: byteToComponent(b),
    alpha: alpha || '1.000',
  }
}

export function rgbaCss(rgba: Rgba): string {
  return `rgba(${componentToByte(rgba.red)}, ${componentToByte(rgba.green)}, ${componentToByte(rgba.blue)}, ${clamp01(Number(rgba.alpha))})`
}
