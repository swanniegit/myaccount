'use client'
import { useEffect, useState } from 'react'
import { formatMoney } from '@/lib/utils'
import Button from '@/components/ui/Button'
import type { PrEmployee } from '@/lib/payroll/types'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<PrEmployee[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({
    code: '', full_name: '', job_title: '', department: '',
    basic_salary: '', hire_date: '', tax_number: '',
    id_number: '', date_of_birth: '', tax_status: 'resident',
    pay_frequency: 'monthly',
    bank_name: '', bank_branch: '', bank_account: '', bank_type: 'cheque',
  })
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/payroll/employees')
    if (res.ok) setEmployees(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    const res = await fetch('/api/payroll/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setShowForm(false); load() }
  }

  function field(key: keyof typeof form, label: string, type = 'text') {
    return (
      <div key={key}>
        <label className="field-label">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="field"
        />
      </div>
    )
  }

  const totalGross = employees.reduce((s, e) => s + Number(e.basic_salary), 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs text-ink-2">
          {employees.length} active · annual CTC {formatMoney(totalGross * 12)}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">Import IRP5</Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>+ New employee</Button>
        </div>
      </div>

      {showForm && (
        <div className="card-accent p-4 mb-4">
          <div className="font-semibold text-sm mb-3">New employee</div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {field('code',         'Employee code')}
            {field('full_name',    'Full name')}
            {field('job_title',    'Job title')}
            {field('department',   'Department')}
            {field('hire_date',    'Hire date', 'date')}
            {field('basic_salary', 'Basic salary', 'number')}
            {field('id_number',    'SA ID number')}
            {field('date_of_birth','Date of birth', 'date')}
            {field('tax_number',   'Tax number')}
            {field('bank_name',    'Bank')}
            {field('bank_branch',  'Branch code')}
            {field('bank_account', 'Account number')}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save employee'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              <th className="text-left font-medium">Code</th>
              <th className="text-left font-medium">Name · Role</th>
              <th className="text-left font-medium">Tax #</th>
              <th className="text-right font-medium">Basic</th>
              <th className="text-left font-medium">Frequency</th>
              <th className="text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">Loading…</td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  No employees yet — add your first employee above.
                </td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id} className="t-row">
                  <td className="t-cell font-mono text-ink-2">{emp.code}</td>
                  <td className="t-cell">
                    <span className="font-medium">{emp.full_name}</span>
                    {emp.job_title && (
                      <span className="ml-1.5 text-ink-2">· {emp.job_title}</span>
                    )}
                  </td>
                  <td className="t-cell font-mono">{emp.tax_number ?? '—'}</td>
                  <td className="t-cell num">{formatMoney(Number(emp.basic_salary))}</td>
                  <td className="t-cell capitalize">{emp.pay_frequency}</td>
                  <td className="t-cell">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: emp.is_active ? 'var(--accent-soft)' : 'var(--surface)',
                        color: emp.is_active ? 'var(--accent)' : 'var(--muted)',
                        border: `1px solid ${emp.is_active ? 'var(--accent)' : 'var(--paper-edge)'}`,
                      }}
                    >
                      {emp.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {employees.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-paper-edge" style={{ background: 'var(--accent-soft)' }}>
                <td colSpan={3} className="px-3 py-2 font-semibold">
                  Total · {employees.length} employees
                </td>
                <td className="px-3 py-2 num font-semibold">
                  {formatMoney(totalGross)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
