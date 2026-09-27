import Prism from 'prismjs'

/** Minimal .strings grammar: comments, quoted strings, = ; */
if (!Prism.languages.strings) {
  Prism.languages.strings = {
    comment: [
      { pattern: /\/\*[\s\S]*?\*\//, greedy: true },
      { pattern: /\/\/.*/, greedy: true },
    ],
    string: { pattern: /"(?:\\.|[^\\"])*"/, greedy: true },
    operator: /=/,
    punctuation: /;/,
  }
}

const MAP: Record<string, string> = {
  plist: 'markup',
  xcstrings: 'json',
  xcconfig: 'properties',
  strings: 'strings',
}

/** Prism language id for approximate highlight; `none` = no tokenize. */
export function prismLangFor(languageId: string): string {
  return MAP[languageId] ?? 'none'
}
