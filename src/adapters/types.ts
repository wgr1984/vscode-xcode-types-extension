export type Column = {
  key: string
  label: string
  editable?: boolean
  editor?: 'text' | 'select'
  options?: string[]
}
export type Row = { id: string; cells: Record<string, string>; meta?: unknown }
export type Banner = { level: 'error' | 'info'; text: string }
/** 0-based line; cols default to full line when omitted. */
export type ParseIssue = {
  message: string
  line: number
  startCol?: number
  endCol?: number
}
export type TableModel = {
  columns: Column[]
  rows: Row[]
  banner?: Banner
  issues?: ParseIssue[]
}

export interface FormatAdapter {
  readonly languageId: string
  parse(text: string): TableModel
  serialize(model: TableModel): string
}
