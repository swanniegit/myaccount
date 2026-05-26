'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { monthRange, type MonthValue } from '@/components/ui/MonthPicker'
import { formatDate } from '@/lib/utils'
import type { BankAccountLite } from './types'

interface BankTxn { id: string; date: string; amount: number; is_reconciled: boolean; journal_line_id: string | null }
interface Batch { date: string; count: number; receipts: number; payments: number; reconciled: number }

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })

export default function CashbookBatchesView({ account, period }: { account: BankAccountLite; period: MonthValue }) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [account, period])

  async function load() {
    setLoading(true)
    const { start, end } = monthRange(period)
    const { data } = await supabase
      .from('acct_bank_transactions')
      .select('id, date, amount, is_reconciled, journal_line_id')
      .eq('bank_account_id', account.id)
      .gte('date', start).lt('date', end)
      .order('date', { ascending: false })

    const byDate = new Map<string, Batch>()
    for (const t of (data ?? []) as BankTxn[]) {
      const b = byDate.get(t.date) ?? { date: t.date, count: 0, receipts: 0, payments: 0, reconciled: 0 }
      b.count += 1
      if (t.amount > 0) b.receipts += t.amount
      else b.payments += Math.abs(t.amount)
      if (t.is_reconciled || t.journal_line_id) b.reconciled += 1
      byDate.set(t.date, b)
    }
    setBatches(Array.from(byDate.values()))
    setLoading(false)
  }

  return (
    <>
      <div className="mb-4">
        <p className="text-sm font-semibold mb-0.5">{account.name} · cashbook batches</p>
        <p className="text-xs text-ink-2">transactions grouped by entry date · {batches.length} batches this period</p>
      </div>

      {loading ? (
        <div className="text-sm p-4 text-ink-2">Loading…</div>
      ) : batches.length === 0 ? (
        <div className="card p-8 text-center text-xs text-muted">No batches this period</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="t-head">
              <tr>
                <th className="text-left">Batch (date)</th>
                <th className="num">Entries</th>
                <th className="num">Receipts</th>
                <th className="num">Payments</th>
                <th className="num">Net</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => {
                const fullyPosted = b.reconciled === b.count
                return (
                  <tr key={b.date} className="t-row">
                    <td className="t-cell font-medium">{formatDate(b.date)}</td>
                    <td className="t-cell num">{b.count}</td>
                    <td className="t-cell num text-positive">{money(b.receipts)}</td>
                    <td className="t-cell num text-negative">{money(b.payments)}</td>
                    <td className="t-cell num font-semibold">{money(b.receipts - b.payments)}</td>
                    <td className="t-cell">
                      <span className={`badge ${fullyPosted ? 'badge-posted' : 'badge-review'}`}>
                        {fullyPosted ? 'posted' : `${b.reconciled}/${b.count} posted`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
