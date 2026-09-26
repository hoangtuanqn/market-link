# Per-pickup-date product inventory — design

Date: 26/09/2026 · Status: approved in chat, spec not yet reviewed by user

> Not in `.ai/REQUIREMENTS.md` under this name — extends FR-063 (weekly stock template) and FR-031
> (pre-order deducts stock, D-02). No FR-xxx assigned; flag for LEAD in the migration comment and PR
> body per the established R-02 gap pattern (same treatment as market closures and shelf-life).

## Problem

`products.stock_quantity` is one mutable number shared by every future pickup date. Customers can
place pre-orders far ahead (`FarmerProfile.orderCutoffHours` goes up to 72h, `SlotService.MAX_RANGE_DAYS
= 60`), and `D-02` deducts from that single pool the instant an order is placed, regardless of which
`pickupDate` the customer chose. Consequence, concretely:

- An order placed today for pickup in 10 days depletes the *same* pool an order for pickup tomorrow
  draws from — a customer can be wrongly rejected for tomorrow because someone else already claimed
  the number against a date far in the future, or wrongly accepted because the pool still shows stock
  a Farmer never promised for that particular day.
- FR-063 (`weekly_stock_templates`, already shipped this session) could only ever be a shortcut for
  refilling that one shared pool — its `dayOfWeek` was not actually scoping anything.

Verified against the original SRS (`docs/MarketLink End-to-End Web Solutions_SRS.pdf`, p.9): "place a
pre-order against the Farmer's available stock" plus "Farmers can view incoming pre-orders, accept or
decline them" — deduction-at-placement with Farmer review *afterward* is the documented flow (matches
D-02); there is no requirement to hold deduction until Farmer approval. That part of D-02 is not
being revisited by this change — only *what* gets locked/decremented changes (per date instead of
one global pool).

## Decisions made in chat (do not re-litigate)

1. **No manual "Apply" step.** Per-date availability is derived automatically from
   `weekly_stock_templates` the first time it is needed (browsing or ordering) — never a Farmer-clicked
   action. Removes the whole "Farmer forgot to refill" failure mode this design exists to fix.
2. **A product with zero templates is never orderable, on any date.** No silent fallback to
   `products.stock_quantity`. Farmer must set up at least one weekday in Weekly stock template before
   the product can be pre-ordered at all.
3. **Browse/search shows the nearest upcoming orderable date's quantity** on the product card (e.g.
   "Available Fri · 40 bunch"), not a single date-less number. Full per-day detail lives on the product
   detail page once a date is picked.

## Data model — additive only

One new table. Nothing on `products` or `weekly_stock_templates` changes shape.

```sql
CREATE TABLE product_daily_stock (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id         BIGINT UNSIGNED NOT NULL,
    stock_date         DATE NOT NULL,
    quantity_available INT NOT NULL,
    unit_price         DECIMAL(10,2) NOT NULL,
    UNIQUE KEY uq_product_daily_stock (product_id, stock_date),
    CONSTRAINT fk_pds_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CHECK (quantity_available >= 0)
);
```

`products.price` / `products.stock_quantity` stay on the entity (FR-062's create/edit form still
requires them) but become **reference-only** for ordering — order placement and preview no longer read
them. The one place `products.price` still feeds into the new flow is as the materialization fallback:
when a template row's `default_price` is null, the daily-stock row is seeded with `products.price`
(same null-semantics `weekly_stock_templates` already has today).

## Materialize-on-demand

Given `(productId, date)`, ensure a row exists before it is read or locked:

```sql
INSERT INTO product_daily_stock (product_id, stock_date, quantity_available, unit_price)
SELECT :productId, :date, t.default_quantity, COALESCE(t.default_price, p.price)
FROM weekly_stock_templates t JOIN products p ON p.id = t.product_id
WHERE t.product_id = :productId AND t.day_of_week = :dayOfWeek AND t.is_active = TRUE
ON DUPLICATE KEY UPDATE id = id  -- no-op if the row already exists
```

`:dayOfWeek` is computed in application code from `:date` before the query runs — same
`date.getDayOfWeek().getValue() % 7` conversion already used by `SlotService` and
`StockTemplateService`, not something SQL derives itself.

No matching active template → the `INSERT ... SELECT` inserts zero rows → the (product, date) pair
stays absent → treated as 0 available downstream. The `UNIQUE(product_id, stock_date)` key makes two
concurrent callers racing to create the same row safe (one wins, the other is a no-op), matching the
existing `uq_weekly_stock_template` / `uq_market_closure_day` pattern already used in this codebase.

## Order placement (`OrderService`)

Reuses the exact locking architecture already in `OrderService.place()` (documented there as C5-2:
lock everything the whole request needs, in ascending `id` order, in one pass, before any decrement) —
only the locked table changes.

