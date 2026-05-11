#!/usr/bin/env node
/**
 * Adds missing columns to acct_company.
 * Safe to re-run — uses IF NOT EXISTS.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://saujtvflbumngsfcjvdt.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdWp0dmZsYnVtbmdzZmNqdmR0Iiwicm9sZSI6' +
  'InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzMzY3NiwiZXhwIjoyMDgzMTA5Njc2fQ.' +
  'qk9lRm63n17ekZyumy3Svae65e2aAX7Mb9IIkDV_-eI'

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
