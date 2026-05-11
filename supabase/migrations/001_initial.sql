-- myAccount tables — prefixed acct_ to share Supabase instance with other projects

create table acct_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type text not null check (type in ('asset','liability','equity','revenue','expense')),
  sub_type text,
  is_vat_account boolean default false,
  normal_balance text not null check (normal_balance in ('debit','credit')),
  parent_id uuid references acct_accounts(id),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table acct_journal_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  description text not null,
  reference text,
  source text default 'manual' check (source in ('manual','bank_import','invoice','bill')),
  is_posted boolean default false,
  created_at timestamptz default now()
);

create table acct_journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references acct_journal_entries(id) on delete cascade,
  account_id uuid not null references acct_accounts(id),
  debit numeric(15,2) not null default 0,
  credit numeric(15,2) not null default 0,
  description text,
  created_at timestamptz default now(),
  constraint acct_jl_positive check (debit >= 0 and credit >= 0),
  constraint acct_jl_one_side check (debit = 0 or credit = 0)
);

create table acct_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('customer','supplier','both')),
  email text,
  phone text,
  vat_number text,
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table acct_invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  contact_id uuid references acct_contacts(id),
  date date not null,
  due_date date,
  status text not null default 'draft' check (status in ('draft','sent','paid','overdue','void')),
  subtotal numeric(15,2) not null default 0,
  vat_amount numeric(15,2) not null default 0,
  total numeric(15,2) not null default 0,
  notes text,
  journal_entry_id uuid references acct_journal_entries(id),
  created_at timestamptz default now()
);

create table acct_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references acct_invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(15,2) not null,
  vat_rate numeric(5,2) not null default 15,
  account_id uuid references acct_accounts(id),
  line_total numeric(15,2) not null
);

create table acct_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bank_name text,
  account_number text,
  account_id uuid references acct_accounts(id),
  balance numeric(15,2) default 0,
  is_active boolean default true
);

create table acct_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid references acct_bank_accounts(id),
  date date not null,
  description text not null,
  amount numeric(15,2) not null,
  is_reconciled boolean default false,
  journal_line_id uuid references acct_journal_lines(id),
  created_at timestamptz default now()
);

create table acct_company (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_number text,
  vat_number text,
  tax_year_end int default 2,
  address text,
  created_at timestamptz default now()
);

create index idx_acct_jl_entry   on acct_journal_lines(entry_id);
create index idx_acct_jl_account on acct_journal_lines(account_id);
create index idx_acct_je_date    on acct_journal_entries(date);
create index idx_acct_inv_status on acct_invoices(status);
create index idx_acct_bt_recon   on acct_bank_transactions(is_reconciled);
