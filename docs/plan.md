# Admin panel build plan

> The agreed plan for the operator portal, kept in the repo so the decisions
> and their reasons outlive any one working session. Update the status lines as
> phases land. The store-side API work lives in `../nav-pro-listing`.

## What the owner asked for (2026-09-22)

1. See, for every product, the **purchase (cost) price and the retail price
   (RRP) that were scraped**, the price we sell at, the **supplier** (e.g.
   Repco), the **title** and the **images**.
2. Edit price, images, title and description in a way a non-technical person
   can manage, and have every edit **show on the storefront** for that product.
3. A **dashboard**: sales per day and per month, total revenue to date, and
   profit margins worked out from purchase price against selling price.
4. Record **marketing spend**, so the dashboard separates profit before and
   after marketing.
5. Charts that are **interactive and work on every screen size**.
6. Every checkout on the storefront shows up in the panel, and an order can be
   **tracked** from the panel through to delivery.

## What the existing plan was missing

`docs/storefront-admin-integration.md` in the store repo documents the orders,
shipping and product-override API. Measured against the list above it is
missing, or gets wrong:

| Gap | Why it matters | Fixed in |
|---|---|---|
| Order lines do not record what the part **cost us** when it sold | Profit can only be computed from today's cost, which drifts from what was really paid. Every report of "margin" would be wrong for old orders | Phase 1 |
| No **RRP or cost** in the admin product list | Requirement 1 | Phase 1 |
| The product override **cannot change the description or image** | Requirement 2 | Phase 1 (description, image by URL), Phase 2 (upload) |
| The product PATCH **cannot undo an override** (`coalesce` keeps the old value) | A non-technical editor who sets a price has no way back to "use the normal price" | Phase 1 |
| Editing any field of a hidden, supplier-withdrawn part **publishes it** (`is_published` defaults to true when an override row is created) | A title fix on an "NLA" part would silently put it back on sale | Phase 1 |
| No **reporting** endpoint (sales by day/month, revenue, cost of goods, profit) | Requirement 3 | Phase 1 |
| No **marketing spend** data at all | Requirement 4 | Phase 1 |
| Customers are **not told** when an order ships; a guest cannot see tracking without signing in | Requirement 6 | Phase 1 |
| **No operator sign-in** exists; the panel must never ship `ADMIN_TOKEN` to a browser | Everything | Phase 1 |
| No record of **who changed what** | A wrong price needs to be traceable and reversible | Phase 1 (audit log), Phase 4 (per-person accounts) |
| Image uploads need storage, validation and versioned URLs | Requirement 2 | Phase 2 |

## Decisions made to get started

These were not specified. Each is the conventional default and easy to change;
flag any you disagree with.

| Decision | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 App Router, React 19, Tailwind 4, shadcn over `radix-ui` | Same stack as the storefront, so one set of skills and patterns |
| Hosting | Vercel, a second project next to the storefront | Same as the storefront |
| Talking to the API | Server-side only. Server components and server actions call `/api/admin/*` with `ADMIN_TOKEN`; the browser only ever talks to the panel | The token grants cost prices and every order; it must never reach a browser |
| Sign-in (phases 1–3) | Email on an allow-list (`ADMIN_EMAILS`) plus one shared password (`ADMIN_PASSWORD`), signed httpOnly session cookie, 12-hour expiry, attempts rate-limited | Works on day one with two env vars. The email is recorded against every change. Replaced by per-person accounts in Phase 4 |
| Charts | Recharts, through the shadcn chart pattern | Interactive tooltips and legend toggles, `ResponsiveContainer` for every width, no licence |
| Reporting day boundaries | `Australia/Sydney` (env `REPORT_TIMEZONE`) | An order at 9 am in Sydney is 11 pm the day before in UTC |
| Profit definition | See "How profit is calculated" | The one that can be computed from data we actually hold |
| Marketing | Dated spend entries with a channel (Google, Facebook, …), amount and whether it included GST | The owner asked to add marketing money and see profit with and without it. A monthly budget target can sit on top later |
| Look | Light theme, petrol navigation, orange action buttons with white text | Matches the storefront and the owner's stated preferences |

## How profit is calculated

All figures are in AUD and **exclude GST**, because GST collected is owed to the
ATO and GST paid on stock and advertising is claimed back.

- **Revenue** = order totals of orders that were paid and not refunded or
  cancelled (statuses `paid`, `packing`, `shipped`), less their GST. Shown
  separately as product sales and delivery charged.
- **Cost of goods** = for each line, quantity × the supplier cost **at the time
  of the sale** (snapshotted onto the order line from Phase 1). Orders placed
  before the snapshot existed are back-filled from the price history as it stood
  when the order was placed.
- **Gross profit** = revenue − cost of goods. **Gross margin** = gross profit ÷
  revenue.
- **Marketing** = spend entries in the period, ex GST.
- **Profit after marketing** = gross profit − marketing.

- **Net profit** (added in phase 5) = profit after marketing − what the
  carrier charged us (entered per order) − estimated card / PayPal fees (rates
  on the Settings page). Orders with no delivery cost entered are counted and
  shown, so the figure is never silently incomplete.

