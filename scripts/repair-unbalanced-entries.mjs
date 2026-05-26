#!/usr/bin/env node
/**
 * Repairs unbalanced journal entries created by import-livehis-prod.mjs.
 * Root cause: VAT credit used MySQL vat_amount directly; safeTotal != safeSubtotal + safeVat.
 * Fix: re-derive VAT as (total - subtotal) so each entry balances exactly.
 *
 * Usage:
 *   node --env-file=.env.local scripts/repair-unbalanced-entries.mjs --dry-run
 *   node --env-file=.env.local scripts/repair-unbalanced-entries.mjs
 */
import { createClient } from '@supabase/supabase-js'

const DRY = process.argv.includes('--dry-run')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Run with: node --env-file=.env.local scripts/repair-unbalanced-entries.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ---------------------------------------------------------------------------
// Step 1: Load all journal lines and find unbalanced entry IDs
// ---------------------------------------------------------------------------
console.log('Loading journal lines...')
const allLines = []
const BATCH = 1000
let offset = 0
while (true) {
  const { data, error } = await supabase
    .from('acct_journal_lines')
    .select('id, entry_id, account_id, debit, credit')
    .range(offset, offset + BATCH - 1)
  if (error) throw new Error('Failed to load lines: ' + error.message)
  allLines.push(...data)
  if (data.length < BATCH) break
  offset += BATCH
}
console.log(`  ${allLines.length} lines loaded.`)

const entryTotals = {}
for (const l of allLines) {
  if (!entryTotals[l.entry_id]) entryTotals[l.entry_id] = { dr: 0, cr: 0, lines: [] }
  entryTotals[l.entry_id].dr += Number(l.debit)
  entryTotals[l.entry_id].cr += Number(l.credit)
  entryTotals[l.entry_id].lines.push(l)
}

const badEntryIds = Object.entries(entryTotals)
  .filter(([, v]) => Math.abs(v.dr - v.cr) >= 0.01)
  .map(([id]) => id)

console.log(`\nUnbalanced entries found: ${badEntryIds.length}`)
if (!badEntryIds.length) { console.log('Nothing to repair.'); process.exit(0) }

// ---------------------------------------------------------------------------
// Step 2: Load invoices linked to these entries
// ---------------------------------------------------------------------------
console.log('Loading linked invoices from Supabase...')
const { data: invoices, error: invErr } = await supabase
  .from('acct_invoices')
  .select('id, number, journal_entry_id, total, subtotal')
  .in('journal_entry_id', badEntryIds)
if (invErr) throw new Error('Invoice lookup failed: ' + invErr.message)

const invByEntryId = {}
for (const inv of invoices) invByEntryId[inv.journal_entry_id] = inv

console.log(`  ${invoices.length} linked invoices found.`)

// ---------------------------------------------------------------------------
// Step 3: Load account codes for lookup
// ---------------------------------------------------------------------------
const { data: accounts } = await supabase.from('acct_accounts').select('id, code')
const codeById = {}
for (const a of accounts) codeById[a.id] = a.code

// ---------------------------------------------------------------------------
// Step 4: Build repairs
// ---------------------------------------------------------------------------
const repairs = []
const skipped = []

for (const entryId of badEntryIds) {
  const { dr, cr, lines } = entryTotals[entryId]
  const diff = Math.round((dr - cr) * 100) / 100
  const invoice = invByEntryId[entryId]

  if (!invoice) {
    skipped.push({ entryId, diff, reason: 'no linked invoice found — manual review needed' })
    continue
  }

  // Determine which account was debited (1010 or 1100)
  const debitLine = lines.find(l => Number(l.debit) > 0)
  if (!debitLine) {
    skipped.push({ entryId, diff, reason: 'no debit line found — unusual structure' })
    continue
  }
  const debitAcctCode = codeById[debitLine.account_id]
  if (!['1010', '1100'].includes(debitAcctCode)) {
    skipped.push({ entryId, diff, reason: `unexpected debit account ${debitAcctCode}` })
    continue
  }

  const safeTotal    = Math.round(Math.max(0, Number(invoice.total))    * 100) / 100
  const safeSubtotal = Math.round(Math.max(0, Number(invoice.subtotal)) * 100) / 100
  const safeVatCredit = Math.round((safeTotal - safeSubtotal) * 100) / 100

  repairs.push({
    entryId,
    invoiceNumber: invoice.number,
    debitAcctId: debitLine.account_id,
    debitAcctCode,
    safeTotal,
    safeSubtotal,
    safeVatCredit,
    oldDiff: diff,
  })
}

// ---------------------------------------------------------------------------
// Step 5: Report
// ---------------------------------------------------------------------------
console.log(`\n  Repairable : ${repairs.length}`)
console.log(`  Skipped    : ${skipped.length}`)

if (skipped.length) {
  console.log('\nSkipped (manual review):')
  for (const s of skipped) console.log(`  entry=${s.entryId}  diff=${s.diff}  reason=${s.reason}`)
}

