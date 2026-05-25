-- G-01 extension: Block UPDATE/DELETE on lines of posted journal entries.
-- INSERT is allowed so the posting RPC (which inserts entry as posted, then inserts lines)
-- continues to work. Orphan-line attacks require service-role access, which is already
-- out of scope for application-layer protection.

create or replace function acct_protect_posted_lines()
returns trigger language plpgsql as $$
declare
  parent_posted boolean;
begin
  select is_posted into parent_posted
  from acct_journal_entries
  where id = OLD.entry_id;

  if parent_posted then
    raise exception 'Cannot modify lines of a posted journal entry; post a reversing journal instead.';
  end if;
  return coalesce(NEW, OLD);
end $$;

create trigger acct_jl_protect
  before update or delete on acct_journal_lines
  for each row execute function acct_protect_posted_lines();
