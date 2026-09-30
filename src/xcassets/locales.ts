/** Common BCP-47-ish ids — fallback when the workspace has no project locales. */
export const COMMON_LOCALES: { id: string; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'es', label: 'Spanish' },
  { id: 'it', label: 'Italian' },
  { id: 'ja', label: 'Japanese' },
  { id: 'ko', label: 'Korean' },
  { id: 'pt-BR', label: 'Portuguese (Brazil)' },
  { id: 'pt-PT', label: 'Portuguese (Portugal)' },
  { id: 'zh-Hans', label: 'Chinese (Simplified)' },
  { id: 'zh-Hant', label: 'Chinese (Traditional)' },
  { id: 'nl', label: 'Dutch' },
  { id: 'pl', label: 'Polish' },
  { id: 'ru', label: 'Russian' },
  { id: 'tr', label: 'Turkish' },
  { id: 'ar', label: 'Arabic' },
  { id: 'he', label: 'Hebrew' },
]

const LABEL_BY_ID = new Map(COMMON_LOCALES.map((l) => [l.id, l.label]))

export function localeDisplayName(id: string): string {
  return LABEL_BY_ID.get(id) ?? id
}

/** Extract locale ids currently present on slots. */
export function localesFromContents(
  contents: unknown,
  arrayKey: 'images' | 'colors' = 'images',
): string[] {
  if (!contents || typeof contents !== 'object') return []
  const arr = (contents as Record<string, unknown>)[arrayKey]
  if (!Array.isArray(arr)) return []
  const set = new Set<string>()
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const loc = (item as { locale?: unknown }).locale
    if (typeof loc === 'string' && loc) set.add(loc)
  }
  return [...set].sort()
}

/**
 * Locales declared in a String Catalog (`.xcstrings`):
 * `sourceLanguage` + every key under `strings.*.localizations`.
 */
export function localesFromXcstringsText(text: string): string[] {
  let data: {
    sourceLanguage?: string
    strings?: Record<string, { localizations?: Record<string, unknown> }>
  }
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    return []
  }
  const set = new Set<string>()
  if (typeof data.sourceLanguage === 'string' && data.sourceLanguage) {
    set.add(data.sourceLanguage)
  }
  for (const entry of Object.values(data.strings ?? {})) {
    const locs = entry?.localizations
    if (!locs || typeof locs !== 'object') continue
    for (const id of Object.keys(locs)) {
      if (id) set.add(id)
    }
  }
  return [...set].sort()
}

export function toLocaleOptions(
  ids: Iterable<string>,
): { id: string; label: string }[] {
  return [...new Set(ids)]
    .filter(Boolean)
    .map((id) => ({ id, label: localeDisplayName(id) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
