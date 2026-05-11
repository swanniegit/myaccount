# Handoff: myAccount — South African Accounting System

> A web-based double-entry accounting system for South African small business owners. Spreadsheet-dense desktop UX, T-accounts as a primary lens, modern tables and drag-to-post journal entry, with SARS / VAT 201 / PAYE / UIF / IFRS-for-SMEs compliance baked into the data model.

---

## About this bundle

The HTML and JSX files in this folder are **design references**, not production code. They were generated as prototypes to communicate intent — layout, density, copy, interaction patterns, the visual relationship between T-accounts and the rest of the UI. They use React + Babel via inline `<script type="text/babel">` tags and run directly in a browser; they are **not** structured for production deployment.

Your task is to **re-implement these designs in the project's existing tech stack** — or, if there is no codebase yet, to choose the most appropriate stack (e.g. Next.js + Postgres + Prisma, or Rails, or Django) and build there. Pull the visual decisions, copy, layout structure, and behavior from these references; do not lift the JSX directly.

## Fidelity

This bundle is a **mix**:

- **V1 (`Accounting Wireframes.html` + `screens/`)** — **Low-fidelity wireframes**, sketchy hand-drawn aesthetic (Caveat / Patrick Hand fonts, dashed borders, squiggle dividers). Use as a guide for **information architecture, screen inventory, and rough layout only**. Apply the codebase's actual design system for typography, color, and components.
- **V2 (`V2 Modern Cards.html` + `v2/`)** — **Medium-fidelity mockups**, cleaner card-based layout but still using sketchy fonts for headings. Use as a guide for **layout, density, and interaction patterns**. Re-skin with the production design system.

There is **no final hi-fi visual design** yet. Production typography, color palette, and component library should be established by the team. Use the wireframes for layout/IA decisions and brand for visuals.

---

## Target audience & context

- **Users**: South African small business owners (non-accountants) — sole proprietors, Pty Ltd, CC. Not professional bookkeepers.
- **Platform**: **Desktop web app**, dense / spreadsheet-like. Tablet responsive is nice-to-have. Mobile is out of scope for v1 (except possibly receipt-capture).
- **Mental model**: T-accounts are the primary view but **users should never be forced to understand double-entry**. The system posts both sides automatically; T-accounts are visible for those who want to learn or audit.

---

## Tech & compliance requirements (South Africa)

These are non-negotiable for the SA market — they shape the data model.

| Requirement | Detail |
|---|---|
| **VAT** | Standard rate 15%, zero-rated and exempt categories. VAT 201 return generated bi-monthly (Category A / B / C) for SARS eFiling. |
| **PAYE / UIF / SDL** | Monthly EMP201 submission. UIF 1% employee + 1% employer (capped). SDL 1% on payroll if total payroll > R500k/year. |
| **Tax invoices** | Must include VAT registration no., "Tax Invoice" wording, sequential invoice number, full supplier + buyer details, VAT amount shown separately. (SARS rules.) |
| **Chart of accounts** | Provide an SA-standard 47-account COA as default (1000-series Assets, 2000-series Liabilities, 3000-series Equity, 4000-series Income, 5000-series Cost of Sales, 6000-series Expenses). Editable. |
| **Reporting** | IFRS for SMEs format (not full IFRS). Income Statement, Balance Sheet, Cash Flow, Statement of Changes in Equity. |
| **Currency** | ZAR primary; allow foreign currency invoicing with exchange-rate handling for export businesses. |
| **Bank feeds** | FNB, Absa, Nedbank, Standard Bank, Capitec, Tyme. Via Stitch (or similar aggregator) — read-only OAuth, no stored credentials. |
| **SARS integration** | VAT 201 and EMP201 should be exportable as the official SARS XML or in a format ready for eFiling upload. |
| **Year-end** | Configurable (typically Feb/Mar in SA but companies can choose). |
| **Audit trail** | Every posting, edit, and deletion must be logged with timestamp + user. Closed periods cannot be edited (only adjusted via journal). |

---

## Screen inventory (V2 — primary reference)

V2 has **12 production screens + 6 flow walkthrough screens**. The flow walkthrough screens are subsets of the production screens shown in narrative order.

### Daily (high-frequency screens)

1. **Dashboard** — KPI cards (cash on hand, AR outstanding, AP outstanding, VAT due, profit MTD), bank feed mini-list, recent activity, "what's due" widget.
2. **Journal entry (drag-to-post)** ⭐ — Novel interaction. Left column is a list of "uncategorized transactions" (chips with description + amount). Right column shows T-accounts. User drags a chip into a T-account; system auto-creates the balancing entry on the other side and posts. Show running balance update.
3. **T-Account ledger** — Pick an account from a dropdown/search; see its T-account with debits left, credits right, running balance below. Click any line to drill into the source document.

### Sales (AR)

