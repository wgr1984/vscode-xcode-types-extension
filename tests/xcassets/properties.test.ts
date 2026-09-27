import { describe, expect, it } from 'vitest'
import {
  propertyFieldsFor,
  setContentsProperty,
} from '../../src/xcassets/properties'

describe('properties', () => {
  it('reads preserves-vector from imageset', () => {
    const fields = propertyFieldsFor('imageset', {
      images: [],
      properties: { 'preserves-vector-representation': true },
    })
    const pv = fields.find((f) => f.key === 'preserves-vector-representation')
    expect(pv?.type).toBe('boolean')
    if (pv?.type === 'boolean') expect(pv.value).toBe(true)
  })

  it('sets and clears boolean property', () => {
    const on = setContentsProperty({ images: [], info: { version: 1 } }, 'preserves-vector-representation', true) as {
      properties: Record<string, unknown>
    }
    expect(on.properties['preserves-vector-representation']).toBe(true)
    const off = setContentsProperty(on, 'preserves-vector-representation', false) as {
      properties?: Record<string, unknown>
    }
    expect(off.properties).toBeUndefined()
  })

  it('sets template intent', () => {
    const next = setContentsProperty({ images: [] }, 'template-rendering-intent', 'template') as {
      properties: Record<string, unknown>
    }
    expect(next.properties['template-rendering-intent']).toBe('template')
  })
})
