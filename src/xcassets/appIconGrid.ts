/** App Icon inspector → reshape `images[]`. */

export type AppIconIos = 'none' | 'single' | 'all'
export type AppIconPlatformOpt = 'none' | 'all'
export type AppIconAppearances = 'any' | 'any-dark' | 'any-dark-tinted'

export type AppIconGridConfig = {
  ios: AppIconIos
  macos: AppIconPlatformOpt
  watchos: AppIconPlatformOpt
  appearances: AppIconAppearances
  gamut: 'any' | 'both'
}

type Slot = Record<string, unknown>
type AppearanceSpec = { appearance: string; value: string }[] | undefined

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function appearancesKey(slot: Slot): string {
  const apps = slot.appearances
  if (!Array.isArray(apps) || apps.length === 0) return ''
  return apps
    .map((a) => {
      if (!a || typeof a !== 'object') return ''
      const o = a as { appearance?: string; value?: string }
      return `${o.appearance ?? ''}:${o.value ?? ''}`
    })
    .filter(Boolean)
    .sort()
    .join('|')
}

export function appIconSlotIdentity(slot: Slot): string {
  return [
    `idiom=${slot.idiom ?? ''}`,
    `platform=${slot.platform ?? ''}`,
    `size=${slot.size ?? ''}`,
    `scale=${slot.scale ?? ''}`,
    `role=${slot.role ?? ''}`,
    `subtype=${slot.subtype ?? ''}`,
    `appearances=${appearancesKey(slot)}`,
    `gamut=${slot['display-gamut'] ?? ''}`,
  ].join(';')
}

function appearanceVariants(mode: AppIconAppearances): AppearanceSpec[] {
  if (mode === 'any') return [undefined]
  if (mode === 'any-dark') {
    return [undefined, [{ appearance: 'luminosity', value: 'dark' }]]
  }
  return [
    undefined,
    [{ appearance: 'luminosity', value: 'dark' }],
    [{ appearance: 'luminosity', value: 'tinted' }],
  ]
}

function withAppearancesAndGamut(
  bases: Slot[],
  config: AppIconGridConfig,
): Slot[] {
  const apps = appearanceVariants(config.appearances)
  const gamuts =
    config.gamut === 'both' ? (['sRGB', 'display-P3'] as const) : [undefined]
  const out: Slot[] = []
  for (const base of bases) {
    for (const app of apps) {
      for (const gamut of gamuts) {
        const slot: Slot = { ...base }
        if (app) slot.appearances = app
        if (gamut) slot['display-gamut'] = gamut
        out.push(slot)
      }
    }
  }
  return out
}

/** iPhone + iPad + App Store marketing — common “All Sizes (Xcode 13)” set. */
function iosAllSizeBases(): Slot[] {
  const iphone: [string, string[]][] = [
    ['20x20', ['2x', '3x']],
    ['29x29', ['2x', '3x']],
    ['40x40', ['2x', '3x']],
    ['60x60', ['2x', '3x']],
  ]
  const ipad: [string, string[]][] = [
    ['20x20', ['1x', '2x']],
    ['29x29', ['1x', '2x']],
    ['40x40', ['1x', '2x']],
    ['76x76', ['1x', '2x']],
    ['83.5x83.5', ['2x']],
  ]
  const out: Slot[] = []
  for (const [size, scales] of iphone) {
    for (const scale of scales) {
      out.push({ idiom: 'iphone', size, scale })
    }
  }
  for (const [size, scales] of ipad) {
    for (const scale of scales) {
      out.push({ idiom: 'ipad', size, scale })
    }
  }
  out.push({ idiom: 'ios-marketing', size: '1024x1024', scale: '1x' })
  return out
}

function iosSingleBases(): Slot[] {
  return [{ idiom: 'universal', platform: 'ios', size: '1024x1024' }]
}

function macAllSizeBases(): Slot[] {
  const sizes = ['16x16', '32x32', '128x128', '256x256', '512x512']
  const out: Slot[] = []
  for (const size of sizes) {
    out.push({ idiom: 'mac', size, scale: '1x' })
    out.push({ idiom: 'mac', size, scale: '2x' })
  }
  return out
}

