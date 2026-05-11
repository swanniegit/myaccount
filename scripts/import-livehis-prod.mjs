#!/usr/bin/env node
/**
 * Bulk import from production liveHIS → myAccount Supabase.
 * Processes all invoices + payments from 2025-03-01 onwards.
 *
 * Usage:
 *   node scripts/import-livehis-prod.mjs
 *   node scripts/import-livehis-prod.mjs --dry-run
 */
import mysql from 'mysql2/promise'
import { createClient } from '@supabase/supabase-js'

const DRY = process.argv.includes('--dry-run')

const SUPABASE_URL = 'https://saujtvflbumngsfcjvdt.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdWp0dmZsYnVtbmdzZmNqdmR0Iiwicm9sZSI6' +
  'InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzMzY3NiwiZXhwIjoyMDgzMTA5Njc2fQ.' +
  'qk9lRm63n17ekZyumy3Svae65e2aAX7Mb9IIkDV_-eI'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const db = await mysql.createConnection({
  host: 'sql32.cpt3.host-h.net',
  user: 'heartsi1',
  password: 'Th3dbmovetoxneel',
  database: 'heartsinscrubs_db',
})

// ---------------------------------------------------------------------------
// Account ID cache
// ---------------------------------------------------------------------------
const accountCache = {}
async function getAccountId(code) {
  if (accountCache[code]) return accountCache[code]
  const { data, error } = await supabase.from('acct_accounts').select('id').eq('code', code).single()
  if (error || !data) throw new Error(`Account ${code} not found: ${error?.message}`)
  accountCache[code] = data.id
  return data.id
}

