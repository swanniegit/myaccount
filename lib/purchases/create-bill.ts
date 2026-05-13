import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateBillInput } from './types'

function round2(n: number) { return Math.round(n * 100) / 100 }

export async function createBill(supabase: SupabaseClient, input: CreateBillInput): Promise<string> {
  const subtotal   = round2(input.lines.reduce((s, l) => s + l.line_total, 0))
  const vat_amount = round2(input.lines.reduce((s, l) => s + l.line_total * l.vat_rate / 100, 0))
  const total      = round2(subtotal + vat_amount)

  const { data: bill, error } = await supabase
    .from('acct_invoices')
    .insert({
      number: input.number,
      contact_id: input.contact_id,
      date: input.date,
      due_date: input.due_date,
      status: 'draft',
      invoice_type: 'bill',
      subtotal,
      vat_amount,
      total,
      notes: input.notes,
    })
    .select('id')
    .single()

  if (error || !bill) throw new Error(error?.message ?? 'Failed to create bill')

  const { error: lErr } = await supabase.from('acct_invoice_lines').insert(
    input.lines.map(l => ({
      invoice_id: bill.id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      vat_rate: l.vat_rate,
      account_id: l.account_id || null,
      line_total: l.line_total,
    }))
  )
  if (lErr) throw new Error(lErr.message)

  return bill.id
}