- `lockProducts(groups)` → replaced by a step that, for every `(productId, group.pickupDate())` pair
  needed across the whole request, runs the materialize-on-demand upsert above, then locks the
  resulting `product_daily_stock` rows via the same `SELECT ... FOR UPDATE ... WHERE id IN (:ids) ORDER
  BY id` shape as today's `ProductRepository.lockAllById` (new equivalent method on a
  `ProductDailyStockRepository`).
- `problemOf`/`sellable` checks in `placeGroup` move from `Product.stockQuantity`/`status` to the
  locked `product_daily_stock` row's `quantity_available`. Missing row (no template for that weekday)
  → `OutOfStockException` (reused, no new exception type).
- Decrement: `row.quantityAvailable -= qty` on the locked `product_daily_stock` row instead of
  `Product.stockQuantity`. No more auto-flipping `Product.status` to `SOLD_OUT` — "sold out" is now a
  property of one date, not the product.
- `OrderItem.snapshot()` takes its `unitPrice` from the locked `product_daily_stock` row instead of
  `product.getPrice()`, so the customer is charged the price that was actually promised for that date.

`preview()` has no `pickupDate` in its request shape today and is not gaining one — it stays advisory
only. `PreviewItemResource.stockQuantity` (currently `p.getStockQuantity()`) is repointed to the same
nearest-available-date lookup described below under "Browse / search", so the cart summary and the
product listing report the same number through one shared helper. The one and only place that actually
locks and gates an order is `place()`, which already carries `pickupDate` per group. No change to the
`/orders/preview` or `/orders` request contracts.

## Browse / search — nearest available date

New query (raw SQL via `NamedParameterJdbcTemplate`, R-04) added to `ProductQueryRepository`: for each
product, walk forward from today over its active `weekly_stock_templates` rows, find the closest date
whose weekday matches an active template, and report `quantity_available` from `product_daily_stock`
if a row already exists for that exact date, else the template's `default_quantity` (nothing has
touched it yet). No matching date within a bounded lookahead (14 days) → product shows as not
currently orderable. This does **not** write to `product_daily_stock` — browsing stays read-only;
only `place()` (and the manual override endpoint below) materialize rows.

## Farmer per-date override

New endpoint `PATCH /api/v1/farmer/products/{id}/daily-stock/{date}` — runs the same
materialize-on-demand step, then overwrites `quantity_available`/`unit_price` with the Farmer's input
for that one date, independent of the recurring template. This is what "chỉnh riêng một ngày mà không
đụng lịch chung" needs, and maps to FR-063's own wording ("...áp dụng và **điều chỉnh**").

## What gets removed from today's FR-063 work

The whole point of decision 1 is that "Apply" stops existing as a Farmer action:

- Backend: `POST /farmer/stock-templates/apply`, `StockTemplateService.apply()`,
  `ApplyStockTemplateRequest`, `StockTemplateApplyResultResource`, and the 7 apply-related tests in
  `StockTemplateServiceTest`.
- Frontend: the "Apply template" button and its confirmation `Dialog` in
  `pages/farmer/StockWeek/index.tsx`, `StockTemplateApi.apply`, and the `apply.*` locale keys.
- `GET`/`PUT /farmer/stock-templates` (view/edit the recurring weekly template) are unaffected — they
  remain the only way to declare the recurring rule that materialization reads from.

## Test impact

`PlaceOrderConcurrencyTest` currently asserts D-02's overbooking guard against `products.stock_quantity`
directly — it needs rewriting against `product_daily_stock`, not a regression, an update to keep
protecting the same guarantee against the new locked resource. New cases to add: ordering a date with
no template → 409; two concurrent orders against the same `(product, date)` can't jointly exceed
`quantity_available` (mirrors the existing concurrency test's shape); ordering one date does not touch
`product_daily_stock` rows for other dates of the same product; the materialize step is a no-op on a
row that already exists (doesn't reset a partially-consumed date back to the template default).

## Out of scope / explicit follow-ups

- **Accept/decline/cancel do not exist yet** in this codebase (only `preview`/`place` are built — no
  `FarmerOrderController`, no cancel endpoint). There is therefore no existing refund logic this design
  breaks. Whoever builds FR-034/FR-065/FR-066 next must restore quantity onto the correct
  `product_daily_stock` row (`product_id` + `order.pickup_date`), not onto `products.stock_quantity`.
  Noting it here so it isn't rediscovered as a surprise.
- Backfilling/seed data: existing seed `products.stock_quantity` values are not migrated into
  `product_daily_stock` — they simply stop being read for ordering. Demo data will need at least one
  `weekly_stock_templates` row per seeded product for the seeded catalogue to stay orderable end to
  end; out of scope for this spec, tracked as a seed-data follow-up.
- No FR-xxx exists for `product_daily_stock` or the per-date override endpoint — flagged for LEAD per
  R-02, same as `market_closures` and the shelf-life columns were.
