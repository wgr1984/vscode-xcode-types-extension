import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-properties'
import { prismLangFor } from './prismLang'

/** Hardcoded — VS Code webview CSS vars often empty (fallback ignored). */
const TOKEN_COLOR: Record<string, string> = {
  comment: '#6a9955',
  prolog: '#6a9955',
  doctype: '#6a9955',
  cdata: '#6a9955',
  punctuation: '#d4d4d4',
  property: '#9cdcfe',
  tag: '#569cd6',
  boolean: '#569cd6',
  number: '#b5cea8',
  constant: '#9cdcfe',
  symbol: '#9cdcfe',
  selector: '#d7ba7d',
  'attr-name': '#9cdcfe',
  string: '#ce9178',
  char: '#ce9178',
  builtin: '#ce9178',
  inserted: '#ce9178',
  operator: '#d4d4d4',
  entity: '#569cd6',
  url: '#ce9178',
  atrule: '#569cd6',
  'attr-value': '#ce9178',
  keyword: '#569cd6',
  function: '#dcdcaa',
  'class-name': '#4ec9b0',
  regex: '#d16969',
  important: '#569cd6',
  variable: '#9cdcfe',
}

/** Prism emits class="token foo bar"; paint via inline style (beats webview CSS). */
export function colorizePrismHtml(html: string): string {
  return html.replace(/class="token([^"]*)"/g, (full, classes: string) => {
    const kinds = classes.trim().split(/\s+/).filter(Boolean)
    const color = kinds.map((k) => TOKEN_COLOR[k]).find(Boolean) ?? '#d4d4d4'
    return `${full} style="color:${color}"`
  })
}

type Props = {
  text: string
  languageId: string
  errorLines?: number[]
  onChange: (text: string) => void
}

export function RawEditor({ text, languageId, errorLines, onChange }: Props) {
  const [local, setLocal] = useState(text)
  const dirty = useRef(false)
  const preRef = useRef<HTMLPreElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorSet = useMemo(
    () => new Set(errorLines ?? []),
    [errorLines],
  )

  useEffect(() => {
    if (!dirty.current) setLocal(text)
  }, [text])

  useLayoutEffect(() => {
    const ta = taRef.current
    if (!ta) return
    // VS Code webview injects textarea color !important — beat it.
    ta.style.setProperty('color', 'transparent', 'important')
    ta.style.setProperty('-webkit-text-fill-color', 'transparent', 'important')
    ta.style.setProperty(
      'caret-color',
      'var(--vscode-editorCursor-foreground, #aeafad)',
      'important',
    )
  }, [])

  const lang = prismLangFor(languageId)

  const html = useMemo(() => {
    const lines = local.split('\n')
    return lines
      .map((line, i) => {
        let raw: string
        if (lang === 'none' || !Prism.languages[lang]) {
          raw = Prism.util.encode(line) as string
        } else {
          raw = Prism.highlight(line, Prism.languages[lang], lang)
        }
        const colored = colorizePrismHtml(raw)
        if (errorSet.has(i)) {
          return `<span class="raw-error-line">${colored}</span>`
        }
        return colored
      })
      .join('\n')
  }, [local, lang, errorSet])

  const syncScroll = () => {
    const ta = taRef.current
    const pre = preRef.current
    if (!ta || !pre) return
    pre.scrollTop = ta.scrollTop
    pre.scrollLeft = ta.scrollLeft
  }

  const emit = (next: string) => {
    setLocal(next)
    dirty.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onChange(next)
      dirty.current = false
    }, 120)
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const shared =
    'absolute inset-0 m-0 p-3 box-border w-full h-full overflow-auto font-mono text-sm leading-5 whitespace-pre-wrap break-words'

  return (
    <div className="relative h-full min-h-0 bg-[var(--vscode-editor-background)]">
      <pre
        ref={preRef}
        aria-hidden
        className={`${shared} raw-editor__pre pointer-events-none text-[#d4d4d4]`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <textarea
        ref={taRef}
        value={local}
        spellCheck={false}
        onScroll={syncScroll}
        onChange={(e) => emit(e.target.value)}
        className={`${shared} raw-editor__textarea resize-none bg-transparent outline-none`}
      />
    </div>
  )
}
