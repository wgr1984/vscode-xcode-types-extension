import { describe, expect, it } from 'vitest'
import { isEditableKind, kindFromFolderName } from '../../src/xcassets/kinds'

describe('kindFromFolderName', () => {
  it('maps known extensions', () => {
    expect(kindFromFolderName('Foo.imageset')).toBe('imageset')
    expect(kindFromFolderName('AppIcon.appiconset')).toBe('appiconset')
    expect(kindFromFolderName('Accent.colorset')).toBe('colorset')
    expect(kindFromFolderName('blob.dataset')).toBe('dataset')
    expect(kindFromFolderName('Launch.launchimage')).toBe('launchimage')
  })

  it('group = no dot; exotic = unknown extension', () => {
    expect(kindFromFolderName('Icons')).toBe('group')
    expect(kindFromFolderName('Mark.symbolset')).toBe('exotic')
    expect(kindFromFolderName('Assets.xcassets')).toBe('catalog')
  })

  it('editable set', () => {
    expect(isEditableKind('imageset')).toBe(true)
    expect(isEditableKind('exotic')).toBe(false)
    expect(isEditableKind('group')).toBe(true)
  })
})
