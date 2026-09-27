/** Device checkboxes → idiom (+ optional subtype). */
export type DeviceId =
  | 'universal'
  | 'iphone'
  | 'ipad'
  | 'mac'
  | 'tv'
  | 'watch'
  | 'car'
  | 'vision'
  | 'mac-catalyst'

export type ImageGridConfig = {
  devices: DeviceId[]
  /** any | any-dark | light-dark */
  appearances: 'any' | 'any-dark' | 'light-dark'
  highContrast: boolean
  individualScales: boolean
  gamut: 'any' | 'both'
  direction: 'fixed' | 'both'
  widthClass: boolean
  heightClass: boolean
  memory: string[]
  graphics: string[]
}

export const DEVICE_OPTIONS: { id: DeviceId; label: string }[] = [
  { id: 'universal', label: 'Universal' },
  { id: 'iphone', label: 'iPhone' },
  { id: 'ipad', label: 'iPad' },
  { id: 'mac-catalyst', label: 'Mac Catalyst' },
  { id: 'car', label: 'CarPlay' },
  { id: 'mac', label: 'Mac' },
  { id: 'vision', label: 'Apple Vision' },
  { id: 'watch', label: 'Apple Watch' },
  { id: 'tv', label: 'Apple TV' },
]

export const MEMORY_OPTIONS = ['1GB', '2GB', '3GB', '4GB'] as const
export const GRAPHICS_OPTIONS = [
  'metal1v2',
  'metal1v3',
  'metal2v2',
  'metal2v3',
  'metal3v1',
  'metal3v2',
  'metal4v1',
] as const

type Slot = Record<string, unknown>

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

/** Stable identity for filename remapping. */
export function slotIdentity(slot: Slot): string {
  const parts = [
    `idiom=${slot.idiom ?? ''}`,
    `subtype=${slot.subtype ?? ''}`,
    `scale=${slot.scale ?? ''}`,
    `appearances=${appearancesKey(slot)}`,
    `gamut=${slot['display-gamut'] ?? ''}`,
    `dir=${slot['language-direction'] ?? ''}`,
    `w=${slot['width-class'] ?? ''}`,
    `h=${slot['height-class'] ?? ''}`,
    `mem=${slot.memory ?? ''}`,
    `gfx=${slot['graphics-feature-set'] ?? ''}`,
    `sw=${slot['screen-width'] ?? ''}`,
    `locale=${slot.locale ?? ''}`,
  ]
  return parts.join(';')
}

function deviceOf(slot: Slot): DeviceId | undefined {
  if (slot.subtype === 'mac-catalyst') return 'mac-catalyst'
  const idiom = slot.idiom
  if (typeof idiom !== 'string') return 'universal'
  if (
    idiom === 'universal' ||
    idiom === 'iphone' ||
    idiom === 'ipad' ||
    idiom === 'mac' ||
    idiom === 'tv' ||
    idiom === 'watch' ||
    idiom === 'car' ||
    idiom === 'vision'
  ) {
    return idiom
  }
  return undefined
}

function scalesFor(device: DeviceId): string[] {
  switch (device) {
    case 'universal':
    case 'iphone':
      return ['1x', '2x', '3x']
    case 'ipad':
    case 'mac':
    case 'tv':
    case 'car':
      return ['1x', '2x']
    case 'watch':
    case 'vision':
    case 'mac-catalyst':
      return ['2x']
  }
}

function baseDeviceSlot(device: DeviceId): Slot {
  if (device === 'mac-catalyst') {
    return { idiom: 'ipad', subtype: 'mac-catalyst' }
  }
  return { idiom: device }
}

type AppearanceSpec = { appearance: string; value: string }[] | undefined

function appearanceVariants(
  mode: ImageGridConfig['appearances'],
  highContrast: boolean,
): AppearanceSpec[] {
  const base: AppearanceSpec[] = []
  if (mode === 'any') {
    base.push(undefined)
  } else if (mode === 'any-dark') {
    base.push(undefined)
    base.push([{ appearance: 'luminosity', value: 'dark' }])
  } else {
    base.push([{ appearance: 'luminosity', value: 'light' }])
    base.push([{ appearance: 'luminosity', value: 'dark' }])
  }
  if (!highContrast) return base
  const out: AppearanceSpec[] = [...base]
  for (const b of base) {
    const withHc = [
      ...(b ?? []),
      { appearance: 'contrast', value: 'high' },
    ]
    out.push(withHc)
  }
  return out
}

function opts(enabled: boolean, values: string[]): (string | undefined)[] {
  return enabled ? values : [undefined]
}

