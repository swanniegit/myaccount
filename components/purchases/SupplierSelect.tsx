'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Contact } from '@/lib/types'

interface Props {
  value: string
  onChange: (contactId: string) => void
}

export default function SupplierSelect({ value, onChange }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showAdd, setShowAdd]   = useState(false)
  const [newName, setNewName]   = useState('')
  const [saving, setSaving]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function loadContacts() {
    const { data } = await supabase
      .from('acct_contacts')
      .select('id, name')
      .in('type', ['supplier', 'both'])
      .eq('is_active', true)
      .order('name')
    if (data) setContacts(data as Contact[])
  }

  useEffect(() => { loadContacts() }, [])
  useEffect(() => { if (showAdd) inputRef.current?.focus() }, [showAdd])

  async function addSupplier() {
    if (!newName.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('acct_contacts')
      .insert({ name: newName.trim(), type: 'supplier', is_active: true })
      .select('id, name')
      .single()
    if (data) {
      setContacts(prev => [...prev, data as Contact].sort((a, b) => a.name.localeCompare(b.name)))
      onChange(data.id)
    }
    setNewName('')
    setShowAdd(false)
    setSaving(false)
  }

  if (showAdd) {
    return (
      <div className="flex gap-1.5 items-center">
        <input
          ref={inputRef}
          className="field flex-1"
          placeholder="Supplier name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addSupplier() }
            if (e.key === 'Escape') setShowAdd(false)
          }}
        />
        <button
          onClick={addSupplier}
          disabled={saving || !newName.trim()}
          className="btn btn-sm btn-primary"
        >
          {saving ? '…' : 'Add'}
        </button>
        <button onClick={() => setShowAdd(false)} className="text-xs t-secondary">✕</button>
      </div>
    )
  }

  return (
    <div className="flex gap-1.5 items-center">
      <select className="field flex-1" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— Select supplier —</option>
        {contacts.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="text-xs t-accent whitespace-nowrap hover:opacity-70"
      >
        + New
      </button>
    </div>
  )
}