/** Common watch app icon roles (simplified full set). */
function watchAllSizeBases(): Slot[] {
  return [
    { idiom: 'watch', role: 'notificationCenter', size: '24x24', scale: '2x' },
    { idiom: 'watch', role: 'notificationCenter', size: '27.5x27.5', scale: '2x' },
    { idiom: 'watch', role: 'companionSettings', size: '29x29', scale: '2x' },
    { idiom: 'watch', role: 'companionSettings', size: '29x29', scale: '3x' },
    { idiom: 'watch', role: 'appLauncher', size: '40x40', scale: '2x' },
    { idiom: 'watch', role: 'appLauncher', size: '44x44', scale: '2x' },
    { idiom: 'watch', role: 'appLauncher', size: '50x50', scale: '2x' },
    { idiom: 'watch', role: 'quickLook', size: '86x86', scale: '2x' },
    { idiom: 'watch', role: 'quickLook', size: '98x98', scale: '2x' },
    { idiom: 'watch', role: 'quickLook', size: '108x108', scale: '2x' },
    { idiom: 'watch-marketing', size: '1024x1024', scale: '1x' },
  ]
}

function buildBases(config: AppIconGridConfig): Slot[] {
  const bases: Slot[] = []
  if (config.ios === 'single') bases.push(...iosSingleBases())
  else if (config.ios === 'all') bases.push(...iosAllSizeBases())
  if (config.macos === 'all') bases.push(...macAllSizeBases())
  if (config.watchos === 'all') bases.push(...watchAllSizeBases())
  return bases
}

export function inferAppIconGrid(contents: unknown): AppIconGridConfig {
  const empty: AppIconGridConfig = {
    ios: 'none',
    macos: 'none',
    watchos: 'none',
    appearances: 'any',
    gamut: 'any',
  }
  if (!contents || typeof contents !== 'object') return empty
  const images = (contents as { images?: unknown }).images
  if (!Array.isArray(images) || images.length === 0) return empty

  let hasIosSingle = false
  let hasIosAll = false
  let hasMac = false
  let hasWatch = false
  let hasDark = false
  let hasTinted = false
  let hasGamut = false

  for (const raw of images) {
    if (!raw || typeof raw !== 'object') continue
    const s = raw as Slot
    if (s['display-gamut']) hasGamut = true
    const idiom = s.idiom
    if (idiom === 'mac') hasMac = true
    if (idiom === 'watch' || idiom === 'watch-marketing') hasWatch = true
    if (
      idiom === 'iphone' ||
      idiom === 'ipad' ||
      idiom === 'ios-marketing'
    ) {
      hasIosAll = true
    }
    if (idiom === 'universal' && s.platform === 'ios') hasIosSingle = true
    const apps = s.appearances
    if (Array.isArray(apps)) {
      for (const a of apps) {
        if (!a || typeof a !== 'object') continue
        const o = a as { appearance?: string; value?: string }
        if (o.appearance === 'luminosity' && o.value === 'dark') hasDark = true
        if (o.appearance === 'luminosity' && o.value === 'tinted') hasTinted = true
      }
    }
  }

  let ios: AppIconIos = 'none'
  if (hasIosSingle) ios = 'single'
  else if (hasIosAll) ios = 'all'

  let appearances: AppIconAppearances = 'any'
  if (hasTinted) appearances = 'any-dark-tinted'
  else if (hasDark) appearances = 'any-dark'

  return {
    ios,
    macos: hasMac ? 'all' : 'none',
    watchos: hasWatch ? 'all' : 'none',
    appearances,
    gamut: hasGamut ? 'both' : 'any',
  }
}

export function applyAppIconGrid(
  contents: unknown,
  config: AppIconGridConfig,
): unknown {
  if (!contents || typeof contents !== 'object') {
    throw new Error('Contents.json root must be an object')
  }
  const root = clone(contents) as Record<string, unknown>
  const prev = Array.isArray(root.images) ? (root.images as Slot[]) : []
  const byId = new Map<string, string>()
  for (const s of prev) {
    if (!s || typeof s !== 'object') continue
    if (typeof s.filename === 'string') {
      byId.set(appIconSlotIdentity(s), s.filename)
    }
  }
  const next = withAppearancesAndGamut(buildBases(config), config).map((s) => {
    const fn = byId.get(appIconSlotIdentity(s))
    return fn ? { ...s, filename: fn } : s
  })
  root.images = next
  return root
}
