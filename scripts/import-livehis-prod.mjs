#!/usr/bin/env node
/**
 * Bulk import from production liveHIS → myAccount Supabase.
 * Optimised: pre-loads caches, batches all inserts.
 *
 * Usage:
 *   node scripts/import-livehis-prod.mjs
 *   node scripts/import-livehis-prod.mjs --dry-run
 */
import mysql from 'mysql2/promise'
import { createClient } from '@supabase/supabase-js'

const DRY = process.argv.includes('--dry-run')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const LIVEHIS_HOST = process.env.LIVEHIS_DB_HOST
const LIVEHIS_USER = process.env.LIVEHIS_DB_USER
const LIVEHIS_PASS = process.env.LIVEHIS_DB_PASS
const LIVEHIS_DB   = process.env.LIVEHIS_DB_NAME ?? 'heartsinscrubs_db'

if (!SUPABASE_URL || !SUPABASE_KEY || !LIVEHIS_HOST || !LIVEHIS_USER || !LIVEHIS_PASS) {
  console.error('Missing env vars. Run with: node --env-file=.env.local scripts/import-livehis-prod.mjs')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LIVEHIS_DB_HOST, LIVEHIS_DB_USER, LIVEHIS_DB_PASS')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const db = await mysql.createConnection({
  host: LIVEHIS_HOST,
  user: LIVEHIS_USER,
  password: LIVEHIS_PASS,
  database: LIVEHIS_DB,
})

const BATCH = 200

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sbInsertBatch(table, rows) {
  if (!rows.length || DRY) return []
  const results = []
  for (let i = 0; i < rows.length; i += BATCH) {
    const { data, error } = await supabase.from(table).insert(rows.slice(i, i + BATCH)).select('id')
    if (error) throw new Error(`${table} batch insert failed: ${error.message}`)
    results.push(...(data ?? []))
  }
  return results
}

async function getAccountIds(...codes) {
  const { data, error } = await supabase.from('acct_accounts').select('id,code').in('code', codes)
  if (error) throw new Error(`Account lookup failed: ${error.message}`)
  const map = {}
  for (const row of data) map[row.code] = row.id
  for (const code of codes) if (!map[code]) throw new Error(`Account ${code} not found`)
  return map
}

// ---------------------------------------------------------------------------
// Phase 1: Contacts
// ---------------------------------------------------------------------------
async function importContacts(invoiceRows) {
  console.log('Loading existing contacts from Supabase...')
  const { data: existing } = await supabase.from('acct_contacts').select('id,external_ref')
  const contactMap = {}
  for (const c of existing ?? []) contactMap[c.external_ref] = c.id

  // Dedupe patients from invoices
  const seen = new Set(Object.keys(contactMap))
  const toInsert = []
  for (const row of invoiceRows) {
    const ref = `his_pat_${row.patient_id}`
    if (seen.has(ref)) continue
    seen.add(ref)
    const name = `${row.patient_names || ''} ${row.patient_surname || ''}`.trim() || 'Unknown'
    toInsert.push({ name, type: 'customer', email: row.email || null, phone: row.contact_number || null, external_ref: ref, is_active: true })
  }

  console.log(`  ${Object.keys(contactMap).length} already in Supabase, inserting ${toInsert.length} new...`)
  if (!DRY && toInsert.length) {
    const inserted = await sbInsertBatch('acct_contacts', toInsert)
    for (let i = 0; i < toInsert.length; i++) contactMap[toInsert[i].external_ref] = inserted[i]?.id
  }
  console.log(`  Contacts ready: ${Object.keys(contactMap).length}`)
  return contactMap
}

