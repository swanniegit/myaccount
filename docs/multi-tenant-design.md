# Multi-tenant design — same Supabase instance

**Status:** Design document (no implementation yet)
**Goal:** Serve two or more South African companies from the same Supabase project and Next.js deploy, with complete data isolation.

---

## 1. Current state

myAccount is single-tenant today:

| Area | Current state |
|------|--------------|
| Data | All `acct_*` and `pr_*` tables have no `company_id`; every query returns all rows |
| Auth | Single shared `SITE_PASSWORD`; HMAC session cookie carries no company identity |
| Server client | Uses the service-role key — **RLS is bypassed on all reads and writes** |
| Company record | One row in `acct_company`; fetched with `.limit(1).maybeSingle()` |
| Payroll schema | 7 `pr_*` tables defined only in `scripts/migrate-payroll.sql`, **not in `supabase/migrations/`** |

---

## 2. New `acct_companies` table

Replace the single-row `acct_company` with a multi-row `acct_companies`. The existing row becomes the first entry (slug `'default'`).

```sql
CREATE TABLE acct_companies (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text        UNIQUE NOT NULL,        -- short id: 'acme', 'springbok'
  name                 text        NOT NULL,
  registration_number  text,
  vat_number           text,
  tax_year_end         int,                                -- month 1–12
  address              text,
  push_api_key         text        UNIQUE,                 -- liveHis / machine-to-machine auth
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Migrate existing company
INSERT INTO acct_companies (id, slug, name, registration_number, vat_number, tax_year_end, address, push_api_key)
SELECT id, 'default', name, registration_number, vat_number, tax_year_end, address, gen_random_uuid()
FROM acct_company;
```

`push_api_key` is generated per-company so liveHis and other machine-to-machine callers can identify which company they're pushing into without changing URLs (see §8).

---

## 3. `company_id` scoping

### Per-company tables (add `company_id`)

Every row in these tables belongs to one company.

| Table | Notes |
|-------|-------|
| `acct_accounts` | Each company has its own chart of accounts |
| `acct_journal_entries` | Core GL — must be scoped |
| `acct_journal_lines` | Inherits via `entry_id`; add `company_id` for index efficiency |
| `acct_contacts` | Customers/suppliers differ per company |
| `acct_invoices` | Per company |
| `acct_invoice_lines` | Inherits via `invoice_id`; add for index efficiency |
| `acct_bank_accounts` | Per company |
| `acct_bank_transactions` | Per company |
| `acct_periods` | Financial year and period status are per company |
| `acct_journal_seqs` | PK changes from `(source)` → `(company_id, source)` |
| `pr_employees` | Per company |
| `pr_periods` | Per company |
| `pr_payslips` | Per company (via employee) |
| `pr_payslip_lines` | Inherits via `payslip_id`; add for efficiency |
| `pr_emp201` | Per company |
| `pr_leave_balances` | Per company |
| `pr_leave_requests` | Per company |

Pattern for each table (example: `acct_journal_entries`):

```sql
-- Step 1: add nullable
ALTER TABLE acct_journal_entries
  ADD COLUMN company_id uuid REFERENCES acct_companies(id);

-- Step 2: backfill
UPDATE acct_journal_entries
SET company_id = (SELECT id FROM acct_companies WHERE slug = 'default');

-- Step 3: constrain + index
ALTER TABLE acct_journal_entries
  ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX ON acct_journal_entries (company_id);
```

### Shared reference tables (no `company_id`)

These are SARS-statutory and identical for all South African companies.

| Table | Reason |
|-------|--------|
| `acct_tax_types` | Standard SARS codes `01`–`06` |
| `acct_vat_rates` | Statutory VAT rates (15%, etc.) |

---

## 4. Session → company mapping

### The problem in plain terms

Right now there is one password and one company. With two companies in the same database, the app needs to know **which company you're working in** after you log in.

### Recommended approach: extend the HMAC session cookie

The existing cookie is: `nonce.hmac(SESSION_SECRET + SITE_PASSWORD, nonce)`

Extended cookie: `nonce.companyId.hmac(SESSION_SECRET + SITE_PASSWORD, nonce + companyId)`

**Login flow change:**
1. `/auth/login` renders a **company dropdown** populated from `acct_companies` (public, no auth needed).
2. User selects a company and enters `SITE_PASSWORD`.
3. API route `/api/auth/login` validates the password, then encodes `company_id` into the HMAC payload.
4. `middleware.ts` verifies the HMAC and extracts `company_id` — attaches it as `x-company-id` request header.
5. Every API route reads `request.headers.get('x-company-id')` and passes it down to `lib/` functions.

