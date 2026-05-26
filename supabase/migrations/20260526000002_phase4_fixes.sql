-- Phase 4 review fixes
-- 1. Add 'payment' source to enum (payments were sharing 'invoice'/'bill' sequences)
-- 2. Block bank_import on control accounts (not just manual)
-- 3. Return journal_number from acct_post_journal_entry RPC

-- ─── 1. Extend source enum ───────────────────────────────────────────────────
alter table acct_journal_entries
  drop constraint acct_journal_entries_source_check;

alter table acct_journal_entries
  add constraint acct_journal_entries_source_check
  check (source in ('manual','bank_import','invoice','bill','payment'));

insert into acct_journal_seqs (source) values ('payment')
on conflict do nothing;

-- ─── 2. Control account trigger — also block bank_import ─────────────────────
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
    -- Allow invoice / bill / payment flows; block manual edits and raw bank imports
    if coalesce(v_source, 'manual') in ('manual', 'bank_import') then
      raise exception
        'Cannot post directly to control account % — use the invoice/payment workflow', v_code;
    end if;
  end if;
  return NEW;
end $$;

-- ─── 3. RPC: return journal_number in response payload ───────────────────────
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
  v_entry_id       uuid;
  v_journal_number bigint;
  v_total_dr       numeric;
  v_total_cr       numeric;
  v_line           jsonb;
  v_lines          jsonb := '[]'::jsonb;
  v_line_id        uuid;
  v_account_id     uuid;
  v_debit          numeric;
  v_credit         numeric;
  v_tax_type       char(2);
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
    'entry_id',       v_entry_id,
    'journal_number', v_journal_number,
    'lines',          v_lines
  );
end;
$$;
