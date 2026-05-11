'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Company, BankAccount } from '@/lib/types'
import { monthName } from '@/lib/utils'
import Button from '@/components/ui/Button'

const TABS = ['Company', 'Tax & SARS', 'Bank accounts', 'Users', 'Year-end', 'Integrations']

const fieldCls = [
  'w-full px-2.5 py-1.5 rounded text-xs outline-none',
  'border border-[color:var(--paper-edge)] bg-[color:var(--paper)]',
  'focus:border-[color:var(--accent)]',
].join(' ')

export default function CompanySettingsPage() {
  const [tab, setTab] = useState('Tax & SARS')
  const [company, setCompany] = useState<Company | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Company tab
  const [name, setName]       = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone]     = useState('')
  const [email, setEmail]     = useState('')

  // Tax & SARS tab
  const [regNo, setRegNo]           = useState('')
  const [taxNo, setTaxNo]           = useState('')
  const [vatNo, setVatNo]           = useState('')
  const [vatDate, setVatDate]       = useState('')
  const [vatCycle, setVatCycle]     = useState('Category A - bi-monthly')
  const [payeRef, setPayeRef]       = useState('')
  const [efilingUser, setEfilingUser] = useState('')

  // Accounting policy (Tax & SARS panel)
  const [yearEnd, setYearEnd]                 = useState(2)
  const [booksLocked, setBooksLocked]         = useState('')
  const [defaultVat, setDefaultVat]           = useState('15')
  const [inventoryMethod, setInventoryMethod] = useState('FIFO')

  useEffect(() => {
    supabase.from('acct_company').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (!data) return
      setCompany(data)
      setName(data.name ?? '')
      setAddress(data.address ?? '')
      setPhone(data.phone ?? '')
      setEmail(data.email ?? '')
      setRegNo(data.registration_number ?? '')
      setTaxNo(data.tax_number ?? '')
      setVatNo(data.vat_number ?? '')
      setVatDate(data.vat_registration_date ?? '')
      setVatCycle(data.vat_cycle ?? 'Category A - bi-monthly')
      setPayeRef(data.paye_ref ?? '')
      setEfilingUser(data.efiling_user ?? '')
      setYearEnd(data.tax_year_end ?? 2)
      setBooksLocked(data.books_locked_through ?? '')
      setDefaultVat(data.default_vat ?? '15')
      setInventoryMethod(data.inventory_method ?? 'FIFO')
    })
    supabase.from('acct_bank_accounts').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setBankAccounts(data)
    })
  }, [])

  async function save() {
    setSaving(true)
    const payload = {
      name, address: address || null, phone: phone || null, email: email || null,
      registration_number: regNo || null, tax_number: taxNo || null,
      vat_number: vatNo || null, vat_registration_date: vatDate || null,
      vat_cycle: vatCycle, paye_ref: payeRef || null, efiling_user: efilingUser || null,
      tax_year_end: yearEnd, books_locked_through: booksLocked || null,
      default_vat: defaultVat, inventory_method: inventoryMethod,
    }
    if (company) {
      await supabase.from('acct_company').update(payload).eq('id', company.id)
    } else {
      const { data } = await supabase.from('acct_company').insert(payload).select().single()
      if (data) setCompany(data)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-5 max-w-4xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Setup · Company</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
          SARS / VAT / banking · used everywhere
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 text-xs rounded font-medium transition-colors"
            style={{
              background: tab === t ? 'var(--ink)' : 'var(--surface)',
              color: tab === t ? '#fff' : 'var(--ink-2)',
              border: `1px solid ${tab === t ? 'var(--ink)' : 'var(--paper-edge)'}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Company ── */}
      {tab === 'Company' && (
        <div className="rounded-lg p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
          <div className="text-sm font-medium mb-4 italic">Business details</div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Business name">
              <input className={fieldCls} value={name} onChange={e => setName(e.target.value)} placeholder="Thandi's Trading (Pty) Ltd" />
            </F>
            <F label="Phone">
              <input className={fieldCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27 11 123 4567" />
            </F>
            <F label="Email">
              <input className={fieldCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="accounts@company.co.za" />
            </F>
            <F label="Address">
              <input className={fieldCls} value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main Street, Sandton, 2196" />
            </F>
          </div>
        </div>
      )}

      {/* ── Tax & SARS ── */}
      {tab === 'Tax & SARS' && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
            <div className="text-sm font-medium mb-4 italic">Tax registration</div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Business name">
                <input className={fieldCls} value={name} onChange={e => setName(e.target.value)} />
              </F>
              <F label="Reg no.">
                <input className={fieldCls} value={regNo} onChange={e => setRegNo(e.target.value)} placeholder="2022/123456/07" />
              </F>
              <F label="Tax / Income tax no.">
                <input className={fieldCls} value={taxNo} onChange={e => setTaxNo(e.target.value)} placeholder="9123456789" />
              </F>
              <F label="VAT no.">
                <input className={fieldCls} value={vatNo} onChange={e => setVatNo(e.target.value)} placeholder="4123456789" />
              </F>
              <F label="VAT registration date">
                <input className={fieldCls} type="date" value={vatDate} onChange={e => setVatDate(e.target.value)} />
              </F>
              <F label="VAT cycle">
                <select className={fieldCls} value={vatCycle} onChange={e => setVatCycle(e.target.value)}>
                  <option>Category A - bi-monthly</option>
                  <option>Category B - bi-monthly</option>
                  <option>Category C - monthly</option>
                </select>
              </F>
              <F label="PAYE / UIF / SDL ref">
                <input className={fieldCls} value={payeRef} onChange={e => setPayeRef(e.target.value)} placeholder="7700123456" />
              </F>
              <F label="SARS eFiling user">
                <input className={fieldCls} value={efilingUser} onChange={e => setEfilingUser(e.target.value)} placeholder="TG-44" />
              </F>
            </div>
            <div className="mt-3 px-3 py-2 text-xs rounded" style={{ border: '1px dashed var(--accent)', color: 'var(--accent)', fontStyle: 'italic' }}>
              Used on every tax invoice, VAT 201 and EMP 201 submission
            </div>
          </div>

          <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
            <div className="text-sm font-medium mb-4 italic">Accounting policy</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <F label="Reporting standard">
                <input className={fieldCls} readOnly value="IFRS for SMEs" style={{ opacity: 0.6 }} />
              </F>
              <F label="Functional currency">
                <input className={fieldCls} readOnly value="ZAR (R)" style={{ opacity: 0.6 }} />
              </F>
              <F label="Year end">
                <select className={fieldCls} value={yearEnd} onChange={e => setYearEnd(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
                  ))}
                </select>
              </F>
              <F label="Books locked through">
                <input className={fieldCls} type="date" value={booksLocked} onChange={e => setBooksLocked(e.target.value)} />
              </F>
              <F label="Default VAT">
                <select className={fieldCls} value={defaultVat} onChange={e => setDefaultVat(e.target.value)}>
                  <option value="15">15% (standard)</option>
                  <option value="0">0% (zero-rated)</option>
                </select>
              </F>
              <F label="Inventory method">
                <select className={fieldCls} value={inventoryMethod} onChange={e => setInventoryMethod(e.target.value)}>
                  <option value="FIFO">FIFO – perpetual</option>
                  <option value="WAC">Weighted average</option>
                </select>
              </F>
            </div>
            <div className="text-xs font-medium mb-2">Status</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <IntegrationStatus label="SARS eFiling"        linked={!!efilingUser} />
              <IntegrationStatus label="FNB bank feed"       linked={bankAccounts.length > 0} />
              <IntegrationStatus label="SimplePay (payroll)" linked={false} />
              <IntegrationStatus label="Yoco / Stitch (POS)" linked={false} />
            </div>
          </div>
        </div>
      )}

      {/* ── Bank accounts ── */}
      {tab === 'Bank accounts' && (
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--paper-edge)' }}>
          <div className="px-4 py-2 text-xs font-medium" style={{ background: 'var(--paper-edge)', color: 'var(--ink-2)' }}>
            Connected bank accounts
          </div>
          {bankAccounts.length === 0 ? (
            <div className="px-4 py-6 text-xs text-center" style={{ color: 'var(--muted)' }}>
              No bank accounts configured — run the import script to add one
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--paper-edge)' }}>
                  {['Name', 'Bank', 'Account number', 'Closing balance', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-medium" style={{ color: 'var(--ink-2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bankAccounts.map(ba => (
                  <tr key={ba.id} style={{ borderBottom: '1px solid var(--paper-edge)', background: 'var(--surface)' }}>
                    <td className="px-4 py-2 font-medium">{ba.name}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--ink-2)' }}>{ba.bank_name ?? '—'}</td>
                    <td className="px-4 py-2 font-mono" style={{ color: 'var(--ink-2)' }}>
                      {ba.account_number ? ba.account_number.slice(0, 4) + ' ···· ' + ba.account_number.slice(-4) : '—'}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      R {ba.balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2">
                      <span style={{ color: 'var(--positive)' }}>active ✓</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'Users' && (
        <div className="rounded-lg p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
          <div className="text-sm font-medium mb-3 italic">Users</div>
          <div className="text-xs" style={{ color: 'var(--ink-2)' }}>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px dotted var(--paper-edge)' }}>
              <span>photosharer818@gmail.com</span>
              <span style={{ color: 'var(--positive)' }}>Owner</span>
            </div>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
            Invite additional users — accountant, bookkeeper, auditor read-only — coming soon
          </p>
        </div>
      )}

      {/* ── Year-end ── */}
      {tab === 'Year-end' && (
        <div className="rounded-lg p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
          <div className="text-sm font-medium mb-4 italic">Year-end & lock</div>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <F label="Financial year end month">
              <select className={fieldCls} value={yearEnd} onChange={e => setYearEnd(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
                ))}
              </select>
            </F>
            <F label="Books locked through">
              <input className={fieldCls} type="date" value={booksLocked} onChange={e => setBooksLocked(e.target.value)} />
            </F>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--ink-2)', fontStyle: 'italic' }}>
            Locking the books prevents back-dated journal entries · year-end close runs the IT14 pack
          </p>
        </div>
      )}

      {/* ── Integrations ── */}
      {tab === 'Integrations' && (
        <div className="rounded-lg p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
          <div className="text-sm font-medium mb-4 italic">External integrations</div>
          <div className="space-y-3">
            {[
              { label: 'SARS eFiling', desc: 'Auto-populate VAT 201 & EMP 201', linked: !!efilingUser, action: 'Configure' },
              { label: 'FNB bank feed', desc: 'Statement import via PDF · 438 transactions loaded', linked: bankAccounts.length > 0, action: 'Re-import' },
              { label: 'SimplePay (payroll)', desc: 'Sync payroll journals from SimplePay', linked: false, action: 'Connect' },
              { label: 'Yoco / Stitch (POS)', desc: 'Auto-reconcile card payments', linked: false, action: 'Connect' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px dotted var(--paper-edge)' }}>
                <div>
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{item.desc}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: item.linked ? 'var(--positive)' : 'var(--muted)' }}>
                    {item.linked ? 'linked ✓' : 'not linked'}
                  </span>
                  <button
                    className="text-xs px-2 py-1 rounded"
                    style={{ border: '1px solid var(--paper-edge)', color: 'var(--ink-2)' }}
                  >
                    {item.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {tab !== 'Users' && tab !== 'Bank accounts' && tab !== 'Integrations' && (
        <div className="flex items-center justify-between">
          <div className="px-3 py-2 text-xs rounded" style={{ border: '1px dashed var(--paper-edge)', color: 'var(--ink-2)', fontStyle: 'italic' }}>
            {tab === 'Year-end'
              ? 'Locking the books prevents back-dated journal entries · year-end runs the IT14 pack'
              : 'Changes take effect immediately on all reports and submissions'}
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      )}
    </div>
  )
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{label}</label>
      {children}
    </div>
  )
}

function IntegrationStatus({ label, linked }: { label: string; linked: boolean }) {
  return (
    <div className="text-xs">
      {label}{' '}
      <span style={{ color: linked ? 'var(--positive)' : 'var(--muted)' }}>
        {linked ? 'linked ✓' : 'not linked'}
      </span>
    </div>
  )
}
