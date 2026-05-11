'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, AccountType } from '@/lib/types'
import Button from '@/components/ui/Button'

const TYPE_BADGE: Record<string, string> = {
  asset: 'Asset (current)',
  liability: 'Liability (current)',
  equity: 'Equity',
  revenue: 'Income',
  expense: 'Expense',
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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)

  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<AccountType>('asset')
  const [newVat, setNewVat] = useState(false)

  useEffect(() => {
    load()
  }, [])

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
      setNewCode('')
      setNewName('')
      setNewType('asset')
      setNewVat(false)
      setShowAdd(false)
    }
  }

  async function deleteAccount(id: string) {
    await supabase.from('acct_accounts').update({ is_active: false }).eq('id', id)
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Setup · Chart of Accounts</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
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
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded"
          style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)', width: 220 }}
        >
          <span className="text-xs" style={{ color: 'var(--muted)' }}>⌕</span>
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
          className="text-xs px-2 py-1.5 rounded"
          style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)' }}
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
        <div
          className="rounded-lg p-4 mb-3 flex gap-3 items-end flex-wrap"
          style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}
        >
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--ink-2)' }}>Code</label>
            <input
              type="text"
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              placeholder="e.g. 6100"
              className="rounded px-2 py-1.5 text-xs w-20"
              style={{ border: '1px solid var(--paper-edge)', background: 'var(--paper)' }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--ink-2)' }}>Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Account name"
              className="rounded px-2 py-1.5 text-xs w-48"
              style={{ border: '1px solid var(--paper-edge)', background: 'var(--paper)' }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--ink-2)' }}>Type</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as AccountType)}
              className="rounded px-2 py-1.5 text-xs"
              style={{ border: '1px solid var(--paper-edge)', background: 'var(--paper)' }}
            >
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-2)' }}>
            <input type="checkbox" checked={newVat} onChange={e => setNewVat(e.target.checked)} />
            VAT account
          </label>
          <Button size="sm" onClick={addAccount}>Save</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--paper-edge)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--paper-edge)' }}>
              {['Code', 'Name', 'Type', 'Tax', 'Balance', 'YTD movement', ''].map((h, i) => (
                <th
                  key={i}
                  className={`px-3 py-2 text-left font-medium ${h === 'Balance' || h === 'YTD movement' ? 'text-right' : ''}`}
                  style={{ color: 'var(--ink-2)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(10)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <div className="h-3 rounded animate-pulse" style={{ background: 'var(--paper-edge)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map(acc => (
                  <tr
                    key={acc.id}
                    style={{ borderBottom: '1px solid var(--paper-edge)', background: 'var(--surface)' }}
                  >
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>{acc.code}</td>
                    <td className="px-3 py-2 font-medium">{acc.name}</td>
                    <td className="px-3 py-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ border: '1px solid var(--paper-edge)', color: 'var(--ink-2)', whiteSpace: 'nowrap' }}
                      >
                        {subBadge(acc)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: acc.is_vat_account ? 'var(--accent)' : 'var(--ink-2)' }}>
                      {acc.is_vat_account ? '15%' : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-right" style={{ color: 'var(--ink-2)' }}>—</td>
                    <td className="px-3 py-2 font-mono text-right" style={{ color: 'var(--ink-2)' }}>—</td>
                    <td className="px-3 py-2 flex gap-2">
                      <button className="text-xs" style={{ color: 'var(--ink-2)' }}>↕</button>
                      <button onClick={() => deleteAccount(acc.id)} className="text-xs" style={{ color: 'var(--negative)' }}>🗑</button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
