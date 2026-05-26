import type { SupabaseClient } from '@supabase/supabase-js'
import type { Invoice, InvoiceLine } from '@/lib/types'
import { getAccountId } from '@/lib/livehis-push/account-lookup'
import { recordJournalEntry, type JournalLineInput } from '@/lib/ledger'

// DR each expense line / DR VAT Input / CR Accounts Payable
export async function approveBill(
  supabase: SupabaseClient,
  bill: Invoice & { lines: InvoiceLine[] }
): Promise<void> {
  // V-09: SARS requires VAT number for supplier invoices > R 5 000
  if (Number(bill.vat_amount) > 5000 && bill.contact_id) {
    const { data: contact } = await supabase
      .from('acct_contacts')
      .select('vat_number')
      .eq('id', bill.contact_id)
      .maybeSingle()
    if (!contact?.vat_number) {
      throw new Error(
        `Bill ${bill.number}: VAT amount exceeds R 5 000 but supplier has no VAT registration number on file. ` +
        `Add the supplier's VAT number in Contacts before approving.`
      )
    }
  }

  const [apId, vatId] = await Promise.all([
    getAccountId(supabase, '2000'),
    getAccountId(supabase, '1300'),
  ])

  const lines: JournalLineInput[] = bill.lines
    .filter(l => l.account_id && Number(l.line_total) > 0)
    .map(l => ({
      account_id: l.account_id!,
      debit: Number(l.line_total),
      credit: 0,
      description: l.description,
    }))

  const totalVat = Number(bill.vat_amount)
  if (totalVat > 0) {
    lines.push({
      account_id: vatId,
      debit: totalVat,
      credit: 0,
      description: `VAT Input — ${bill.number}`,
      tax_type_code: '01',
    })
  }

  lines.push({
    account_id: apId,
    debit: 0,
    credit: Number(bill.total),
    description: `AP — ${bill.number}`,
  })

  const { entry } = await recordJournalEntry(supabase, {
    date: bill.date,
    description: `Bill ${bill.number}`,
    reference: bill.number,
    source: 'bill',
    lines,
  })

  const { error: updateErr } = await supabase
    .from('acct_invoices')
    .update({ status: 'sent', journal_entry_id: entry.id })
    .eq('id', bill.id)
  if (updateErr) throw new Error(updateErr.message)
}
