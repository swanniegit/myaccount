# myAccount Multi-Company Migration — Hardened Plan

**Status:** Approved implementation spec (no implementation yet). **Supersedes** the prior `multi-tenant-design.md` (2026-05-28) and the conversational "Plan B".
**Date:** 2026-06-17
**Goal:** Serve two or more SA companies (first new one: *Yellow Archer*) from the same Supabase project + Next.js deploy, with complete data isolation.

> Produced by an adversarial multi-agent review (6 ground-truth census agents + 3 critique lenses + synthesis) that verified every claim against source, then refined by an external implementation review. File:line references below were read against the codebase.

### Changelog
- **2026-06-17 (rev 2):** External implementation review — **approved as the spec.** Resolved all five §7 open questions; added API-key hashing spec (G1), intra-company FK integrity (G9b), explicit client-page scoping sub-workstream (PR3 / G2), `lib/company-context.ts` + CI-audit specs, `acct_seed_company` acceptance criteria, PR3→PR4 hard dependency; moved down-migrations off the critical path (G19).
- **2026-06-17 (rev 1):** Hardened plan replaces the 2026-05-28 design doc.

---

## Locked decisions

1. **liveHis machine-to-machine auth → per-company API keys.** Company resolved server-side from the presented key; unspoofable; no change to the liveHis payload contract. (Gap **G1**.)
2. **Payroll (`pr_*`) is IN scope for v1.** Full statutory isolation — it posts GL and files EMP201 per company. Sets effort at **~4–5 weeks**. (Gap **G5**.)
3. This document is the saved working spec; work proceeds against it.

**Resolved §7 questions (2026-06-17):**

4. **RLS → No.** The `child.company_id = parent.company_id` CHECK (G9) + intra-company FK checks (G9b) + the PR3 CI audit + `NOT NULL` are sufficient for the single-login / service-role / one-bookkeeper threat model. (Rationale §7.1.)
5. **VAT201/EMP201 filing snapshots → Yes, v1.** Two SARS-registered entities must be able to prove what each declared; ~2 days. (G16.)
6. **`books_locked_through` → Enforce** in `assertPeriodOpen`. An advertised soft-lock that isn't enforced erodes Tharina's trust. (G15.)
7. **Consolidated/group reporting → No, v1.** Single-company-cookie scoping forecloses it; the v2 `company_id IN (...)` path is documented. (G24.)
8. **Company lifecycle → Archive, never hard-delete** (SARS 5-year retention). (G17.)

---

## 1. Verdict

The *data model* is right; the *blast-radius accounting, migration mechanics, and PR sequencing* were not in the earlier plans. Shipped as written, they would (a) abort on the first migration run, (b) take the live liveHis integration down for the multi-day window between PRs, and (c) silently merge companies' GL/EMP201/VAT into shared reports. This spec fixes the three fatal flaws of naïve multi-tenant migrations: **no company source for M2M, backfill blocked by protect triggers, and `NOT NULL` before writers carry the column.**

### What was already right (keep)
- `company_id` as a **data-partition key, not a security boundary** is internally consistent with the single-`SITE_PASSWORD` / one-bookkeeper model. Skipping RLS-*as-security* is defensible (residual is a correctness backstop — see §3 G9/G9b).
- The list of `acct_*` tables to scope (and which stay global) is complete and correctly classified.
- Denormalizing `company_id` onto `acct_journal_lines` and `acct_bank_transactions` is correct (the `!inner` join reports depend on it).
- `acct_invoice_lines` derived via parent invoice is fine (cascade child keyed by `invoice_id`).
- `acct_journal_seqs` PK → `(company_id, source)`; named unique recompositions; `assertPeriodOpen` needing a company filter; **timestamped** migration filenames — all correct.
- Per-company COA seeding via `acct_seed_company(p_company_id)` is the right shape *(function does not exist yet — to be created in PR4)*.

### The 5 things that were materially wrong or missing (ranked)

