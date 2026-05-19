import Button from '@/components/ui/Button'
import { formatMoney } from '@/lib/utils'
import type { Account } from '@/lib/types'
import type { ManualLine } from '@/lib/journal/types'

interface Props {
  accounts: Account[]
  date: string
  desc: string
  lines: ManualLine[]
  manualDr: number
  manualCr: number
  manualBalanced: boolean
  addingAccount: boolean
  addAccountTarget: 'pin' | number
  newAccCode: string
  newAccName: string
  newAccType: string
  onDateChange: (v: string) => void
  onDescChange: (v: string) => void
  onLinesChange: (lines: ManualLine[]) => void
  onSubmit: (e: React.FormEvent) => void
  onStartAddAccount: (target: 'pin' | number) => void
  onNewAccCode: (v: string) => void
  onNewAccName: (v: string) => void
  onNewAccType: (v: string) => void
  onSaveNewAccount: () => void
  onCancelAddAccount: () => void
}

export default function ManualEntryForm({
  accounts,
  date,
  desc,
  lines,
  manualDr,
  manualCr,
  manualBalanced,
  addingAccount,
  newAccCode,
  newAccName,
  newAccType,
  onDateChange,
  onDescChange,
  onLinesChange,
  onSubmit,
  onStartAddAccount,
  onNewAccCode,
  onNewAccName,
  onNewAccType,
  onSaveNewAccount,
  onCancelAddAccount,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="card p-4">
      <div className="text-sm font-medium mb-3">Manual entry</div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="field-label">Date</label>
          <input type="date" value={date} onChange={e => onDateChange(e.target.value)} className="field" />
        </div>
        <div>
          <label className="field-label">Description</label>
          <input
            type="text"
            value={desc}
            onChange={e => onDescChange(e.target.value)}
            required
            placeholder="e.g. Monthly rent"
            className="field"
          />
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
                <select
                  value={line.account_id}
                  onChange={e => {
                    if (e.target.value === '__add__') {
                      onStartAddAccount(i)
                      return
                    }
                    onLinesChange(lines.map((l, j) => (j === i ? { ...l, account_id: e.target.value } : l)))
                  }}
                  className="field"
                >
                  <option value="">Select account…</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} · {a.name}
                    </option>
                  ))}
                  <option value="__add__">+ Add account…</option>
                </select>
              </td>
              <td className="py-1 pl-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.debit}
                  onChange={e =>
                    onLinesChange(lines.map((l, j) => (j === i ? { ...l, debit: e.target.value, credit: '' } : l)))
                  }
                  className="field text-right"
                />
              </td>
              <td className="py-1 pl-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.credit}
                  onChange={e =>
                    onLinesChange(lines.map((l, j) => (j === i ? { ...l, credit: e.target.value, debit: '' } : l)))
                  }
                  className="field text-right"
                />
              </td>
              <td className="py-1 pl-1">
                {lines.length > 2 && (
                  <button type="button" onClick={() => onLinesChange(lines.filter((_, j) => j !== i))} className="text-muted">
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={() => onLinesChange([...lines, { account_id: '', debit: '', credit: '' }])}
          className="text-xs text-accent"
        >
          + Add line
        </button>
      </div>
      {addingAccount && (
        <div className="flex gap-2 items-end p-3 rounded bg-paper border border-accent mb-3">
          <motion>
            <label className="field-label">Code *</label>
            <input value={newAccCode} onChange={e => onNewAccCode(e.target.value)} placeholder="e.g. 6100" className="field" style={{ width: 80 }} />
          </motion>
          <div className="flex-1">
            <label className="field-label">Name *</label>
            <input value={newAccName} onChange={e => onNewAccName(e.target.value)} placeholder="Account name" className="field" />
          </motion>
          <motion>
            <label className="field-label">Type</label>
            <select value={newAccType} onChange={e => onNewAccType(e.target.value)} className="field" style={{ width: 'auto' }}>
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
          </motion>
          <button type="button" onClick={onSaveNewAccount} className="btn btn-sm btn-primary">
            Save
          </button>
          <button type="button" onClick={onCancelAddAccount} className="btn btn-sm btn-ghost">
            Cancel
          </button>
        </motion>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={!manualBalanced || !desc}>
          Post entry
        </Button>
        {!manualBalanced && manualDr + manualCr > 0 && (
          <span className="text-xs text-negative">Diff: {formatMoney(Math.abs(manualDr - manualCr))}</span>
        )}
        {manualBalanced && <span className="text-xs text-positive">✓ balanced</span>}
      </motion>
    </form>
  )
}
