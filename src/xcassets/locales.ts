/** Common BCP-47-ish ids Xcode shows for asset localization. */
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