| # | Issue | Severity | Why it's fatal as-written |
|---|-------|----------|---------------------------|
| 1 | **liveHis `/api/push/*` has no company source.** A cookie can't serve machine-to-machine routes; `requireApiKey` (`lib/livehis-push/auth.ts:4-25`) checks one shared `ACCOUNTING_API_KEY` and returns `NextResponse \| null`. | **critical** | After `NOT NULL`, every push (invoice/payment/void/sync) 500s. Yellow Archer import depends on this path. |
| 2 | **Backfill aborts on the protect triggers.** All GL rows are `is_posted=true`; `acct_je_protect` AND `acct_jl_protect` raise on any UPDATE. The phase-4 precedent disabled only the entry trigger. | **critical** | Migration fails on first run. |
| 3 | **Three GL write paths bypass the RPC** and were omitted: inline fallback `postJournalEntryInline` (`lib/ledger.ts:66-113`, no `company_id`), `acct_void_invoice` (direct inserts `20260525000004:48-61`), `acct_income_expense` (chart aggregate, GROUP BY across all companies). A `.from()` grep can't see the last two (they are `.rpc()`/server SQL). | **critical** | NULL/global-company GL writes; dashboard sums every company together. |
| 4 | **Entire `pr_*` payroll schema (7 tables) omitted** — and not in `supabase/migrations` (lives in `scripts/migrate-payroll.sql`). Posts GL via `recordJournalEntry` (`source='payroll'`). | **critical** | Clean deploy lacks the tables; live DB shares one employee list + one set of EMP201 across companies — leak in a SARS-statutory module. *(In scope per decision 2.)* |
| 5 | **`NOT NULL` set before writers carry `company_id`.** The big scoping PR is days later. | **critical (sequencing)** | Multi-day outage of posting + live integration. Fix: additive column + temp DEFAULT first; `NOT NULL` + `DROP DEFAULT` is the *last* PR. |

Two more **high** items that under-scoped the estimate: account-lookup-by-**code** `.single()` calls hard-crash once the chart is cloned per company (codes repeat); and ~10 `acct_company` columns + `pr_*` live **out-of-band** — migrations are not the schema source of truth, so dump remote DDL before writing the first migration.

---

## 2. Corrections to the earlier plans (with evidence)

| Earlier claim | Correction | Evidence |
|---|---|---|
| "change `acct_accounts.code` / `acct_invoices.number` unique → composite" | Column-level UNIQUE (auto-named `acct_accounts_code_key`, `acct_invoices_number_key`) — can't be ALTERed in place. **DROP then ADD.** Verify names on remote. | `001_initial.sql:5,52` |
| "constraint list is complete" | **Missing `external_ref`.** Partial-unique indexes on `acct_invoices(external_ref)` and `acct_contacts(external_ref)` → `unique(company_id, external_ref) WHERE external_ref IS NOT NULL`. | `003_livehis_integration.sql:4,7` |
| "backfill is a routine UPDATE" | Blocked by protect triggers. Disable `acct_je_protect` **and** `acct_jl_protect` around the backfill; re-enable. | `20260525000001:7-9`; `20260525000003:11-16`; precedent (entry-only) `20260526000001:39,51` |
| RPC list = post/next_je/assign_je/check_control | **Add `acct_void_invoice`** (direct reversal insert, period lookup by year/month only — `20260525000004:37-39,48-61`) **and `acct_income_expense`** (`20260527000000:6-34`). Fix `acct_next_je_number`'s `ON CONFLICT (source)` → `(company_id, source)` (`20260526000001:22-31`). | verified |
| `acct_post_journal_entry` gets `p_company_id` | Authoritative body is the 6-arg **phase5** version (`20260526000003:23-98`); five older copies are dead. **Inline fallback `postJournalEntryInline` must also stamp `company_id`**, and `lib/ledger.ts` must pass `p_company_id` in the SAME PR (PostgREST resolves by arg names → PGRST202 otherwise). | `lib/ledger.ts:70-96,131-147` |
| `assertPeriodOpen` "just add a filter" | Uses `.maybeSingle()` on `(year,month)` (`lib/ledger.ts:43-48`). Once periods are unique per `(company,year,month)`, `.maybeSingle()` **throws "multiple rows" on every post** until the filter lands. Same in `lib/year-end/close.ts:44-49` and the void RPC — change together. | verified |
| `acct_check_control_account` "asserts same company" | **Net-new logic**, not a tweak — current fn joins by id only. Add `account.company_id == NEW.company_id == entry.company_id`. | `20260526000002:18-36` |
| "~145 sites, mechanical `.eq`" | 145/57 correct for `.ts/.tsx`; **167/61 repo-wide** incl. 3 GL-writing `.mjs` scripts (needed for import). Excludes `pr_*` sites. ~25 are **judgement** sites, not mechanical. | grep |
| "pure reference reads left alone" | **Misclassifies `acct_accounts`.** `getAccountId('4100').single()` throws once codes repeat; `accounts.find(code)` over unscoped selects returns the *wrong* company's account silently. | `lib/livehis-push/account-lookup.ts:8-12`; `lib/vat/compute.ts:46-53`; `lib/year-end/close.ts:64-78` |
| "convert `002_seed_accounts.sql`" | Incomplete chart. Seed must also reproduce provisional-tax accounts 1260/1270/5920, `is_contra` on 1110/1510, `is_control` on 1100/2000 (later migrations), and year-end's 3300/3100. | `20260526000001:77`; `20260526000003:122,125-131`; `lib/year-end/close.ts:74-78` |
| rename `acct_company` → `acct_companies` (prior doc §2) | **Do NOT rename.** Risks dropping ~10 out-of-band prod columns (`tax_number, vat_cycle, paye_ref, efiling_user, books_locked_through, default_vat, inventory_method, phone, email, vat_registration_date`) present only on the live DB. Keep `acct_company` as the tenant root. | `001_initial.sql:97-105` (6 cols) vs `app/api/setup/company/route.ts:26-42` (16 cols) + `scripts/migrate-company-columns.mjs` |

