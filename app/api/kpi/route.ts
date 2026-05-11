import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerClient()

  // SA financial year starts 1 March
  const now = new Date()
  const fyYear = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1
  const fyStart = `${fyYear}-03-01`

  // Cash: sum of active bank account balances (real bank data, not journal lines)
  const { data: bankAccounts } = await supabase
    .from('acct_bank_accounts')
    .select('balance')
    .eq('is_active', true)
  const cash = bankAccounts?.reduce((s, b) => s + Number(b.balance), 0) ?? 0

  // AR: sum of all outstanding invoices (sent + overdue), paginated
  let ar = 0, arOffset = 0
  while (true) {
    const { data } = await supabase
      .from('acct_invoices')
      .select('total')
      .in('status', ['sent', 'overdue'])
      .range(arOffset, arOffset + 999)
    if (!data || data.length === 0) break
    ar += data.reduce((s, i) => s + Number(i.total), 0)
    if (data.length < 1000) break
    arOffset += 1000
  }

  // VAT: sum of vat_amount on all invoices in current FY
  let vat = 0, vatOffset = 0
  while (true) {
    const { data } = await supabase
      .from('acct_invoices')
      .select('vat_amount')
      .gte('date', fyStart)
      .range(vatOffset, vatOffset + 999)
    if (!data || data.length === 0) break
    vat += data.reduce((s, i) => s + Number(i.vat_amount), 0)
    if (data.length < 1000) break
    vatOffset += 1000
  }

  // AP: no bills imported yet
  const ap = 0

  return NextResponse.json({ cash, ar, ap, vat, income: 0, expense: 0, profit: 0 })
}
