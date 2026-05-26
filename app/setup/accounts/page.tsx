'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, AccountType } from '@/lib/types'
import Button from '@/components/ui/Button'

const TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense']

const TYPE_LABEL: Record<AccountType, string> = {
  asset:     'Assets',
  liability: 'Liabilities',
  equity:    'Equity',
  revenue:   'Revenue',
  expense:   'Expenses',
}

function subBadge(acc: Account): string {
  if (acc.code === '1000' || acc.code === '1010' || acc.code === '1020') return 'Bank'
  if (acc.sub_type === 'fixed_asset') return 'Asset (fixed)'
  if (acc.sub_type === 'long_term_liability') return 'Liability (long)'
  if (acc.type === 'asset') return 'Asset (current)'
  if (acc.type === 'liability') return 'Liability (current)'
  if (acc.type === 'equity') return 'Equity'
  if (acc.type === 'revenue') return 'Income'
  return 'Expense'
}

export default function SetupPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filtered, setFiltered] = useState<Account[]>([])
  const [search, setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading]   = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<AccountType>('asset')
  const [newVat, setNewVat]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('acct_accounts').select('*').order('code')
    if (data) { setAccounts(data); setFiltered(data) }
    setLoading(false)
  }

  useEffect(() => {
    let r = accounts
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(a => a.name.toLowerCase().includes(q) || a.code.includes(q))
    }
    if (typeFilter !== 'all') r = r.filter(a => a.type === typeFilter)
    setFiltered(r)
  }, [search, typeFilter, accounts])

  async function addAccount() {
    if (!newCode || !newName) return
    const normalBalance = newType === 'asset' || newType === 'expense' ? 'debit' : 'credit'
    const { data } = await supabase
      .from('acct_accounts')
      .insert({ code: newCode, name: newName, type: newType, normal_balance: normalBalance, is_vat_account: newVat })
      .select()
      .single()
    if (data) {
      setAccounts(prev => [...prev, data].sort((a, b) => a.code.localeCompare(b.code)))
      setNewCode(''); setNewName(''); setNewType('asset'); setNewVat(false); setShowAdd(false)
    }
  }

  async function deleteAccount(id: string) {
    await supabase.from('acct_accounts').update({ is_active: false }).eq('id', id)
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  // C-01: group by type for section headers (respects active type filter)
  const groups = (typeFilter === 'all' ? TYPE_ORDER : [typeFilter as AccountType])
    .map(t => ({ type: t, rows: filtered.filter(a => a.type === t) }))
    .filter(g => g.rows.length > 0)

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Setup · Chart of Accounts</h1>
          <p className="text-xs mt-0.5 text-ink-2">
            {accounts.length} accounts · grouped by type · SA SME default
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">Import CSV</Button>
          <Button variant="secondary" size="sm">Reset to SA default</Button>
          <Button size="sm" onClick={() => setShowAdd(v => !v)}>+ Account</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3">
        <div className="search-box" style={{ width: 220 }}>
          <span className="text-muted text-xs">⌕</span>
          <input
            type="text"
            placeholder="type name or code"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 outline-none bg-transparent text-xs"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="field"
          style={{ width: 'auto' }}
        >
          <option value="all">all</option>
          <option value="asset">asset</option>
          <option value="liability">liability</option>
          <option value="equity">equity</option>
          <option value="revenue">revenue</option>
          <option value="expense">expense</option>
        </select>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card p-4 mb-3 flex gap-3 items-end flex-wrap">
          <div>
            <label className="field-label">Code</label>
            <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)}
              placeholder="e.g. 6100" className="field" style={{ width: 80 }} />
          </div>
          <div>
            <label className="field-label">Name</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Account name" className="field" style={{ width: 192 }} />
          </div>
          <div>
            <label className="field-label">Type</label>
            <select value={newType} onChange={e => setNewType(e.target.value as AccountType)} className="field">
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-ink-2">
            <input type="checkbox" checked={newVat} onChange={e => setNewVat(e.target.checked)} />
            VAT account
          </label>
          <Button size="sm" onClick={addAccount}>Save</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
        </div>
      )}

      {/* Table — C-01: sections by type */}
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              {['Code', 'Name', 'Type', 'Tax', 'Balance', 'YTD movement', ''].map((h, i) => (
                <th key={i} className={`text-left font-medium ${h === 'Balance' || h === 'YTD movement' ? 'text-right' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(10)].map((_, i) => (
                  <tr key={i} className="t-row">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="t-cell">
                        <div className="h-3 rounded animate-pulse bg-paper-edge" />
                      </td>
                    ))}
                  </tr>
                ))
              : groups.map(group => (
                  <>
                    {/* C-01: type section header */}
                    <tr key={`hdr-${group.type}`} style={{ background: 'var(--accent-soft)' }}>
                      <td colSpan={7} className="px-3 py-1.5 font-semibold text-xs tracking-wide">
                        {TYPE_LABEL[group.type]}
                      </td>
                    </tr>
                    {group.rows.map(acc => (
                      <tr key={acc.id} className="t-row">
                        <td className="t-cell font-mono text-ink-2">{acc.code}</td>
                        <td className="t-cell font-medium">{acc.name}</td>
                        <td className="t-cell">
                          <span className="badge">{subBadge(acc)}</span>
                          {acc.is_control && (
                            <span className="badge ml-1" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                              Control
                            </span>
                          )}
                          {acc.is_contra && (
                            <span className="badge ml-1" style={{ color: 'var(--ink-2)', borderColor: 'var(--ink-2)' }}>
                              Contra
                            </span>
                          )}
                        </td>
                        <td className="t-cell" style={{ color: acc.is_vat_account ? 'var(--accent)' : 'var(--ink-2)' }}>
                          {acc.is_vat_account ? '15%' : '—'}
                        </td>
                        <td className="t-cell num text-ink-2">—</td>
                        <td className="t-cell num text-ink-2">—</td>
                        <td className="t-cell flex gap-2">
                          <button className="text-xs text-ink-2">↕</button>
                          <button onClick={() => deleteAccount(acc.id)} className="text-xs text-negative">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
