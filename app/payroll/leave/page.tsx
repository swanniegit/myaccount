'use client'
import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import type { PrEmployee, PrLeaveBalance, PrLeaveRequest } from '@/lib/payroll/types'

interface LeaveData {
  balances: (PrLeaveBalance & { employee: { id: string; full_name: string; code: string } | null })[]
  requests: PrLeaveRequest[]
}

const LEAVE_TYPES = ['annual', 'sick', 'family', 'maternity', 'parental']

function byEmployee(balances: LeaveData['balances']) {
  const map = new Map<string, { emp: LeaveData['balances'][0]['employee']; rows: LeaveData['balances'] }>()
  for (const b of balances) {
    const key = b.employee_id
    if (!map.has(key)) map.set(key, { emp: b.employee, rows: [] })
    map.get(key)!.rows.push(b)
  }
  return Array.from(map.values())
}

function balOf(rows: LeaveData['balances'], type: string) {
  const r = rows.find(b => b.type === type)
  if (!r) return { accrued: 0, taken: 0, balance: 0 }
  const balance = Number(r.accrued) - Number(r.taken)
  return { accrued: Number(r.accrued), taken: Number(r.taken), balance }
}

export default function LeavePage() {
  const [data, setData]         = useState<LeaveData>({ balances: [], requests: [] })
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [employees, setEmployees] = useState<PrEmployee[]>([])
  const [form, setForm] = useState({
    employee_id: '', type: 'annual', from_date: '', to_date: '', days: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [leaveRes, empRes] = await Promise.all([
      fetch('/api/payroll/leave'),
      fetch('/api/payroll/employees'),
    ])
    if (leaveRes.ok) setData(await leaveRes.json())
    if (empRes.ok) setEmployees(await empRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateLeaveRequest(requestId: string, action: 'approve' | 'reject') {
    await fetch('/api/payroll/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, request_id: requestId }),
    })
    load()
  }

  async function saveRequest() {
    setSaving(true)
    const res = await fetch('/api/payroll/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, action: 'request' }),
    })
    setSaving(false)
    if (res.ok) { setShowForm(false); load() }
  }

  const groups = byEmployee(data.balances)
  const pending = data.requests.filter(r => r.status === 'pending')

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs text-ink-2">
          BCEA · annual 15 · sick 30/3yr · family 3 · maternity 4mo (UIF)
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>+ Leave request</Button>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="card-accent p-3 mb-4">
          <div className="text-xs font-semibold mb-2">Pending approval ({pending.length})</div>
          <div className="flex flex-col gap-1.5">
            {pending.map(r => (
              <div
                key={r.id}
                className="flex justify-between items-center rounded p-2 bg-surface border border-paper-edge"
              >
                <div className="text-xs">
                  <span className="font-medium capitalize">{r.type}</span>
                  <span className="ml-2 text-ink-2">
                    {r.from_date} → {r.to_date} · {r.days} days
                  </span>
                  {r.notes && <span className="ml-2 italic text-muted">{r.notes}</span>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => updateLeaveRequest(r.id, 'approve')}>Approve</Button>
                  <Button variant="ghost" size="sm" onClick={() => updateLeaveRequest(r.id, 'reject')}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New request form */}
      {showForm && (
        <div className="card-accent p-4 mb-4">
          <div className="text-sm font-semibold mb-3">New leave request</div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="field-label">Employee</label>
              <select
                value={form.employee_id}
                onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                className="field"
              >
                <option value="">Select…</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="field"
              >
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Days</label>
              <input
                type="number"
                value={form.days}
                onChange={e => setForm(f => ({ ...f, days: e.target.value }))}
                className="field"
              />
            </div>
            <div>
              <label className="field-label">From date</label>
              <input
                type="date"
                value={form.from_date}
                onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))}
                className="field"
              />
            </div>
            <div>
              <label className="field-label">To date</label>
              <input
                type="date"
                value={form.to_date}
                onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))}
                className="field"
              />
            </div>
            <div>
              <label className="field-label">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="field"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveRequest} disabled={saving}>
              {saving ? 'Saving…' : 'Submit request'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Leave balances table */}
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-ink bg-paper">
              <th className="px-3 py-2 text-left font-medium text-ink-2">Employee</th>
              <th className="px-3 py-2 text-center font-medium text-ink-2" colSpan={3}>Annual · 15/yr</th>
              <th className="px-3 py-2 text-center font-medium text-ink-2" colSpan={2}>Sick · 30/3yr</th>
              <th className="px-3 py-2 text-center font-medium text-ink-2">Family</th>
              <th className="px-3 py-2 text-left font-medium text-ink-2">Pending</th>
            </tr>
            <tr className="border-b border-paper-edge bg-paper">
              <th />
              <th className="px-2 py-1 text-center font-normal text-xs text-muted">Accrued</th>
              <th className="px-2 py-1 text-center font-normal text-xs text-muted">Taken</th>
              <th className="px-2 py-1 text-center font-normal text-xs text-muted">Balance</th>
              <th className="px-2 py-1 text-center font-normal text-xs text-muted">Taken</th>
              <th className="px-2 py-1 text-center font-normal text-xs text-muted">Balance</th>
              <th className="px-2 py-1 text-center font-normal text-xs text-muted">Balance</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted">Loading…</td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted">
                  No leave balances yet. They are created when employees are added to a period.
                </td>
              </tr>
            ) : (
              groups.map(g => {
                const ann     = balOf(g.rows, 'annual')
                const sick    = balOf(g.rows, 'sick')
                const family  = balOf(g.rows, 'family')
                const empPending = data.requests.filter(
                  r => r.employee_id === g.emp?.id && r.status === 'pending'
                )
                return (
                  <tr key={g.emp?.id} className="t-row">
                    <td className="t-cell font-medium">{g.emp?.full_name ?? '—'}</td>
                    <td className="px-2 py-2 text-center font-mono">{ann.accrued}</td>
                    <td className="px-2 py-2 text-center font-mono">{ann.taken}</td>
                    <td className="px-2 py-2 text-center font-mono font-semibold" style={{ color: ann.balance < 3 ? '#c0392b' : 'inherit' }}>
                      {ann.balance}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">{sick.taken}</td>
                    <td className="px-2 py-2 text-center font-mono font-semibold">{sick.balance}</td>
                    <td className="px-2 py-2 text-center font-mono">{family.balance}</td>
                    <td className="t-cell" style={{ color: empPending.length ? 'var(--accent)' : 'var(--muted)' }}>
                      {empPending.length
                        ? `${empPending.reduce((s, r) => s + Number(r.days), 0)} days ⏳`
                        : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-muted italic">
        maternity (4mo) is UIF-claimable · system pre-fills UI19 form when requested
      </div>
    </div>
  )
}
