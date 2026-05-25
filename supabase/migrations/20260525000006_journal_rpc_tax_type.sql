-- Extend acct_post_journal_entry to persist tax_type_code on journal lines.
-- Previously the RPC only wrote (entry_id, account_id, debit, credit, description);
-- tax_type_code was silently dropped, making VAT 201 box derivation non-functional.

create or replace function acct_post_journal_entry(
  p_date        date,
  p_description text,
  p_reference   text    default null,
  p_source      text    default 'manual',
  p_lines       jsonb   default '[]'::jsonb
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

  insert into acct_journal_entries (date, description, reference, source, is_posted)
  values (p_date, p_description, p_reference, coalesce(p_source, 'manual'), true)
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
      v_entry_id,
      v_account_id,
      v_debit,
      v_credit,
      nullif(v_line->>'description', ''),
      v_tax_type
    )
    returning id into v_line_id;

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'id',             v_line_id,
        'account_id',     v_account_id,
        'debit',          v_debit,
        'credit',         v_credit,
        'tax_type_code',  v_tax_type
      )
    );
  end loop;

  return jsonb_build_object('entry_id', v_entry_id, 'lines', v_lines);
end;
$$;
