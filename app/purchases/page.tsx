'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface Bill {
  id: string
  ref: string
  supplier: string
  due: string
  excl: number
  vat: number
  total: number
  status: 'paid' | 'approved' | 'awaiting'
}

const TABS = ['All', 'Awaiting approval', 'Approved', 'Paid']

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState('All')
  const [selected, setSelected] = useState<Bill | null>(null)

  const bills: Bill[] = []
  const displayed = bills

  return (
    <div className="p-5 flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Purchases · Bills</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>What I owe · OCR-from-receipt enabled</p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1.5">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-3 py-1 text-xs rounded-full font-medium transition-colors"
                  style={{
                    background: activeTab === tab ? 'var(--ink)' : 'var(--surface)',
                    color: activeTab === tab ? '#fff' : 'var(--ink-2)',
                    border: `1px solid ${activeTab === tab ? 'var(--ink)' : 'var(--paper-edge)'}`,
                  }}
                >
                  {tab} (0)
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">📎 Drop receipt</Button>
              <Button size="sm">+ New bill</Button>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--paper-edge)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--paper-edge)' }}>
                  {['Ref', 'Supplier', 'Due', 'Excl.', 'VAT', 'Total', 'Status'].map(h => (
                    <th
                      key={h}
                      className={`px-3 py-2 font-medium text-left ${['Excl.','VAT','Total'].includes(h) ? 'text-right' : ''}`}
                      style={{ color: 'var(--ink-2)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center" style={{ color: 'var(--muted)' }}>
                      No bills yet
                    </td>
                  </tr>
                ) : displayed.map(bill => (
                  <tr
                    key={bill.id}
                    onClick={() => setSelected(bill)}
                    className="cursor-pointer"
                    style={{
                      borderBottom: '1px solid var(--paper-edge)',
                      background:
                        selected?.id === bill.id
                          ? 'var(--accent-soft)'
                          : bill.status === 'awaiting'
                          ? 'rgba(217,119,87,0.05)'
                          : 'var(--surface)',
                    }}
                  >
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--accent)' }}>{bill.ref}</td>
                    <td className="px-3 py-2">{bill.supplier}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>{bill.due}</td>
                    <td className="px-3 py-2 font-mono text-right">{bill.excl.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 font-mono text-right" style={{ color: 'var(--ink-2)' }}>
                      {bill.vat > 0 ? bill.vat.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-right font-semibold">{bill.total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2"><Badge status={bill.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div
            className="w-56 shrink-0 rounded-lg p-4"
            style={{ border: '1px solid var(--paper-edge)', background: 'var(--surface)' }}
          >
            <div className="text-xs font-medium mb-3">{selected.ref} preview</div>
            <div
              className="rounded mb-3 flex items-center justify-center text-xs"
              style={{
                height: 90,
                background: 'repeating-linear-gradient(45deg,var(--paper-edge) 0,var(--paper-edge) 1px,transparent 0,transparent 50%)',
                backgroundSize: '8px 8px',
                color: 'var(--muted)',
                border: '1px solid var(--paper-edge)',
              }}
            >
              // receipt PDF / photo
            </div>

            <div className="text-xs space-y-1 mb-3">
              <div><span style={{ color: 'var(--ink-2)' }}>Supplier: </span><span className="font-medium">{selected.supplier}</span></div>
              <div>
                <span style={{ color: 'var(--ink-2)' }}>Excl: </span>
                <span className="font-mono">R {selected.excl.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} · VAT R {selected.vat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span style={{ color: 'var(--ink-2)' }}>Total: </span>
                <span className="font-mono font-semibold">R {selected.total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {selected.status === 'awaiting' && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Reject</Button>
                <Button size="sm">Approve</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
