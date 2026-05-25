'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import MonthPicker, { currentMonth, monthRange } from '@/components/ui/MonthPicker'
import type { MonthValue } from '@/components/ui/MonthPicker'

const REPORT_TABS = [
  { label: 'Trial Balance',    href: '/reports/trial-balance' },
  { label: 'Income Statement', href: '/reports/income-statement' },
  { label: 'Balance Sheet',    href: '/reports/balance-sheet' },
  { label: 'Cash Flow',        href: '/reports/cash-flow' },
  { label: 'VAT Detail',       href: '/vat' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// 1-indexed taxYearEnd (2=Feb). Returns 0-indexed MonthValue for FY start.
function fyStart(month: MonthValue, taxYearEnd: number): MonthValue {
  const fyStartMonthZero = taxYearEnd % 12
  const fyStartYear = month.month >= fyStartMonthZero ? month.year : month.year - 1
  return { year: fyStartYear, month: fyStartMonthZero }
}

// Account codes classified for IAS 7 indirect method
const OPERATING_WC   = ['1100','1200','1400','2000','2400']  // AR, Inventory, Prepaid, AP, Accrued
const INVESTING      = ['1500','1510','1600','1610','1700','1710','1800']
const FINANCING      = ['2600','2700','3000','3200']
const CASH_ACCOUNTS  = ['1000','1010','1020']
const DEPRECIATION   = ['5800']

interface CashFlowData {
  netProfit: number
  depreciation: number
  wcChanges: { label: string; amount: number }[]
  investing: { label: string; amount: number }[]
  financing: { label: string; amount: number }[]
  openingCash: number
  closingCash: number
}

const BATCH = 1000

export default function CashFlowPage() {
  const [period, setPeriod]     = useState<MonthValue>(currentMonth())
  const [ytd, setYtd]           = useState(false)
  const [taxYearEnd, setTaxYearEnd] = useState(2)
  const [data, setData]         = useState<CashFlowData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    supabase.from('acct_company').select('tax_year_end').maybeSingle().then(({ data: co }) => {
      if (co?.tax_year_end) setTaxYearEnd(co.tax_year_end)
    })
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const rangeStart = ytd ? monthRange(fyStart(period, taxYearEnd)).start : monthRange(period).start
      const rangeEnd   = monthRange(period).end

      const { data: accounts } = await supabase
        .from('acct_accounts')
        .select('id, code, type, sub_type, normal_balance, name')
        .eq('is_active', true)

      if (!accounts) { setError('Failed to load accounts'); setLoading(false); return }

      const accByCode: Record<string, typeof accounts[0]> = {}
      const accById:   Record<string, typeof accounts[0]> = {}
      for (const a of accounts) { accByCode[a.code] = a; accById[a.id] = a }

      // Period totals (IS + WC + Investing + Financing)
      const periodTotals: Record<string, { debit: number; credit: number }> = {}
      let offset = 0

      while (true) {
        const { data: batch, error: e } = await supabase
          .from('acct_journal_lines')
          .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
          .eq('acct_journal_entries.is_posted', true)
          .gte('acct_journal_entries.date', rangeStart)
          .lt('acct_journal_entries.date', rangeEnd)
          .range(offset, offset + BATCH - 1)

        if (e) { setError(e.message); setLoading(false); return }
        if (!batch || batch.length === 0) break

        for (const l of batch) {
          if (!periodTotals[l.account_id]) periodTotals[l.account_id] = { debit: 0, credit: 0 }
          periodTotals[l.account_id].debit  += Number(l.debit)
          periodTotals[l.account_id].credit += Number(l.credit)
        }

        if (batch.length < BATCH) break
        offset += BATCH
      }

      // Opening cash: cumulative balance of cash accounts before period start
      const cashTotalsOpen: Record<string, { debit: number; credit: number }> = {}
      const cashIds = CASH_ACCOUNTS.map(c => accByCode[c]?.id).filter(Boolean) as string[]

      if (cashIds.length > 0) {
        const { data: openLines } = await supabase
          .from('acct_journal_lines')
          .select('account_id, debit, credit, acct_journal_entries!inner(date, is_posted)')
          .eq('acct_journal_entries.is_posted', true)
          .lt('acct_journal_entries.date', rangeStart)
          .in('account_id', cashIds)

        for (const l of openLines ?? []) {
          if (!cashTotalsOpen[l.account_id]) cashTotalsOpen[l.account_id] = { debit: 0, credit: 0 }
          cashTotalsOpen[l.account_id].debit  += Number(l.debit)
          cashTotalsOpen[l.account_id].credit += Number(l.credit)
        }
      }

      // Helper: net credit for account in period (positive = source; negative = use)
      function periodDelta(code: string) {
        const id = accByCode[code]?.id
        if (!id) return 0
        const t = periodTotals[id]
        return t ? t.credit - t.debit : 0
      }

      // Net profit from IS accounts
      let totalRev = 0, totalExp = 0
      for (const [id, t] of Object.entries(periodTotals)) {
        const acc = accById[id]
        if (!acc) continue
        if (acc.type === 'revenue') totalRev += t.credit - t.debit
        if (acc.type === 'expense') totalExp += t.debit - t.credit
      }
      const netProfit = totalRev - totalExp

      // Depreciation (non-cash): add back debit movement on 5800
      const depAcc = accByCode['5800']
      const depT   = depAcc ? periodTotals[depAcc.id] : null
      const depreciation = depT ? depT.debit - depT.credit : 0

      // Working capital changes (positive = source of cash)
      const wcChanges = OPERATING_WC.map(code => {
        const acc = accByCode[code]
        if (!acc) return null
        return { label: `${acc.code} ${acc.name}`, amount: periodDelta(code) }
      }).filter(Boolean) as { label: string; amount: number }[]

      // Investing (positive delta for fixed assets = asset decreased = cash in; negative = purchase)
      const investing = INVESTING.map(code => {
        const acc = accByCode[code]
        if (!acc) return null
        const delta = periodDelta(code)
        if (delta === 0) return null
        return { label: `${acc.code} ${acc.name}`, amount: delta }
      }).filter(Boolean) as { label: string; amount: number }[]

      // Financing
      const financing = FINANCING.map(code => {
        const acc = accByCode[code]
        if (!acc) return null
        const delta = periodDelta(code)
        if (delta === 0) return null
        return { label: `${acc.code} ${acc.name}`, amount: delta }
      }).filter(Boolean) as { label: string; amount: number }[]

      // Opening and closing cash
      const openingCash = CASH_ACCOUNTS.reduce((sum, code) => {
        const id = accByCode[code]?.id
        if (!id) return sum
        const t = cashTotalsOpen[id]
        return sum + (t ? t.debit - t.credit : 0)
      }, 0)

      // Closing cash = opening + all period movements on cash accounts
      const periodCashDelta = CASH_ACCOUNTS.reduce((sum, code) => {
        const id = accByCode[code]?.id
        if (!id) return sum
        const t = periodTotals[id]
        return sum + (t ? t.debit - t.credit : 0)
      }, 0)
      const closingCash = openingCash + periodCashDelta

      setData({ netProfit, depreciation, wcChanges, investing, financing, openingCash, closingCash })
      setLoading(false)
    }
    load()
  }, [period, ytd, taxYearEnd])

  const operatingCash = data
    ? data.netProfit + data.depreciation + data.wcChanges.reduce((s, r) => s + r.amount, 0)
    : 0
  const investingCash  = data ? data.investing.reduce((s, r) => s + r.amount, 0) : 0
  const financingCash  = data ? data.financing.reduce((s, r) => s + r.amount, 0) : 0
  const netCash        = operatingCash + investingCash + financingCash

  const periodLabel = ytd
    ? `FY YTD to ${MONTHS[period.month]} ${period.year}`
    : `${MONTHS[period.month]} ${period.year}`

  function fmt(n: number, parens = false) {
    if (parens && n < 0) return `(${Math.abs(n).toLocaleString('en-ZA', { minimumFractionDigits: 2 })})`
    return n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })
  }

  const SectionRow = ({ label, amount, indent = false, bold = false }: { label: string; amount: number; indent?: boolean; bold?: boolean }) => (
    <tr className="t-row">
      <td className={`t-cell ${indent ? 'pl-8' : ''} ${bold ? 'font-semibold' : ''}`}>{label}</td>
      <td className={`t-cell num ${bold ? 'font-semibold' : ''}`} style={{ color: amount < 0 ? 'var(--negative)' : undefined }}>
        {fmt(amount, true)}
      </td>
    </tr>
  )

  const SectionHeader = ({ label }: { label: string }) => (
    <tr style={{ background: 'var(--accent-soft)' }}>
      <td colSpan={2} className="px-3 py-1.5 font-semibold text-xs">{label}</td>
    </tr>
  )

  const Subtotal = ({ label, amount }: { label: string; amount: number }) => (
    <tr className="bg-paper-edge border-t border-paper-edge">
      <td className="px-3 py-2 font-semibold">{label}</td>
      <td className="px-3 py-2 num font-semibold" style={{ color: amount < 0 ? 'var(--negative)' : 'var(--positive)' }}>
        {fmt(amount, true)}
      </td>
    </tr>
  )

  return (
    <div className="p-5 max-w-3xl">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Reports · Cash Flow Statement</h1>
          <p className="text-xs mt-0.5 text-ink-2">{periodLabel} · IAS 7 Indirect Method</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker value={period} onChange={setPeriod} />
          <button onClick={() => setYtd(v => !v)} className="pill" data-active={ytd}>FY YTD</button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {REPORT_TABS.map(tab => (
          <Link key={tab.label} href={tab.href} className="pill no-underline" data-active={tab.href === '/reports/cash-flow'}>
            {tab.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="text-xs px-3 py-2 rounded mb-4 text-negative" style={{ background: 'var(--accent-soft)', border: '1px solid var(--negative)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-3 rounded animate-pulse bg-paper-edge mb-2" style={{ width: `${60 + (i % 4) * 10}%` }} />
          ))}
        </div>
      ) : data && (
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="t-head">
              <tr>
                <th className="text-left">Item</th>
                <th className="text-right w-36">R</th>
              </tr>
            </thead>
            <tbody>
              <SectionHeader label="Operating Activities" />
              <SectionRow label="Net profit / (loss) for period" amount={data.netProfit} />
              {data.depreciation !== 0 && (
                <SectionRow label="5800 Depreciation (add back)" amount={data.depreciation} indent />
              )}
              {data.wcChanges.filter(r => r.amount !== 0).map(r => (
                <SectionRow key={r.label} label={r.label} amount={r.amount} indent />
              ))}
              <Subtotal label="Net cash from operating activities" amount={operatingCash} />

              {(data.investing.length > 0) && (
                <>
                  <SectionHeader label="Investing Activities" />
                  {data.investing.map(r => (
                    <SectionRow key={r.label} label={r.label} amount={r.amount} indent />
                  ))}
                  <Subtotal label="Net cash from investing activities" amount={investingCash} />
                </>
              )}

              {(data.financing.length > 0) && (
                <>
                  <SectionHeader label="Financing Activities" />
                  {data.financing.map(r => (
                    <SectionRow key={r.label} label={r.label} amount={r.amount} indent />
                  ))}
                  <Subtotal label="Net cash from financing activities" amount={financingCash} />
                </>
              )}

              <SectionHeader label="Cash Position" />
              <SectionRow label="Opening cash balance" amount={data.openingCash} />
              <SectionRow label="Net increase / (decrease) in cash" amount={netCash} />
            </tbody>
            <tfoot>
              <tr style={{ background: data.closingCash >= 0 ? 'rgba(0,180,100,0.08)' : 'rgba(220,50,50,0.06)', borderTop: '2px solid var(--paper-edge)' }}>
                <td className="px-3 py-2.5 font-bold">Closing cash balance</td>
                <td className="px-3 py-2.5 num font-bold" style={{ color: data.closingCash >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                  {fmt(data.closingCash)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
