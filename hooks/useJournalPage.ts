'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { recordJournalEntryClient } from '@/lib/ledger'
import { today } from '@/lib/utils'
import type { Account, JournalEntry } from '@/lib/types'
import type { ManualLine, PendingChip, PinnedAccount } from '@/lib/journal/types'

export function useJournalPage() {
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
  const [lines, setLines] = useState<ManualLine[]>([
    { account_id: '', debit: '', credit: '' },
    { account_id: '', debit: '', credit: '' },
  ])

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from('acct_journal_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setEntries(data)
  }, [])

  useEffect(() => {
    supabase.from('acct_accounts').select('*').order('code').then(({ data }) => {
      if (data) setAccounts(data)
    })
    loadEntries()
  }, [loadEntries])

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
      await recordJournalEntryClient({ date: today(), description: 'Drag-to-post entry', lines: entryLines })
      setSaved('Entry posted!')
      setPinned([])
      loadEntries()
      setTimeout(() => setSaved(''), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Post failed')
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
      await recordJournalEntryClient({ date, description: desc, lines: parsed })
      setSaved('Entry posted!')
      setDesc('')
      setLines([
        { account_id: '', debit: '', credit: '' },
        { account_id: '', debit: '', credit: '' },
      ])
      setShowForm(false)
      loadEntries()
      setTimeout(() => setSaved(''), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Post failed')
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
      .select()
      .single()
    if (data) {
      setAccounts(prev => [...prev, data].sort((a, b) => a.code.localeCompare(b.code)))
      if (addAccountTarget === 'pin') pinAccount(data)
      else setLines(prev => prev.map((l, j) => (j === addAccountTarget ? { ...l, account_id: data.id } : l)))
    }
    setNewAccCode('')
    setNewAccName('')
    setNewAccType('expense')
    setAddingAccount(false)
  }

  const entryNum = String(entries.length + 1).padStart(4, '0')

  return {
    accounts,
    entries,
    chips,
    pinned,
    dragging,
    dragTarget,
    error,
    saved,
    addingAccount,
    addAccountTarget,
    newAccCode,
    newAccName,
    newAccType,
    showForm,
    desc,
    date,
    lines,
    totalDr,
    totalCr,
    balanced,
    manualDr,
    manualCr,
    manualBalanced,
    entryNum,
    setDragging,
    setDragTarget,
    setPinned,
    setChips,
    setAddingAccount,
    setAddAccountTarget,
    setNewAccCode,
    setNewAccName,
    setNewAccType,
    setShowForm,
    setDesc,
    setDate,
    setLines,
    pinAccount,
    handleDrop,
    postDragEntry,
    handleManualSubmit,
    saveNewAccount,
  }
}
