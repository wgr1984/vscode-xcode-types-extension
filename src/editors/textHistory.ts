/** Webview CmdZ mirror. Empty → undefined (caller must no-op). */

export type DocHistory = {
  undo: string[]
  redo: string[]
  /** Last known doc text; mismatch on re-open → wipe (edited elsewhere). */
  tip: string
}

/** Session-lived stacks by URI — survives webview dispose, not extension host restart. */
const byUri = new Map<string, DocHistory>()

export function historyFor(uri: string, currentText: string): DocHistory {
  let h = byUri.get(uri)
  if (!h) {
    h = { undo: [], redo: [], tip: currentText }
    byUri.set(uri, h)
    return h
  }
  if (h.tip !== currentText) {
    h.undo.length = 0
    h.redo.length = 0
    h.tip = currentText
  }
  return h
}

export function forgetHistory(uri: string): void {
  byUri.delete(uri)
}

/** @internal tests */
export function _resetHistoryStore(): void {
  byUri.clear()
}

export function pushEdit(undo: string[], redo: string[], previousText: string): void {
  undo.push(previousText)
  redo.length = 0
}

/** Peek + commit so failed writes do not mutate stacks. Undo: from=undo,to=redo. */
export function planMove(
  from: string[],
  to: string[],
  currentText: string,
): { next: string; commit: () => void } | undefined {
  if (from.length === 0) return undefined
  const next = from[from.length - 1]!
  return {
    next,
    commit: () => {
      from.pop()
      to.push(currentText)
    },
  }
}
