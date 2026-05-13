import type { SupabaseClient } from '@supabase/supabase-js'
import type { Invoice, InvoiceLine } from '@/lib/types'
import { getAccountId } from '@/lib/livehis-push/account-lookup'

// DR each expense line / DR VAT Input / CR Accounts Payable
export async function approveBill(
  supabase: SupabaseClient,
  bill: Invoice & { lines: InvoiceLine[] }
): Promise<void> {
  const [apId, vatId] = await Promise.all([
    getAccountId(supabase, '2000'), // Accounts Payable
    getAccountId(supabase, '1300'), // VAT Input (Claimable)
  ])

  const { data: entry, error: entryErr } = await supabase
    .from('acct_journal_entries')
    .insert({
      date: bill.date,
      description: `Bill ${bill.number}`,
      reference: bill.number,
      source: 'bill',
      is_posted: true,
    })
    .select('id')
    .single()

  if (entryErr || !entry) throw new Error(entryErr?.message ?? 'Failed to create journal entry')

  const journalLines: object[] = bill.lines
    .filter(l => l.account_id && Number(l.line_total) > 0)
    .map(l => ({
      entry_id: entry.id,
      account_id: l.account_id,
      debit: Number(l.line_total),
      credit: 0,
      description: l.description,
    }))

  const totalVat = Number(bill.vat_amount)
  if (totalVat > 0) {
    journalLines.push({
      entry_id: entry.id,
      account_id: vatId,
      debit: totalVat,
      credit: 0,
      description: `VAT Input — ${bill.number}`,
    })
  }

  journalLines.push({
    entry_id: entry.id,
    account_id: apId,
    debit: 0,
    credit: Number(bill.total),
    description: `AP — ${bill.number}`,
  })

  const { error: linesErr } = await supabase.from('acct_journal_lines').insert(journalLines)
  if (linesErr) throw new Error(linesErr.message)

  const { error: updateErr } = await supabase
    .from('acct_invoices')
    .update({ status: 'sent', journal_entry_id: entry.id })
    .eq('id', bill.id)
  if (updateErr) throw new Error(updateErr.message)
}