```ts
// middleware.ts — after HMAC verify, parse cookie
const [nonce, companyId, sig] = cookie.split('.')
const expected = hmac(SESSION_SECRET + SITE_PASSWORD, nonce + companyId)
if (!timingSafeEqual(sig, expected)) return redirect('/auth/login')
// attach for downstream routes
headers.set('x-company-id', companyId)
```

This change requires **no Supabase Auth migration** and keeps the existing single-password model. Rotating `SITE_PASSWORD` still revokes all sessions.

### Future upgrade path

If individual user accounts are needed later (e.g., separate logins for bookkeeper vs. director), migrating to **Supabase Auth** with a `user_companies` membership table is the correct path. That migration is out of scope here but the `acct_companies` table design is compatible with it.

---

## 5. Scoping enforcement strategy

### Primary: application-level filtering in `lib/`

Because the server client uses the **service-role key** (bypasses RLS), `company_id` must be passed explicitly to every query.

Key function signature changes:

```ts
// lib/ledger.ts
recordJournalEntry(supabase, companyId: string, input: RecordEntryInput)
assertPeriodOpen(supabase, companyId: string, date: string)

// lib/ar/aging.ts, lib/banking/*, lib/purchases/*, lib/payroll/*, lib/vat/*
// — every lib function that queries DB gains a companyId param
```

Every Supabase query gains `.eq('company_id', companyId)` as the first filter. The Postgres RPC `acct_post_journal_entry` gains a `p_company_id uuid` parameter and passes it to its INSERT statements.

### Defence-in-depth: Row-Level Security

After all `company_id` columns are in place, enable RLS on every `acct_*` and `pr_*` table:

```sql
ALTER TABLE acct_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_isolation ON acct_journal_entries
  USING (company_id = current_setting('app.company_id', true)::uuid);
```

`createServerClient()` is updated to `SET LOCAL app.company_id = $1` before each query batch:

```ts
// lib/supabase-server.ts
export function createServerClient(companyId: string) {
  const client = createClient(url, serviceRoleKey)
  // set session variable so RLS policies see the company
  client.rpc('set_config', { parameter: 'app.company_id', value: companyId, is_local: true })
  return client
}
```

Shared reference tables (`acct_tax_types`, `acct_vat_rates`) get no RLS — they have no `company_id` and are read-only reference data.

---

## 6. Migration plan (sequenced)

All new files use timestamped filenames in `supabase/migrations/`.

### Step 0 — Capture `pr_*` schema (prerequisite)

`scripts/migrate-payroll.sql` contains 7 tables not tracked by Supabase migrations. Convert it to a proper migration **before** any other step so a clean-deploy works end-to-end.

**File:** `20260601000000_payroll_schema.sql`
Content: the full `CREATE TABLE IF NOT EXISTS` DDL from `scripts/migrate-payroll.sql` (minus the seed INSERT, which belongs in a separate seed script).

### Step 1 — Create `acct_companies`

**File:** `20260601000001_multi_tenant_companies.sql`

```sql
CREATE TABLE acct_companies ( … );  -- full DDL from §2

INSERT INTO acct_companies (id, slug, name, registration_number, vat_number, tax_year_end, address, push_api_key)
SELECT id, 'default', name, registration_number, vat_number, tax_year_end, address, gen_random_uuid()
FROM acct_company;
```

### Step 2 — Add `company_id` columns and backfill

**File:** `20260601000002_multi_tenant_add_company_id.sql`

For each scoped table (§3): `ADD COLUMN company_id uuid REFERENCES acct_companies(id)` then `UPDATE … SET company_id = (SELECT id … WHERE slug = 'default')`.

Order matters for FK dependencies:
1. `acct_accounts`, `acct_contacts`, `acct_periods`, `acct_bank_accounts`
2. `acct_journal_entries`, `acct_invoices`
3. `acct_journal_lines`, `acct_invoice_lines`, `acct_bank_transactions`
4. `pr_employees`, `pr_periods`
5. `pr_payslips`, `pr_emp201`, `pr_leave_balances`, `pr_leave_requests`
6. `pr_payslip_lines`

### Step 3 — NOT NULL + indexes

**File:** `20260601000003_multi_tenant_constraints.sql`

```sql
-- repeat for every scoped table:
ALTER TABLE acct_journal_entries ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX idx_journal_entries_company ON acct_journal_entries (company_id);
-- … etc.
```

### Step 4 — Migrate `acct_journal_seqs`

**File:** `20260601000004_multi_tenant_seqs.sql`