**Confirmed-but-leave-alone (avoid churn):** `acct_tax_types` + `acct_vat_rates` stay global; `acct_vat_rates(effective_from)` unique needs no recomposition; `acct_entry_is_balanced` (keyed by `entry_id`) unchanged; `acct_invoice_lines` derived via invoice is fine (but direct queries must filter through the parent — see PR3 audit).

---

## 3. Newly identified gaps (critical → low)

### CRITICAL

**G1 — liveHis machine-to-machine company routing.** *(Decided: per-company API keys.)* Add `acct_company_api_keys(id, company_id uuid, key_hash text, label text, is_active bool, created_at, last_used_at, revoked_at)`. Rewrite `requireApiKey` to resolve the presented `x-api-key` and **return `{ companyId }`** instead of pass/fail. Keep a deprecation window where the old `ACCOUNTING_API_KEY` resolves to the default company. **Predecessor of the import PR.**

> **Key storage spec:** store **only** `key_hash = SHA-256(SESSION_SECRET-derived pepper ‖ plaintext)`; never store plaintext. Compare in **constant time** against active rows (`is_active AND revoked_at IS NULL`). Plaintext is shown to the operator **once** at generation (and handed to the liveHis config out-of-band — see `reference_livehis_prod`); rotation = insert new active key, then revoke old after liveHis cutover. `last_used_at` + `created_at`/`revoked_at` give a rotation audit. Key format: a random 32-byte URL-safe token with a non-secret prefix (`mak_<company-slug>_…`) so it's identifiable in logs without exposing the secret.

**G2 — Data leak on company switch (client state, not server cache).** Confirmed there is **no** Next.js data/full-route-cache hazard (no `createServerClient` in pages, no `revalidate`/`unstable_cache`; ~39/46 `page.tsx` are `'use client'`). The risk is **client-side and large**: ~24 `app/**` pages import `@/lib/supabase` directly and query `acct_*` from the browser, and `recordJournalEntryClient` hardcodes the module-singleton client (`lib/ledger.ts:177-179`). Setting a cookie alone doesn't remount mounted pages. **Fix:** (a) signed **httpOnly** company cookie the server trusts (its own HMAC — the session cookie signs only a nonce); (b) a non-httpOnly companion cookie + `CompanyProvider` context so **every** client query has a `companyId`, not just `recordJournalEntryClient`; (c) **on switch, hard-reload** (`window.location.assign('/dashboard')`); (d) `middleware.ts` validates the company-cookie HMAC and redirects deleted/forged/archived ids to a picker. **UX note:** a hard reload discards in-flight unsaved journal/invoice form state — acceptable for v1, but warn on switch if a form is dirty. PR3 treats the client pages as an explicit sub-workstream (see PR3).

**G3 — Protect-trigger-blocked backfill.** (See §2.) Disable both triggers around the backfill; wrap backfill + per-table constraint changes in one transaction.

**G4 — Inline fallback + `acct_void_invoice` + `acct_income_expense` write/aggregate company-blind.** (See §2.) Patch all in the same enforcement window as the main RPC.

