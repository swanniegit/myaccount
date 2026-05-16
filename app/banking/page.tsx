'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/lib/types'
import Button from '@/components/ui/Button'
import MonthPicker, { currentMonth, monthRange, type MonthValue } from '@/components/ui/MonthPicker'

interface BankTxn { id: string; date: string; description: string; amount: number; is_reconciled: boolean; journal_line_id: string | null }
interface BankAccount { id: string; name: string; account_number: string; balance: number }

function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`
}

export default function BankingPage() {
  const [account, setAccount]       = useState<BankAccount | null>(null)
  const [txns, setTxns]             = useState<BankTxn[]>([])
  const [matched, setMatched]       = useState<Set<string>>(new Set())
  const [loading, setLoading]       = useState(true)
  const [period, setPeriod]         = useState<MonthValue>(currentMonth())
  const [accounts, setAccounts]     = useState<Account[]>([])
  const [allocating, setAllocating] = useState<string | null>(null)
  const [selAccount, setSelAccount] = useState('')
  const [allocDesc, setAllocDesc]   = useState('')
  const [allocating2, setAllocating2] = useState(false)
  const [allocError, setAllocError]   = useState<string | null>(null)

  useEffect(() => { loadAccount(); loadAccounts() }, [])
  useEffect(() => { if (account) loadTransactions() }, [account, period])

  async function loadAccount() {
    const { data } = await supabase
      .from('acct_bank_accounts').select('id, name, account_number, balance')
      .eq('account_number', '63044191201').maybeSingle()
    setAccount(data ?? null)
    if (!data) setLoading(false)
  }

  async function loadAccounts() {
    const { data } = await supabase
      .from('acct_accounts')
      .select('id, code, name, type, sub_type, is_vat_account, normal_balance, parent_id')
      .eq('is_active', true)
      .order('code')
    setAccounts((data ?? []) as Account[])
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

  async function toggleMatch(id: string) {
    const nowMatched = !matched.has(id)
    setMatched(prev => { const n = new Set(prev); nowMatched ? n.add(id) : n.delete(id); return n })
    await supabase.from('acct_bank_transactions').update({ is_reconciled: nowMatched }).eq('id', id)
  }

  function openAllocate(txn: BankTxn) {
    setAllocating(txn.id)
    setAllocDesc(txn.description)
    setSelAccount('')
    setAllocError(null)
  }

  function closeAllocate() {
    setAllocating(null)
    setAllocError(null)
  }

  async function submitAllocate(txnId: string) {
    if (!selAccount) { setAllocError('Select an account'); return }
    setAllocating2(true)
    setAllocError(null)
    try {
      const res = await fetch('/api/banking/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_transaction_id: txnId, account_id: selAccount, description: allocDesc }),
      })
      if (!res.ok) {
        const err = await res.json()
        setAllocError(err.error ?? 'Failed')
        return
      }
      // Update local state — mark as matched with a placeholder journal_line_id
      setTxns(prev => prev.map(t => t.id === txnId ? { ...t, journal_line_id: 'allocated', is_reconciled: true } : t))
      setMatched(prev => { const n = new Set(prev); n.add(txnId); return n })
      setAllocating(null)
    } catch {
      setAllocError('Network error')
    } finally {
      setAllocating2(false)
    }
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
            const isMatched   = matched.has(txn.id)
            const isAllocating = allocating === txn.id
            const rowBg       = i % 2 === 0 ? 'var(--surface)' : 'var(--paper)'
            return (
              <div key={txn.id}>
                <div className="grid grid-cols-[1fr_40px_1fr]">
                  {/* Bank side */}
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

                  {/* Toggle */}
                  <div className="flex items-center justify-center cursor-pointer border-t border-paper-edge"
                    style={{ background: rowBg }} onClick={() => toggleMatch(txn.id)}>
                    <button className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ border: `1.5px solid ${isMatched ? 'var(--positive)' : 'var(--muted)'}`, color: isMatched ? 'var(--positive)' : 'var(--muted)', background: 'transparent' }}>
                      {isMatched ? '✓' : '?'}
                    </button>
                  </div>

                  {/* Books side */}
                  <div className="px-3 py-2 text-xs border-t border-paper-edge"
                    style={{ background: txn.journal_line_id ? rowBg : 'var(--accent-ghost)' }}>
                    {txn.journal_line_id ? (
                      <p className="font-medium text-positive">matched to journal entry</p>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-accent">no match found</p>
                          <p className="text-ink-2" style={{ fontSize: 11 }}>allocate to a GL account</p>
                        </div>
                        <button
                          onClick={() => isAllocating ? closeAllocate() : openAllocate(txn)}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'transparent', cursor: 'pointer' }}>
                          {isAllocating ? 'Cancel' : 'Allocate'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline allocation panel */}
                {isAllocating && (
                  <div className="border-t border-paper-edge px-3 py-3 text-xs"
                    style={{ background: 'var(--surface)', gridColumn: '1 / -1' }}>
                    <p className="font-medium mb-2">
                      Allocate {txn.amount < 0 ? 'payment' : 'receipt'} of R {Math.abs(txn.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} to account
                    </p>
                    <div className="flex gap-2 flex-wrap items-end">
                      <div className="flex-1 min-w-40">
                        <label className="field-label mb-1 block">Account</label>
                        <select
                          value={selAccount}
                          onChange={e => setSelAccount(e.target.value)}
                          className="field w-full"
                          style={{ fontSize: 12 }}>
                          <option value="">— select account —</option>
                          {['expense', 'revenue', 'asset', 'liability'].map(type => {
                            const group = accounts.filter(a => a.type === type)
                            if (!group.length) return null
                            return (
                              <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}>
                                {group.map(a => (
                                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                                ))}
                              </optgroup>
                            )
                          })}
                        </select>
                      </div>
                      <div className="flex-1 min-w-40">
                        <label className="field-label mb-1 block">Description</label>
                        <input
                          type="text"
                          value={allocDesc}
                          onChange={e => setAllocDesc(e.target.value)}
                          className="field w-full"
                          style={{ fontSize: 12 }}
                          placeholder={txn.description}
                        />
                      </div>
                      <Button size="sm" onClick={() => submitAllocate(txn.id)} disabled={allocating2}>
                        {allocating2 ? 'Saving…' : 'Post to GL'}
                      </Button>
                    </div>
                    {allocError && <p className="mt-1 text-negative" style={{ fontSize: 11 }}>{allocError}</p>}
                    <p className="mt-2 text-ink-2" style={{ fontSize: 11 }}>
                      This will create a journal entry and link it to this bank transaction.
                    </p>
                  </div>
                )}
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
