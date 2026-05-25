-- G-03: Missing period rows default to 'closed', not open.
-- A period that has never been explicitly opened is treated as locked.

create or replace function acct_period_status(p_date date)
returns text language sql stable as $$
  select coalesce(
    (select status from acct_periods
       where year  = extract(year  from p_date)::int
         and month = extract(month from p_date)::int),
    'closed'
  );
$$;