// ---------------------------------------------------------------------------
// Contact upsert cache
// ---------------------------------------------------------------------------
const contactCache = {}
async function upsertContact(patientId, name, email, phone) {
  const ref = `his_pat_${patientId}`
  if (contactCache[ref]) return contactCache[ref]

  const { data: existing } = await supabase
    .from('acct_contacts')
    .select('id')
    .eq('external_ref', ref)
    .maybeSingle()

  if (existing) {
    contactCache[ref] = existing.id
    return existing.id
  }

  if (DRY) {
    contactCache[ref] = `dry_${ref}`
    return contactCache[ref]
  }

  const { data, error } = await supabase
    .from('acct_contacts')
    .insert({ name: name || 'Unknown', type: 'customer', email: email || null, phone: phone || null, external_ref: ref, is_active: true })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to upsert contact ${ref}: ${error?.message}`)
  contactCache[ref] = data.id
  return data.id
}

// ---------------------------------------------------------------------------
// Invoice import
// ---------------------------------------------------------------------------
async function importInvoices() {
  const [rows] = await db.execute(`
    SELECT
      i.invoice_id, i.invoice_number, i.invoice_date, i.invoice_type,
      i.subtotal_amount, i.vat_amount, i.total_amount, i.status, i.due_date, i.notes,
      p.patient_id, p.patient_surname, p.patient_names, p.email, p.contact_number
    FROM billing_invoices i
    JOIN patients p ON i.patient_id = p.patient_id
    WHERE i.invoice_date >= '2025-03-01'
    ORDER BY i.invoice_date
  `)

  console.log(`\nImporting ${rows.length} invoices...`)

  let ok = 0, skipped = 0, failed = 0

  for (const row of rows) {
    const externalRef = `his_inv_${row.invoice_id}`

    // Idempotency check
    const { data: existing } = await supabase
      .from('acct_invoices')
      .select('id')
      .eq('external_ref', externalRef)
      .maybeSingle()

    if (existing) { skipped++; continue }

    try {
      const name = `${row.patient_names || ''} ${row.patient_surname || ''}`.trim() || 'Unknown'
      const contactId = await upsertContact(row.patient_id, name, row.email, row.contact_number)

      const subtotal = parseFloat(row.subtotal_amount) || 0
      const vatAmount = parseFloat(row.vat_amount) || 0
      const total = parseFloat(row.total_amount) || 0
      const invoiceType = ['cash', 'medical_aid', 'corporate', 'wca'].includes(row.invoice_type)
        ? row.invoice_type : 'cash'

      let journalEntryId = null
      if (!DRY && total > 0 && subtotal >= 0 && vatAmount >= 0) {
        const safeTotal    = Math.max(0, total)
        const safeSubtotal = Math.max(0, subtotal)
        const safeVat      = Math.max(0, vatAmount)

        const debitCode = invoiceType === 'cash' ? '1010' : '1100'
        const [debitId, revenueId, vatId] = await Promise.all([
          getAccountId(debitCode),
          getAccountId('4100'),
          getAccountId('2100'),
        ])

        const { data: entry, error: entryErr } = await supabase
          .from('acct_journal_entries')
          .insert({ date: row.invoice_date, description: `Invoice ${row.invoice_number} — liveHis`, reference: row.invoice_number, source: 'invoice', is_posted: true })
          .select('id').single()
        if (entryErr || !entry) throw new Error(`Journal entry failed: ${entryErr?.message}`)

        await supabase.from('acct_journal_lines').insert([
          { entry_id: entry.id, account_id: debitId,   debit: safeTotal,    credit: 0,            description: `AR/Cash — ${row.invoice_number}` },
          { entry_id: entry.id, account_id: revenueId, debit: 0,            credit: safeSubtotal, description: `Revenue — ${row.invoice_number}` },
          { entry_id: entry.id, account_id: vatId,     debit: 0,            credit: safeVat,      description: `VAT Output — ${row.invoice_number}` },
        ])

        journalEntryId = entry.id
      }

      // Map status
      const statusMap = { draft: 'draft', submitted: 'sent', unpaid: 'sent', partially_paid: 'sent', paid: 'paid', cancelled: 'void', write_off: 'void', void: 'void', split_pending_payment: 'sent' }
      const status = statusMap[row.status] ?? 'sent'

      if (!DRY) {
        const { data: inv, error: invErr } = await supabase
          .from('acct_invoices')
          .insert({
            number: row.invoice_number,
            contact_id: contactId,
            date: row.invoice_date,
            due_date: row.due_date ?? null,
            status,
            subtotal,
            vat_amount: vatAmount,
            total,
            notes: row.notes ?? null,
            journal_entry_id: journalEntryId,
            external_ref: externalRef,
          })
          .select('id').single()
        if (invErr || !inv) throw new Error(`Invoice insert failed: ${invErr?.message}`)

        // Fetch and insert line items
        const [items] = await db.execute(
          `SELECT description, quantity, unit_price, vat_rate, line_total FROM billing_invoice_items WHERE invoice_id = ?`,
          [row.invoice_id]
        )
        if (items.length > 0) {
          const revenueAccountId = await getAccountId('4100')
          const lines = items.map(it => ({
            invoice_id: inv.id,
            description: it.description,
            quantity: parseFloat(it.quantity) || 1,
            unit_price: parseFloat(it.unit_price) || 0,
            vat_rate: parseFloat(it.vat_rate) || 15,
            account_id: revenueAccountId,
            line_total: parseFloat(it.line_total) || 0,
          }))
          await supabase.from('acct_invoice_lines').insert(lines)
        }
      }

      ok++
      if (ok % 50 === 0) process.stdout.write(`  ${ok} invoices done...\n`)
    } catch (e) {
      console.error(`  FAIL invoice ${row.invoice_id}: ${e.message}`)
      failed++
    }
  }

  console.log(`Invoices: ${ok} imported, ${skipped} already existed, ${failed} failed`)
}

// ---------------------------------------------------------------------------
// Payment import
// ---------------------------------------------------------------------------
async function importPayments() {
  const [rows] = await db.execute(`
    SELECT
      bp.payment_id, bp.invoice_id, bp.payment_date, bp.amount,
      bp.payment_method, bp.reference_number, bp.status
    FROM billing_payments bp
    JOIN billing_invoices bi ON bp.invoice_id = bi.invoice_id
    WHERE bp.payment_date >= '2025-03-01'
      AND bp.status = 'active'
    ORDER BY bp.payment_date
  `)

  console.log(`\nImporting ${rows.length} payments...`)

  let ok = 0, skipped = 0, failed = 0

  const [bankId, arId] = await Promise.all([getAccountId('1010'), getAccountId('1100')])

  for (const row of rows) {
    const invRef = `his_inv_${row.invoice_id}`

    const { data: invoice } = await supabase
      .from('acct_invoices')
      .select('id, total, status')
      .eq('external_ref', invRef)
      .maybeSingle()

    if (!invoice) { skipped++; continue }

    // Check if payment journal already exists for this invoice + amount + date
    const desc = `Payment for ${invRef} — his_pay_${row.payment_id}`
    const { data: existingEntry } = await supabase
      .from('acct_journal_entries')
      .select('id')
      .eq('description', desc)
      .maybeSingle()
    if (existingEntry) { skipped++; continue }

    try {
      const amount = parseFloat(row.amount) || 0
      const methodMap = { cash: 'cash', eft: 'eft', credit_card: 'card', debit_card: 'card', medical_aid: 'medical_aid', cheque: 'eft', credit: 'eft', other: 'eft' }

      if (!DRY) {
        const { data: entry, error: entryErr } = await supabase
          .from('acct_journal_entries')
          .insert({ date: row.payment_date, description: desc, reference: row.reference_number ?? null, source: 'invoice', is_posted: true })
          .select('id').single()
        if (entryErr || !entry) throw new Error(`Payment journal failed: ${entryErr?.message}`)

        await supabase.from('acct_journal_lines').insert([
          { entry_id: entry.id, account_id: bankId, debit: amount, credit: 0,      description: desc },
          { entry_id: entry.id, account_id: arId,   debit: 0,      credit: amount, description: desc },
        ])

        const newStatus = amount >= invoice.total ? 'paid' : invoice.status
        await supabase.from('acct_invoices').update({ status: newStatus }).eq('id', invoice.id)
      }

      ok++
      if (ok % 50 === 0) process.stdout.write(`  ${ok} payments done...\n`)
    } catch (e) {
      console.error(`  FAIL payment ${row.payment_id}: ${e.message}`)
      failed++
    }
  }

  console.log(`Payments: ${ok} imported, ${skipped} skipped (invoice not found or duplicate), ${failed} failed`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log(DRY ? '\n=== DRY RUN ===' : '\n=== LIVE IMPORT ===')
console.log('Source: production liveHIS (sql32.cpt3.host-h.net)')
console.log('Target: myAccount Supabase (saujtvflbumngsfcjvdt)')

await importInvoices()
await importPayments()

await db.end()
console.log('\nDone.')
