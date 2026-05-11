-- liveHis integration: add external_ref columns for idempotent upserts

ALTER TABLE acct_invoices ADD COLUMN IF NOT EXISTS external_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_acct_inv_external_ref ON acct_invoices(external_ref) WHERE external_ref IS NOT NULL;

ALTER TABLE acct_contacts ADD COLUMN IF NOT EXISTS external_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_acct_contacts_external_ref ON acct_contacts(external_ref) WHERE external_ref IS NOT NULL;
