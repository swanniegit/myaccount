'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Company } from '@/lib/types'
import { monthName } from '@/lib/utils'
import Button from '@/components/ui/Button'

const TABS = ['Company', 'Tax & SARS', 'Bank accounts', 'Users', 'Year-end', 'Integrations']

export default function CompanySettingsPage() {
  const [tab, setTab] = useState('Tax & SARS')
  const [company, setCompany] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [regNo, setRegNo] = useState('')
  const [taxNo, setTaxNo] = useState('')
  const [vatNo, setVatNo] = useState('')
  const [vatDate, setVatDate] = useState('')
  const [vatCycle, setVatCycle] = useState('Category A – bi-monthly')
  const [payeRef, setPayeRef] = useState('')
  const [efilingUser, setEfilingUser] = useState('')
  const [yearEnd, setYearEnd] = useState(2)
  const [defaultVat, setDefaultVat] = useState('15% (standard)')
  const [inventoryMethod, setInventoryMethod] = useState('FIFO · perpetual.')

  useEffect(() => {
    supabase.from('acct_company').select('*').limit(1).single().then(({ data }) => {
      if (data) {
        setCompany(data)
        setName(data.name ?? '')
        setRegNo(data.registration_number ?? '')
        setVatNo(data.vat_number ?? '')
        setYearEnd(data.tax_year_end ?? 2)
      }
    })
  }, [])

  async function save() {
    setSaving(true)
    if (company) {
      await supabase.from('acct_company').update({
        name, registration_number: regNo, vat_number: vatNo, tax_year_end: yearEnd,
      }).eq('id', company.id)
    } else {
      const { data } = await supabase.from('acct_company').insert({
        name, registration_number: regNo, vat_number: vatNo, tax_year_end: yearEnd,
      }).select().single()
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

      {tab === 'Tax & SARS' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Tax registration */}
            <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
              <div className="text-sm font-medium mb-4 italic">Tax registration</div>
              <div className="grid grid-cols-2 gap-3">
                <SettingsField label="Business name">
                  <input value={name} onChange={e => setName(e.target.value)} />
                </SettingsField>
                <SettingsField label="Reg no.">
                  <input value={regNo} onChange={e => setRegNo(e.target.value)} placeholder="2022/123456/07" />
                </SettingsField>
                <SettingsField label="Tax / Income tax no.">
                  <input value={taxNo} onChange={e => setTaxNo(e.target.value)} placeholder="9123456789" />
                </SettingsField>
                <SettingsField label="VAT no.">
                  <input value={vatNo} onChange={e => setVatNo(e.target.value)} placeholder="4123456789" />
                </SettingsField>
                <SettingsField label="VAT registration date">
                  <input type="date" value={vatDate} onChange={e => setVatDate(e.target.value)} />
                </SettingsField>
                <SettingsField label="VAT cycle">
                  <select value={vatCycle} onChange={e => setVatCycle(e.target.value)}>
                    <option>Category A – bi-monthly</option>
                    <option>Category B – bi-monthly</option>
                    <option>Category C – monthly</option>
                  </select>
                </SettingsField>
                <SettingsField label="PAYE / UIF / SDL ref">
                  <input value={payeRef} onChange={e => setPayeRef(e.target.value)} placeholder="7700123456" />
                </SettingsField>
                <SettingsField label="SARS eFiling user">
                  <input value={efilingUser} onChange={e => setEfilingUser(e.target.value)} placeholder="TG-44 · linked ✓" />
                </SettingsField>
              </div>
              <div
                className="mt-3 px-3 py-2 text-xs rounded"
                style={{ border: '1px dashed var(--accent)', color: 'var(--accent)', fontStyle: 'italic' }}
              >
                Used on every tax invoice, VAT 201 and EMP 201 submission
              </div>
            </div>

            {/* Accounting policy */}
            <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--paper-edge)' }}>
              <div className="text-sm font-medium mb-4 italic">Accounting policy</div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <SettingsField label="Reporting standard">
                  <input readOnly value="IFRS for SMEs" />
                </SettingsField>
                <SettingsField label="Functional currency">
                  <input readOnly value="ZAR (R)" />
                </SettingsField>
                <SettingsField label="Year end">
                  <select value={yearEnd} onChange={e => setYearEnd(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
                    ))}
                  </select>
                </SettingsField>
                <SettingsField label="Books locked through">
                  <input readOnly value="31 January 2026" />
                </SettingsField>
                <SettingsField label="Default VAT">
                  <select value={defaultVat} onChange={e => setDefaultVat(e.target.value)}>
                    <option>15% (standard)</option>
                    <option>0% (zero-rated)</option>
                  </select>
                </SettingsField>
                <SettingsField label="Inventory method">
                  <select value={inventoryMethod} onChange={e => setInventoryMethod(e.target.value)}>
                    <option>FIFO · perpetual.</option>
                    <option>Weighted average</option>
                  </select>
                </SettingsField>
              </div>

              {/* Status */}
              <div className="text-xs font-medium mb-2">Status</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <IntegrationStatus label="SARS eFiling" linked />
                <IntegrationStatus label="FNB bank feed" linked />
                <IntegrationStatus label="SimplePay (payroll)" linked={false} />
                <IntegrationStatus label="Yoco / Stitch (POS)" linked={false} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div
              className="px-3 py-2 text-xs rounded"
              style={{ border: '1px dashed var(--paper-edge)', color: 'var(--ink-2)', fontStyle: 'italic' }}
            >
              Locking the books prevents back-dated journal entries · year-end runs the IT14 pack
            </div>
            <Button size="sm" onClick={save} disabled={saving}>
              {saved ? 'Saved ✓' : 'Save settings'}
            </Button>
          </div>
        </>
      )}

      {tab !== 'Tax & SARS' && (
        <div
          className="rounded-lg p-8 text-center text-xs"
          style={{ border: '1px dashed var(--paper-edge)', color: 'var(--muted)' }}
        >
          {tab} settings — coming soon
        </div>
      )}
    </div>
  )
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{label}</label>
      <div
        className="
          [&>input]:w-full [&>input]:px-2.5 [&>input]:py-1.5 [&>input]:rounded [&>input]:text-xs [&>input]:border [&>input]:outline-none
          [&>select]:w-full [&>select]:px-2.5 [&>select]:py-1.5 [&>select]:rounded [&>select]:text-xs [&>select]:border [&>select]:outline-none
        "
        style={{ '--b': 'var(--paper-edge)' } as React.CSSProperties}
      >
        <style>{`
          [data-settings-field] input, [data-settings-field] select {
            border-color: var(--paper-edge);
            background: var(--paper);
          }
        `}</style>
        {children}
      </div>
    </div>
  )
}

function IntegrationStatus({ label, linked }: { label: string; linked: boolean }) {
  return (
    <div>
      <span>{label} </span>
      <span style={{ color: linked ? 'var(--positive)' : 'var(--muted)' }}>
        {linked ? 'linked ✓' : 'not linked'}
      </span>
    </div>
  )
}
