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

function propsObj(contents: unknown): Record<string, unknown> {
  if (!contents || typeof contents !== 'object') return {}
  const root = contents as Record<string, unknown>
  const p = root.properties
  if (!p || typeof p !== 'object') return {}
  return p as Record<string, unknown>
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
    return [
      {
        key: 'preserves-vector-representation',
        label: 'Preserve vector data',
        type: 'boolean',
        value: p['preserves-vector-representation'] === true,
      },
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
    ]
  }
  return []
}

/** Set or clear a property. Empty string for select clears the key. */
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
  if (typeof value === 'boolean') {
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
