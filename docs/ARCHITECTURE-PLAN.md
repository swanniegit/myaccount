# Architecture refactor — plan & task log

Completed May 2026. Tracks the structure review follow-up.

## Phase 1 — GL single path (done)

- [x] `lib/ledger.ts` — `recordJournalEntry(supabase, input)`, `assertJournalBalanced`, client helper
- [x] RPC `acct_post_journal_entry` + `acct_entry_is_balanced` — `supabase/migrations/005_journal_post_rpc.sql`
- [x] Inline fallback when RPC not yet deployed
- [x] Refactor: `approve-bill`, `pay-bill`, `create-invoice-journal`, `record-payment-journal`, `banking/allocate`

## Phase 2 — Modular API (done)

- [x] `lib/banking/allocate.ts`
- [x] `lib/livehis-push/record-payment-journal.ts`
- [x] Thin `app/api/banking/allocate` and `app/api/push/payment`

## Phase 3 — Journal UI LEGO blocks (done)

- [x] `hooks/useJournalPage.ts`
- [x] `components/journal/*` (PendingTray, TAccountBoard, ManualEntryForm, PostedEntriesTable)
- [x] Slim `app/journal/page.tsx`

## Phase 4 — Repo hygiene (done)

- [x] `.cursor/rules/myaccount-architecture.mdc`
- [x] `examples/ledger-demo/` (was `src/`)
- [x] `round2` in `lib/utils.ts`

## Phase 5 — Your follow-ups (optional)

- [ ] Apply migration `005` on Supabase: `supabase db push` or run SQL in dashboard
- [ ] Split `app/setup/company/page.tsx` (~330 lines) like journal
- [ ] Split `app/sales/new/page.tsx` (~307 lines)
- [ ] Generate Supabase types: `supabase gen types typescript`
- [ ] Move more read-heavy pages behind API routes if RLS is added later

## Deploy note

After pulling, run migration **005** so GL posts use the atomic RPC. Until then, the app falls back to multi-step inserts with rollback.
