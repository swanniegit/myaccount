-- G-02 atomic void: reverse GL and mark invoice void in a single transaction.
-- Replaces the two-step JS sequence in app/api/push/void/route.ts which could
-- leave an orphan reversal if the invoice status update failed.

create or replace function acct_void_invoice(
  p_invoice_id uuid,
  p_void_date  date default current_date
)
returns jsonb
language plpgsql
security definer  -- bypasses row-level security; caller auth is enforced in the API route
as $$
declare
  v_invoice       record;
  v_period_status text;
  v_void_year     int := extract(year  from p_void_date)::int;
  v_void_month    int := extract(month from p_void_date)::int;
  v_entry_id      uuid;
  v_line          record;
begin
  -- Lock the invoice row to prevent concurrent void attempts
  select id, number, status, journal_entry_id
  into   v_invoice
  from   acct_invoices
  where  id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.status = 'void' then
    return jsonb_build_object('already_void', true);
  end if;

  -- Enforce period open on the void date
  select status into v_period_status
  from   acct_periods
  where  year = v_void_year and month = v_void_month;

  if v_period_status is null or v_period_status <> 'open' then
    raise exception 'Period %/% is closed — open it in Settings → Periods before voiding.',
      v_void_month, v_void_year;
  end if;

  -- Post reversing journal only when a GL entry exists
  if v_invoice.journal_entry_id is not null then
    insert into acct_journal_entries (date, description, reference, source, is_posted)
    values (
      p_void_date,
      'Void of invoice ' || v_invoice.number,
      'VOID-' || v_invoice.number,
      'invoice',
      true
    )
    returning id into v_entry_id;

    insert into acct_journal_lines (entry_id, account_id, debit, credit)
    select v_entry_id, account_id, credit, debit   -- swap debit↔credit to reverse
    from   acct_journal_lines
    where  entry_id = v_invoice.journal_entry_id;
  end if;

  -- Mark void — same transaction, so both succeed or both roll back
  update acct_invoices set status = 'void' where id = p_invoice_id;

  return jsonb_build_object('success', true, 'reversal_entry_id', v_entry_id);
end;
$$;
