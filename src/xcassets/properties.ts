import type { AssetKind } from './kinds'

export type PropertyField =
  | {
      key: string
      label: string
      type: 'boolean'
      value: boolean
    }
  | {
      key: string
      label: string
      type: 'select'
      value: string
      options: { value: string; label: string }[]
    }
  | {
      key: string
      label: string
      type: 'string'
      value: string
      placeholder?: string
    }

const COMPRESSION_OPTIONS = [
  { value: '', label: 'Inherited (Automatic)' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'lossless', label: 'Lossless' },
  { value: 'lossy', label: 'Lossy' },
  { value: 'gpu-optimized-best', label: 'GPU Optimized Best' },
  { value: 'gpu-optimized-smallest', label: 'GPU Optimized Smallest' },
]

function propsObj(contents: unknown): Record<string, unknown> {
  if (!contents || typeof contents !== 'object') return {}
  const root = contents as Record<string, unknown>
  const p = root.properties
  if (!p || typeof p !== 'object') return {}
  return p as Record<string, unknown>
}

function tagsString(p: Record<string, unknown>): string {
  const t = p['on-demand-resource-tags']
  if (!Array.isArray(t)) return ''
  return t.map(String).join(', ')
}

/** Fields shown for a kind — values from Contents.json `properties`. */
export function propertyFieldsFor(
  kind: AssetKind,
  contents: unknown,
): PropertyField[] {
  const p = propsObj(contents)
  if (kind === 'imageset') {
    const intent =
      typeof p['template-rendering-intent'] === 'string'
        ? String(p['template-rendering-intent'])
        : ''
    const compression =
      typeof p['compression-type'] === 'string'
        ? String(p['compression-type'])
        : ''
    const autoScaling =
      typeof p['auto-scaling'] === 'string'
        ? String(p['auto-scaling'])
        : p['auto-scaling'] === true
          ? 'auto'
          : ''
    return [
      {
        key: 'template-rendering-intent',
        label: 'Render as',
        type: 'select',
        value: intent,
        options: [
          { value: '', label: 'Default' },
          { value: 'original', label: 'Original' },
          { value: 'template', label: 'Template' },
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
        key: 'preserves-vector-representation',
        label: 'Preserve vector data',
        type: 'boolean',
        value: p['preserves-vector-representation'] === true,
      },
      {
        key: 'auto-scaling',
        label: 'Auto scaling',
        type: 'select',
        value: autoScaling,
        options: [
          { value: '', label: 'Off' },
          { value: 'auto', label: 'Auto' },
        ],
      },
      {
        key: 'on-demand-resource-tags',
        label: 'ODR tags',
        type: 'string',
        value: tagsString(p),
        placeholder: 'tag1, tag2',
      },
    ]
  }
  if (kind === 'appiconset') {
    return [
      {
        key: 'pre-rendered',
        label: 'Pre-rendered',
        type: 'boolean',
        value: p['pre-rendered'] === true,
      },
      {
        key: 'on-demand-resource-tags',
        label: 'ODR tags',
        type: 'string',
        value: tagsString(p),
        placeholder: 'tag1, tag2',
      },
    ]
  }
  if (kind === 'group') {
    return [
      {
        key: 'provides-namespace',
        label: 'Provides namespace',
        type: 'boolean',
        value: p['provides-namespace'] === true,
      },
      {
        key: 'on-demand-resource-tags',
        label: 'ODR tags',
        type: 'string',
        value: tagsString(p),
        placeholder: 'tag1, tag2',
      },
    ]
  }
  return []
}

/** Set or clear a property. Empty string for select/string clears the key. */
export function setContentsProperty(
  contents: unknown,
  key: string,
  value: boolean | string,
): unknown {
  if (!contents || typeof contents !== 'object') {
    throw new Error('Contents.json root must be an object')
  }
  const root = JSON.parse(JSON.stringify(contents)) as Record<string, unknown>
  const props = {
    ...((root.properties && typeof root.properties === 'object'
      ? root.properties
      : {}) as Record<string, unknown>),
  }
  if (key === 'on-demand-resource-tags') {
    const tags = String(value)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (tags.length === 0) delete props[key]
    else props[key] = tags
  } else if (typeof value === 'boolean') {
    if (value) props[key] = true
    else delete props[key]
  } else if (value === '') {
    delete props[key]
  } else {
    props[key] = value
  }
  if (Object.keys(props).length === 0) delete root.properties
  else root.properties = props
  return root
}