**G5 — Payroll (`pr_*`) unscoped and not in migrations.** *(In scope per decision 2.)* First **promote `scripts/migrate-payroll.sql` to a timestamped migration**, then add `company_id` to all 7 tables, recompose keys (`pr_employees.code → (company_id,code)`; `pr_periods(year,month) → (company_id,year,month)`), scope all 7 payroll routes + `lib/payroll/*`.

**G6 — Account-by-code lookups crash or mis-resolve.** `getAccountId` and `getDefaultBankAccountId` need a **required `companyId`** param; ~6 `accounts.find(code)` over unscoped selects must be scoped (`lib/vat/compute.ts:46-53`, `lib/year-end/close.ts:64-78`, `app/api/charts/route.ts:70`). Mandatory (crash), not optional.

**G7 — Year-end close is company-blind end-to-end.** `runYearEndClose` reads the `acct_company` singleton for `tax_year_end`, aggregates ALL posted lines, and bulk-UPDATEs `acct_periods` by year/month (would close *every* company's periods). `tax_year_end` differs per company → even the FY range is wrong. Thread `company_id` through `lib/year-end/close.ts:19,32-39,64,84-106,176-203`.

### HIGH

**G8 — Global idempotency keys collide across companies.** Beyond `external_ref`: payment `PAY-<ref>-<date>`, `VAT-CLEAR-YYYY-MM`, `PR-YYYY-MM`, `YE-YYYY-CLOSE/ROLLUP`. Add `.eq('company_id', id)` to every existing-row check (`app/api/push/payment/route.ts:40-45`, `app/api/vat-clearing/route.ts:25-30`, `app/api/payroll/close/route.ts:35-37`, `lib/year-end/close.ts:32-39`).

**G9 — Denormalized `company_id` has no integrity guarantee.** ~8 report joins filter `acct_journal_lines` through `acct_journal_entries!inner` relying on a single `.eq` on the denormalized column. **Add a trigger/CHECK enforcing `child.company_id = parent.company_id`** on `acct_journal_lines` and `acct_bank_transactions`, and stamp the denormalized value **only inside the RPC/triggers from the parent, never from app input.** Practical replacement for the RLS backstop and the highest-leverage single safety net.

**G9b — Intra-company FK integrity (parent rows).** The CHECK in G9 catches denormalized drift but **not** a wrong `company_id` on a *parent* row written by application code. With the service-role client, app code is the only real boundary, so add CHECK/trigger enforcement on the hot paths where a cross-company reference is plausible:
- `acct_accounts.parent_id` must reference an account in the **same** company.
- `acct_invoices.contact_id` and each invoice line's `account_id` must belong to the **invoice's** company.
- `acct_bank_transactions.journal_line_id` must point at a line in the **same** company (reconciliation across companies must be impossible).
Low probability under normal UI flows, but cheap to enforce and the only structural defence given service-role access. Treat the PR3 CI audit as **mandatory**, not nice-to-have.

**G10 — `getDefaultBankAccountId` + hardcoded bank.** `lib/banking/get-default-bank.ts:8-14` returns the first active bank globally; `app/banking/page.tsx` hardwires `.eq('account_number','63044191201')` — a day-one break for any non-original company. Scope by company; make `is_default` a per-company partial unique index.

**G11 — `acct_company` singleton reads return an arbitrary company.** ~10 `.limit(1).maybeSingle()` sites (year-end FY anchor, income-statement, cash-flow, setup). Replace with `.eq('id', activeCompanyId).single()`. Own audit category.

**G12 — Data export is company-blind.** `lib/export/transactional.ts:61-87` pulls every posted entry in a range. Thread `company_id` into both queries.

**G13 — VAT201 `entryCount` is a global count.** `lib/vat/compute.ts:67-72`. Scope it; surface the active company's `vat_number`/`vat_cycle`.

**G14 — Per-company period seeding + opening balances (onboarding blocker).** `acct_seed_company` must also create the 12 `acct_periods` rows anchored to the new company's `tax_year_end` (default closed) and seed the full `acct_journal_seqs` source set. A new company also needs a **take-on/opening-balance flow** (`source='take_on'` exists in the enum but has no route/UI) **before** statement import — otherwise the first trial balance/balance sheet is wrong and the 3300→3100 rollup has nothing to roll.

### MEDIUM

**G15 — `books_locked_through` enforcement.** *(Decided: enforce.)* Reject postings with date ≤ the active company's `books_locked_through` inside `assertPeriodOpen` (alongside the period-closed check). Tharina relies on this soft-lock; advisory mode is a trust risk.

**G16 — VAT201/EMP201 filing-status persistence.** *(Decided: v1.)* `computeVat201` recomputes from GL every call with no snapshot of what each company declared to SARS. Add `acct_vat_returns` / `acct_emp201_returns` (`company_id`, period, status, `filed_at`, snapshot JSON, SARS ref); warn-on-drift once a period is filed. ~2 days.

**G17 — Company archive lifecycle.** *(Decided: archive, not delete.)* Add `is_active` / `archived_at` to the tenant root; archive instead of hard-delete (SARS 5-year retention); switcher + middleware reject archived ids.

**G18 — Deploy not reproducible.** Reconcile out-of-band `acct_company` columns and `pr_*` into real migrations before the first multi-company migration (PR0).

**G19 — Migration safety (down-migrations optional).** Use `ADD CONSTRAINT … NOT VALID` then `VALIDATE CONSTRAINT` for FKs; the temp DEFAULT closes the concurrent-insert-during-backfill hole. **Down-migrations are a local-dev convenience only — not on the critical path:** Supabase production rollbacks are forward-fix migrations, so do not let reverse-migration authoring block PR0–PR1a.

### LOW

**G20 — Document numbering semantics.** Numbers restart per company (correct, Pastel-style) but `INV-001` collides visibly across companies. Add a per-company prefix; include company slug in PDF filenames/email refs.

**G21 — Tests break on `companyId` arity.** `tests/import-statement.test.ts` (7 call sites) and the vitest stub need updating; the stub must honor `.eq('company_id')` for a meaningful isolation test.

**G22** — document scoped reads that stay global (`acct_tax_types`, `acct_vat_rates`) in the `scopedFrom` allowlist so the CI audit never flags them. **G23** — allow annotated exemptions for transitively-scoped second passes (`.in('entry_id', ids)`, direct `acct_invoice_lines` queries that filter through the parent invoice). **G24** — *(Decided: no consolidated reporting in v1.)* Record that single-company-cookie scoping forecloses it without a second `company_id IN (...)` code path — v2. **G25 — Observability.** Add `/api/whoami` returning `{ companyId, companyName }`, and add a structured `company_id` log field on every `/api/push/*` route (resolved key → company) so cross-company mis-routing is visible in logs.

---

## 4. Revised inventory

### 4.1 Tables

| Table | Treatment | Notes |
|---|---|---|
| `acct_company` | **TENANT ROOT** | Keep — do NOT rename. Reconcile ~10 out-of-band columns first. Add `is_active`/`archived_at` (G17). |
| `acct_company_api_keys` | **NEW** | per-company M2M keys; stores `key_hash` only (G1) |
| `acct_accounts` | scoped (direct) | `code` unique → `(company_id, code)`; `parent_id` self-FK same-company CHECK (G9b) |
| `acct_journal_entries` | scoped (direct) | |
| `acct_journal_lines` | scoped (**denormalized**) | + CHECK = parent's company_id (G9) |
| `acct_contacts` | scoped (direct) | `external_ref` unique → `(company_id, external_ref)` |
| `acct_invoices` | scoped (direct) | `number` → `(company_id, number)`; `external_ref` → `(company_id, external_ref)`; `contact_id` same-company CHECK (G9b) |
| `acct_invoice_lines` | derived via invoice | no direct column; `account_id` same-company CHECK (G9b) |
| `acct_bank_accounts` | scoped (direct) | `is_default` → per-company partial unique |
| `acct_bank_transactions` | scoped (**denormalized**) | + CHECK = parent bank_account's company_id (G9); `journal_line_id` same-company CHECK (G9b) |
| `acct_periods` | scoped (direct) | `(year,month)` → `(company_id, year, month)` |
| `acct_journal_seqs` | scoped | PK `(source)` → `(company_id, source)` |
| `acct_vat_returns` / `acct_emp201_returns` | **NEW** | per-company filing snapshots (G16) |
| `acct_tax_types` | **GLOBAL** | national SARS codes |
| `acct_vat_rates` | **GLOBAL** | statutory rates; `(effective_from)` unique unchanged |
| `pr_employees` | scoped (direct) | `code` → `(company_id, code)` — **promote to migration first** |
| `pr_periods` | scoped (direct) | `(year,month)` → `(company_id, year, month)` |
| `pr_payslips` | scoped (direct) | |
| `pr_payslip_lines` | derived via payslip | |
| `pr_emp201` | scoped (direct) | |
| `pr_leave_balances` | scoped (direct) | |
| `pr_leave_requests` | scoped (direct) | |

### 4.2 Functions / triggers

| Object | Authoritative location | Verdict |
|---|---|---|
| `acct_post_journal_entry` | `20260526000003_phase5.sql:23-98` (6-arg) | **CHANGE** — add `p_company_id`, stamp entry + each line. 5 older copies dead. |
| `postJournalEntryInline` (TS) | `lib/ledger.ts:66-113` | **CHANGE** — stamp `company_id` on both inserts |
| `acct_void_invoice` | `20260525000004:5-69` | **CHANGE** — `p_company_id`; stamp reversal entry+lines; scope period+invoice lookups |
| `acct_income_expense` | `20260527000000:6-34` | **CHANGE** — `p_company_id` + `WHERE l.company_id = p_company_id` |
| `acct_next_je_number` | `20260526000001:22-31` | **CHANGE** — `p_company_id`; `ON CONFLICT (company_id, source)` |
| `acct_assign_je_number` | `20260526000001:60-66` | **CHANGE** — pass `NEW.company_id` |
| `acct_check_control_account` | `20260526000002:18-36` | **CHANGE (net-new logic)** — assert account/entry/line same company |
| `acct_seed_company` | — | **NEW (PR4)** — clones effective COA + flags, 12 periods anchored to FYE, seq rows per `EntrySource` |
| `requireApiKey` (TS) | `lib/livehis-push/auth.ts:4-25` | **CHANGE** — resolve key → `{ companyId }` (G1) |
| `assertPeriodOpen` (TS) | `lib/ledger.ts:39-54` | **CHANGE** — `.eq('company_id')` before `.maybeSingle()`; also enforce `books_locked_through` (G15) |
| `acct_je_protect` | `20260525000001:14` | **DISABLE during backfill only** |
| `acct_jl_protect` | `20260525000003:21` | **DISABLE during backfill only** |
| child=parent company CHECK triggers | — | **NEW (PR1b)** — on `acct_journal_lines`, `acct_bank_transactions` (G9) + intra-company FK checks (G9b) |
| `acct_entry_is_balanced` | `20260519210000:73` | **NO CHANGE** (keyed by entry_id) |
| `acct_period_status` | `20260525000002:4` | **NO CHANGE** unless a caller is found (appears unused) |
| `acct_je_number` / `acct_jl_no_control` triggers | BEFORE INSERT | **NO CHANGE** (don't block backfill) |

### 4.3 Constraint recomposition (complete)

1. `acct_accounts_code_key` — DROP (column-level), ADD `unique(company_id, code)`
2. `acct_invoices_number_key` — DROP (column-level), ADD `unique(company_id, number)`
3. `acct_periods (year,month)` — drop named constraint, ADD `unique(company_id, year, month)`
4. `idx_acct_inv_external_ref` — DROP, recreate `unique(company_id, external_ref) WHERE external_ref IS NOT NULL`
5. `idx_acct_contacts_external_ref` — as #4
6. `acct_journal_seqs` PK `(source)` → `(company_id, source)`
7. `acct_bank_accounts` — add partial `unique(company_id) WHERE is_default`
8. `pr_employees.code` → `(company_id, code)`; `pr_periods (year,month)` → `(company_id, year, month)`
9. **Verify all auto-named constraint names against the live remote** — schema has drifted.

---

## 5. Revised rollout (safe sequence)

The single fix that removes the outage hazard: **make the schema PR additive (nullable + temp DEFAULT), and make `NOT NULL` + `DROP DEFAULT` the LAST PR**, after every writer carries `company_id`. The system stays single-company-correct throughout.

| PR | Scope | Atomic? |
|---|---|---|
| **PR0 — Drift reconciliation** | Dump live `acct_company` DDL; bring out-of-band columns + `scripts/migrate-payroll.sql` into real timestamped migrations. No behaviour change. | — |
| **PR1a — Additive schema** | `ADD COLUMN company_id` **nullable, DEFAULT = the one existing company id** on all scoped `acct_*` + `pr_*`; backfill (with `acct_je_protect`+`acct_jl_protect` disabled inside the txn); FKs `NOT VALID` then `VALIDATE`; indexes; recompose all uniques; seq PK change. **No `NOT NULL`, no `DROP DEFAULT`.** Zero behaviour change. | backfill + per-table constraint changes per txn |
| **PR1b — DB write/aggregate RPCs** | One migration + `lib/ledger.ts` in the same PR: `acct_post_journal_entry`, inline fallback, `acct_void_invoice`, `acct_income_expense`, `acct_next_je_number` (ON CONFLICT), `acct_assign_je_number`, `acct_check_control_account`, `assertPeriodOpen` + `lib/year-end/close.ts` `.maybeSingle()`. Add the G9 child=parent CHECK and the G9b intra-company FK checks. | RPC sig + `lib/ledger.ts` caller atomically |
| **PR2 — Company context** | `lib/company-context.ts` (see API below); signed httpOnly company cookie; `CompanyProvider` + companion cookie reaching **all** client queries; middleware HMAC validation + deleted/archived-id redirect. | — |
| **PR-M2M — Push company routing** (parallel; predecessor of import) | `acct_company_api_keys` (hash spec, G1); `requireApiKey` returns `{ companyId }`; thread through `lib/livehis-push/*`; per-company `external_ref` lookups; old-key deprecation window; push-route `company_id` logging (G25). | — |
| **PR-PAYROLL** (parallel) | Scope all 7 `pr_*` tables + routes + `lib/payroll/*`. | — |
| **PR3 — App scoping** | Two sub-workstreams: **(a) server/lib** — mechanical `.eq(company_id)` bulk + judgement bucket (by-code `.single()`/`find()`, `acct_company` singleton reads, `periods` `onConflict`, idempotency keys, next-invoice-number max, `getDefaultBankAccountId`, hardcoded bank, export, VAT201 count, year-end); **(b) client pages** — the ~24 `app/**` pages importing `@/lib/supabase` directly, each wired to `CompanyProvider` so post-switch reload shows scoped data. CI audit (see below) gates the PR. | — |
| **PR4 — Company CRUD + complete seed** | `acct_seed_company` (acceptance criteria below); CRUD list/switch + archive (G17); switch = hard reload with dirty-form warning; **take-on/opening-balance flow** (G14); filing-snapshot tables (G16). **Hard-depends on PR3** — a new company must not exist until all writers are scoped, or its first writes leak into the default company. | — |
| **PR5-ENFORCE — Final gate** | `SET NOT NULL` + `DROP DEFAULT` on all scoped tables. **Only after PR1b + PR3 + PR4 + PR-M2M + PR-PAYROLL are merged and proven.** Low-traffic window. | the serialization gate |
| **PR6 — Create Yellow Archer + import** | Issue its push key (lockstep with external liveHis prod); take-on balances; PDF→CSV for the 10 statements (FNB PDF path was removed — commit `490efc2`). | — |

**Dependencies / parallelization:** after PR1a lands, PR1b / PR-M2M / PR-PAYROLL / PR3 run in parallel. **PR4 hard-depends on PR3** (and on PR-M2M for the import path). The only serialization gate is **PR5-ENFORCE**, which depends on everything above it.

### 5.1 `lib/company-context.ts` interface (PR2)

```ts
// Server: resolve the active company from the signed httpOnly cookie (defaults to the sole/default company).
export async function getActiveCompanyId(req: NextRequest): Promise<string>

// Set/rotate the active-company cookies (httpOnly signed + non-httpOnly companion) — used by the switcher.
export async function setActiveCompany(res: NextResponse, companyId: string): Promise<void>

// The one scoping seam every API route + lib function uses, so .eq('company_id') is impossible to forget.
// Global reference tables (acct_tax_types, acct_vat_rates) are NOT routed through this (CI allowlist).
export function scopedFrom(supabase: SupabaseClient, table: ScopedTable, companyId: string): PostgrestFilterBuilder
```

### 5.2 CI audit (gates PR3, mandatory per G9b)

- Flag any `.from('acct_<scoped>')` / `.from('pr_<scoped>')` without a nearby `.eq('company_id', …)` (or `scopedFrom`).
- Flag `.rpc('acct_post_journal_entry' | 'acct_void_invoice' | 'acct_income_expense' | 'acct_next_je_number')` calls missing `p_company_id`.
- Flag `acct_company` singleton reads (`.limit(1).maybeSingle()` on the tenant root) outside the company-context helper.
- **Allowlist:** `acct_tax_types`, `acct_vat_rates`, and annotated transitive passes (`.in('entry_id', …)`, invoice-line reads filtered through the parent invoice).

### 5.3 `acct_seed_company` acceptance criteria (PR4)

- Clones the **current effective** chart of accounts (base seed + `is_control`/`is_contra` flags + provisional-tax accounts 1260/1270/5920 + year-end 3300/3100) for the new `company_id`.
- Creates **12 `acct_periods`** rows for the company's first FY, anchored to its `tax_year_end`, all defaulting **closed**.
- Inserts an `acct_journal_seqs` row per `EntrySource` value at `next_val = 1`.
- Idempotent / transactional: a partial failure leaves no half-seeded company.

---

## 6. Revised effort

**~4–5 weeks full scope** (payroll included per decision 2; M2M + VAT/EMP201 snapshots + ~25 judgement sites + client-page workstream). Do not compress below ~3 weeks.

| Workstream | Estimate |
|---|---|
| PR0 drift + PR1a additive schema | 2–3 days |
| PR1b all RPCs + inline fallback + maybeSingle fixes + G9/G9b CHECKs | 2 days |
| PR3 app scoping (server/lib bulk + ~25 judgement sites + ~24 client pages + CI audit) | 5–7 days |
| PR-M2M per-company-key auth + hashing + external_ref reindex + push threading + liveHis lockstep | 3–4 days |
| PR-PAYROLL schema promotion + scoping | 2–3 days |
| PR4 CRUD + complete seed + period seeding + take-on + filing snapshots + switcher/CompanyProvider | 3–4 days |
| Tests/fixtures/isolation + call-site arity updates | 2 days |

**Critical path:** PR0 → PR1a → (PR1b ∥ PR3 ∥ PR-M2M ∥ PR-PAYROLL) → PR4 → **PR5-ENFORCE** → PR6. Gating risk: PR3→PR4 dependency, PR-M2M (predecessor of import), and the final enforcement gate.

---

## 7. Decisions (resolved 2026-06-17)

All five prior open questions are now decided (mirrored in *Locked decisions* above):

1. **RLS → No.** App-level scoping via `scopedFrom` + the G9 child=parent CHECK + G9b intra-company FK checks + the PR3 CI audit + `NOT NULL` is the chosen isolation stack. The residual ("one missed `.eq` could merge a report") is accepted and mitigated by the **mandatory** CI audit and the structural CHECKs. *(Prior doc §5 proposed full RLS via `current_setting('app.company_id')` + `SET LOCAL`; rejected — it adds a session-var contract to every server query batch under a service-role client for little marginal safety here.)*
2. **VAT201/EMP201 filing snapshots → Yes (v1).** G16.
3. **`books_locked_through` → Enforce** in `assertPeriodOpen`. G15.
4. **Consolidated/group reporting → No (v1).** Documented v2 path: a second `company_id IN (...)` code path. G24.
5. **Company lifecycle → Archive, not hard-delete** (SARS 5-year retention). G17.

**Files most affected by judgement (not mechanical) work:** `lib/ledger.ts`, `lib/livehis-push/{auth,account-lookup,create-invoice-journal,record-payment-journal,upsert-contact}.ts`, `app/api/push/{invoice,payment,sync,void}/route.ts`, `app/api/{kpi,charts,periods}/route.ts`, `lib/vat/compute.ts`, `lib/year-end/close.ts`, `lib/banking/get-default-bank.ts`, `lib/export/transactional.ts`, `app/banking/page.tsx`, `app/sales/new/page.tsx`, the ~24 client `app/**` pages importing `@/lib/supabase`, and migrations `20260526000003_phase5.sql`, `20260525000004_void_invoice_atomic.sql`, `20260527000000_chart_aggregates.sql`, `20260526000001_phase4_pastel_parity.sql`. Out-of-band sources to reconcile first: `scripts/migrate-payroll.sql`, `scripts/migrate-company-columns.mjs`.

---

## Appendix — carried over from the prior design doc (2026-05-28)

- **Allocations table (pre-existing sub-ledger gap):** the lack of invoice-level allocations (payments, credit notes, interest not linked to specific invoices) predates multi-tenancy and is independent of it. When built, an `acct_allocations` table **must** include `company_id` and follow the same scoping pattern (incl. a G9b same-company CHECK on its FKs). Tracked as a separate roadmap item.
- **Future upgrade path:** if individual user accounts are later needed (e.g. separate logins for bookkeeper vs director), migrate to **Supabase Auth** with a `user_companies` membership table. Out of scope here, but the tenant-root design is compatible with it.
