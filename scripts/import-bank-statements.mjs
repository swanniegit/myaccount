#!/usr/bin/env node
/**
 * Parses FNB Gold Business Account PDF statements (33–38) and imports
 * transactions into Supabase acct_bank_transactions.
 *
 * Usage:
 *   node scripts/import-bank-statements.mjs
 *   node scripts/import-bank-statements.mjs --force   (clear and reimport)
 */
import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Run with: node --env-file=.env.local scripts/import-bank-statements.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const FORCE = process.argv.includes('--force')

const PDFS = [
  'C:\\Users\\sanne\\Downloads\\GOLD_BUSINESS_ACCOUNT_36 (1).pdf',
  'C:\\Users\\sanne\\Downloads\\GOLD_BUSINESS_ACCOUNT_37 (1).pdf',
  'C:\\Users\\sanne\\Downloads\\GOLD_BUSINESS_ACCOUNT_38 (1).pdf',
]

const MONTH = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

// ---------------------------------------------------------------------------
// PDF parsing helpers
// ---------------------------------------------------------------------------

function extractText(pdfPath) {
  return execSync(`pdftotext -layout "${pdfPath}" -`, { encoding: 'utf8' })
}

/** Extracts the year from "Statement Period : ... to DD Month YYYY" */
function extractYear(text) {
  const m = text.match(/Statement Period\s*:.*?to\s+\d+\s+\w+\s+(\d{4})/i)
  return m ? m[1] : null
}

/** Extracts the closing balance amount (positive number) */
function extractClosingBalance(text) {
  const m = text.match(/Closing Balance\s+([\d,]+\.\d{2})\s+Cr/)
  return m ? parseFloat(m[1].replace(/,/g, '')) : null
}

/**
 * Parse all transaction lines from extracted PDF text.
 * FNB fixed-width layout:
 *   DD Mon  <description + reference>  [amount][Cr]  [balance Cr]
 *
 * Rules:
 *   - Amount ending in "Cr" directly attached → credit to account (positive)
 *   - Amount with no Cr → debit from account (negative)
 *   - Line with only a balance ("X,XXX.XX Cr" at far right, no amount) → skip
 */
function parseTransactions(text, year) {
  const transactions = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd()

    // Must start with a date: optional leading spaces, then DD Mon
    const dateMatch = line.match(/^\s*(\d{2})\s+([A-Z][a-z]{2})\s+/)
    if (!dateMatch) continue
    const mon = MONTH[dateMatch[2]]
    if (!mon) continue

    const date = `${year}-${mon}-${dateMatch[1]}`

    // Everything after the date token
    let rest = line.slice(line.indexOf(dateMatch[0]) + dateMatch[0].length)

    // Strip trailing running balance: two-or-more spaces + number + " Cr" at end
    rest = rest.replace(/\s{2,}([\d,]+\.\d{2})\s+Cr\s*$/, '')

    // Credit amount: number with "Cr" directly attached at end
    const credM = rest.match(/([\d,]+\.\d{2})Cr\s*$/)
    if (credM) {
      const desc = rest.slice(0, rest.lastIndexOf(credM[1])).trim().replace(/\s{2,}/g, ' ')
      const amount = parseFloat(credM[1].replace(/,/g, ''))
      transactions.push({ date, description: desc || 'Credit', amount })
      continue
    }

    // Debit amount: number at end with no Cr
    const debM = rest.match(/([\d,]+\.\d{2})\s*$/)
    if (debM) {
      const desc = rest.slice(0, rest.lastIndexOf(debM[1])).trim().replace(/\s{2,}/g, ' ')
      const amount = -parseFloat(debM[1].replace(/,/g, ''))
      transactions.push({ date, description: desc || 'Debit', amount })
      continue
    }

    // Balance-only line — skip (no amount in amount column)
  }
  return transactions
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // 1. Get GL account id for code 1010 (FNB Cheque Account)
  const { data: glAcct, error: glErr } = await supabase
    .from('acct_accounts')
    .select('id')
    .eq('code', '1010')
    .single()
  if (glErr || !glAcct) throw new Error('Account code 1010 not found in acct_accounts')

  // 2. Create / find bank account
  let bankAccountId
  const { data: existingBank } = await supabase
    .from('acct_bank_accounts')
    .select('id')
    .eq('account_number', '63044191201')
    .maybeSingle()

  if (existingBank) {
    bankAccountId = existingBank.id
    console.log('Using existing bank account:', bankAccountId)
  } else {
    const { data: created, error: bErr } = await supabase
      .from('acct_bank_accounts')
      .insert({
        name: 'FNB Gold Business',
        bank_name: 'FNB',
        account_number: '63044191201',
        account_id: glAcct.id,
        balance: 0,
        is_active: true,
      })
      .select('id')
      .single()
    if (bErr || !created) throw new Error('Failed to create bank account: ' + bErr?.message)
    bankAccountId = created.id
    console.log('Created bank account:', bankAccountId)
  }

  // 3. Duplicate guard
  const { count } = await supabase
    .from('acct_bank_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('bank_account_id', bankAccountId)

  if (count && count > 0) {
    if (!FORCE) {
      console.log(`${count} transactions already exist. Re-run with --force to clear and reimport.`)
      return
    }
    const { error: delErr } = await supabase
      .from('acct_bank_transactions')
      .delete()
      .eq('bank_account_id', bankAccountId)
    if (delErr) throw new Error('Failed to clear existing transactions: ' + delErr.message)
    console.log(`Cleared ${count} existing transactions.`)
  }

  // 4. Parse all PDFs
  let allTxns = []
  let closingBalance = 0

  for (const pdf of PDFS) {
    console.log('\nParsing:', pdf.split('\\').pop())
    let text
    try {
      text = extractText(pdf)
    } catch (e) {
      console.warn('  SKIP — could not read PDF:', e.message)
      continue
    }

    const year = extractYear(text)
    if (!year) { console.warn('  SKIP — could not determine year'); continue }

    const closing = extractClosingBalance(text)
    if (closing) closingBalance = closing

    const txns = parseTransactions(text, year)
    console.log(`  Year: ${year}  Closing balance: ${closing ?? 'n/a'}  Parsed: ${txns.length} transactions`)
    allTxns = allTxns.concat(txns)
  }

  // 5. Filter: only from 2026-03-01
  allTxns = allTxns.filter(t => t.date >= '2026-03-01')
  console.log(`\nTotal transactions after filter (>= 2026-03-01): ${allTxns.length}`)

  // 6. Batch insert
  const BATCH = 100
  for (let i = 0; i < allTxns.length; i += BATCH) {
    const batch = allTxns.slice(i, i + BATCH).map(t => ({
      bank_account_id: bankAccountId,
      date: t.date,
      description: t.description,
      amount: t.amount,
      is_reconciled: false,
      journal_line_id: null,
    }))
    const { error } = await supabase.from('acct_bank_transactions').insert(batch)
    if (error) throw new Error(`Batch ${Math.floor(i / BATCH) + 1} failed: ${error.message}`)
    process.stdout.write('.')
  }
  console.log('\n')

  // 7. Update bank account with latest closing balance
  await supabase
    .from('acct_bank_accounts')
    .update({ balance: closingBalance })
    .eq('id', bankAccountId)

  console.log(`Done. Imported ${allTxns.length} transactions. Closing balance: R${closingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`)
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1) })
