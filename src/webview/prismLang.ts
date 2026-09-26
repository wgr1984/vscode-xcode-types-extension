const MAP: Record<string, string> = {
  plist: 'markup',
  xcstrings: 'json',
  xcconfig: 'properties',
  strings: 'none',
}

/** Prism language id for approximate highlight; `none` = no tokenize. */
export function prismLangFor(languageId: string): string {
  return MAP[languageId] ?? 'none'
}