// ---------------------------------------------------------------------------
// Phase 2: Invoices + journals
// ---------------------------------------------------------------------------
async function importInvoices(invoiceRows, contactMap, accts) {
  console.log('\nLoading existing invoice refs from Supabase...')
  const { data: existing } = await supabase.from('acct_invoices').select('id,external_ref')
  const existingRefs = new Set((existing ?? []).map(r => r.external_ref))
  console.log(`  ${existingRefs.size} already imported, skipping those.`)

  const toProcess = invoiceRows.filter(r => !existingRefs.has(`his_inv_${r.invoice_id}`))
  console.log(`  Importing ${toProcess.length} new invoices...`)

  if (!toProcess.length) { console.log('  Nothing to import.'); return {} }

  // Map: invoice_id → supabase uuid (populated after insert)
  const invRefToId = {}

  const statusMap = { draft: 'draft', submitted: 'sent', unpaid: 'sent', partially_paid: 'sent', paid: 'paid', cancelled: 'void', write_off: 'void', void: 'void', split_pending_payment: 'sent' }

  // Process in chunks so we can link journal entries to invoices
  for (let chunk = 0; chunk < toProcess.length; chunk += BATCH) {
    const slice = toProcess.slice(chunk, chunk + BATCH)

    // --- Build journal entries ---
    const jeRows = []
    for (const row of slice) {
      const total = Math.max(0, parseFloat(row.total_amount) || 0)
      if (total > 0) {
        jeRows.push({ date: row.invoice_date, description: `Invoice ${row.invoice_number} — liveHis`, reference: row.invoice_number, source: 'invoice', is_posted: true, _inv_id: row.invoice_id })
      }
    }

    let jeInserted = []
    if (!DRY && jeRows.length) {
      const { data, error } = await supabase
        .from('acct_journal_entries')
        .insert(jeRows.map(({ _inv_id, ...r }) => r))
        .select('id')
      if (error) throw new Error(`Journal entries failed: ${error.message}`)
      jeInserted = data
    }

    // journal_entry_id map: invoice_id → journal entry supabase id
    const jeMap = {}
    let jeIdx = 0
    for (const je of jeRows) {
      jeMap[je._inv_id] = jeInserted[jeIdx]?.id ?? null
      jeIdx++
    }

    // --- Build journal lines ---
    const jlRows = []
    for (const row of slice) {
      const invId = row.invoice_id
      const jeId = jeMap[invId]
      if (!jeId) continue
      const invoiceType = ['cash', 'medical_aid', 'corporate', 'wca'].includes(row.invoice_type) ? row.invoice_type : 'cash'
      const debitCode = invoiceType === 'cash' ? '1010' : '1100'
      const safeTotal    = Math.round(Math.max(0, parseFloat(row.total_amount)    || 0) * 100) / 100
      const safeSubtotal = Math.round(Math.max(0, parseFloat(row.subtotal_amount) || 0) * 100) / 100
      // Derive VAT as the residual so the entry always balances exactly
      const safeVatCredit = Math.round((safeTotal - safeSubtotal) * 100) / 100
      jlRows.push(
        { entry_id: jeId, account_id: accts[debitCode], debit: safeTotal,      credit: 0,             description: `AR/Cash — ${row.invoice_number}` },
        { entry_id: jeId, account_id: accts['4100'],     debit: 0,              credit: safeSubtotal,  description: `Revenue — ${row.invoice_number}` },
        { entry_id: jeId, account_id: accts['2100'],     debit: 0,              credit: safeVatCredit, description: `VAT Output — ${row.invoice_number}` },
      )
    }
    if (!DRY && jlRows.length) await sbInsertBatch('acct_journal_lines', jlRows)

    // --- Build invoices ---
    const invRows = slice.map(row => ({
      number: row.invoice_number,
      contact_id: contactMap[`his_pat_${row.patient_id}`] ?? null,
      date: row.invoice_date,
      due_date: row.due_date ?? null,
      status: statusMap[row.status] ?? 'sent',
      subtotal: parseFloat(row.subtotal_amount) || 0,
      vat_amount: parseFloat(row.vat_amount) || 0,
      total: parseFloat(row.total_amount) || 0,
      notes: row.notes ?? null,
      journal_entry_id: jeMap[row.invoice_id] ?? null,
      external_ref: `his_inv_${row.invoice_id}`,
    }))

    let invInserted = []
    if (!DRY) {
      const { data, error } = await supabase.from('acct_invoices')
        .upsert(invRows, { onConflict: 'number', ignoreDuplicates: false })
        .select('id,external_ref')
      if (error) throw new Error(`Invoices batch failed: ${error.message}`)
      invInserted = data
    }
    for (const inv of invInserted) invRefToId[inv.external_ref] = inv.id

    process.stdout.write(`  ${Math.min(chunk + BATCH, toProcess.length)}/${toProcess.length} invoices...\n`)
  }

  return invRefToId
}

// ---------------------------------------------------------------------------
// Phase 3: Invoice lines (batch fetch from MySQL, batch insert to Supabase)
// ---------------------------------------------------------------------------
async function importInvoiceLines(invoiceRows, invRefToId, accts) {
  const invIds = invoiceRows.filter(r => invRefToId[`his_inv_${r.invoice_id}`]).map(r => r.invoice_id)
  if (!invIds.length) { console.log('\nNo invoice lines to import.'); return }

  console.log(`\nFetching invoice line items for ${invIds.length} invoices from MySQL...`)

  const placeholders = invIds.map(() => '?').join(',')
  const [items] = await db.execute(
    `SELECT invoice_id, description, quantity, unit_price, vat_rate, line_total FROM billing_invoice_items WHERE invoice_id IN (${placeholders})`,
    invIds
  )

  console.log(`  ${items.length} line items found. Inserting...`)

  const revenueId = accts['4100']
  const lineRows = items
    .filter(it => invRefToId[`his_inv_${it.invoice_id}`])
    .map(it => ({
      invoice_id: invRefToId[`his_inv_${it.invoice_id}`],
      description: it.description,
      quantity: parseFloat(it.quantity) || 1,
      unit_price: parseFloat(it.unit_price) || 0,
      vat_rate: parseFloat(it.vat_rate) || 15,
      account_id: revenueId,
      line_total: parseFloat(it.line_total) || 0,
    }))

  if (!DRY) await sbInsertBatch('acct_invoice_lines', lineRows)
  console.log(`  ${lineRows.length} invoice lines inserted.`)
}

