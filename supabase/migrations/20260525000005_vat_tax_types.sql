-- V-03: SARS tax-type model
-- 2-digit codes matching SARS VAT 201 supply classifications.

create table acct_tax_types (
  code            char(2)       primary key,
  name            text          not null,
  rate            numeric(5,4)  not null default 0,
  output_box      text,          -- VAT 201 box for output supplies (e.g. '1', '2', '3')
  input_box       text,          -- VAT 201 box for input claims  (e.g. '14', '14A', '15')
  is_capital_goods boolean       not null default false,
  is_input_allowed boolean       not null default true,
  description     text
);

insert into acct_tax_types
  (code, name,                          rate,   output_box, input_box, is_capital_goods, is_input_allowed)
values
  ('01', 'Standard rated (15%)',        0.15,   '1',        '14',      false,            true),
  ('02', 'Standard, no input claim',    0.15,   '1',        null,      false,            false),
  ('03', 'Zero-rated',                  0.0000, '2',        '15',      false,            true),
  ('04', 'Exempt',                      0.0000, '3',        '15A',     false,            false),
  ('05', 'Capital goods (15%)',         0.15,   null,       '14A',     true,             true),
  ('06', 'Out of scope',                0.0000, null,       null,      false,            false);

-- Add tax_type_code to journal lines (nullable — non-VAT lines like AR, cash have no type)
alter table acct_journal_lines
  add column tax_type_code char(2) references acct_tax_types(code);

-- Add tax_type_code to invoice lines (defaults to standard 15%)
alter table acct_invoice_lines
  add column tax_type_code char(2) references acct_tax_types(code) default '01';

create index idx_acct_jl_tax_type on acct_journal_lines(tax_type_code);
