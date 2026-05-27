#!/usr/bin/env node
/**
 * Clears ALL payroll data so real employees can be imported from scratch.
 * Deletes every row from the pr_* tables in foreign-key dependency order
 * (children first). Tables that don't exist are skipped.
 *
 * Runs against whatever NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 * point at in .env.local (the linked project).
 *
 * Usage:
 *   node --env-file=.env.local scripts/clear-payroll.mjs --dry-run   # counts only
 *   node --env-file=.env.local scripts/clear-payroll.mjs             # deletes
 */
import { createClient } from '@supabase/supabase-js'

const DRY = process.argv.includes('--dry-run')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env. Run: node --env-file=.env.local scripts/clear-payroll.mjs [--dry-run]')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Child tables first so foreign keys don't block deletes.
const TABLES = [
  'pr_payslip_lines',
  'pr_payslips',
  'pr_emp201',
  'pr_leave_requests',
  'pr_leave_balances',
  'pr_periods',
  'pr_employees',
]
const ALL_UUID = '00000000-0000-0000-0000-000000000000'

console.log(`Target: ${SUPABASE_URL}`)
console.log(DRY ? 'DRY RUN — counting rows, nothing will be deleted\n' : 'CLEARING all payroll data\n')

let totalDeleted = 0
for (const table of TABLES) {
  const { count, error: cErr } = await supabase.from(table).select('id', { count: 'exact', head: true })
  if (cErr) {
    console.log(`  ${table.padEnd(20)} skipped (${cErr.message})`)
    continue
  }
  if (DRY) {
    console.log(`  ${table.padEnd(20)} ${count ?? 0} rows`)
    continue
  }
  const { error: dErr } = await supabase.from(table).delete().neq('id', ALL_UUID)
  if (dErr) {
    console.log(`  ${table.padEnd(20)} DELETE FAILED: ${dErr.message}`)
    continue
  }
  totalDeleted += count ?? 0
  console.log(`  ${table.padEnd(20)} deleted ${count ?? 0} rows`)
}

console.log(DRY ? '\n--- DRY RUN — nothing deleted ---' : `\nDone. Deleted ${totalDeleted} rows total.`)
