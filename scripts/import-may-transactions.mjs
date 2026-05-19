#!/usr/bin/env node
/**
 * Import May 2026 transactions from FNB transaction history PDF.
 * Format is an FNB app printout — multi-column, dates often on separate lines.
 * Strategy: use the running balance to reconstruct transactions.
 */
import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://saujtvflbumngsfcjvdt.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdWp0dmZsYnVtbmdzZmNqdmR0Iiwicm9sZSI6' +
  'InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzMzY3NiwiZXhwIjoyMDgzMTA5Njc2fQ.' +
  'qk9lRm63n17ekZyumy3Svae65e2aAX7Mb9IIkDV_-eI'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const PDF = 'C:/Users/sanne/Downloads/transaction_history_Hearts_In_Scrubs (4)/63044191201.pdf'
const CURRENT_BALANCE = 19337.63   // from header of printout (11 May 2026)
const BANK_ACCOUNT_NUMBER = '63044191201'

const MONTH = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' }

function parseDate(str) {
  // "02 May 2026" → "2026-05-02"
  const m = str.match(/(\d{2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/)
  if (!m) return null
  return `${m[3]}-${MONTH[m[2]]}-${m[1]}`
}

function parseAmount(str) {
  // "(-)N,NNN.NN DR" or "(+)N,NNN.NN CR"
  const m = str.match(/([\d,]+\.\d{2})\s*(DR|CR)/)
  if (!m) return null
  const v = parseFloat(m[1].replace(/,/g, ''))
  return m[2] === 'DR' ? -v : v
}

function parseBalance(str) {
  // rightmost "N,NNN.NN CR" (balances are always CR for this account)
  const matches = [...str.matchAll(/([\d,]+\.\d{2})\s*CR/g)]
  if (!matches.length) return null
  return parseFloat(matches[matches.length - 1][1].replace(/,/g, ''))
}

// ---------------------------------------------------------------------------
// Parse PDF into transaction objects
// ---------------------------------------------------------------------------
const text = execSync(`pdftotext -layout "${PDF}" -`, { encoding: 'utf8' })
const rawLines = text.split('\n')

// We'll collect transactions by finding lines that have a date AND an amount.
// Multi-line transactions: date on one line, description+amount on next.
const transactions = []
let currentDate = null
let pendingDesc = null

for (let i = 0; i < rawLines.length; i++) {
  const line = rawLines[i]
  const trimmed = line.trim()

  // Skip headers, footers, empty lines
  if (!trimmed || /Printed|FNB|FirstRand|Address|Tel:|info@fnb|Transaction History|Hearts In Scrubs|Available Balance|Current Balance|Nickname:|Selected Account:|Date:|Service Fee.*Amount.*Balance/i.test(trimmed)) {
    continue
  }

  // Does this line start with a date?
  const dateMatch = line.match(/^\s*(\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/)
  const date = dateMatch ? parseDate(dateMatch[1]) : null

  // Does this line have an amount?
  const amount = parseAmount(line)
  const balance = parseBalance(line)

  if (date) {
    currentDate = date
    // Extract description from this line (between date and amount)
    let desc = line
      .replace(/^\s*\d{2}\s+\w+\s+\d{4}\s*/, '')  // strip date
      .replace(/\s+0\.00\s+/, ' ')                   // strip zero service fee
      .replace(/([\d,]+\.\d{2})\s*(DR|CR)\s+([\d,]+\.\d{2})\s*CR\s*$/, '')  // strip amount+balance
      .replace(/([\d,]+\.\d{2})\s*(DR|CR)\s*$/, '')  // strip amount only
      .replace(/([\d,]+\.\d{2})\s*CR\s*$/, '')       // strip balance only
      .trim()

    if (amount !== null && balance !== null) {
      transactions.push({ date: currentDate, description: desc || 'Transaction', amount, balance })
      pendingDesc = null
    } else if (amount !== null) {
      transactions.push({ date: currentDate, description: desc || 'Transaction', amount, balance: null })
      pendingDesc = null
    } else {
      pendingDesc = desc || null
    }
  } else if (amount !== null && currentDate) {
    // Continuation line — belongs to currentDate
    let desc = line
      .replace(/^\s+/, '')
      .replace(/\s+0\.00\s+/, ' ')
      .replace(/([\d,]+\.\d{2})\s*(DR|CR)\s+([\d,]+\.\d{2})\s*CR\s*$/, '')
      .replace(/([\d,]+\.\d{2})\s*(DR|CR)\s*$/, '')
      .replace(/([\d,]+\.\d{2})\s*CR\s*$/, '')
      .trim()

    const finalDesc = pendingDesc ? `${pendingDesc}${desc ? ' ' + desc : ''}` : (desc || 'Transaction')
    transactions.push({ date: currentDate, description: finalDesc.trim() || 'Transaction', amount, balance })
    pendingDesc = null
  } else if (trimmed && !date && currentDate) {
    // Description-only continuation
    pendingDesc = (pendingDesc ? pendingDesc + ' ' : '') + trimmed
      .replace(/\s+0\.00\s*$/, '')
      .trim()
  }
}

// Filter to May 2026 only (April already imported from statements)
const mayTxns = transactions.filter(t => t.date >= '2026-05-01' && t.date <= '2026-05-31')

console.log(`Parsed ${transactions.length} total transactions, ${mayTxns.length} in May 2026`)
console.log('\nMay transactions:')
mayTxns.forEach(t => console.log(`  ${t.date}  ${String(t.amount.toFixed(2)).padStart(12)}  bal:${t.balance?.toFixed(2) ?? '?'}  ${t.description}`))

// ---------------------------------------------------------------------------
// Import to Supabase
// ---------------------------------------------------------------------------
const { data: bankAccount } = await supabase
  .from('acct_bank_accounts')
  .select('id')
  .eq('account_number', BANK_ACCOUNT_NUMBER)
  .single()

if (!bankAccount) throw new Error('Bank account not found')
const bankAccountId = bankAccount.id

// Check existing May transactions to avoid duplicates
const { data: existing } = await supabase
  .from('acct_bank_transactions')
  .select('date, amount, description')
  .eq('bank_account_id', bankAccountId)
  .gte('date', '2026-05-01')

const existingKeys = new Set((existing ?? []).map(t => `${t.date}|${Number(t.amount).toFixed(2)}|${t.description}`))

const toInsert = mayTxns.filter(t => {
  const key = `${t.date}|${t.amount.toFixed(2)}|${t.description}`
  return !existingKeys.has(key)
})

console.log(`\n${toInsert.length} new transactions to insert (${mayTxns.length - toInsert.length} already exist)`)

if (toInsert.length > 0) {
  const rows = toInsert.map(t => ({
    bank_account_id: bankAccountId,
    date: t.date,
    description: t.description,
    amount: t.amount,
    is_reconciled: false,
    journal_line_id: null,
  }))
  const { error } = await supabase.from('acct_bank_transactions').insert(rows)
  if (error) throw new Error('Insert failed: ' + error.message)
  console.log(`Inserted ${toInsert.length} May transactions`)
}

// Update bank account balance to current balance (May 11)
await supabase
  .from('acct_bank_accounts')
  .update({ balance: CURRENT_BALANCE })
  .eq('id', bankAccountId)

console.log(`\nBank account balance updated to R${CURRENT_BALANCE.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} (May 11, 2026)`)
console.log('Done.')
