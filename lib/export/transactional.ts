import type { SupabaseClient } from '@supabase/supabase-js'

export const EXPORT_HEADER = [
  'Date', 'JE#', 'Account code', 'Account', 'Description', 'Debit', 'Credit', 'Source', 'Reference',
]

export interface ExportEntry {
  id: string
  date: string
  journal_number: number | null
  reference: string | null
  source: string
  description: string
}

export interface ExportLine {
  entry_id: string
  debit: number | string
  credit: number | string
  description: string | null
  created_at?: string
  acct_accounts: { code: string; name: string } | null
}

/** Pure: map posted lines to CSV rows, sorted by date, then JE number, then posting order. */
export function buildExportRows(entries: ExportEntry[], lines: ExportLine[]): (string | number)[][] {
  const byId = new Map(entries.map(e => [e.id, e]))
  return lines
    .map(l => {
      const e = byId.get(l.entry_id)
      return {
        d: e?.date ?? '',
        je: e?.journal_number ?? 0,
        seq: l.created_at ?? '',
        cells: [
          e?.date ?? '',
          e?.journal_number ?? '',
          l.acct_accounts?.code ?? '',
          l.acct_accounts?.name ?? '',
          l.description ?? e?.description ?? '',
          Number(l.debit).toFixed(2),
          Number(l.credit).toFixed(2),
          e?.source ?? '',
          e?.reference ?? '',
        ] as (string | number)[],
      }
    })
    .sort((a, b) => a.d.localeCompare(b.d) || a.je - b.je || a.seq.localeCompare(b.seq))
    .map(r => r.cells)
}

/** Fetch posted journal lines in [from, to] (paginated) and build CSV rows. Throws on query error. */
export async function fetchTransactionalExport(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<{ header: string[]; rows: (string | number)[][] }> {
  const entries: ExportEntry[] = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('acct_journal_entries')
      .select('id, date, journal_number, reference, source, description')
      .gte('date', from).lte('date', to)
      .eq('is_posted', true)
      .order('date', { ascending: true })
      .order('journal_number', { ascending: true })
      .range(offset, offset + 999)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    entries.push(...(data as ExportEntry[]))
    if (data.length < 1000) break
    offset += 1000
  }
  if (entries.length === 0) return { header: EXPORT_HEADER, rows: [] }

  const ids = entries.map(e => e.id)
  const lines: ExportLine[] = []
  const BATCH = 500
  for (let i = 0; i < ids.length; i += BATCH) {
    const { data, error } = await supabase
      .from('acct_journal_lines')
      .select('entry_id, debit, credit, description, created_at, acct_accounts(code, name)')
      .in('entry_id', ids.slice(i, i + BATCH))
    if (error) throw new Error(error.message)
    if (data) lines.push(...(data as unknown as ExportLine[]))
  }

  return { header: EXPORT_HEADER, rows: buildExportRows(entries, lines) }
}
