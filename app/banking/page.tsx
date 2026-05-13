'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import MonthPicker, { currentMonth, monthRange, type MonthValue } from '@/components/ui/MonthPicker'

interface BankTxn { id: string; date: string; description: string; amount: number; is_reconciled: boolean; journal_line_id: string | null }
interface BankAccount { id: string; name: string; account_number: string; balance: number }

function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`
}

export default function BankingPage() {
  const [account, setAccount] = useState<BankAccount | null>(null)
  const [txns, setTxns]       = useState<BankTxn[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState<MonthValue>(currentMonth())

  useEffect(() => { loadAccount() }, [])
  useEffect(() => { if (account) loadTransactions() }, [account, period])

  async function loadAccount() {
    const { data } = await supabase
      .from('acct_bank_accounts').select('id, name, account_number, balance')
      .eq('account_number', '63044191201').maybeSingle()
    setAccount(data ?? null)
    if (!data) setLoading(false)
  }

  async function loadTransactions() {
    if (!account) return
    setLoading(true)
    const { start, end } = monthRange(period)
    const { data } = await supabase
      .from('acct_bank_transactions')
      .select('id, date, description, amount, is_reconciled, journal_line_id')
      .eq('bank_account_id', account.id)
      .gte('date', start).lt('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) {
      setTxns(data)
      setMatched(new Set(data.filter(r => r.is_reconciled || r.journal_line_id).map(r => r.id)))
    }
    setLoading(false)
  }

  function toggleMatch(id: string) {
    setMatched(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const needsReview  = txns.filter(t => !matched.has(t.id)).length
  const matchedCount = txns.filter(t =>  matched.has(t.id)).length
  const masked       = account ? account.account_number.slice(0,4) + '...' + account.account_number.slice(-4) : ''

  if (!loading && !account) {
    return <div className="p-5 text-sm text-ink-2">No bank account configured.</div>
  }

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Bank reconciliation</h1>
          <p className="text-xs mt-0.5 text-ink-2">{account?.name} · matching imported txns to your books</p>
        </div>
        <div className="flex gap-2 items-center">
          <MonthPicker value={period} onChange={p => setPeriod(p)} />
          <Button variant="secondary" size="sm" onClick={() => loadTransactions()}>Refresh</Button>
          <Button size="sm">Finish reconcile</Button>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-semibold mb-0.5">{account?.name} · {masked}</p>
        <p className="text-xs mb-3 text-ink-2">{txns.length} transactions this period</p>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Transactions" value={String(txns.length)} />
          <StatBox label="Matched"      value={String(matchedCount)} />
          <StatBox label="Needs review" value={String(needsReview)} accent={needsReview > 0} />
        </div>
      </div>

      {loading ? (
        <div className="text-sm p-4 text-ink-2">Loading…</div>
      ) : txns.length === 0 ? (
        <div className="card p-8 text-center text-xs text-muted">No transactions this period</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1fr_40px_1fr]">
            <div className="px-3 py-2 text-xs font-medium bg-paper-edge text-ink-2">Bank statement</div>
            <div className="bg-paper-edge" />
            <div className="px-3 py-2 text-xs font-medium bg-paper-edge text-ink-2">Your books</div>
          </div>

          {txns.map((txn, i) => {
            const isMatched = matched.has(txn.id)
            const rowBg     = i % 2 === 0 ? 'var(--surface)' : 'var(--paper)'
            return (
              <div key={txn.id} className="grid grid-cols-[1fr_40px_1fr]">
                <div className="px-3 py-2 text-xs flex justify-between items-center border-t border-paper-edge"
                  style={{ background: txn.amount > 0 ? 'var(--accent-soft)' : rowBg }}>
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="num mr-2 text-ink-2" style={{ fontSize: 11 }}>{fmtDate(txn.date)}</span>
                    <span className="truncate">{txn.description}</span>
                  </div>
                  <span className={`num font-semibold whitespace-nowrap ${txn.amount > 0 ? 'text-accent' : ''}`}>
                    {txn.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-center cursor-pointer border-t border-paper-edge"
                  style={{ background: rowBg }} onClick={() => toggleMatch(txn.id)}>
                  <button className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    style={{ border: `1.5px solid ${isMatched ? 'var(--positive)' : 'var(--muted)'}`, color: isMatched ? 'var(--positive)' : 'var(--muted)', background: 'transparent' }}>
                    {isMatched ? '✓' : '?'}
                  </button>
                </div>

                <div className="px-3 py-2 text-xs border-t border-paper-edge"
                  style={{ background: txn.journal_line_id ? rowBg : 'var(--accent-ghost)' }}>
                  {txn.journal_line_id
                    ? <p className="font-medium text-positive">matched to journal entry</p>
                    : <div>
                        <p className="font-medium text-accent">no match found</p>
                        <p className="text-ink-2" style={{ fontSize: 11 }}>click ✓ to mark matched</p>
                      </div>
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="notice notice-dashed mt-3">
        {needsReview} on this period need review · closing balance: R {account?.balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
      </div>
    </div>
  )
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={accent ? 'card-accent kpi' : 'card kpi'}>
      <p className="kpi-label" style={{ color: accent ? 'var(--accent)' : undefined }}>{label}</p>
      <p className="kpi-value" style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}>{value}</p>
    </div>
  )
}