// ---------------------------------------------------------------------------
// Phase 4: Payments
// ---------------------------------------------------------------------------
async function importPayments(accts) {
  const [rows] = await db.execute(`
    SELECT bp.payment_id, bp.invoice_id, bp.payment_date, bp.amount, bp.payment_method, bp.reference_number
    FROM billing_payments bp
    JOIN billing_invoices bi ON bp.invoice_id = bi.invoice_id
    WHERE bp.payment_date >= '2025-03-01' AND bp.status = 'active'
    ORDER BY bp.payment_date
  `)

  console.log(`\nImporting ${rows.length} payments...`)

  // Load all invoices from Supabase for lookup
  const { data: sbInvoices } = await supabase.from('acct_invoices').select('id,external_ref,total,status')
  const invByRef = {}
  for (const inv of sbInvoices ?? []) invByRef[inv.external_ref] = inv

  // Load existing payment journal descriptions to skip dupes
  const { data: existingJe } = await supabase.from('acct_journal_entries').select('description').eq('source', 'invoice')
  const existingDescs = new Set((existingJe ?? []).map(e => e.description))

  const jeRows = []
  const jlRowSets = []   // parallel array — each element is [debit_line, credit_line]
  const statusUpdates = []

  for (const row of rows) {
    const invRef = `his_inv_${row.invoice_id}`
    const invoice = invByRef[invRef]
    if (!invoice) continue

    const desc = `Payment for ${invRef} — his_pay_${row.payment_id}`
    if (existingDescs.has(desc)) continue

    const amount = parseFloat(row.amount) || 0
    jeRows.push({ date: row.payment_date, description: desc, reference: row.reference_number ?? null, source: 'invoice', is_posted: true })
    jlRowSets.push([
      { account_id: accts['1010'], debit: amount, credit: 0,      description: desc },
      { account_id: accts['1100'], debit: 0,      credit: amount, description: desc },
    ])
    const newStatus = amount >= invoice.total ? 'paid' : invoice.status
    if (newStatus !== invoice.status) statusUpdates.push({ id: invoice.id, status: newStatus })
  }

  console.log(`  ${jeRows.length} new payment journals to create (${rows.length - jeRows.length} skipped)`)

  if (!DRY && jeRows.length) {
    const { data: inserted, error } = await supabase.from('acct_journal_entries').insert(jeRows).select('id')
    if (error) throw new Error(`Payment journal entries failed: ${error.message}`)

    // Build journal lines with entry IDs
    const allJl = []
    for (let i = 0; i < inserted.length; i++) {
      allJl.push({ entry_id: inserted[i].id, ...jlRowSets[i][0] })
      allJl.push({ entry_id: inserted[i].id, ...jlRowSets[i][1] })
    }
    await sbInsertBatch('acct_journal_lines', allJl)

    // Update invoice statuses
    for (const { id, status } of statusUpdates) {
      await supabase.from('acct_invoices').update({ status }).eq('id', id)
    }
    console.log(`  ${statusUpdates.length} invoice statuses updated to 'paid'`)
  }

  console.log(`Payments: ${jeRows.length} imported`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log(DRY ? '\n=== DRY RUN ===' : '\n=== LIVE IMPORT ===')
console.log('Source: production liveHIS (sql32.cpt3.host-h.net)')
console.log('Target: myAccount Supabase (saujtvflbumngsfcjvdt)\n')

const accts = await getAccountIds('1010', '1100', '2100', '4100')
console.log('Account IDs loaded:', Object.keys(accts).join(', '))

// Fetch all invoices from MySQL once
console.log('\nFetching all invoices from production liveHIS...')
const [invoiceRows] = await db.execute(`
  SELECT
    i.invoice_id, i.invoice_number, i.invoice_date, i.invoice_type,
    i.subtotal_amount, i.vat_amount, i.total_amount, i.status, i.due_date, i.notes,
    p.patient_id, p.patient_surname, p.patient_names, p.email, p.contact_number
  FROM billing_invoices i
  JOIN patients p ON i.patient_id = p.patient_id
  WHERE i.invoice_date >= '2025-03-01'
  ORDER BY i.invoice_date
`)
console.log(`${invoiceRows.length} invoices loaded from liveHIS.`)

const contactMap = await importContacts(invoiceRows)
const invRefToId  = await importInvoices(invoiceRows, contactMap, accts)
await importInvoiceLines(invoiceRows, invRefToId, accts)
await importPayments(accts)

await db.end()
console.log('\nAll done.')
