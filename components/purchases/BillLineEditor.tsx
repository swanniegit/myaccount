'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/lib/types'
import type { BillLineInput } from '@/lib/purchases/types'

interface Props {
  lines: BillLineInput[]
  onChange: (lines: BillLineInput[]) => void
}

export default function BillLineEditor({ lines, onChange }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    supabase
      .from('acct_accounts')
      .select('id, code, name')
      .eq('type', 'expense')
      .eq('is_active', true)
      .order('code')
      .then(({ data }) => { if (data) setAccounts(data as Account[]) })
  }, [])

  const defaultId = accounts.find(a => a.code === '5950')?.id ?? accounts[0]?.id ?? ''

  function update(i: number, patch: Partial<BillLineInput>) {
    onChange(lines.map((l, idx) => {
      if (idx !== i) return l
      const next = { ...l, ...patch }
      next.line_total = Math.round(next.quantity * next.unit_price * 100) / 100
      return next
    }))
  }

  function addLine() {
    onChange([...lines, { description: '', quantity: 1, unit_price: 0, vat_rate: 15, account_id: defaultId, line_total: 0 }])
  }

  function removeLine(i: number) {
    onChange(lines.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      {lines.length > 0 && (
        <table className="w-full mb-2">
          <thead className="t-head">
            <tr>
              <th style={{ width: '32%' }}>Description</th>
              <th className="num" style={{ width: '7%' }}>Qty</th>
              <th className="num" style={{ width: '12%' }}>Unit price</th>
              <th className="num" style={{ width: '8%' }}>VAT</th>
              <th style={{ width: '30%' }}>Account</th>
              <th className="num" style={{ width: '11%' }}>Total</th>
              <th style={{ width: 20 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="align-top">
                <td className="pr-1 pb-1">
                  <input className="field" value={line.description} onChange={e => update(i, { description: e.target.value })} placeholder="Description" />
                </td>
                <td className="pr-1 pb-1">
                  <input className="field text-right" type="number" min={0} value={line.quantity} onChange={e => update(i, { quantity: parseFloat(e.target.value) || 0 })} />
                </td>
                <td className="pr-1 pb-1">
                  <input className="field text-right" type="number" min={0} step="0.01" value={line.unit_price} onChange={e => update(i, { unit_price: parseFloat(e.target.value) || 0 })} />
                </td>
                <td className="pr-1 pb-1">
                  <select className="field" value={line.vat_rate} onChange={e => update(i, { vat_rate: parseFloat(e.target.value) })}>
                    <option value={0}>0%</option>
                    <option value={15}>15%</option>
                  </select>
                </td>
                <td className="pr-1 pb-1">
                  <select className="field" value={line.account_id} onChange={e => update(i, { account_id: e.target.value })}>
                    <option value="">— Account —</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} {a.name}</option>
                    ))}
                  </select>
                </td>
                <td className="pb-1 pr-1 num text-right align-middle pt-1 text-xs">
                  {line.line_total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </td>
                <td className="pb-1 align-middle">
                  <button type="button" onClick={() => removeLine(i)} className="text-xs opacity-40 hover:opacity-100 t-secondary transition-opacity leading-none">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" onClick={addLine} className="text-xs t-accent">+ Add line</button>
    </div>
  )
}
