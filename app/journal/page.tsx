'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatMoney, today } from '@/lib/utils'
import { recordJournalEntry } from '@/lib/ledger'
import type { Account, JournalEntry } from '@/lib/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface PendingChip {
  id: string
  label: string
  amount: number
  ref: string
}

interface TAccountLine {
  label: string
  amount: number
  side: 'Dr' | 'Cr'
}

interface PinnedAccount {
  account: Account
  lines: TAccountLine[]
}

export default function JournalPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [chips, setChips] = useState<PendingChip[]>([])
  const [pinned, setPinned] = useState<PinnedAccount[]>([])
  const [dragging, setDragging] = useState<PendingChip | null>(null)
  const [dragTarget, setDragTarget] = useState<{ id: string; side: 'Dr' | 'Cr' } | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [addingAccount, setAddingAccount] = useState(false)
  const [addAccountTarget, setAddAccountTarget] = useState<'pin' | number>('pin')
  const [newAccCode, setNewAccCode] = useState('')
  const [newAccName, setNewAccName] = useState('')
  const [newAccType, setNewAccType] = useState('expense')
  const [showForm, setShowForm] = useState(false)
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(today())
  const [lines, setLines] = useState([
    { account_id: '', debit: '', credit: '' },
    { account_id: '', debit: '', credit: '' },
  ])

  useEffect(() => {
    supabase.from('acct_accounts').select('*').order('code').then(({ data }) => {
      if (data) setAccounts(data)
    })
    loadEntries()
  }, [])

  async function loadEntries() {
    const { data } = await supabase
      .from('acct_journal_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setEntries(data)
  }

  function pinAccount(acc: Account) {
    if (pinned.find(p => p.account.id === acc.id)) return
    setPinned(prev => [...prev, { account: acc, lines: [] }])
  }

  function handleDrop(accountId: string, side: 'Dr' | 'Cr') {
    if (!dragging) return
    const amount = dragging.amount
    const vatAmount = Math.round(amount * (15 / 115) * 100) / 100
    const exclAmount = amount - vatAmount

    setPinned(prev =>
      prev.map(p => {
        if (p.account.id !== accountId) return p
        return {
          ...p,
          lines: [
            ...p.lines,
            {
              label: `(new) ${dragging.label}\n${dragging.ref}`,
              amount: side === 'Dr' ? amount : exclAmount,
              side,
            },
          ],
        }
      })
    )
    setChips(prev => prev.filter(c => c.id !== dragging.id))
    setDragging(null)
    setDragTarget(null)
  }

  const totalDr = pinned.flatMap(p => p.lines.filter(l => l.side === 'Dr')).reduce((s, l) => s + l.amount, 0)
  const totalCr = pinned.flatMap(p => p.lines.filter(l => l.side === 'Cr')).reduce((s, l) => s + l.amount, 0)
  const balanced = Math.abs(totalDr - totalCr) < 0.01 && totalDr > 0

  async function postDragEntry() {
    if (!balanced) return
    try {
      const entryLines = pinned.flatMap(p =>
        p.lines.map(l => ({
          account_id: p.account.id,
          debit: l.side === 'Dr' ? l.amount : 0,
          credit: l.side === 'Cr' ? l.amount : 0,
        }))
      )
      await recordJournalEntry({ date: today(), description: 'Drag-to-post entry', lines: entryLines })
      setSaved('Entry posted!')
      setPinned([])
      loadEntries()
      setTimeout(() => setSaved(''), 3000)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const parsed = lines
        .filter(l => l.account_id)
        .map(l => ({
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        }))
      await recordJournalEntry({ date, description: desc, lines: parsed })
      setSaved('Entry posted!')
      setDesc('')
      setLines([{ account_id: '', debit: '', credit: '' }, { account_id: '', debit: '', credit: '' }])
      setShowForm(false)
      loadEntries()
      setTimeout(() => setSaved(''), 3000)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const manualDr = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const manualCr = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const manualBalanced = Math.abs(manualDr - manualCr) < 0.01 && manualDr > 0

  async function saveNewAccount() {
    if (!newAccCode || !newAccName) return
    const normalBalance = newAccType === 'asset' || newAccType === 'expense' ? 'debit' : 'credit'
    const { data } = await supabase
      .from('acct_accounts')
      .insert({ code: newAccCode, name: newAccName, type: newAccType, normal_balance: normalBalance })
      .select().single()
    if (data) {
      setAccounts(prev => [...prev, data].sort((a, b) => a.code.localeCompare(b.code)))
      if (addAccountTarget === 'pin') pinAccount(data)
      else setLines(prev => prev.map((l, j) => j === addAccountTarget ? { ...l, account_id: data.id } : l))
    }
    setNewAccCode(''); setNewAccName(''); setNewAccType('expense'); setAddingAccount(false)
  }

  const entryNum = String(entries.length + 1).padStart(4, '0')

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Journal Entry</h1>
          <p className="text-xs mt-0.5 text-ink-2">Drag-to-post · the headline interaction</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowForm(v => !v)}>Manual entry</Button>
        </div>
      </div>

      {/* Drag-to-post section */}
      <div className="card p-4">
        {/* Sub-header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-medium">New journal entry · JE-{entryNum}</span>
            <span className="text-xs ml-3 text-ink-2">
              Drag any pending txn into the Dr or Cr side of a T-account · ⌥ to split · auto VAT 15%
            </span>
          </div>
          {balanced && (
            <button onClick={postDragEntry} className="btn btn-sm btn-primary">
              Post · balanced ✓
            </button>
          )}
        </div>

        {/* Pending tray */}
        <div
          className="flex items-center gap-2 p-2 rounded mb-4 flex-wrap"
          style={{ background: 'rgba(234,227,210,0.5)', border: '1.5px dashed var(--ink-2)' }}
        >
          <span className="text-xs shrink-0 text-ink-2">Pending tray →</span>
          {chips.map(chip => (
            <div
              key={chip.id}
              draggable
              onDragStart={() => setDragging(chip)}
              onDragEnd={() => { if (dragging?.id === chip.id) setDragging(null) }}
              className="flex flex-col px-3 py-2 rounded cursor-grab select-none"
              style={{
                background: dragging?.id === chip.id ? 'var(--accent)' : 'var(--surface)',
                border: `1.5px solid ${dragging?.id === chip.id ? 'var(--accent)' : 'var(--paper-edge)'}`,
                color: dragging?.id === chip.id ? '#fff' : 'var(--ink)',
                minWidth: 120,
              }}
            >
              <span className="font-mono text-xs font-semibold">{formatMoney(chip.amount)}</span>
              <span className="text-xs">{chip.label}</span>
              <span className="text-xs" style={{ color: dragging?.id === chip.id ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}>
                {chip.ref}
              </span>
            </div>
          ))}
          {chips.length === 0 && (
            <span className="text-xs text-muted">All posted ✓</span>
          )}
        </div>

        {/* Pin an account */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-2">
            <select
              className="field"
              style={{ minWidth: 200, width: 'auto' }}
              onChange={e => {
                if (e.target.value === '__add__') { setAddAccountTarget('pin'); setAddingAccount(true); e.target.value = ''; return }
                const acc = accounts.find(a => a.id === e.target.value)
                if (acc) pinAccount(acc)
                e.target.value = ''
              }}
              defaultValue=""
            >
              <option value="" disabled>+ Pin account to T-board</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
              ))}
              <option value="__add__">+ Add account…</option>
            </select>
          </div>
          {addingAccount && (
            <div className="flex gap-2 items-end p-3 rounded bg-paper border border-accent">
              <div>
                <label className="field-label">Code *</label>
                <input value={newAccCode} onChange={e => setNewAccCode(e.target.value)} placeholder="e.g. 6100" className="field" style={{ width: 80 }} />
              </div>
              <div className="flex-1">
                <label className="field-label">Name *</label>
                <input value={newAccName} onChange={e => setNewAccName(e.target.value)} placeholder="Account name" className="field" />
              </div>
              <div>
                <label className="field-label">Type</label>
                <select value={newAccType} onChange={e => setNewAccType(e.target.value)} className="field" style={{ width: 'auto' }}>
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                  <option value="equity">Equity</option>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <button onClick={saveNewAccount} className="btn btn-sm btn-primary">Save</button>
              <button onClick={() => setAddingAccount(false)} className="btn btn-sm btn-ghost">Cancel</button>
            </div>
          )}
        </div>

        {/* T-account board */}
        {pinned.length > 0 ? (
          <div className="flex gap-3 flex-wrap mb-3">
            {pinned.map(p => {
              const drLines = p.lines.filter(l => l.side === 'Dr')
              const crLines = p.lines.filter(l => l.side === 'Cr')
              const drTotal = drLines.reduce((s, l) => s + l.amount, 0)
              const crTotal = crLines.reduce((s, l) => s + l.amount, 0)
              const bal = p.account.normal_balance === 'debit' ? drTotal - crTotal : crTotal - drTotal

              return (
                <div
                  key={p.account.id}
                  className="rounded overflow-hidden shrink-0"
                  style={{
                    width: 210,
                    border: `1.5px solid ${dragTarget?.id === p.account.id ? 'var(--accent)' : 'var(--ink)'}`,
                  }}
                >
                  <div className="flex justify-between items-center px-2 py-1.5 bg-ink text-white">
                    <span className="text-xs font-medium">{p.account.code} · {p.account.name}</span>
                    <button onClick={() => setPinned(prev => prev.filter(x => x.account.id !== p.account.id))}
                      className="text-xs opacity-60 hover:opacity-100">×</button>
                  </div>
                  <div className="flex" style={{ minHeight: 70 }}>
                    <div
                      className="flex-1 p-2 border-r border-ink"
                      style={{ background: dragTarget?.id === p.account.id && dragTarget.side === 'Dr' ? 'var(--accent-soft)' : 'transparent' }}
                      onDragOver={e => { e.preventDefault(); setDragTarget({ id: p.account.id, side: 'Dr' }) }}
                      onDragLeave={() => setDragTarget(null)}
                      onDrop={e => { e.preventDefault(); handleDrop(p.account.id, 'Dr') }}
                    >
                      <div className="text-xs font-medium mb-1 text-accent">DR</div>
                      {drLines.map((l, i) => (
                        <div key={i} className="text-xs">
                          <div className="text-muted" style={{ fontSize: 10 }}>{l.label.split('\n')[0]}</div>
                          <div className="font-mono text-accent">
                            {l.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      className="flex-1 p-2"
                      style={{ background: dragTarget?.id === p.account.id && dragTarget.side === 'Cr' ? 'var(--accent-soft)' : 'transparent' }}
                      onDragOver={e => { e.preventDefault(); setDragTarget({ id: p.account.id, side: 'Cr' }) }}
                      onDragLeave={() => setDragTarget(null)}
                      onDrop={e => { e.preventDefault(); handleDrop(p.account.id, 'Cr') }}
                    >
                      <div className="text-xs font-medium mb-1 text-ink-2">CR</div>
                      {crLines.map((l, i) => (
                        <div key={i} className="text-xs">
                          <div className="text-muted" style={{ fontSize: 10 }}>{l.label.split('\n')[0]}</div>
                          <div className="font-mono">{l.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1 border-t border-ink bg-paper">
                    <span className="text-xs text-ink-2">Bal.</span>
                    <span className="font-mono text-xs font-semibold" style={{ color: bal >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                      {bal >= 0 ? '+' : ''}{formatMoney(bal)}
                    </span>
                  </div>
                  {p.lines.length > 0 && (
                    <div className="px-2 py-0.5 text-xs italic bg-paper text-muted" style={{ fontSize: 10 }}>
                      {drLines.length > 0 ? 'dropped on Dr' : 'auto-split'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div
            className="rounded p-6 text-center text-xs mb-3 text-muted"
            style={{ border: '1.5px dashed var(--paper-edge)' }}
          >
            Pin an account above, then drag a chip onto its Dr or Cr side
          </div>
        )}

        {/* Footer balance bar */}
        {(totalDr > 0 || totalCr > 0) && (
          <div className="flex justify-between items-center px-3 py-2 rounded text-xs font-mono bg-paper border border-paper-edge">
            <span>
              Σ Dr {formatMoney(totalDr)} &nbsp;·&nbsp; Σ Cr {formatMoney(totalCr)}
              {balanced ? (
                <span className="ml-2 text-positive">✓ balanced</span>
              ) : (
                <span className="ml-2 text-negative">✗ diff {formatMoney(Math.abs(totalDr - totalCr))}</span>
              )}
            </span>
            <span className="text-muted">
              ⌘↑ post · ✉ pop chip back to tray · / search account
            </span>
          </div>
        )}
      </div>

      {/* Manual entry form */}
      {showForm && (
        <form onSubmit={handleManualSubmit} className="card p-4">
          <div className="text-sm font-medium mb-3">Manual entry</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="field-label">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="field" />
            </div>
            <div>
              <label className="field-label">Description</label>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} required placeholder="e.g. Monthly rent" className="field" />
            </div>
          </div>
          <table className="w-full text-xs mb-2">
            <thead>
              <tr className="border-b border-paper-edge">
                <th className="text-left py-1.5 font-medium text-ink-2">Account</th>
                <th className="text-right py-1.5 font-medium w-28 text-ink-2">Debit</th>
                <th className="text-right py-1.5 font-medium w-28 text-ink-2">Credit</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="border-b border-paper-edge">
                  <td className="py-1">
                    <select value={line.account_id} onChange={e => {
                      if (e.target.value === '__add__') { setAddAccountTarget(i); setAddingAccount(true); return }
                      setLines(prev => prev.map((l, j) => j === i ? { ...l, account_id: e.target.value } : l))
                    }} className="field">
                      <option value="">Select account…</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                      <option value="__add__">+ Add account…</option>
                    </select>
                  </td>
                  <td className="py-1 pl-2">
                    <input type="number" step="0.01" min="0" value={line.debit} onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, debit: e.target.value, credit: '' } : l))} className="field text-right" />
                  </td>
                  <td className="py-1 pl-2">
                    <input type="number" step="0.01" min="0" value={line.credit} onChange={e => setLines(prev => prev.map((l, j) => j === i ? { ...l, credit: e.target.value, debit: '' } : l))} className="field text-right" />
                  </td>
                  <td className="py-1 pl-1">
                    {lines.length > 2 && <button type="button" onClick={() => setLines(prev => prev.filter((_, j) => j !== i))} className="text-muted">×</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3 mb-2">
            <button type="button" onClick={() => setLines(prev => [...prev, { account_id: '', debit: '', credit: '' }])} className="text-xs text-accent">+ Add line</button>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={!manualBalanced || !desc}>Post entry</Button>
            {!manualBalanced && manualDr + manualCr > 0 && <span className="text-xs text-negative">Diff: {formatMoney(Math.abs(manualDr - manualCr))}</span>}
            {manualBalanced && <span className="text-xs text-positive">✓ balanced</span>}
          </div>
        </form>
      )}

      {error && <p className="text-xs text-negative">{error}</p>}
      {saved && <p className="text-xs text-positive">{saved}</p>}

      {/* Journal list */}
      <div>
        <div className="text-sm font-medium mb-2">Posted entries</div>
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="t-head">
              <tr>
                {['Date', 'Description', 'Source', 'Status'].map(h => (
                  <th key={h} className="text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id} className="t-row" style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--paper)' }}>
                  <td className="t-cell num">{entry.date}</td>
                  <td className="t-cell">{entry.description}</td>
                  <td className="t-cell capitalize text-ink-2">{entry.source}</td>
                  <td className="t-cell"><Badge status={entry.is_posted ? 'posted' : 'unposted'} /></td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr className="t-empty"><td colSpan={4}>No entries yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
