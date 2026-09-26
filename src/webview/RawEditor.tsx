import { useEffect, useMemo, useRef, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-properties'
import { prismLangFor } from './prismLang'

type Props = {
  text: string
  languageId: string
  onChange: (text: string) => void
}

export function RawEditor({ text, languageId, onChange }: Props) {
  const [local, setLocal] = useState(text)
  const dirty = useRef(false)
  const preRef = useRef<HTMLPreElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!dirty.current) setLocal(text)
  }, [text])

  const lang = prismLangFor(languageId)

  const html = useMemo(() => {
    const code = local.endsWith('\n') ? local : local + '\n'
    if (lang === 'none' || !Prism.languages[lang]) {
      return Prism.util.encode(code) as string
    }
    return Prism.highlight(code, Prism.languages[lang], lang)
  }, [local, lang])

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
    <div className="relative h-[calc(100vh-6rem)] min-h-[12rem] bg-[var(--vscode-editor-background)]">
      <pre
        ref={preRef}
        aria-hidden
        className={`${shared} pointer-events-none text-[var(--vscode-editor-foreground)]`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <textarea
        ref={taRef}
        value={local}
        spellCheck={false}
        onScroll={syncScroll}
        onChange={(e) => emit(e.target.value)}
        className={`${shared} resize-none bg-transparent text-transparent caret-[var(--vscode-editorCursor-foreground)] outline-none`}
      />
    </div>
  )
}
