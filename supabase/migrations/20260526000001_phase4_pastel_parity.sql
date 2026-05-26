-- Phase 4: Pastel Parity
-- G-04  created_by on journal entries
-- G-05  monotonic per-source journal number sequence
-- C-03  is_control flag on accounts + trigger blocking direct manual posts
-- G-12  reference_type / reference_id on bank_transactions for payment tracing

-- ─── G-04: created_by ───────────────────────────────────────────────────────
alter table acct_journal_entries
  add column if not exists created_by text not null default 'system';

-- ─── G-05: per-source monotonic journal number ──────────────────────────────
create table if not exists acct_journal_seqs (
  source   text   primary key,
  next_val bigint not null default 1
);

insert into acct_journal_seqs (source) values
  ('manual'), ('invoice'), ('bill'), ('bank_import'),
  ('year_end'), ('vat_clearing'), ('payroll')
on conflict do nothing;

create or replace function acct_next_je_number(p_source text)
returns bigint language plpgsql as $$
declare v_num bigint;
begin
  insert into acct_journal_seqs (source, next_val) values (p_source, 2)
  on conflict (source) do update
    set next_val = acct_journal_seqs.next_val + 1
  returning next_val - 1 into v_num;
  return v_num;
end $$;

alter table acct_journal_entries
  add column if not exists journal_number bigint;

-- Backfill existing entries: monotonic within source ordered by created_at.
-- acct_je_protect fires on any UPDATE to posted entries, so disable it for this
-- one-time backfill write, then immediately re-enable.
alter table acct_journal_entries disable trigger acct_je_protect;

with ranked as (
  select id, source,
    row_number() over (partition by source order by created_at, id) as rn
  from acct_journal_entries
)
update acct_journal_entries je
set journal_number = r.rn
from ranked r
where je.id = r.id;

alter table acct_journal_entries enable trigger acct_je_protect;

-- Advance sequences past the highest backfilled number
update acct_journal_seqs s
set next_val = coalesce(
  (select max(journal_number) + 1 from acct_journal_entries where source = s.source),
  1
);

create or replace function acct_assign_je_number() returns trigger language plpgsql as $$
begin
  if NEW.journal_number is null then
    NEW.journal_number := acct_next_je_number(coalesce(NEW.source, 'manual'));
  end if;
  return NEW;
end $$;

create trigger acct_je_number
  before insert on acct_journal_entries
  for each row execute function acct_assign_je_number();

-- ─── C-03: control accounts ──────────────────────────────────────────────────
alter table acct_accounts
  add column if not exists is_control boolean not null default false;

-- 1100 Debtors Control, 2000 Creditors Control
update acct_accounts set is_control = true where code in ('1100', '2000');

-- Block direct manual journal lines to control accounts.
-- source='invoice' / 'bill' / 'bank_import' are allowed (sub-ledger workflow).
create or replace function acct_check_control_account() returns trigger language plpgsql as $$
declare
  v_is_control boolean;
  v_source     text;
  v_code       text;
begin
  select is_control, code into v_is_control, v_code
  from acct_accounts where id = NEW.account_id;

  if v_is_control then
    select source into v_source from acct_journal_entries where id = NEW.entry_id;
    if coalesce(v_source, 'manual') = 'manual' then
      raise exception
        'Cannot post directly to control account % — use the invoice/payment workflow', v_code;
    end if;
  end if;
  return NEW;
end $$;

create trigger acct_jl_no_control
  before insert on acct_journal_lines
  for each row execute function acct_check_control_account();

-- ─── G-12: bank transaction payment tracing ──────────────────────────────────
alter table acct_bank_transactions
  add column if not exists reference_type text,   -- 'invoice_payment' | 'bill_payment' | 'bank_import'
  add column if not exists reference_id   uuid;   -- acct_invoices.id

-- ─── G-04: update RPC to persist created_by ──────────────────────────────────
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
  v_entry_id   uuid;
  v_total_dr   numeric;
  v_total_cr   numeric;
  v_line       jsonb;
  v_lines      jsonb := '[]'::jsonb;
  v_line_id    uuid;
  v_account_id uuid;
  v_debit      numeric;
  v_credit     numeric;
  v_tax_type   char(2);
begin
  if jsonb_array_length(p_lines) = 0 then
    raise exception 'Journal entry requires at least one line';
  end if;

  select
    coalesce(sum((l->>'debit')::numeric),  0),
    coalesce(sum((l->>'credit')::numeric), 0)
  into v_total_dr, v_total_cr
  from jsonb_array_elements(p_lines) l;

  if abs(v_total_dr - v_total_cr) > 0.01 then
    raise exception 'Debits (%) must equal credits (%)', v_total_dr, v_total_cr;
  end if;

  insert into acct_journal_entries
    (date, description, reference, source, is_posted, created_by)
  values
    (p_date, p_description, p_reference,
     coalesce(p_source, 'manual'), true, coalesce(p_created_by, 'system'))
  returning id into v_entry_id;

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

  return jsonb_build_object('entry_id', v_entry_id, 'lines', v_lines);
end;
$$;
