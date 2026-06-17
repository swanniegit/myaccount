#!/usr/bin/env node
/**
 * Adds missing columns to acct_company.
 * Safe to re-run — uses IF NOT EXISTS.
 *
 * SUPERSEDED: this DDL is now tracked as a migration
 * (supabase/migrations/20260617000001_acct_company_columns.sql), which is the
 * canonical source. Kept for reference only — do not change columns here without
 * also updating the migration, or the two will drift apart again.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Run with: node --env-file=.env.local scripts/migrate-company-columns.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const sql = `
ALTER TABLE acct_company
  ADD COLUMN IF NOT EXISTS tax_number            TEXT,
  ADD COLUMN IF NOT EXISTS vat_registration_date DATE,
  ADD COLUMN IF NOT EXISTS vat_cycle             TEXT DEFAULT 'Category A – bi-monthly',
  ADD COLUMN IF NOT EXISTS paye_ref              TEXT,
  ADD COLUMN IF NOT EXISTS efiling_user          TEXT,
  ADD COLUMN IF NOT EXISTS books_locked_through  DATE,
  ADD COLUMN IF NOT EXISTS default_vat           TEXT DEFAULT '15',
  ADD COLUMN IF NOT EXISTS inventory_method      TEXT DEFAULT 'FIFO',
  ADD COLUMN IF NOT EXISTS phone                 TEXT,
  ADD COLUMN IF NOT EXISTS email                 TEXT;
`

let error
try {
  ;({ error } = await supabase.rpc('exec_sql', { sql }))
} catch {
  error = { message: 'exec_sql not available' }
}

if (error) {
  // Fallback: try direct REST query (won't work for DDL, just confirms connection)
  console.error('exec_sql RPC not available — run this SQL manually in Supabase SQL Editor:')
  console.log(sql)
} else {
  console.log('Migration complete.')
}
