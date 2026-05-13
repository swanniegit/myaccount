'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Company, BankAccount } from '@/lib/types'
import { monthName } from '@/lib/utils'
import Button from '@/components/ui/Button'

const TABS = ['Company', 'Tax & SARS', 'Bank accounts', 'Users', 'Year-end', 'Integrations']

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
        <p className="text-xs mt-0.5 text-ink-2">SARS / VAT / banking · used everywhere</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="pill"
            data-active={tab === t}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Company ── */}
      {tab === 'Company' && (
        <div className="card p-5 mb-4">
          <div className="text-sm font-medium mb-4 italic">Business details</div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Business name">
              <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Thandi's Trading (Pty) Ltd" />
            </F>
            <F label="Phone">
              <input className="field" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27 11 123 4567" />
            </F>
            <F label="Email">
              <input className="field" value={email} onChange={e => setEmail(e.target.value)} placeholder="accounts@company.co.za" />
            </F>
            <F label="Address">
              <input className="field" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main Street, Sandton, 2196" />
            </F>
          </div>
        </div>
      )}

      {/* ── Tax & SARS ── */}
      {tab === 'Tax & SARS' && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="card p-5">
            <div className="text-sm font-medium mb-4 italic">Tax registration</div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Business name">
                <input className="field" value={name} onChange={e => setName(e.target.value)} />
              </F>
              <F label="Reg no.">
                <input className="field" value={regNo} onChange={e => setRegNo(e.target.value)} placeholder="2022/123456/07" />
              </F>
              <F label="Tax / Income tax no.">
                <input className="field" value={taxNo} onChange={e => setTaxNo(e.target.value)} placeholder="9123456789" />
              </F>
              <F label="VAT no.">
                <input className="field" value={vatNo} onChange={e => setVatNo(e.target.value)} placeholder="4123456789" />
              </F>
              <F label="VAT registration date">
                <input className="field" type="date" value={vatDate} onChange={e => setVatDate(e.target.value)} />
              </F>
              <F label="VAT cycle">
                <select className="field" value={vatCycle} onChange={e => setVatCycle(e.target.value)}>
                  <option>Category A - bi-monthly</option>
                  <option>Category B - bi-monthly</option>
                  <option>Category C - monthly</option>
                </select>
              </F>
              <F label="PAYE / UIF / SDL ref">
                <input className="field" value={payeRef} onChange={e => setPayeRef(e.target.value)} placeholder="7700123456" />
              </F>
              <F label="SARS eFiling user">
                <input className="field" value={efilingUser} onChange={e => setEfilingUser(e.target.value)} placeholder="TG-44" />
              </F>
            </div>
            <div className="notice notice-accent italic text-xs mt-3">
              Used on every tax invoice, VAT 201 and EMP 201 submission
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm font-medium mb-4 italic">Accounting policy</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <F label="Reporting standard">
                <input className="field" readOnly value="IFRS for SMEs" style={{ opacity: 0.6 }} />
              </F>
              <F label="Functional currency">
                <input className="field" readOnly value="ZAR (R)" style={{ opacity: 0.6 }} />
              </F>
              <F label="Year end">
                <select className="field" value={yearEnd} onChange={e => setYearEnd(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
                  ))}
                </select>
              </F>
              <F label="Books locked through">
                <input className="field" type="date" value={booksLocked} onChange={e => setBooksLocked(e.target.value)} />
              </F>
              <F label="Default VAT">
                <select className="field" value={defaultVat} onChange={e => setDefaultVat(e.target.value)}>
                  <option value="15">15% (standard)</option>
                  <option value="0">0% (zero-rated)</option>
                </select>
              </F>
              <F label="Inventory method">
                <select className="field" value={inventoryMethod} onChange={e => setInventoryMethod(e.target.value)}>
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
        <div className="card overflow-hidden mb-4">
          <div className="px-4 py-2 text-xs font-medium bg-paper-edge text-ink-2">
            Connected bank accounts
          </div>
          {bankAccounts.length === 0 ? (
            <div className="px-4 py-6 text-xs text-center text-muted">
              No bank accounts configured — run the import script to add one
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="t-head">
                <tr>
                  {['Name', 'Bank', 'Account number', 'Closing balance', 'Status'].map(h => (
                    <th key={h} className="text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bankAccounts.map(ba => (
                  <tr key={ba.id} className="t-row">
                    <td className="t-cell font-medium">{ba.name}</td>
                    <td className="t-cell text-ink-2">{ba.bank_name ?? '—'}</td>
                    <td className="t-cell font-mono text-ink-2">
                      {ba.account_number ? ba.account_number.slice(0, 4) + ' ···· ' + ba.account_number.slice(-4) : '—'}
                    </td>
                    <td className="t-cell num">
                      R {ba.balance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="t-cell text-positive">active ✓</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'Users' && (
        <div className="card p-5 mb-4">
          <div className="text-sm font-medium mb-3 italic">Users</div>
          <div className="text-xs">
            <div className="flex justify-between py-2 border-b border-dotted border-paper-edge">
              <span>photosharer818@gmail.com</span>
              <span className="text-positive">Owner</span>
            </div>
          </div>
          <p className="text-xs mt-4 text-muted italic">
            Invite additional users — accountant, bookkeeper, auditor read-only — coming soon
          </p>
        </div>
      )}

      {/* ── Year-end ── */}
      {tab === 'Year-end' && (
        <div className="card p-5 mb-4">
          <div className="text-sm font-medium mb-4 italic">Year-end & lock</div>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <F label="Financial year end month">
              <select className="field" value={yearEnd} onChange={e => setYearEnd(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
                ))}
              </select>
            </F>
            <F label="Books locked through">
              <input className="field" type="date" value={booksLocked} onChange={e => setBooksLocked(e.target.value)} />
            </F>
          </div>
          <p className="text-xs mt-4 italic text-ink-2">
            Locking the books prevents back-dated journal entries · year-end close runs the IT14 pack
          </p>
        </div>
      )}

      {/* ── Integrations ── */}
      {tab === 'Integrations' && (
        <div className="card p-5 mb-4">
          <div className="text-sm font-medium mb-4 italic">External integrations</div>
          <div className="space-y-3">
            {[
              { label: 'SARS eFiling', desc: 'Auto-populate VAT 201 & EMP 201', linked: !!efilingUser, action: 'Configure' },
              { label: 'FNB bank feed', desc: 'Statement import via PDF · 438 transactions loaded', linked: bankAccounts.length > 0, action: 'Re-import' },
              { label: 'SimplePay (payroll)', desc: 'Sync payroll journals from SimplePay', linked: false, action: 'Connect' },
              { label: 'Yoco / Stitch (POS)', desc: 'Auto-reconcile card payments', linked: false, action: 'Connect' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-dotted border-paper-edge">
                <div>
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="text-xs mt-0.5 text-ink-2">{item.desc}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: item.linked ? 'var(--positive)' : 'var(--muted)' }}>
                    {item.linked ? 'linked ✓' : 'not linked'}
                  </span>
                  <button className="btn btn-ghost text-xs">{item.action}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {tab !== 'Users' && tab !== 'Bank accounts' && tab !== 'Integrations' && (
        <div className="flex items-center justify-between">
          <div className="notice notice-dashed text-xs italic">
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
      <label className="field-label">{label}</label>
      <div className="field-wrap">{children}</div>
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
