import type { PropertyField } from './properties'

const COMPRESSION_OPTIONS = [
  { value: '', label: 'Inherited' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'lossless', label: 'Lossless' },
  { value: 'lossy', label: 'Lossy' },
  { value: 'gpu-optimized-best', label: 'GPU Optimized Best' },
  { value: 'gpu-optimized-smallest', label: 'GPU Optimized Smallest' },
]

function imagesArr(contents: unknown): Record<string, unknown>[] | undefined {
  if (!contents || typeof contents !== 'object') return undefined
  const arr = (contents as { images?: unknown }).images
  if (!Array.isArray(arr)) return undefined
  return arr as Record<string, unknown>[]
}

/** Editable attributes for one images[] entry (imageset-focused). */
export function slotFieldsFor(
  contents: unknown,
  slotIndex: number,
): PropertyField[] {
  const arr = imagesArr(contents)
  if (!arr || slotIndex < 0 || slotIndex >= arr.length) return []
  const s = arr[slotIndex] && typeof arr[slotIndex] === 'object' ? arr[slotIndex] : {}
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
      options: [
        { value: 'universal', label: 'universal' },
        { value: 'iphone', label: 'iphone' },
        { value: 'ipad', label: 'ipad' },
        { value: 'mac', label: 'mac' },
        { value: 'tv', label: 'tv' },
        { value: 'watch', label: 'watch' },
        { value: 'car', label: 'car' },
        { value: 'vision', label: 'vision' },
      ],
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
      options: [
        { value: '', label: 'Any' },
        { value: 'sRGB', label: 'sRGB' },
        { value: 'display-P3', label: 'Display P3' },
      ],
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

export function setSlotAttribute(
  contents: unknown,
  slotIndex: number,
  key: string,
  value: boolean | string,
): unknown {
  if (!contents || typeof contents !== 'object') {
    throw new Error('Contents.json root must be an object')
  }
  const root = JSON.parse(JSON.stringify(contents)) as Record<string, unknown>
  const arr = root.images
  if (!Array.isArray(arr)) throw new Error('Missing images array')
  if (slotIndex < 0 || slotIndex >= arr.length) {
    throw new Error(`images slot out of range: ${slotIndex}`)
  }
  const slot = {
    ...(arr[slotIndex] && typeof arr[slotIndex] === 'object'
      ? (arr[slotIndex] as object)
      : {}),
  } as Record<string, unknown>
  if (typeof value === 'boolean') {
    if (value) slot[key] = true
    else delete slot[key]
  } else if (value === '') {
    delete slot[key]
  } else {
    slot[key] = value
  }
  arr[slotIndex] = slot
  root.images = arr
  return root
}