4. **Invoices list** — Table: number, date, customer, amount, status (Draft / Sent / Viewed / Paid / Overdue), with bulk actions. Filter by status, customer, date range.
5. **Invoice create / edit** — Standard SA tax invoice. Customer picker (with VAT no.), line items (description, qty, unit excl. VAT, VAT rate dropdown [15% / 0% / Exempt], line total), totals panel (subtotal, VAT, total), notes, payment terms. Save as draft / send / preview.
6. **Customers + AR aging** — Customer list with current / 30 / 60 / 90 / 120+ aging buckets. Click customer to see ledger, statements, contact info.
7. **Quotes** *(flow walkthrough only — promote to full screen)* — Same shape as invoice but with "valid until" date and "Convert to invoice" CTA. **Quotes do NOT post to GL** — only the converted invoice does.

### Purchases (AP)

8. **Bills with OCR** — Drop a supplier invoice PDF/photo; OCR extracts supplier, date, amount, VAT. User confirms account allocation. Posts to GL.

### Banking

9. **Bank reconciliation** — Two-column match view. Left: bank statement lines from feed. Right: unmatched book transactions. Drag-to-match or click to suggest. Highlight mismatches.

### Tax

10. **VAT 201 wizard** — Multi-step: select period → review output VAT (sales) → review input VAT (purchases) → adjustments → preview return → submit to eFiling (or export XML). Shows reconciliation between VAT control account and the calculated return — flag mismatches.
11. **Trial balance** — Standard TB at any date. Click any account to drill to ledger.
12. **Reports hub** — Cards for: Income Statement, Balance Sheet, Cash Flow, Statement of Changes in Equity, AR Aging, AP Aging, VAT report, PAYE report. Each generates a printable / exportable view.

### Setup

13. **Chart of accounts** — Tree/table view. Edit account names, codes, types. Defaults provided.
14. **Company settings** — Tabs: Business details, Tax (VAT no., PAYE ref, eFiling user), Bank accounts (linked feeds), Users & roles, Year-end & periods, Branding (for invoices).

### First-run

15. **Onboarding** — 5-step wizard: Business details → Tax setup → Connect bank → Chart of accounts (default vs upload) → First entry (opening balances).

---

## The drag-to-post journal — primary novel interaction

This is the **hero interaction** of the product. Worth its own implementation spec.

**Layout** (left ⇆ right):
- **Left panel (~30% width)**: "Inbox" of uncategorized items — bank feed lines, OCR'd bills, captured receipts. Each renders as a draggable chip with date, description, amount, source icon (bank / receipt / manual).
- **Center panel (~50% width)**: 2–4 T-account cards arranged in a grid. User can pin frequently-used accounts here. Each T shows: account name + code header, debit column, credit column, running balance footer. Drop zones light up on dragover.
- **Right panel (~20% width)**: "Posting preview" — shows the journal entry that *will* be created when the user drops, with the auto-suggested contra account. User can override the contra before confirming.

**Behavior**:
1. User picks up a chip (e.g. "FNB 28/03 — Engen R450 fuel"). 
2. The system suggests the most likely expense account ("6200 Travel") based on description matching and prior categorizations.
3. As the chip hovers an account T, that T pulses; the preview panel shows the proposed entry (Dr 6200 Travel R391.30, Dr 8100 VAT input R58.70, Cr 1000 FNB R450).
4. On drop, entry posts and the chip vanishes from inbox with a brief animation; T-account balances update with a count-up animation.
5. Undo available for ~10 seconds via toast.
6. If user drops on the wrong account, they can drag the resulting ledger line back to inbox to reverse.

**State**:
- `inbox: UncategorizedTxn[]`
- `pinnedAccounts: AccountId[]` (user preference, persisted)
- `suggestions: Map<TxnId, { accountId, confidence, reason }>` — from a categorization heuristic (start with rule-based: keyword → account; upgrade to ML later)
- `draggingTxn: TxnId | null`
- `pendingPost: { txn, debit, credit } | null`

**Accessibility fallback**: Every drag-to-post must also be doable via keyboard. Right-arrow on a chip opens a target picker; user types account code or name; Enter posts.

---

## Visual language (V2)

V2 uses a card-based modern layout. Replace the sketchy fonts (Caveat, Patrick Hand) with the production type system. Keep:

