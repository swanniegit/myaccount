-- Add invoice_type to distinguish sales invoices from purchase bills
ALTER TABLE acct_invoices
  ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'invoice'
  CHECK (invoice_type IN ('invoice', 'bill'));

CREATE INDEX IF NOT EXISTS idx_acct_inv_type ON acct_invoices(invoice_type);
