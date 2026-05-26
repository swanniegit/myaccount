'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import MonthPicker, { currentMonth, type MonthValue } from '@/components/ui/MonthPicker'
import ReconcileView from '@/components/banking/ReconcileView'
import CashbookView from '@/components/banking/CashbookView'
import CashbookBatchesView from '@/components/banking/CashbookBatchesView'
import type { BankAccountLite } from '@/components/banking/types'

type View = 'reconcile' | 'cashbook' | 'batches'

const TITLES: Record<View, { title: string; sub: string }> = {
  reconcile: { title: 'Bank reconciliation', sub: 'matching imported txns to your books' },
  cashbook:  { title: 'Cashbook',            sub: 'receipts and payments with running balance' },
  batches:   { title: 'Cashbook Batches',    sub: 'transactions grouped into dated batches' },
}

function BankingInner() {
  const params = useSearchParams()
  const view = (['reconcile', 'cashbook', 'batches'].includes(params.get('view') ?? '')
    ? params.get('view')
    : 'reconcile') as View

  const [account, setAccount] = useState<BankAccountLite | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState<MonthValue>(currentMonth())

  useEffect(() => { loadAccount() }, [])

  async function loadAccount() {
    const { data } = await supabase
      .from('acct_bank_accounts').select('id, name, account_number, balance')
      .eq('account_number', '63044191201').maybeSingle()
    setAccount(data ?? null)
    setLoading(false)
  }

  if (!loading && !account) {
    return <div className="p-5 text-sm text-ink-2">No bank account configured.</div>
  }

  const meta = TITLES[view]

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">{meta.title}</h1>
          <p className="text-xs mt-0.5 text-ink-2">{account?.name} · {meta.sub}</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker value={period} onChange={setPeriod} />
          {view === 'reconcile' && <Button size="sm">Finish reconcile</Button>}
        </div>
      </div>

      {!account ? (
        <div className="text-sm p-4 text-ink-2">Loading…</div>
      ) : view === 'cashbook' ? (
        <CashbookView account={account} period={period} />
      ) : view === 'batches' ? (
        <CashbookBatchesView account={account} period={period} />
      ) : (
        <ReconcileView account={account} period={period} />
      )}
    </div>
  )
}

export default function BankingPage() {
  return (
    <Suspense fallback={<div className="p-5 text-sm text-ink-2">Loading…</div>}>
      <BankingInner />
    </Suspense>
  )
}
