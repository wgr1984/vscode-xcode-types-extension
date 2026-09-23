import type { FormatAdapter } from './types'

const adapters = new Map<string, FormatAdapter>()

export function registerAdapter(adapter: FormatAdapter): void {
  adapters.set(adapter.languageId, adapter)
}

export function getAdapter(languageId: string): FormatAdapter | undefined {
  return adapters.get(languageId)
}