```sql
ALTER TABLE acct_journal_seqs ADD COLUMN company_id uuid REFERENCES acct_companies(id);
UPDATE acct_journal_seqs SET company_id = (SELECT id FROM acct_companies WHERE slug = 'default');
ALTER TABLE acct_journal_seqs ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE acct_journal_seqs DROP CONSTRAINT acct_journal_seqs_pkey;
ALTER TABLE acct_journal_seqs ADD PRIMARY KEY (company_id, source);
```

### Step 5 — Update RPC `acct_post_journal_entry`

**File:** `20260601000005_multi_tenant_rpc.sql`

Add `p_company_id uuid` parameter; propagate to all INSERT statements within the function. The existing RPC definition is replaced (`CREATE OR REPLACE FUNCTION`).

### Step 6 — Enable RLS

**File:** `20260601000006_multi_tenant_rls.sql`

```sql
-- repeat for every scoped table:
ALTER TABLE acct_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON acct_journal_entries
  USING (company_id = current_setting('app.company_id', true)::uuid);
```

### Step 7 — Drop `acct_company` (last, after app code is updated)

**File:** `20260601000007_drop_acct_company.sql`

```sql
DROP TABLE acct_company;
```

Only run after all TypeScript queries referencing `acct_company` are migrated to `acct_companies`.

---

## 7. Per-company structures

| Structure | Approach |
|-----------|----------|
| Chart of accounts | Per company (`company_id` on `acct_accounts`). A seed function generates the standard SA COA for new companies. |
| Accounting periods | Per company (`company_id` on `acct_periods`). New company is seeded with 12 periods derived from its `tax_year_end`. |
| Journal sequences | Per company — new PK `(company_id, source)`. Company B starts at `next_val = 1` for each source. |
| Bank accounts | Per company. |
| VAT / tax types | Shared reference tables — no change. |

---

## 8. Resolved limitations

### liveHis push routes (`/api/push/*`)

These routes currently use a separate API key (not the session cookie). They authenticate against an env-var key and post on behalf of no particular company.

**Resolution:** `push_api_key` (UUID, unique) is stored on `acct_companies`. Push routes are updated to:

```ts
const key = request.headers.get('x-api-key')
const { data: company } = await supabase
  .from('acct_companies')
  .select('id')
  .eq('push_api_key', key)
  .single()
if (!company) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
// proceed with company.id
```

URL stays the same (`/api/push/invoice`). Each company's liveHis integration is configured with its own key. Generate keys with `gen_random_uuid()` when creating a company.

### Journal sequence numbering

New companies are seeded with `next_val = 1` for every `EntrySource` value in `acct_journal_seqs`. The default company's existing sequence values are preserved during the backfill in migration step 4. There is no cross-company sequence gap risk because `(company_id, source)` is a unique composite key.

### RLS (cross-company data leak risk)

Addressed in §5 and migration step 6. The two-layer approach (application filter + RLS policy) means a single bug in either layer cannot expose cross-company data by itself. The `current_setting('app.company_id', true)` call returns `null` (not an error) if the setting is missing, so RLS blocks all rows by default if `company_id` is never set — a safe fallback.

### Allocations table (pre-existing sub-ledger gap)

The lack of invoice-level allocations (payments, credit notes, interest not linked to specific invoices) predates multi-tenancy and is independent of it. It is not resolved here. When built, the `acct_allocations` table **must** include `company_id` and follow the same scoping pattern. Tracked as a separate roadmap item.

---

## 9. Application code changes (summary)

This section is a checklist for the implementation phase, not this doc's scope to execute.

- [ ] `middleware.ts` — extend cookie format, extract and forward `x-company-id`
- [ ] `app/api/auth/login/route.ts` — accept `companyId` in body; include in HMAC
- [ ] `app/auth/login/page.tsx` — add company selector dropdown
- [ ] `lib/supabase-server.ts` — `createServerClient(companyId)` sets `app.company_id`
- [ ] `lib/ledger.ts` — `recordJournalEntry`, `assertPeriodOpen`, `getAccountBalance` gain `companyId`
- [ ] All `lib/ar/`, `lib/banking/`, `lib/purchases/`, `lib/payroll/`, `lib/vat/`, `lib/livehis-push/` — add `companyId` param
- [ ] All `app/api/*/route.ts` — read `x-company-id` header, pass to lib functions
- [ ] `app/api/push/*/route.ts` — replace env-var key check with `push_api_key` DB lookup
- [ ] `lib/types.ts` — update `Company` type to reflect `acct_companies` shape

---

## 10. What stays unchanged

- Single `SITE_PASSWORD` — still controls login access for all companies on this deploy
- Auth model (HMAC cookie) — extended, not replaced
- `EntrySource` enum — unchanged
- `acct_tax_types`, `acct_vat_rates` — shared, no migration needed
- Postgres triggers protecting posted entries — unchanged; they operate per-row and are company-agnostic
