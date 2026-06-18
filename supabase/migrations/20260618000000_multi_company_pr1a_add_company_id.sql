-- Multi-company PR1a — additive company_id (no NOT NULL yet)
--
-- Adds a nullable company_id to every scoped acct_* and pr_* table, backfills it
-- to the existing (single) company, sets a temporary column DEFAULT so any row
-- inserted before PR5 enforces NOT NULL is stamped automatically, then adds the
-- foreign key to the tenant root (acct_company) and a company_id index per table.
--
-- DESIGN — zero behaviour change:
--   * Columns are NULLABLE here. SET NOT NULL + DROP DEFAULT happen LAST, in
--     PR5-ENFORCE, only once every writer carries company_id.
--   * On the live (single-company) DB every row belongs to the one company, so the
--     backfill is "set every scoped row to that company". Denormalised columns
--     (journal_lines, bank_transactions) therefore equal their parents trivially.
--   * Posted journal entries/lines are UPDATE-locked by acct_je_protect /
--     acct_jl_protect; the backfill disables them for the duration and re-enables
--     them. The whole migration runs in one transaction, so an error rolls the
--     DISABLE back too — the triggers can never be left off.
--   * Fully safe on a FRESH deploy (acct_company empty): the backfill/default step
--     is skipped, columns stay nullable, FKs validate against all-NULL (NULLs do
--     not violate a FK). App code (post-PR3) supplies company_id explicitly there.
--
-- DEFERRED to PR1b (NOT here) — these would break runtime behaviour if applied
-- before the functions/routes that depend on them are updated in the same change:
--   * acct_journal_seqs PK (source) -> (company_id, source): acct_next_je_number
--     does ON CONFLICT (source) on every post.
--   * acct_periods unique (year,month) -> (company_id, year, month):
--     app/api/periods/route.ts upserts with onConflict 'year,month'.
--   * acct_accounts.code / acct_invoices.number / external_ref unique recompositions
--     only matter once a 2nd company exists (PR4); recomposing now risks breaking
--     ON CONFLICT/upsert paths. They land in PR1b alongside the code that updates them.
--
-- Idempotent (IF NOT EXISTS on columns/indexes; existence-guarded FKs) so a partial
-- apply can be retried safely.

do $$
declare
  t         text;
  v_default uuid;
  -- Scoped tables that get a direct company_id. Excluded by design:
  --   acct_invoice_lines / pr_payslip_lines (derived via parent),
  --   acct_company (tenant root), acct_tax_types / acct_vat_rates (global reference).
  scoped text[] := array[
    'acct_accounts', 'acct_journal_entries', 'acct_journal_lines', 'acct_contacts',
    'acct_invoices', 'acct_bank_accounts', 'acct_bank_transactions', 'acct_periods',
    'acct_journal_seqs', 'pr_employees', 'pr_periods', 'pr_payslips', 'pr_emp201',
    'pr_leave_balances', 'pr_leave_requests'
  ];
begin
  -- 1) Nullable column + index on every scoped table.
  foreach t in array scoped loop
    execute format('alter table %I add column if not exists company_id uuid', t);
    execute format('create index if not exists %I on %I (company_id)',
                   'idx_' || t || '_company', t);
  end loop;

  -- 2) Backfill to the single existing company, then set a temp DEFAULT.
  select id into v_default from acct_company order by created_at, id limit 1;

  if v_default is null then
    raise notice 'PR1a: no acct_company row (fresh deploy) — columns left nullable, no backfill/default.';
  else
    -- Posted GL rows are UPDATE-locked; disable the protect triggers for the backfill.
    alter table acct_journal_entries disable trigger acct_je_protect;
    alter table acct_journal_lines   disable trigger acct_jl_protect;

    foreach t in array scoped loop
      execute format('update %I set company_id = %L where company_id is null', t, v_default);
    end loop;

    alter table acct_journal_entries enable trigger acct_je_protect;
    alter table acct_journal_lines   enable trigger acct_jl_protect;

    -- Temporary DEFAULT (removed in PR5-ENFORCE with SET NOT NULL) so inserts during
    -- the PR1a -> PR5 window are stamped even before app code passes company_id.
    foreach t in array scoped loop
      execute format('alter table %I alter column company_id set default %L', t, v_default);
    end loop;
  end if;

  -- 3) Foreign key to the tenant root: ADD NOT VALID (no full-table lock) then VALIDATE.
  foreach t in array scoped loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = t::regclass and conname = t || '_company_id_fkey'
    ) then
      execute format(
        'alter table %I add constraint %I foreign key (company_id) references acct_company(id) not valid',
        t, t || '_company_id_fkey');
    end if;
    execute format('alter table %I validate constraint %I', t, t || '_company_id_fkey');
  end loop;
end $$;