- **Density**: spreadsheet-like, 11–13px monospace for numbers, 13–14px for labels. Designed for power users.
- **Sidebar nav**: persistent left rail, ~140px wide, dark text on paper, accent color on active item.
- **Color**: warm paper background (#F6F0E4-ish), ink (#1A1A1A), accent (configurable — defaults to terracotta `#D97757` but exposed as a Tweak). Soft accent for highlights. **All "money" colors should be configurable** — green/red for positive/negative is convention but the team may prefer ink-only with sign.
- **Numbers**: always JetBrains Mono or another monospace, right-aligned, 2 decimal places, comma thousand separators, "R" prefix for ZAR.
- **T-accounts**: rendered as a box with a horizontal rule under the header and a vertical rule down the middle. Debits left, credits right. Running balance below the box.

### Design tokens (starting point — refine in production)

```
// Spacing scale
4, 6, 8, 10, 12, 14, 18, 24, 32, 48 (px)

// Type scale (production — replace sketchy)
12 / 13 / 14 / 16 / 18 / 22 / 28 / 36 (px)

// Border radius
3 / 4 / 6 / 8 (px) — kept tight, this is a serious tool

// Colors (V2 prototype values — refine)
paper:      #F6F0E4
paperEdge:  #EAE3D2
ink:        #1A1A1A
ink2:       #5A554A
muted:      #B8B0A0
accent:     #D97757  (configurable)
accentSoft: rgba(217,119,87,0.12)
positive:   #1F8A5B  (optional — team may prefer ink + sign)
negative:   #C0392B  (optional)
```

---

## State management (recommended)

This is a multi-entity transactional app. Suggested approach:

- **Server-side**: Postgres with a normalized double-entry ledger schema (`accounts`, `journal_entries`, `journal_lines` — every entry has ≥2 lines, sum to zero). Constraint at DB level. Audit log table.
- **Client-side**: TanStack Query (React Query) for server state. Zustand or Redux Toolkit for UI state (drag-in-progress, panel layout, etc.). 
- **Auth**: SSO + 2FA. SARS integration requires careful secret management — use a vault.
- **Realtime**: Optimistic updates on post; reconcile against server. Bank feed sync is background job (queue + webhook).

---

## Data model essentials

```
Account { id, code (4-digit), name, type (asset|liability|equity|income|expense), vatable, is_control, parent_id }
JournalEntry { id, date, source (manual|invoice|bill|bank_match|opening), reference, narration, posted_at, posted_by, period_id }
JournalLine { id, entry_id, account_id, debit, credit, vat_code, currency, fx_rate }
  CONSTRAINT: sum(debit) == sum(credit) per entry
Invoice { id, number, customer_id, date, due_date, status, total_excl, vat, total_incl, journal_entry_id }
InvoiceLine { id, invoice_id, description, qty, unit_excl, vat_code, account_id }
Bill { ... mirrors Invoice }
BankAccount { id, account_id (FK to chart account), provider, last_synced_at }
BankTransaction { id, bank_account_id, date, description, amount, balance, matched_journal_line_id }
Customer { id, name, vat_number, ... }
Supplier { id, name, vat_number, ... }
Period { id, start_date, end_date, status (open|closed) }
VATReturn { id, period_start, period_end, output_vat, input_vat, net, status, submitted_at }
```

---

## Out of scope for v1 (good to flag)

- Payroll module (payslips, EMP201 generation) — can be a v1.1 add-on. Show a placeholder in nav.
- Inventory / stock control — many SA SMEs need it; ask the team.
- Multi-entity / consolidation — most SMEs are single-entity.
- Mobile app — possibly a companion receipt-capture app later.
- Project costing — not requested.

---

## Files in this bundle

```
design_handoff_myaccount/
├── README.md                    ← you are here
├── V2 Modern Cards.html         ← primary reference, open this
├── Accounting Wireframes.html   ← V1 lo-fi wireframes (IA/screens reference)
├── v2/                          ← V2 React source
│   ├── app.jsx                  ← main app shell + section nav + flow walkthrough
│   ├── daily.jsx                ← Dashboard, Journal (drag-to-post), T-Ledger
│   ├── sales.jsx                ← Invoices list, Invoice create, Customers+AR
│   ├── banktax.jsx              ← Bills+OCR, Reconciliation, VAT 201, Trial Balance, Reports
│   ├── setup.jsx                ← Chart of accounts, Company settings
│   └── extras.jsx               ← Quote, Record payment, Onboarding (flow walkthrough)
├── screens/                     ← V1 wireframe screens
│   ├── dashboard.jsx
│   ├── ledger.jsx
│   ├── journal.jsx
│   ├── trial-balance.jsx
│   ├── chart.jsx
│   └── sketch.jsx               ← shared lo-fi primitives
├── app.jsx                      ← V1 app entry
├── design-canvas.jsx            ← presentation chrome (not part of the product)
└── tweaks-panel.jsx             ← presentation chrome (not part of the product)
```

**To view the designs:** open `V2 Modern Cards.html` in a browser. The flow walkthrough (Onboard → Quote → Invoice → Payment → Reconcile → VAT 201) is at the top.

---

## Open questions for the product team

These came up during design and should be resolved before build:

1. **Bank feed provider** — Stitch is most common in SA; confirm before contracting.
2. **SARS eFiling integration depth** — full API integration (requires SARS approval) or export-and-upload? Export-first is faster to v1.
3. **Multi-currency** — needed for v1? Affects journal line schema.
4. **Categorization engine** — start rule-based or invest in ML from day 1? Rule-based is recommended (90% of value, 10% of cost).
5. **Pricing & tier structure** — affects feature gating across screens.
6. **Accountant collaboration** — will external accountants/auditors have logins? They will want one.
7. **Receipt capture mobile** — separate app or PWA?
