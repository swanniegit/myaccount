'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import ManualEntryForm from '@/components/journal/ManualEntryForm'
import PendingTray from '@/components/journal/PendingTray'
import PostedEntriesTable from '@/components/journal/PostedEntriesTable'
import TAccountBoard from '@/components/journal/TAccountBoard'
import JournalBatchesView from '@/components/journal/JournalBatchesView'
import { useJournalPage } from '@/hooks/useJournalPage'
import { formatMoney } from '@/lib/utils'
import type { Account } from '@/lib/types'

function JournalRouter() {
  const view = useSearchParams().get('view')
  if (view === 'batches') return <JournalBatchesView />
  return <JournalCapture />
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="p-5 text-sm text-ink-2">Loading…</div>}>
      <JournalRouter />
    </Suspense>
  )
}

function JournalCapture() {
  const j = useJournalPage()

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Journal Entry</h1>
          <p className="text-xs mt-0.5 text-ink-2">Drag-to-post · the headline interaction</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => j.setShowForm(v => !v)}>
          Manual entry
        </Button>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-medium">New journal entry · JE-{j.entryNum}</span>
            <span className="text-xs ml-3 text-ink-2">
              Drag any pending txn into the Dr or Cr side of a T-account · ⌥ to split · auto VAT 15%
            </span>
          </div>
          {j.balanced && (
            <button type="button" onClick={j.postDragEntry} className="btn btn-sm btn-primary">
              Post · balanced ✓
            </button>
          )}
        </div>

        <PendingTray
          chips={j.chips}
          dragging={j.dragging}
          onDragStart={j.setDragging}
          onDragEnd={id => {
            if (j.dragging?.id === id) j.setDragging(null)
          }}
        />

        <AccountPinSelect
          accounts={j.accounts}
          addingAccount={j.addingAccount}
          newAccCode={j.newAccCode}
          newAccName={j.newAccName}
          newAccType={j.newAccType}
          onPin={j.pinAccount}
          onStartAdd={() => {
            j.setAddAccountTarget('pin')
            j.setAddingAccount(true)
          }}
          onNewAccCode={j.setNewAccCode}
          onNewAccName={j.setNewAccName}
          onNewAccType={j.setNewAccType}
          onSave={j.saveNewAccount}
          onCancel={() => j.setAddingAccount(false)}
        />

        <TAccountBoard
          pinned={j.pinned}
          dragTarget={j.dragTarget}
          onDragTarget={j.setDragTarget}
          onDrop={j.handleDrop}
          onUnpin={id => j.setPinned(prev => prev.filter(x => x.account.id !== id))}
        />

        {(j.totalDr > 0 || j.totalCr > 0) && (
          <div className="flex justify-between items-center px-3 py-2 rounded text-xs font-mono bg-paper border border-paper-edge">
            <span>
              Σ Dr {formatMoney(j.totalDr)} &nbsp;·&nbsp; Σ Cr {formatMoney(j.totalCr)}
              {j.balanced ? (
                <span className="ml-2 text-positive">✓ balanced</span>
              ) : (
                <span className="ml-2 text-negative">✗ diff {formatMoney(Math.abs(j.totalDr - j.totalCr))}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {j.showForm && (
        <ManualEntryForm
          accounts={j.accounts}
          date={j.date}
          desc={j.desc}
          lines={j.lines}
          manualDr={j.manualDr}
          manualCr={j.manualCr}
          manualBalanced={j.manualBalanced}
          addingAccount={j.addingAccount}
          addAccountTarget={j.addAccountTarget}
          newAccCode={j.newAccCode}
          newAccName={j.newAccName}
          newAccType={j.newAccType}
          onDateChange={j.setDate}
          onDescChange={j.setDesc}
          onLinesChange={j.setLines}
          onSubmit={j.handleManualSubmit}
          onStartAddAccount={target => {
            j.setAddAccountTarget(target)
            j.setAddingAccount(true)
          }}
          onNewAccCode={j.setNewAccCode}
          onNewAccName={j.setNewAccName}
          onNewAccType={j.setNewAccType}
          onSaveNewAccount={j.saveNewAccount}
          onCancelAddAccount={() => j.setAddingAccount(false)}
        />
      )}

      {j.error && <p className="text-xs text-negative">{j.error}</p>}
      {j.saved && <p className="text-xs text-positive">{j.saved}</p>}

      <PostedEntriesTable entries={j.entries} />
    </div>
  )
}

function AccountPinSelect({
  accounts,
  addingAccount,
  newAccCode,
  newAccName,
  newAccType,
  onPin,
  onStartAdd,
  onNewAccCode,
  onNewAccName,
  onNewAccType,
  onSave,
  onCancel,
}: {
  accounts: Account[]
  addingAccount: boolean
  newAccCode: string
  newAccName: string
  newAccType: string
  onPin: (acc: Account) => void
  onStartAdd: () => void
  onNewAccCode: (v: string) => void
  onNewAccName: (v: string) => void
  onNewAccType: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-2 mb-3">
      <select
        className="field"
        style={{ minWidth: 200, width: 'auto' }}
        onChange={e => {
          if (e.target.value === '__add__') {
            onStartAdd()
            e.target.value = ''
            return
          }
          const acc = accounts.find(a => a.id === e.target.value)
          if (acc) onPin(acc)
          e.target.value = ''
        }}
        defaultValue=""
      >
        <option value="" disabled>
          + Pin account to T-board
        </option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>
            {a.code} · {a.name}
          </option>
        ))}
        <option value="__add__">+ Add account…</option>
      </select>
      {addingAccount && (
        <div className="flex gap-2 items-end p-3 rounded bg-paper border border-accent">
          <div>
            <label className="field-label">Code *</label>
            <input value={newAccCode} onChange={e => onNewAccCode(e.target.value)} placeholder="e.g. 6100" className="field" style={{ width: 80 }} />
          </div>
          <div className="flex-1">
            <label className="field-label">Name *</label>
            <input value={newAccName} onChange={e => onNewAccName(e.target.value)} placeholder="Account name" className="field" />
          </div>
          <div>
            <label className="field-label">Type</label>
            <select value={newAccType} onChange={e => onNewAccType(e.target.value)} className="field" style={{ width: 'auto' }}>
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <button type="button" onClick={onSave} className="btn btn-sm btn-primary">
            Save
          </button>
          <button type="button" onClick={onCancel} className="btn btn-sm btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
