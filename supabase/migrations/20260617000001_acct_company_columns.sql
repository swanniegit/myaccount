-- PR0 — Drift reconciliation: acct_company out-of-band columns
--
-- 001_initial.sql created acct_company with 6 columns. Ten more were added later
-- only via scripts/migrate-company-columns.mjs (run by hand), so they exist on the
-- live DB but not in any migration — a clean deploy was missing them, and
-- app/api/setup/company/route.ts writes all 16. This migration captures the drift.
-- It is the canonical source going forward; the .mjs script is retained for reference.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS) — a no-op against the live DB, and
-- reproduces the full acct_company shape on a fresh deploy. Defaults match the
-- original script exactly.

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
