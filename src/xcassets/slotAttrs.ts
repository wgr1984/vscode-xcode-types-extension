import type { AssetKind } from './kinds'
import type { PropertyField } from './properties'

const COMPRESSION_OPTIONS = [
  { value: '', label: 'Inherited' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'lossless', label: 'Lossless' },
  { value: 'lossy', label: 'Lossy' },
  { value: 'gpu-optimized-best', label: 'GPU Optimized Best' },
  { value: 'gpu-optimized-smallest', label: 'GPU Optimized Smallest' },
]

const IDIOM_OPTIONS = [
  { value: 'universal', label: 'universal' },
  { value: 'iphone', label: 'iphone' },
  { value: 'ipad', label: 'ipad' },
  { value: 'mac', label: 'mac' },
  { value: 'tv', label: 'tv' },
  { value: 'watch', label: 'watch' },
  { value: 'car', label: 'car' },
  { value: 'vision', label: 'vision' },
]

const GAMUT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'sRGB', label: 'sRGB' },
  { value: 'display-P3', label: 'Display P3' },
]

function arrFor(
  contents: unknown,
  key: 'images' | 'colors',
): Record<string, unknown>[] | undefined {
  if (!contents || typeof contents !== 'object') return undefined
  const arr = (contents as Record<string, unknown>)[key]
  if (!Array.isArray(arr)) return undefined
  return arr as Record<string, unknown>[]
}

function imageSlotFields(s: Record<string, unknown>): PropertyField[] {
  const compression =
    typeof s['compression-type'] === 'string' ? String(s['compression-type']) : ''
  const gamut =
    typeof s['display-gamut'] === 'string' ? String(s['display-gamut']) : ''
  const dir =
    typeof s['language-direction'] === 'string'
      ? String(s['language-direction'])
      : ''
  const idiom = typeof s.idiom === 'string' ? String(s.idiom) : ''
  const scale = typeof s.scale === 'string' ? String(s.scale) : ''
  return [
    {
      key: 'filename',
      label: 'Filename',
      type: 'string',
      value: typeof s.filename === 'string' ? s.filename : '',
    },
    {
      key: 'idiom',
      label: 'Idiom',
      type: 'select',
      value: idiom,
      options: IDIOM_OPTIONS,
    },
    {
      key: 'scale',
      label: 'Scale',
      type: 'select',
      value: scale,
      options: [
        { value: '', label: 'Any (vector)' },
        { value: '1x', label: '1x' },
        { value: '2x', label: '2x' },
        { value: '3x', label: '3x' },
      ],
    },
    {
      key: 'compression-type',
      label: 'Compression',
      type: 'select',
      value: compression,
      options: COMPRESSION_OPTIONS,
    },
    {
      key: 'display-gamut',
      label: 'Gamut',
      type: 'select',
      value: gamut,
      options: GAMUT_OPTIONS,
    },
    {
      key: 'language-direction',
      label: 'Direction',
      type: 'select',
      value: dir,
      options: [
        { value: '', label: 'Fixed' },
        { value: 'left-to-right', label: 'Left to Right' },
        { value: 'right-to-left', label: 'Right to Left' },
      ],
    },
  ]
}

function colorSlotFields(s: Record<string, unknown>): PropertyField[] {
  const color =
    s.color && typeof s.color === 'object'
      ? (s.color as Record<string, unknown>)
      : {}
  const colorSpace =
    typeof color['color-space'] === 'string' ? String(color['color-space']) : ''
  const gamut =
    typeof s['display-gamut'] === 'string' ? String(s['display-gamut']) : ''
  const idiom = typeof s.idiom === 'string' ? String(s.idiom) : ''
  return [
    {
      key: 'idiom',
      label: 'Idiom',
      type: 'select',
      value: idiom,
      options: IDIOM_OPTIONS,
    },
    {
      key: 'display-gamut',
      label: 'Gamut',
      type: 'select',
      value: gamut,
      options: GAMUT_OPTIONS,
    },
    {
      key: 'color-space',
      label: 'Color space',
      type: 'select',
      value: colorSpace,
      options: [
        { value: 'srgb', label: 'sRGB' },
        { value: 'display-p3', label: 'Display P3' },
        { value: 'extended-srgb', label: 'Extended sRGB' },
        { value: 'extended-linear-srgb', label: 'Extended Linear sRGB' },
        { value: 'gray-gamma-22', label: 'Gray Gamma 2.2' },
      ],
    },
  ]
}

/** Editable attributes for one slot. */
export function slotFieldsFor(
  kind: AssetKind,
  contents: unknown,
  slotIndex: number,
): PropertyField[] {
  if (kind === 'colorset') {
    const arr = arrFor(contents, 'colors')
    if (!arr || slotIndex < 0 || slotIndex >= arr.length) return []
    const s =
      arr[slotIndex] && typeof arr[slotIndex] === 'object' ? arr[slotIndex] : {}
    return colorSlotFields(s)
  }
  if (kind === 'imageset' || kind === 'appiconset' || kind === 'launchimage') {
    const arr = arrFor(contents, 'images')
    if (!arr || slotIndex < 0 || slotIndex >= arr.length) return []
    const s =
      arr[slotIndex] && typeof arr[slotIndex] === 'object' ? arr[slotIndex] : {}
    return imageSlotFields(s)
  }
  return []
}

export function setSlotAttribute(
  kind: AssetKind,
  contents: unknown,
  slotIndex: number,
  key: string,
  value: boolean | string,
): unknown {
  if (!contents || typeof contents !== 'object') {
    throw new Error('Contents.json root must be an object')
  }
  const root = JSON.parse(JSON.stringify(contents)) as Record<string, unknown>
  const arrKey = kind === 'colorset' ? 'colors' : 'images'
  const arr = root[arrKey]
  if (!Array.isArray(arr)) throw new Error(`Missing ${arrKey} array`)
  if (slotIndex < 0 || slotIndex >= arr.length) {
    throw new Error(`${arrKey} slot out of range: ${slotIndex}`)
  }
  const slot = {
    ...(arr[slotIndex] && typeof arr[slotIndex] === 'object'
      ? (arr[slotIndex] as object)
      : {}),
  } as Record<string, unknown>

  if (kind === 'colorset' && key === 'color-space') {
    const color =
      slot.color && typeof slot.color === 'object'
        ? { ...(slot.color as Record<string, unknown>) }
        : {}
    if (value === '') delete color['color-space']
    else color['color-space'] = value
    slot.color = color
  } else if (typeof value === 'boolean') {
    if (value) slot[key] = true
    else delete slot[key]
  } else if (value === '') {
    delete slot[key]
  } else {
    slot[key] = value
  }
  arr[slotIndex] = slot
  root[arrKey] = arr
  return root
}
