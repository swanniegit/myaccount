# Accounting System Remediation Plan

Audit: `Accountant_Review_C_GitHub_account.docx`
Benchmark: Sage Pastel Partner / IFRS for SMEs / SARS VAT 201

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 1 — Audit Blockers
> Nothing else is trustworthy until these five are in place. (PR #1)

| # | ID | Task | Status |
|---|-----|------|--------|
| 1 | G-01 | Add DB trigger blocking UPDATE/DELETE on posted journal entries (`is_posted = true`) | `[x]` |
| 2 | G-02 | Replace void status-flip with a full reversing journal (Dr Sales, Dr VAT Output, Cr AR) | `[x]` |
| 3 | G-03 | Default missing period rows to `'closed'` — absence must mean locked, not open | `[x]` |
| 4 | R-01 | Trial Balance: add date range filter, `is_posted = true` filter, and proper pagination | `[x]` |
| 5 | R-04 | All report pages: apply `!inner` posted-only join (currently only VAT201 does this) | `[x]` |

---

## Phase 2 — Financial Statement Integrity

| # | ID | Task | Status |
|---|-----|------|--------|
| 6 | G-06 | Sales invoice screen (`app/sales/new`) must call `recordJournalEntry` on save — not just create invoice rows | `[x]` |
| 7 | G-10 | Invoice GL routing: use per-line `account_id` instead of hard-coding `4100` Service Revenue for all lines | `[x]` |
| 8 | R-02 | Balance Sheet: add "as at" date picker; report must be point-in-time, not always today | `[x]` |
| 9 | R-03 | Retained earnings: source from GL account balance (after year-end close), not a runtime sum of revenue − expenses | `[x]` |
| 10 | R-05 | Cash Flow: rebuild as IAS 7 indirect method statement from classified GL lines | `[x]` |
| 11 | R-06 | Equity statement: derive opening balance from prior-period GL; remove hardcoded `opening = 0` | `[x]` |
| 12 | R-09 | FY start: read `tax_year_end` from Company table (default Feb = start March 1); remove hardcoded January | `[x]` |
| 13 | C-05 | Income Statement: separate COGS from operating expenses; add Gross Profit subtotal line | `[x]` |
| 14 | C-06 | Year-end roll-up: `POST /api/year-end/close` posts IS→3300→3100 closing entries and locks all FY periods | `[x]` |

---

## Phase 3 — VAT Correctness

| # | ID | Task | Status |
|---|-----|------|--------|
| 15 | V-03 | Add tax-type model: 2-digit code (01 Standard, 02 Std no input, 03 Zero, 04 Exempt, 05 Capital, 06 Out of scope) with rate, GL accounts, VAT 201 box destination, capital-goods flag | `[x]` |
| 16 | V-01 | VAT 201: populate all boxes from tax-type postings (2 zero-rated, 3 exempt, 4 own use, 5 exports, 14 capital goods, 14A, 15A, 16 imports, 17 change in use, 18 bad debts, 19 other) | `[x]` |
| 17 | V-02 | Input excl: derive from actual postings per tax type, not `inputVAT / 0.15` | `[x]` |
| 18 | V-05 | Net payable: implement full SARS formula (Boxes 4+4A+11) − (Boxes 14+14A+15+15A+16+17+18+19) | `[x]` |
| 19 | V-06 | Post VAT clearing journal on period close: Dr 2100 VAT Output / Cr 1300 VAT Input / Cr 2110 VAT Control | `[x]` |

---

## Phase 4 — Pastel Parity

| # | ID | Task | Status |
|---|-----|------|--------|
| 20 | G-04 | Add `created_by` / `posted_by` columns to journal entries; attribute every post to the responsible user | `[x]` |
| 21 | G-05 | Monotonic journal number sequence: DB-generated per-source sequence (gap = visible red flag) | `[x]` |
| 22 | G-09 | Customer/supplier sub-ledger: AR (1100) and AP (2000) as control accounts; each payment/invoice must link to a contact | `[x]` |
| 23 | G-12 | Every bill payment and invoice payment must also write an `acct_bank_transactions` row for bank reconciliation | `[x]` |
| 24 | C-01 | COA main/sub-account split: commit to `parent_id` usage or add `(main_code, sub_code)` fields; add UI grouping | `[x]` |
| 25 | C-03 | Mark Debtors Control (1100) and Creditors Control (2000) as `is_control = true`; block direct journal posting to them | `[x]` |
| 26 | R-07 | Comparative columns: prior-period figures on Income Statement, Balance Sheet, Trial Balance | `[x]` |
| 27 | R-08 | KPI tiles on TB: replace hardcoded "+8%" with real period-over-period delta or remove | `[x]` |

---

## Phase 5 — Remaining Gaps (Medium / Low)

| # | ID | Task | Status |
|---|-----|------|--------|
| 28 | — | Payroll: post salary journal on payroll close (Dr 5100 Salaries / Cr 2200 PAYE / Cr 2210 UIF / Cr 2220 SDL / Cr 1010 Bank) | `[x]` |
| 29 | G-07 | Expand JE source enum: add Cash Book, Customer Journal, Supplier Journal, Inventory Journal, Take-On, Year-End, Payroll | `[x]` |
| 30 | G-08 | Unify balance tolerance: client (0.001) and RPC (0.01) differ; recommend 0.005 | `[x]` |
| 31 | G-11 | Multi-bank routing: replace hardcoded `1010` with selected Cash Book account | `[x]` |
| 32 | C-02 | Contra accounts: add `is_contra` boolean (or `contra_to_account_id`) to Allowance for Doubtful Debts and Accumulated Depreciation accounts | `[x]` |
| 33 | C-04 | COA numbering: decide — keep current textbook scheme or remap to Pastel SA defaults (1000 Sales, 2000 COS, …) | `[x]` |
| 34 | C-07 | VAT Control (2110): wire up period-end usage per Pastel convention | `[x]` |
| 35 | C-08 | Add Provisional Tax (asset), Income Tax Expense (P&L), SARS Refund (asset) accounts for IT14 workflow | `[x]` |
| 36 | V-04 | VAT rate: move from hardcoded `0.15` in `lib/utils.ts` to a table with `effective_from` / `effective_to` | `[~]` table + seeds only — app still reads `lib/utils.ts` |
| 37 | V-07 | Invoice vs payments basis: add per-company switch; apply to VAT 201 period logic | `[~]` deferred — complex scope |
| 38 | V-08 | Add `vat_date` to invoices: tax point = earliest of invoice date or payment date | `[~]` column + type only — no write path or VAT 201 tax-point logic |
| 39 | V-09 | Vendor VAT number validation on `createBill` / `approveBill` (required for input claims > R5,000) | `[x]` |
| 40 | V-10 | VAT-on-imports (SAD500 / customs VAT): add special transaction class | `[~]` deferred — complex scope |

---

## Progress Tracker

| Phase | Total | Done | In Progress |
|-------|-------|------|-------------|
| 1 — Audit Blockers | 5 | 5 | 0 |
| 2 — Financial Statements | 9 | 9 | 0 |
| 3 — VAT | 5 | 5 | 0 |
| 4 — Pastel Parity | 8 | 8 | 0 |
| 5 — Remaining | 13 | 9 | 4 |
| **Total** | **40** | **36** | **4** |
