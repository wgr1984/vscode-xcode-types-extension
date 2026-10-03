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
  const lastEmitted = useRef(text)
  const epoch = useRef(0)
  const pasteFlush = useRef(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorSet = useMemo(
    () => new Set(errorLines ?? []),
    [errorLines],
  )

  useEffect(() => {
    if (text === lastEmitted.current) return
    // undo/redo/external — drop pending paste/type emit
    epoch.current += 1
    setLocal(text)
    lastEmitted.current = text
    if (timer.current) clearTimeout(timer.current)
  }, [text])

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

  useLayoutEffect(() => {
    const ta = taRef.current
    const pre = preRef.current
    if (!ta) return
    // VS Code webview injects textarea color !important — beat it.
    ta.style.setProperty('color', 'transparent', 'important')
    ta.style.setProperty('-webkit-text-fill-color', 'transparent', 'important')
    ta.style.setProperty(
      'caret-color',
      'var(--vscode-editorCursor-foreground, #aeafad)',
      'important',
    )
    const fit = () => {
      ta.style.height = '0px'
      const h = Math.max(ta.scrollHeight, pre?.scrollHeight ?? 0)
      ta.style.height = `${h}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(ta.parentElement ?? ta)
    return () => ro.disconnect()
  }, [local, html])

  const emit = (next: string, delayMs: number) => {
    setLocal(next)
    const e = epoch.current
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (e !== epoch.current) return // stale after undo/host sync
      lastEmitted.current = next
      onChange(next)
    }, delayMs)
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return (
    <div className="raw-editor h-full min-h-0 overflow-auto bg-[var(--vscode-editor-background)] p-3">
      <div className="raw-editor__stack">
        <pre
          ref={preRef}
          aria-hidden
          className="raw-editor__layer raw-editor__pre pointer-events-none text-[#d4d4d4]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <textarea
          ref={taRef}
          value={local}
          spellCheck={false}
          onPaste={() => {
            pasteFlush.current = true
          }}
          onChange={(e) => {
            const delay = pasteFlush.current ? 0 : 120
            pasteFlush.current = false
            emit(e.target.value, delay)
          }}
          className="raw-editor__layer raw-editor__textarea"
        />
      </div>
    </div>
  )
}
