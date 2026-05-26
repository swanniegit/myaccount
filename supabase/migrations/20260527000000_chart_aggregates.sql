-- Dashboard chart aggregation.
-- Replaces fetching every posted P&L journal line and summing in JS (slow, large
-- row transfer) with a server-side GROUP BY that returns one row per period bucket.
-- Used by /api/charts; the route falls back to the JS path if this function is absent.

create or replace function acct_income_expense(
  p_start   date,
  p_end     date,
  p_monthly boolean default true
)
returns table(bucket text, income numeric, expense numeric)
language sql
stable
as $$
  select
    case when p_monthly
      then to_char(e.date, 'YYYY-MM')
      else to_char(e.date, 'YYYY-MM-DD')
    end as bucket,
    coalesce(sum(case when a.type = 'revenue'
      then case when a.normal_balance = 'credit' then l.credit - l.debit else l.debit - l.credit end
      else 0 end), 0) as income,
    coalesce(sum(case when a.type = 'expense'
      then case when a.normal_balance = 'debit' then l.debit - l.credit else l.credit - l.debit end
      else 0 end), 0) as expense
  from acct_journal_lines l
  join acct_journal_entries e on e.id = l.entry_id
  join acct_accounts a        on a.id = l.account_id
  where e.is_posted = true
    and e.date >= p_start
    and e.date <  p_end
    and a.type in ('revenue', 'expense')
  group by 1;
$$;
