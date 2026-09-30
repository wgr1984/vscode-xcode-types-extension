function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function asRecordArray(
  contents: unknown,
  key: 'images' | 'colors' | 'data',
): { root: Record<string, unknown>; arr: Record<string, unknown>[] } {
  if (!contents || typeof contents !== 'object') {
    throw new Error('Contents.json root must be an object')
  }
  const root = clone(contents) as Record<string, unknown>
  const arr = root[key]
  if (!Array.isArray(arr)) {
    throw new Error(`Missing ${key} array`)
  }
  root[key] = arr.map((item) =>
    item && typeof item === 'object' ? { ...(item as object) } : item,
  )
  return { root, arr: root[key] as Record<string, unknown>[] }
}

export function setImageSlotFilename(
  contents: unknown,
  slotIndex: number,
  filename: string | undefined,
): unknown {
  const { root, arr } = asRecordArray(contents, 'images')
  if (slotIndex < 0 || slotIndex >= arr.length) {
    throw new Error(`images slot out of range: ${slotIndex}`)
  }
  if (filename === undefined) delete arr[slotIndex].filename
  else arr[slotIndex].filename = filename
  return root
}

export function setDataSlotFilename(
  contents: unknown,
  slotIndex: number,
  filename: string | undefined,
): unknown {
  const { root, arr } = asRecordArray(contents, 'data')
  if (slotIndex < 0 || slotIndex >= arr.length) {
    throw new Error(`data slot out of range: ${slotIndex}`)
  }
  if (filename === undefined) delete arr[slotIndex].filename
  else arr[slotIndex].filename = filename
  return root
}

export function setColorComponents(
  contents: unknown,
  slotIndex: number,
  rgba: { red: string; green: string; blue: string; alpha: string },
): unknown {
  const { root, arr } = asRecordArray(contents, 'colors')
  if (slotIndex < 0 || slotIndex >= arr.length) {
    throw new Error(`colors slot out of range: ${slotIndex}`)
  }
  const slot = arr[slotIndex]
  const color =
    slot.color && typeof slot.color === 'object'
      ? { ...(slot.color as Record<string, unknown>) }
      : {}
  color.components = { ...rgba }
  if (!color['color-space']) color['color-space'] = 'srgb'
  slot.color = color
  return root
}
