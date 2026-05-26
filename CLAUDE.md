# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**myAccount** — South African small-business accounting (double-entry GL, VAT 201 / SARS, ZAR). Next.js 14 App Router, React 18, TypeScript (strict), Tailwind, Supabase (Postgres). Deploys as a `standalone` build via Coolify.

## Commands

```bash
npm run dev        # local dev server
npm run build      # production build (standalone output)
npm run lint       # next lint / eslint (NOTE: not yet configured — prompts interactively)
npm test           # vitest run — unit tests in tests/
npm run test:watch # vitest watch mode
```

Unit tests use **Vitest** (`tests/**/*.test.ts`), covering pure logic in `lib/` (utils, ledger balance, dashboard launcher config). `vitest.config.ts` maps the `@/` alias and injects dummy Supabase env vars so importing `lib/ledger` (which constructs a client at import time) doesn't throw. Playwright is also installed but no e2e runner is wired up.

Path alias: `@/*` → repo root (e.g. `@/lib/ledger`, `@/components/ui/Button`).

## The five architecture rules (enforced)

From `.cursor/rules/myaccount-architecture.mdc` — these govern every change:

1. **LEGO blocks** — one concern per file; ≤ ~3 exported functions in calc modules; pages stay thin.
2. **Modular** — flow is always UI → API/service → DB. No business logic in routes/pages.
3. **DRY** — reuse `recordJournalEntry`, `getAccountBalance`/`normalBalance` (`lib/ledger.ts`), and helpers in `lib/utils.ts` (`round2`, `formatMoney`, `calcVAT`, `cn`).
4. **Database integrity** — all GL writes are balanced and atomic (see below).
5. **Type safety** — use `lib/types.ts`; type journal lines as `JournalLineInput[]`, never `object[]`.

## General ledger — the core invariant

**All GL writes go through `recordJournalEntry` in `lib/ledger.ts`.** Never `insert` into `acct_journal_entries` / `acct_journal_lines` directly from `app/` (pages or routes).

- Server / API routes: `recordJournalEntry(supabase, input)` — pass a client from `createServerClient()`.
- Client components: `recordJournalEntryClient(input)` — uses the browser client.
- Posting calls the Postgres RPC `acct_post_journal_entry` (atomic, balance-checked). If the RPC is missing it falls back to inline insert+rollback.
- Entries **must balance** (debits = credits; tolerance 0.005 client-side, 0.01 in the RPC).
- `recordJournalEntry` calls `assertPeriodOpen` first — posting to a **closed period** throws. Periods default to closed (see migrations); open them in Settings → Periods.
- Posted entries/lines are protected by DB triggers — they cannot be edited/deleted once posted.
- Reports and enquiries must read **`is_posted = true` only**.

`EntrySource` (manual, invoice, bill, payment, cash_book, payroll, vat_clearing, year_end, take_on, bank_import) tags every entry by origin — set it correctly.

## Supabase clients — pick the right one

Three distinct clients exist; mixing them up causes auth/RLS bugs:

| Client | File | Key | Use in |
|--------|------|-----|--------|
| `supabase` | `lib/supabase.ts` | anon | client components (browser) |
| `createServerClient()` | `lib/supabase-server.ts` | **service role** (bypasses RLS) | API routes / server only — validate inputs first |
| `createAuthClient()` | `lib/supabase-auth.ts` | anon (SSR) | auth flows |

Account lookups are by `code` (e.g. VAT control = `'2100'`). Postgres queries that can exceed 1000 rows must paginate with `.range()`, and `.in()` lookups should be batched (~500) — see `app/api/kpi/route.ts` for the pattern.

## Auth model (not Supabase Auth)

This app does **not** use Supabase JWT auth. `middleware.ts` enforces an HMAC session cookie on all browser routes:

- Session cookie = `nonce.hmac(SESSION_SECRET + SITE_PASSWORD, nonce)`. Single shared `SITE_PASSWORD` login. Rotating `SITE_PASSWORD` immediately revokes every session.
- `/api/push/*` (machine-to-machine, e.g. liveHis integration) bypasses the session and authenticates separately.
- `/api/auth/*` and `/auth/*` are open (login).

## API route conventions

- Put `export const dynamic = 'force-dynamic'` on routes that read live data.
- Keep handlers thin (~30 lines): validate input → call `lib/<domain>/` → return `NextResponse.json`. Domain logic lives in `lib/banking/`, `lib/purchases/`, `lib/payroll/`, `lib/vat/`, `lib/livehis-push/`, `lib/year-end/`.

## Migrations

Migrations live in `supabase/migrations/` against the linked project (`supabase/.temp/linked-project.json`). **Numbering is mixed**: early files are `00X_*.sql`, later ones are timestamped (`2026...`) because the remote already had a divergent `005`. **Use timestamped filenames for new migrations** — do not continue the `00X` sequence. Apply migrations after any schema change.

## Styling / design system

- Design tokens are CSS variables in `app/globals.css` `:root` (`--paper`, `--ink`, `--ink-2`, `--accent`, `--positive`, `--negative`, `--surface`, …). Tailwind maps them to utilities: `text-ink-2`, `bg-paper-edge`, `text-accent`, plus `font-mono` (JetBrains Mono) and `text-2xs` (11px).
- Reusable component classes are defined in `@layer components` in `globals.css`: `.btn`/`.btn-{primary,secondary,ghost,danger}`, `.card`/`.card-accent`, `.kpi*`, `.field`/`.field-label`, table `.t-head`/`.t-row`/`.t-cell`, `.pill`, `.badge-{status}`, `.sheet-*`, `.nav-link`, `.search-box`. **Prefer these over ad-hoc styles.**
- Money displays use the `.num` class (tabular monospace) and `formatMoney()` (ZAR, `en-ZA`). Merge class names with `cn()` from `lib/utils.ts`.

## Out of scope / non-production trees

`examples/` (excluded in tsconfig + build) and `myAccount/` (design handoff). Don't copy design-handoff JSX into production code.
