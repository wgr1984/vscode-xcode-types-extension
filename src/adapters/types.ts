export type Column = { key: string; label: string; editable?: boolean }
export type Row = { id: string; cells: Record<string, string>; meta?: unknown }
export type Banner = { level: 'error' | 'info'; text: string }
export type TableModel = { columns: Column[]; rows: Row[]; banner?: Banner }

export interface FormatAdapter {
  readonly languageId: string
  parse(text: string): TableModel
  serialize(model: TableModel): string
}
