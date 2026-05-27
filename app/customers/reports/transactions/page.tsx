'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Badge from '@/components/ui/Badge'
import MonthPicker, { currentMonth, monthRange, type MonthValue } from '@/components/ui/MonthPicker'
import { formatDate } from '@/lib/utils'

interface Inv { id: string; number: string; date: string; status: string; total: number }
interface Group { name: string; invoices: Inv[]; total: number }

const money = (n: number) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })

export default function CustomerTransactionsReportPage() {
  const [groups, setGroups]   = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState<MonthValue>(currentMonth())

  useEffect(() => { load() }, [period])

  async function load() {
    setLoading(true)
    const { start, end } = monthRange(period)
    const { data } = await supabase
      .from('acct_invoices')
      .select('id, number, date, status, total, contact_id, acct_contacts(name)')
      .eq('invoice_type', 'invoice')
      .neq('status', 'void')
      .gte('date', start).lt('date', end)
      .order('date', { ascending: true })

    const byCustomer = new Map<string, Group>()
    for (const i of (data ?? []) as any[]) {
      const key = i.contact_id ?? (i.acct_contacts?.name ?? '—')
      const g: Group = byCustomer.get(key) ?? { name: i.acct_contacts?.name ?? '—', invoices: [], total: 0 }
      g.invoices.push({ id: i.id, number: i.number, date: i.date, status: i.status, total: Number(i.total) })
      g.total += Number(i.total)
      byCustomer.set(key, g)
    }
    setGroups(Array.from(byCustomer.values()).sort((a, b) => a.name.localeCompare(b.name)))
    setLoading(false)
  }

  const grand = groups.reduce((s, g) => s + g.total, 0)
  const count = groups.reduce((s, g) => s + g.invoices.length, 0)

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link href="/customers/reports" className="text-xs text-accent hover:underline">← Reports</Link>
          <h1 className="text-xl font-semibold mt-1">Transactions</h1>
          <p className="text-xs mt-0.5 text-ink-2">Invoices per customer · {count} invoices · R {money(grand)}</p>
        </div>
        <MonthPicker value={period} onChange={setPeriod} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left">Date</th>
              <th className="text-left">Invoice</th>
              <th className="text-left">Status</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="t-row">
                  {[...Array(4)].map((_, j) => (
                    <td key={j} className="t-cell"><div className="h-3 rounded animate-pulse bg-paper-edge" /></td>
                  ))}
                </tr>
              ))
            ) : groups.length === 0 ? (
              <tr className="t-empty"><td colSpan={4}>No invoices this month</td></tr>
            ) : (
              groups.map(g => (
                <FragmentGroup key={g.name} group={g} />
              ))
            )}
            {!loading && groups.length > 0 && (
              <tr style={{ borderTop: '2px solid var(--paper-edge)' }}>
                <td className="t-cell font-bold" colSpan={3}>Grand total</td>
                <td className="t-cell num font-bold">{money(grand)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FragmentGroup({ group }: { group: Group }) {
  return (
    <>
      <tr style={{ background: 'var(--accent-soft)' }}>
        <td colSpan={4} className="px-3 py-1.5 font-semibold text-xs">{group.name}</td>
      </tr>
      {group.invoices.map(inv => (
        <tr key={inv.id} className="t-row">
          <td className="t-cell num text-ink-2">{formatDate(inv.date)}</td>
          <td className="t-cell num text-accent">{inv.number}</td>
          <td className="t-cell"><Badge status={inv.status} /></td>
          <td className="t-cell num">{money(inv.total)}</td>
        </tr>
      ))}
      <tr className="bg-paper-edge">
        <td className="px-3 py-1 font-medium" colSpan={3}>Subtotal · {group.name}</td>
        <td className="px-3 py-1 num font-semibold">{money(group.total)}</td>
      </tr>
    </>
  )
}
