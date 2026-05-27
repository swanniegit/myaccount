'use client'
import { useCallback, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { monthRange, type MonthValue } from '@/components/ui/MonthPicker'
import type { BankAccountLite } from './types'

interface BankTxn { id: string; date: string; description: string; amount: number }

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })
function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`
}

export default function CashbookView({ account, period }: { account: BankAccountLite; period: MonthValue }) {
  const [txns, setTxns]       = useState<BankTxn[]>([])
  const [opening, setOpening] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { start, end } = monthRange(period)
    const [{ data: prior }, { data: inPeriod }] = await Promise.all([
      supabase.from('acct_bank_transactions').select('amount').eq('bank_account_id', account.id).lt('date', start),
      supabase.from('acct_bank_transactions')
        .select('id, date, description, amount')
        .eq('bank_account_id', account.id)
        .gte('date', start).lt('date', end)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true }),
    ])
    setOpening((prior ?? []).reduce((s, r) => s + Number(r.amount), 0))
    setTxns((inPeriod ?? []) as BankTxn[])
    setLoading(false)
  }, [account, period])

  useEffect(() => { load() }, [load])

  const receipts = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const payments = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const closing  = opening + receipts - payments

  let running = opening

  return (
    <>
      <div className="mb-4">
        <p className="text-sm font-semibold mb-0.5">{account.name} · cashbook</p>
        <p className="text-xs mb-3 text-ink-2">receipts and payments with running balance</p>
        <div className="grid grid-cols-4 gap-3">
          <Stat label="Opening" value={money(opening)} />
          <Stat label="Receipts" value={money(receipts)} positive />
          <Stat label="Payments" value={money(payments)} />
          <Stat label="Closing" value={money(closing)} accent />
        </div>
      </div>

      {loading ? (
        <div className="text-sm p-4 text-ink-2">Loading…</div>
      ) : txns.length === 0 ? (
        <div className="card p-8 text-center text-xs text-muted">No cashbook entries this period</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="t-head">
              <tr>
                <th className="text-left">Date</th>
                <th className="text-left">Description</th>
                <th className="num">Receipt</th>
                <th className="num">Payment</th>
                <th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="t-row">
                <td className="t-cell num text-ink-2">{fmtDate(monthRange(period).start)}</td>
                <td className="t-cell text-ink-2 italic">Opening balance</td>
                <td className="t-cell num">–</td>
                <td className="t-cell num">–</td>
                <td className="t-cell num font-semibold">{money(opening)}</td>
              </tr>
              {txns.map(t => {
                running += t.amount
                return (
                  <tr key={t.id} className="t-row">
                    <td className="t-cell num text-ink-2">{fmtDate(t.date)}</td>
                    <td className="t-cell">{t.description}</td>
                    <td className="t-cell num text-positive">{t.amount > 0 ? money(t.amount) : '–'}</td>
                    <td className="t-cell num text-negative">{t.amount < 0 ? money(Math.abs(t.amount)) : '–'}</td>
                    <td className="t-cell num font-semibold">{money(running)}</td>
                  </tr>
                )
              })}
              <tr style={{ borderTop: '2px solid var(--paper-edge)' }}>
                <td className="t-cell font-semibold" colSpan={2}>Period total</td>
                <td className="t-cell num font-semibold text-positive">{money(receipts)}</td>
                <td className="t-cell num font-semibold text-negative">{money(payments)}</td>
                <td className="t-cell num font-bold">{money(closing)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function Stat({ label, value, accent, positive }: { label: string; value: string; accent?: boolean; positive?: boolean }) {
  const color = accent ? 'var(--accent)' : positive ? 'var(--positive)' : 'var(--ink)'
  return (
    <div className={accent ? 'card-accent kpi' : 'card kpi'}>
      <p className="kpi-label" style={{ color: accent ? 'var(--accent)' : undefined }}>{label}</p>
      <p className="kpi-value num" style={{ color }}>R {value}</p>
    </div>
  )
}
