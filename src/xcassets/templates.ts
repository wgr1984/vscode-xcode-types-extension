import type { AssetKind } from './kinds'

const INFO = { author: 'xcode', version: 1 }

export function defaultContentsJson(kind: AssetKind): unknown {
  switch (kind) {
    case 'imageset':
      return {
        images: [
          { idiom: 'universal', scale: '1x' },
          { idiom: 'universal', scale: '2x' },
          { idiom: 'universal', scale: '3x' },
        ],
        info: INFO,
      }
    case 'appiconset':
      return {
        images: [
          { idiom: 'universal', platform: 'ios', size: '1024x1024' },
        ],
        info: INFO,
      }
    case 'colorset':
      return {
        colors: [
          {
            idiom: 'universal',
            color: {
              'color-space': 'srgb',
              components: {
                red: '0.000',
                green: '0.000',
                blue: '0.000',
                alpha: '1.000',
              },
            },
          },
        ],
        info: INFO,
      }
    case 'dataset':
      return { data: [{ idiom: 'universal' }], info: INFO }
    case 'launchimage':
      return {
        images: [
          {
            extent: 'full-screen',
            idiom: 'iphone',
            orientation: 'portrait',
            scale: '2x',
          },
        ],
        info: INFO,
      }
    case 'group':
      return { info: INFO }
    default:
      return { info: INFO }
  }
}

export function folderNameFor(kind: AssetKind, baseName: string): string {
  const safe = baseName.replace(/[/\\.]/g, '_')
  switch (kind) {
    case 'imageset':
      return `${safe}.imageset`
    case 'appiconset':
      return `${safe}.appiconset`
    case 'colorset':
      return `${safe}.colorset`
    case 'dataset':
      return `${safe}.dataset`
    case 'launchimage':
      return `${safe}.launchimage`
    case 'group':
      return safe
    default:
      return safe
  }
}
