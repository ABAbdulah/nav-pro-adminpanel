# nav-pro-adminpanel

The operator portal for the Parts Finder car-parts store. Read this before
touching the repo; the store's full map is `../nav-pro-listing/CLAUDE.md`.

## Status (2026-09-23)

Phases 1 to 5 of `docs/plan.md` are built. Phase 1 is live on Vercel
(https://nav-pro-adminpanel.vercel.app). Phases 2 to 5 are on branch
`phases-2-5`, with the API side on the store repo's `admin-phases-2-5`; they
need migration `0002-admin-panel-phases-3-5.sql` and the R2 settings on the
API before the photo upload works in production.

## Working rules

- Do not invent product decisions. If the ticket does not say it, ask on the board with 2–3 short options and a recommendation, then wait.
- If the plan is clear, do **not** wait for a thumbs-up. Post the plan on the board for visibility and code.
- Never `git push` to `main` or `master`. Never `git push origin HEAD` without checking the branch name.
- Commits are the user. Strip any `Co-authored-by` / Claude / Cursor / Copilot trailer. Do not add those trailers. Only commit when asked.
- Smoke tests go in a `smoke/` folder that is gitignored; always run them after a change and report the result.
- Any migration that is run is kept in `../nav-pro-listing/db/migrations/` (the schema belongs to the store repo, not this one).
- Never connect this panel's browser code to the database or ship `ADMIN_TOKEN` to the browser. All data goes through the store API from a server-side layer.

## How it fits

```
browser --pf_admin cookie--> panel server (this repo) --Bearer ADMIN_TOKEN + X-Admin-Actor--> store API /api/admin/* --> Postgres
storefront (web/)        --sid cookie -> bearer session-------------------------------------> store API /api/*        --> Postgres
```

- The API is `../nav-pro-listing/api` (Express), deployed on Railway at
  https://nav-pro-listing-production.up.railway.app. Local dev: `npm run api`
  in the store repo, port 4000 (it reads `api/.env`, which has pointed at
  production before: check the host).
- `ADMIN_TOKEN` is a single shared secret, set on Railway and here. Only
  `lib/api.ts` reads it, from the server. `X-Admin-Actor` carries the signed-in
  email so the API's `admin_audit` records who changed what.
- Admin routes are the **only** place cost and margin are exposed. They must
  never be copied into a public page, export, or log.
- Products are sold white label: the customer sees the storefront `title` and
  `brand`; the `supplier*` fields say what to order from the supplier.
- The route table for `/api/admin/*` is in `../nav-pro-listing/CLAUDE.md`
  ("Admin panel"); response types are mirrored in `lib/types.ts`.

## Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server on :3010 | `npm run dev` (needs `.env.local` from `.env.example`) |
| Typecheck | `npm run typecheck` |
| Build without disturbing a dev server | `$env:NEXT_DIST_DIR='.next-verify'; npm run build` |
| Smoke tests | `node smoke/run.mjs` (`--quick` = typecheck and build only). Needs `TEST_DATABASE_URL` in `smoke/.env` and a built store API (`npm --prefix ../nav-pro-listing/api run build`). `SHOTS=1` saves screenshots to `smoke/shots/` |

The smoke checks start the store API on :4078 and this panel on :3108 against
the test database, then drive the panel in Chromium at 1280px and 390px: sign
in, dashboard chart, packing and shipping an order (and its email), editing
and clearing a product, marketing spend, delivery page, phone menu, a forged
cookie, headers and sign-out. They clean up what they write.

## Environment (`.env.example`)

`ADMIN_API_URL`, `ADMIN_TOKEN`, `ADMIN_EMAILS` (comma list), `ADMIN_PASSWORD`,
`SESSION_SECRET` (32+ characters; the panel refuses to sign anyone in
without it), `STOREFRONT_URL` (optional).

## Map

| Path | What |
|---|---|
| `proxy.ts` | Optimistic redirect to `/sign-in` when there is no cookie. Not the security check |
| `lib/session.ts` | Signed cookie `pf_admin` (HMAC with `SESSION_SECRET`, 12 h) with email, role and how they signed in; team accounts re-checked with the API about once a minute; `requireOperator()` for every page and action, `requireOwner()` for owner-only ones |
| `lib/api.ts` | `adminApi()`: the only fetch to the store API; `ApiError` |
| `lib/types.ts` | API response shapes, `ActionState` for forms |
| `lib/format.ts` | Money, dates in Australia/Sydney, status labels |
| `app/sign-in/*` | Emailed-code sign-in for team accounts (default) and the shared owner password for `ADMIN_EMAILS`; per-instance failed-attempt limit |
| `app/(panel)/layout.tsx` | Verifies the session, renders `components/Nav.tsx` (sidebar on desktop, menu on phones, "to send" badge) |
| `app/(panel)/page.tsx` | Dashboard: queue and today/month cards, payment alerts, period controls (URL-driven), KPI tiles, `components/dashboard/SalesChart.tsx` (Recharts, series toggles, table view), best sellers, since-opening totals |
| `app/(panel)/orders/*` | List with tabs (to send, shipped, all paid, not paid, refunded, cancelled), search, `AutoRefresh` every 60 s; detail with timeline, lines with supplier/SKU/cost/profit, payments, history; `components/orders/OrderActions.tsx` (pack, ship + email, tracking, notes, cancel, refund) |
| `app/(panel)/products/*` | List with filters, cost/RRP/price/margin; edit page with `components/products/ProductEditor.tsx` (title, description, own price with live margin, photo by link, show/hide, notes) |
| `app/(panel)/marketing/*` | Add, edit, delete spend; totals by month and channel |
| `app/(panel)/shipping/*` | Delivery areas (zones) and options (rates) |
| `app/(panel)/reports/*`, `app/export/[kind]/route.ts`, `lib/csv.ts` | Sales by category, brand, supplier or product; CSV downloads (orders, profit, breakdown), formula-safe |
| `app/(panel)/customers/*` | Customers grouped by email, and each one's orders |
| `app/(panel)/pricing/*` | Markup rules for parts with no RRP |
| `app/(panel)/team/*` | Team accounts and roles |
| `app/(panel)/history/*` | Change history with undo of product edits |
| `app/(panel)/settings/*` | Card/PayPal fee estimates, new-order email recipients |
| `components/products/BulkBar.tsx`, `StockForm.tsx` | Bulk changes on ticked products (checkboxes join the form by its id); our own stock |
| `lib/range.ts` | Report date ranges from the URL, shared by the dashboard and Reports |
| `components/page.tsx`, `forms.tsx`, `History.tsx`, `ErrorPanel.tsx` | Shared pieces. `ErrorPanel` imports the server-only API module, so it stays out of client components |
| `components/ui/*` | shadcn primitives copied from the storefront. Do not edit or deslop |

## Traps

- A client component must not import anything that imports `lib/api.ts` or `lib/session.ts` (both `server-only`), except server actions, which Next turns into references.
- React resets a form after its action finishes. Tests that submit twice must wait for the first result or reload the page, or the reset wipes what they typed.
- A form that disappears after its action (the order moves on) loses its message. Order status changes share one message area at the top of the card for that reason.
- `loading.tsx` streams first, so a test that reads `main` right after `goto` sees the skeleton. Wait for `main h1`.
- Staff get order data without cost fields from the API (`X-Admin-Role: staff`). Anything a client component receives is visible in the browser, so owner-only figures must never be fetched for a staff session rather than just hidden.
- An upload saves the product. The editor tracks the product's version (`ifUnchangedSince`) and moves it on after an upload, or the next save looks like a conflicting edit.
- Vercel limits a request to 4.5 MB, so photos are shrunk in the browser (`shrink()` in ProductEditor) before the server action sends them on.
- In smoke runs the panel serves as production, so its cookie is `secure`: Playwright's own HTTP client will not send it over http. Fetch from inside the page instead.

## Design

Light theme only, matching the storefront: petrol `#0e3a47` for navigation,
orange `#d04510` with white text for actions, Barlow and Barlow Condensed.
Tables become cards on phones; every screen is checked at 390px.
