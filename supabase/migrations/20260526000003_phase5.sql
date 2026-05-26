-- Phase 5: Remaining Gaps
-- G-07  source enum expansion
-- G-08  balance tolerance 0.005
-- G-11  is_default on bank accounts
-- C-02  is_contra on accounts
-- C-08  provisional tax account seeds
-- V-04  acct_vat_rates table
-- V-08  vat_date on invoices

-- ─── G-07: expand source enum ────────────────────────────────────────────────
alter table acct_journal_entries drop constraint acct_journal_entries_source_check;
alter table acct_journal_entries add constraint acct_journal_entries_source_check
  check (source in (
    'manual','bank_import','invoice','bill','payment',
    'cash_book','take_on','year_end','payroll','vat_clearing'
  ));

insert into acct_journal_seqs (source) values
  ('cash_book'), ('take_on'), ('year_end'), ('payroll'), ('vat_clearing')
on conflict do nothing;

-- ─── G-08: update RPC balance tolerance ──────────────────────────────────────
create or replace function acct_post_journal_entry(
  p_date        date,
  p_description text,
  p_reference   text    default null,
  p_source      text    default 'manual',
  p_lines       jsonb   default '[]'::jsonb,
  p_created_by  text    default 'system'
)
returns jsonb
language plpgsql
as $$
declare
  v_entry_id      uuid;
  v_journal_number bigint;
  v_total_dr      numeric;
  v_total_cr      numeric;
  v_line          jsonb;
  v_lines         jsonb := '[]'::jsonb;
  v_line_id       uuid;
  v_account_id    uuid;
  v_debit         numeric;
  v_credit        numeric;
  v_tax_type      char(2);
begin
  if jsonb_array_length(p_lines) = 0 then
    raise exception 'Journal entry requires at least one line';
  end if;

  select
    coalesce(sum((l->>'debit')::numeric),  0),
    coalesce(sum((l->>'credit')::numeric), 0)
  into v_total_dr, v_total_cr
  from jsonb_array_elements(p_lines) l;

  if abs(v_total_dr - v_total_cr) > 0.005 then
    raise exception 'Debits (%) must equal credits (%)', v_total_dr, v_total_cr;
  end if;

  insert into acct_journal_entries
    (date, description, reference, source, is_posted, created_by)
  values
    (p_date, p_description, p_reference,
     coalesce(p_source, 'manual'), true, coalesce(p_created_by, 'system'))
  returning id, journal_number into v_entry_id, v_journal_number;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_account_id := (v_line->>'account_id')::uuid;
    v_debit      := coalesce((v_line->>'debit')::numeric,  0);
    v_credit     := coalesce((v_line->>'credit')::numeric, 0);
    v_tax_type   := nullif(trim(v_line->>'tax_type_code'), '');

    insert into acct_journal_lines
      (entry_id, account_id, debit, credit, description, tax_type_code)
    values (
      v_entry_id, v_account_id, v_debit, v_credit,
      nullif(v_line->>'description', ''), v_tax_type
    )
    returning id into v_line_id;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'id',            v_line_id,
      'account_id',    v_account_id,
      'debit',         v_debit,
      'credit',        v_credit,
      'tax_type_code', v_tax_type
    ));
  end loop;

  return jsonb_build_object(
    'entry_id',      v_entry_id,
    'journal_number', v_journal_number,
    'lines',         v_lines
  );
end;
$$;

-- ─── G-11: default bank account ──────────────────────────────────────────────
alter table acct_bank_accounts
  add column if not exists is_default boolean not null default false;

-- Mark the first active bank account as default (idempotent if already set)
update acct_bank_accounts
set is_default = true
where id = (
  select id from acct_bank_accounts
  where is_active = true
  order by created_at
  limit 1
)
and not exists (
  select 1 from acct_bank_accounts where is_default = true and is_active = true
);

-- ─── C-02: contra accounts ───────────────────────────────────────────────────
alter table acct_accounts
  add column if not exists is_contra boolean not null default false;

-- 1110 Allowance for Doubtful Debts, 1510 Accumulated Depreciation
update acct_accounts set is_contra = true where code in ('1110', '1510');

-- ─── C-08: provisional tax accounts ─────────────────────────────────────────
insert into acct_accounts
  (code, name, type, sub_type, normal_balance, is_active, is_vat_account, is_control, is_contra)
values
  ('1260', 'Provisional Tax Receivable', 'asset',   'current_asset',     'debit',  true, false, false, false),
  ('1270', 'SARS Income Tax Refund',     'asset',   'current_asset',     'debit',  true, false, false, false),
  ('5920', 'Income Tax Expense',         'expense',  'operating_expense', 'debit',  true, false, false, false)
on conflict (code) do nothing;

-- ─── V-04: VAT rate history ───────────────────────────────────────────────────
create table if not exists acct_vat_rates (
  id             uuid    primary key default gen_random_uuid(),
  rate           numeric(5,4) not null,
  effective_from date    not null,
  effective_to   date,
  description    text,
  constraint acct_vat_rates_from_unique unique (effective_from)
);

insert into acct_vat_rates (rate, effective_from, effective_to, description) values
  (0.14, '1991-09-30', '2018-03-31', 'Standard VAT rate 14%'),
  (0.15, '2018-04-01', null,          'Standard VAT rate 15%')
on conflict (effective_from) do nothing;

-- ─── V-08: vat_date on invoices ──────────────────────────────────────────────
alter table acct_invoices
  add column if not exists vat_date date;
