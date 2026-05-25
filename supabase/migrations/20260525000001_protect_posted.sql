-- G-01: Block UPDATE/DELETE on posted journal entries to preserve the audit trail.
-- Posted entries are immutable; operators must post a reversing journal instead.

create or replace function acct_protect_posted()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'UPDATE' and OLD.is_posted) or
     (TG_OP = 'DELETE' and OLD.is_posted) then
    raise exception 'Posted entries are immutable; post a reversing journal instead.';
  end if;
  return coalesce(NEW, OLD);
end $$;

create trigger acct_je_protect
  before update or delete on acct_journal_entries
  for each row execute function acct_protect_posted();