/** Infer grid toggles from existing images[]. */
export function inferImageGrid(contents: unknown): ImageGridConfig {
  const empty: ImageGridConfig = {
    devices: ['universal'],
    appearances: 'any',
    highContrast: false,
    individualScales: true,
    gamut: 'any',
    direction: 'fixed',
    widthClass: false,
    heightClass: false,
    memory: [],
    graphics: [],
  }
  if (!contents || typeof contents !== 'object') return empty
  const images = (contents as { images?: unknown }).images
  if (!Array.isArray(images) || images.length === 0) return empty

  const slots = images.filter(
    (x): x is Slot => !!x && typeof x === 'object',
  )
  const devices = new Set<DeviceId>()
  let hasDark = false
  let hasLight = false
  let hasContrast = false
  let hasScale = false
  let hasGamut = false
  let hasDir = false
  let hasW = false
  let hasH = false
  const memory = new Set<string>()
  const graphics = new Set<string>()

  for (const s of slots) {
    const d = deviceOf(s)
    if (d) devices.add(d)
    if (typeof s.scale === 'string') hasScale = true
    if (s['display-gamut']) hasGamut = true
    if (s['language-direction']) hasDir = true
    if (s['width-class']) hasW = true
    if (s['height-class']) hasH = true
    if (typeof s.memory === 'string') memory.add(s.memory)
    if (typeof s['graphics-feature-set'] === 'string') {
      graphics.add(String(s['graphics-feature-set']))
    }
    const apps = s.appearances
    if (Array.isArray(apps)) {
      for (const a of apps) {
        if (!a || typeof a !== 'object') continue
        const o = a as { appearance?: string; value?: string }
        if (o.appearance === 'luminosity' && o.value === 'dark') hasDark = true
        if (o.appearance === 'luminosity' && o.value === 'light') hasLight = true
        if (o.appearance === 'contrast') hasContrast = true
      }
    }
  }

  let appearances: ImageGridConfig['appearances'] = 'any'
  if (hasLight && hasDark) appearances = 'light-dark'
  else if (hasDark) appearances = 'any-dark'

  const deviceList = [...devices]
  return {
    devices: deviceList.length ? deviceList : ['universal'],
    appearances,
    highContrast: hasContrast,
    individualScales: hasScale,
    gamut: hasGamut ? 'both' : 'any',
    direction: hasDir ? 'both' : 'fixed',
    widthClass: hasW,
    heightClass: hasH,
    memory: [...memory].sort(),
    graphics: [...graphics].sort(),
  }
}

function buildSlots(config: ImageGridConfig): Slot[] {
  const devices =
    config.devices.length > 0 ? config.devices : (['universal'] as DeviceId[])
  const appVars = appearanceVariants(config.appearances, config.highContrast)
  const gamuts = opts(config.gamut === 'both', ['sRGB', 'display-P3'])
  const dirs = opts(config.direction === 'both', [
    'left-to-right',
    'right-to-left',
  ])
  const widths = opts(config.widthClass, ['compact', 'regular'])
  const heights = opts(config.heightClass, ['compact', 'regular'])
  const mems: (string | undefined)[] =
    config.memory.length > 0 ? config.memory : [undefined]
  const gfxs: (string | undefined)[] =
    config.graphics.length > 0 ? config.graphics : [undefined]

  const out: Slot[] = []
  for (const device of devices) {
    const scales: (string | undefined)[] = config.individualScales
      ? scalesFor(device)
      : [undefined]
    for (const scale of scales) {
      for (const apps of appVars) {
        for (const gamut of gamuts) {
          for (const dir of dirs) {
            for (const w of widths) {
              for (const h of heights) {
                for (const mem of mems) {
                  for (const gfx of gfxs) {
                    const slot: Slot = { ...baseDeviceSlot(device) }
                    if (scale) slot.scale = scale
                    if (apps) slot.appearances = apps
                    if (gamut) slot['display-gamut'] = gamut
                    if (dir) slot['language-direction'] = dir
                    if (w) slot['width-class'] = w
                    if (h) slot['height-class'] = h
                    if (mem) slot.memory = mem
                    if (gfx) slot['graphics-feature-set'] = gfx
                    out.push(slot)
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return out
}

/** Reshape images[] from grid config; keep filenames when identity matches. */
export function applyImageGrid(
  contents: unknown,
  config: ImageGridConfig,
): unknown {
  if (!contents || typeof contents !== 'object') {
    throw new Error('Contents.json root must be an object')
  }
  const root = clone(contents) as Record<string, unknown>
  const prev = Array.isArray(root.images) ? (root.images as Slot[]) : []
  const byId = new Map<string, string>()
  for (const s of prev) {
    if (!s || typeof s !== 'object') continue
    if (typeof s.filename === 'string') byId.set(slotIdentity(s), s.filename)
  }
  const next = buildSlots(config).map((s) => {
    const fn = byId.get(slotIdentity(s))
    return fn ? { ...s, filename: fn } : s
  })
  root.images = next
  return root
}