The product list separately shows, per part: cost, RRP, our price, and margin
against both our price and RRP.

## Phases

Each phase ends with the panel usable for what it covers, tests passing, and
the storefront unaffected.

### Phase 1 — foundations, orders, products, dashboard data

Store API (`../nav-pro-listing`):
- Migration `0001-admin-panel-foundations.sql`:
  - `sales_order_item.unit_cost_ex_gst` (admin only), written at checkout and
    back-filled for existing orders.
  - `product_override`: `description`, `image_url`; `is_published` becomes
    nullable, where null means "use the automatic rule".
  - `v_listing` uses the override description and image; `mv_listing` rebuilt.
  - `marketing_spend` and `admin_audit` tables.
- Product endpoints: list with cost, RRP, our price, margin, image, stock,
  supplier, filters (supplier, visible/hidden, with/without photo, edited) and
  sorting; product detail with supplier values next to overrides, price
  history and change history; PATCH where omitted = unchanged and `null` =
  back to the supplier value.
- `GET /api/admin/reports/sales` (day or month buckets, totals, all-time,
  best sellers) and `GET /api/admin/reports/overview` (orders waiting,
  revenue today and this month).
- Marketing spend CRUD.
- Shipped email to the customer with carrier and tracking link.
- Every write records the operator's email (`X-Admin-Actor`) in `admin_audit`.

Admin panel (this repo):
- Next.js app, sign-in, layout with navigation that collapses on phones.
- **Orders**: list with tabs (to pack, shipped, all paid, checkouts not paid),
  search, auto-refresh; detail with lines, supplier column, customer, address,
  payments, a status timeline and actions (start packing, mark shipped with
  carrier and tracking number, cancel, record refund, internal notes).
- **Products**: searchable list with cost / RRP / price / margin / supplier /
  photo; edit page with title, description, price (or "use normal price"),
  image by URL, show or hide on the storefront, and a live preview link.
- **Dashboard**: revenue, orders, gross profit, margin, marketing, profit after
  marketing; interactive charts by day or month with range presets.
- **Marketing**: add, edit and delete spend.
- **Delivery**: shipping zones and rates (needed before launch).

### Phase 2 — image uploads

- `POST /api/admin/products/:id/image`: validates type by content (JPEG, PNG,
  WebP), size limit, converts to WebP at storefront size, stores under a new
  versioned key in R2 (`car-parts-image`, prefix `uploads/`), sets the override.
  Local disk in development and tests.
- Drag-and-drop upload with preview; "revert to supplier photo".
- R2 credentials live on Railway only, never in the panel or storefront.

### Phase 3 — reporting depth

- Sales by category, brand and supplier; best and worst margin sellers.
- Monthly marketing budget target against actual spend; spend per channel.
- CSV export of orders and of the profit report (admin only, never public).
- Bulk edits: reprice or hide a filtered set of products; price rules screen.

### Phase 4 — operators and safety

- Per-person operator accounts (email sign-in code, reusing the store's OTP
  mail), roles (owner sees cost and profit; staff can pack and ship only).
- Change history screen with one-click revert for product edits.
- Optimistic locking on product edits (two people editing the same product).

### Phase 5 — operations

- Customers screen (orders per customer, guest vs account).
- Optional delivery cost per order and estimated payment fees in profit.
- Stock you hold yourself (the scraped stock is advisory only).
- New-order notification by email.

## Status

- 2026-09-22: phase 1 built, tested and deployed (API on Railway, panel on
  Vercel at https://nav-pro-adminpanel.vercel.app), migration 0001 applied.
- 2026-09-23: phases 2 to 5 built and tested (store branch `admin-phases-2-5`,
  panel branch `phases-2-5`), migration `0002-admin-panel-phases-3-5.sql`
  written. What they added:
  - **Phase 2, photos:** upload from the product page (drag and drop or choose,
    resized in the browser, checked and converted to WebP on the server, stored
    in R2 under a new address), "use the supplier's photo again".
  - **Phase 3, reporting:** sales by category, brand, supplier or product with
    margin, a monthly marketing budget against spend, CSV downloads of orders,
    profit and the breakdown, bulk hide/show/reprice of ticked products, and a
    pricing rules screen.
  - **Phase 4, operators:** a team account per person with an emailed sign-in
    code, owner and staff roles (staff see orders only, never cost or profit),
    a change history screen with one-click undo of product edits, and edit
    conflict protection when two people change the same product.
  - **Phase 5, operations:** a customers screen, what delivery cost you per
    order and estimated card/PayPal fees in a net profit figure, stock you hold
    yourself (taken off when an order ships), and a new-order email to the team.
- To go live: apply migration 0002, add the R2 and ADMIN_PANEL_URL settings on
  Railway, merge both branches, then add team members on the Team page.

### Left for later (not requested)

- A gallery of several photos per product (the storefront shows one).
- Showing our own stock on the storefront, and holding stock for unpaid carts.
- Public fitment overrides ("fits these vehicles") edited in the panel.