if (DRY) {
  console.log('\n--- DRY RUN — no changes written ---')
  console.log('\nSample repairs (first 10):')
  for (const r of repairs.slice(0, 10)) {
    console.log(`  ${r.invoiceNumber}  DR ${r.debitAcctCode}:${r.safeTotal}  CR 4100:${r.safeSubtotal}  CR 2100:${r.safeVatCredit}  (was off by ${r.oldDiff})`)
  }
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Step 6: Load required account IDs
// ---------------------------------------------------------------------------
const { data: acct4100 } = await supabase.from('acct_accounts').select('id').eq('code', '4100').single()
const { data: acct2100 } = await supabase.from('acct_accounts').select('id').eq('code', '2100').single()
if (!acct4100 || !acct2100) throw new Error('Could not find account 4100 or 2100')

// ---------------------------------------------------------------------------
// Step 7: Delete old lines and insert corrected ones
// ---------------------------------------------------------------------------
console.log(`\nRepairing ${repairs.length} entries...`)
let fixed = 0
let failed = 0

for (const r of repairs) {
  // Delete existing lines for this entry
  const { error: delErr } = await supabase
    .from('acct_journal_lines')
    .delete()
    .eq('entry_id', r.entryId)

  if (delErr) {
    console.error(`  FAIL delete lines for entry ${r.entryId}: ${delErr.message}`)
    failed++
    continue
  }

  // Insert corrected lines.
  // If vatCredit < 0 (total < subtotal — unusual WCA/discount scenario),
  // flip it to a debit on 2100 so both sides balance and no negative credits exist.
  const newLines = r.safeVatCredit >= 0
    ? [
        { entry_id: r.entryId, account_id: r.debitAcctId, debit: r.safeTotal,             credit: 0,              description: `AR/Cash — ${r.invoiceNumber}` },
        { entry_id: r.entryId, account_id: acct4100.id,    debit: 0,                      credit: r.safeSubtotal,  description: `Revenue — ${r.invoiceNumber}` },
        { entry_id: r.entryId, account_id: acct2100.id,    debit: 0,                      credit: r.safeVatCredit, description: `VAT Output — ${r.invoiceNumber}` },
      ]
    : [
        // total < subtotal: reverse VAT as a debit (DR Bank + DR VAT-reversal = CR Revenue)
        { entry_id: r.entryId, account_id: r.debitAcctId, debit: r.safeTotal,              credit: 0,              description: `AR/Cash — ${r.invoiceNumber}` },
        { entry_id: r.entryId, account_id: acct2100.id,    debit: Math.abs(r.safeVatCredit), credit: 0,            description: `VAT Reversal — ${r.invoiceNumber}` },
        { entry_id: r.entryId, account_id: acct4100.id,    debit: 0,                       credit: r.safeSubtotal, description: `Revenue — ${r.invoiceNumber}` },
      ]

  const { error: insErr } = await supabase.from('acct_journal_lines').insert(newLines)
  if (insErr) {
    console.error(`  FAIL insert lines for entry ${r.entryId}: ${insErr.message}`)
    failed++
    continue
  }

  fixed++
  if (fixed % 20 === 0) process.stdout.write(`  ${fixed}/${repairs.length}...\n`)
}

// ---------------------------------------------------------------------------
// Step 8: Verify
// ---------------------------------------------------------------------------
console.log(`\nRepaired: ${fixed}  Failed: ${failed}  Skipped: ${skipped.length}`)

// Quick verification
console.log('\nVerifying — loading fresh lines...')
const freshLines = []
offset = 0
while (true) {
  const { data } = await supabase.from('acct_journal_lines').select('entry_id, debit, credit').range(offset, offset + BATCH - 1)
  freshLines.push(...data)
  if (data.length < BATCH) break
  offset += BATCH
}

const freshTotals = {}
for (const l of freshLines) {
  if (!freshTotals[l.entry_id]) freshTotals[l.entry_id] = { dr: 0, cr: 0 }
  freshTotals[l.entry_id].dr += Number(l.debit)
  freshTotals[l.entry_id].cr += Number(l.credit)
}

const stillBad = Object.entries(freshTotals).filter(([, v]) => Math.abs(v.dr - v.cr) >= 0.01)
console.log(`Still unbalanced after repair: ${stillBad.length}`)
if (stillBad.length) {
  for (const [id, v] of stillBad) console.log(`  entry=${id}  dr=${v.dr.toFixed(2)}  cr=${v.cr.toFixed(2)}  diff=${(v.dr - v.cr).toFixed(2)}`)
}

const rawDr = freshLines.reduce((s, l) => s + Number(l.debit),  0)
const rawCr = freshLines.reduce((s, l) => s + Number(l.credit), 0)
console.log(`\nGlobal raw totals:`)
console.log(`  DR: R ${rawDr.toFixed(2)}`)
console.log(`  CR: R ${rawCr.toFixed(2)}`)
console.log(`  Diff: R ${Math.abs(rawDr - rawCr).toFixed(2)}`)
console.log(Math.abs(rawDr - rawCr) < 0.01 ? '\nBALANCED' : '\nSTILL UNBALANCED')
