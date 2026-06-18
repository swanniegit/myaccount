-- PR0 — Drift reconciliation: payroll (pr_*) schema
--
-- These 7 tables existed only in scripts/migrate-payroll.sql (run by hand in the
-- Supabase SQL editor) and were never tracked as a migration, so a clean deploy
-- lacked them. This migration captures them verbatim. It is the canonical source
-- going forward; scripts/migrate-payroll.sql is retained only for reference.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS) — a no-op against the live DB that
-- already has these tables, and reproduces the schema on a fresh deploy.
--
-- The one-off "open period for May 2026" seed from the original script is
-- intentionally omitted: it is environment data, not schema, and per-company
-- period seeding becomes part of acct_seed_company() in a later multi-company PR.

-- Employees
CREATE TABLE IF NOT EXISTS pr_employees (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  full_name        TEXT NOT NULL,
  id_number        TEXT,
  date_of_birth    DATE,
  tax_number       TEXT,
  tax_status       TEXT NOT NULL DEFAULT 'resident',   -- resident | nonresident
  hire_date        DATE NOT NULL,
  termination_date DATE,
  pay_frequency    TEXT NOT NULL DEFAULT 'monthly',    -- monthly | weekly | biweekly
  basic_salary     NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  -- banking
  bank_name        TEXT,
  bank_branch      TEXT,
  bank_account     TEXT,
  bank_type        TEXT DEFAULT 'cheque',
  -- employer
  job_title        TEXT,
  department       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payroll periods
CREATE TABLE IF NOT EXISTS pr_periods (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year       INTEGER NOT NULL,
  month      INTEGER NOT NULL,          -- 1–12
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  pay_date   DATE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',  -- open | calculated | approved | paid
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

-- Payslip headers
CREATE TABLE IF NOT EXISTS pr_payslips (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id           UUID NOT NULL REFERENCES pr_periods(id),
  employee_id         UUID NOT NULL REFERENCES pr_employees(id),
  gross               NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions    NUMERIC(12,2) NOT NULL DEFAULT 0,
  net                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  paye                NUMERIC(12,2) NOT NULL DEFAULT 0,
  uif_employee        NUMERIC(12,2) NOT NULL DEFAULT 0,
  uif_employer        NUMERIC(12,2) NOT NULL DEFAULT 0,
  sdl                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  eti_claimed         NUMERIC(12,2) NOT NULL DEFAULT 0,
  ytd_gross           NUMERIC(12,2) NOT NULL DEFAULT 0,
  ytd_paye            NUMERIC(12,2) NOT NULL DEFAULT 0,
  ytd_uif             NUMERIC(12,2) NOT NULL DEFAULT 0,
  journal_entry_id    UUID,
  status              TEXT NOT NULL DEFAULT 'draft',   -- draft | approved | paid
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_id, employee_id)
);

-- Payslip lines (earnings & deductions)
CREATE TABLE IF NOT EXISTS pr_payslip_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id  UUID NOT NULL REFERENCES pr_payslips(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- earning | deduction | employer_contribution
  sars_code   TEXT,            -- 3601, 4001, etc.
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- EMP201 monthly returns
CREATE TABLE IF NOT EXISTS pr_emp201 (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id       UUID NOT NULL REFERENCES pr_periods(id) UNIQUE,
  paye_liability  NUMERIC(12,2) NOT NULL DEFAULT 0,
  uif_liability   NUMERIC(12,2) NOT NULL DEFAULT 0,
  sdl_liability   NUMERIC(12,2) NOT NULL DEFAULT 0,
  eti_claimed     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_payable   NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | submitted | paid
  submitted_at    TIMESTAMPTZ,
  payment_ref     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave balances (one row per employee per leave type per cycle)
CREATE TABLE IF NOT EXISTS pr_leave_balances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES pr_employees(id),
  type        TEXT NOT NULL,  -- annual | sick | family | maternity | parental
  cycle_start DATE NOT NULL,
  accrued     NUMERIC(6,2) NOT NULL DEFAULT 0,
  taken       NUMERIC(6,2) NOT NULL DEFAULT 0,
  UNIQUE(employee_id, type, cycle_start)
);

-- Leave requests
CREATE TABLE IF NOT EXISTS pr_leave_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES pr_employees(id),
  type        TEXT NOT NULL,
  from_date   DATE NOT NULL,
  to_date     DATE NOT NULL,
  days        NUMERIC(4,1) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  notes       TEXT,
  approved_by TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
