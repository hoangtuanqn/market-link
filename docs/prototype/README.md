# MarketLink prototype

Clickable HTML mockups of every screen for the three roles (Customer, Farmer, Admin), built directly on the
Hang tag design system (`docs/design-system`) and the scope in `.ai/REQUIREMENTS.md`.

## Open it

```bash
# from the repo root
python3 docs/prototype/serve.py
# then open http://localhost:8765/docs/prototype/index.html
```

Use `serve.py`, not `python3 -m http.server`. The plain server lets a browser keep a stale
`prototype.js` or `data.js` while the HTML is fresh, so a screen can look broken because the browser
is running yesterday's code. `serve.py` is the same static server with caching turned off.

`index.html` lists every screen by role, the requirement → screen coverage, and the open questions.
Maps use Leaflet + OpenStreetMap tiles from the network (D-12).

## Files

| Path | What it is |
|---|---|
| `index.html` | Screen map, FR coverage, open questions, design notes |
| `public/`, `customer/`, `farmer/`, `admin/` | One HTML file per screen |
| `data.js` | Shared demo data: 4 markets, 11 Farmers (incl. pending/suspended), 20 products, orders in all 6 states, reviews, notifications |
| `prototype.js` | Header/footer per role, `ml-*` component builders that mirror `docs/design-system/reference/marketlink-reference.js`, Leaflet helper, toasts, dialogs, the prototype bar |
| `prototype.css` | Page-layout classes (`pt-*`) only. It never restyles `ml-*` classes; it sits in the same cascade layer so the design system wins on ties |
| `collect-todos.py` → `todos.js` | Gathers every `data-todo` marker into the index |
| `serve.py` | The static server with `Cache-Control: no-store`, so an edited screen is the screen you see |

## Rules the screens follow

- Colors, type, spacing, radius and shadows come only from the real stylesheets in `frontend/src/styles/`.
- Copy follows the Voice section of the design system: English, sentence case, "you", no emoji, a written reason next to every locked button, "pay at the stall" next to every total.
- Anything the SRS, `docs/decisions.md` or `docs/api-contract.md` does not define is shown one reasonable way and marked with a red `TODO` chip. Nothing is invented silently.
- About us carries a carousel of 4 slides (mission, how it works, the technology, what you get) that advances every 5 seconds. It is a paper card on the same grid as the rest of the page, so its left and right edges line up with every other section. The copy sits on a tag over the photo, so no scrim or gradient is needed. It pauses on hover and on keyboard focus, has a pause button and prev/next, answers the arrow keys, and does not auto-advance under `prefers-reduced-motion` (WCAG 2.2.2). Below 768px the side arrows join the dots at the bottom. Build one with `PT.carouselHTML(slides, label)` and start it with `PT.carousel(selector)`.
- From 1600px wide the header, footer and content widen together to 1360px (the design-system token `size-container` stays 1200; LEAD to confirm). The platform announcement keeps the design system's green band, with a pale rule under it and the same left edge as the header so it still reads as its own strip.
- Date kickers on Home, Markets and the three dashboards show the real date and time (`<time data-clock>`).
- Public pages render as a guest; add `?as=customer` to see the signed-in header.

## Screens added after the first pass

- **Product detail** (`public/product.html`) and **Stall profile** (`public/stall.html`) were in the first pass and have since been rebuilt against patterns from Chợ Tốt: a photo gallery with a counter, a seller card with rating and orders collected, a product-detail table, a pickup table with free slots, review tags with counts, the same product compared across stalls, and a report link into moderation (FR-074).
- **Messages** (`customer/messages.html`, `farmer/messages.html`) are a proposal, not an SRS feature. Both carry a warning banner and a TODO. Price negotiation was deliberately left out: prices are set by the stall and there is no payment in the product.

## Language

Every word of interface copy is English. Stall names now carry their descriptive half in English too, so
`Vườn Cô Tư` reads as `Cô Tư Garden`, `Trại dê Củ Chi` as `Củ Chi Goat Farm`, and so on for all eleven stalls.

Two kinds of word stay as they are, because English writing keeps them that way and neither has a translation:
people's names (Nguyễn Thị Tư, Nguyễn Minh Khang) and real Ho Chi Minh City place names (Thảo Điền, Thủ Đức,
Củ Chi, Bà Chiểu). Say so if you want them romanised without diacritics as well.

This is a deviation: the brand book's Voice section says to keep stall names in Vietnamese. FE1 and LEAD should
fold the change into `docs/design-system/README.md`, or ask for it to be reverted.

## Sign-in and the reset flow

- **Sign in** offers Google and Facebook alongside the password form. Both are out of SRS scope and both carry a
  TODO: FR-001 and FR-002 require a phone number and address that neither provider supplies, so a social sign-up
  needs a profile-completion step before the first order.
- **Forgot password** and **Set a new password** are now two screens (`forgot-password.html`,
  `reset-password.html`). The first takes an email, validates its shape, and moves to a confirmation panel; the
  wording is the same whether or not the address has an account, so the form cannot be used to discover who is
  registered. The second sets the password, checks the two entries match, and can preview the expired-link state.

## Two shells

Public and Customer screens keep the design system's horizontal `SiteHeader` on `board`.

Farmer and Admin screens use a dashboard shell instead: a board-green sidebar 284px wide holding the logo with a
role badge, a context card for the stall or the platform with a market switcher, navigation grouped under small
labels with counts on the groups that need action, and the signed-in person with Sign out at the foot. Beside it
the work area gets a quiet header with a back button, the page name and its kicker, search with a ⌘K hint, the
notification bell and an avatar. Below 1024px the sidebar becomes a drawer behind a menu button.

`PT.boot` builds it: for those two roles it moves `main` into the shell and lifts the page's own `<h1>` (and the
kicker above it) into the header, so no page repeats its title. This is a deviation from the SiteHeader guide and
is flagged on both overview screens.

## Favorites

`customer/favorites.html` is the wishlist: saved products, stalls and markets under three tabs. Each saved product
shows its price with the old price when it has dropped, whether it is in stock, when it was saved, and either Add
to cart or the restock alert when it is sold out. There is a bulk Add the in-stock items to cart, filters for in
stock, sold out and price dropped, and all four data states.

## A Farmer is a Customer with a stall

Roles are no longer exclusive. A Farmer keeps every Customer feature and gains a panel:

- Away from the panel a Farmer gets the Customer menu, a cart, and a **Stall panel** button in the header. Open
  any public screen with `?as=farmer` to see it.
- Inside `farmer/`, the sidebar opens with **Shop at the markets**, which leads back to the public site.
- A Customer is invited to apply in three places: a notification on a new account, a card on the dashboard, and a
  panel on the account page. All three lead to `customer/become-farmer.html`.

The application is six numbered steps: the stall, what you grow, where you grow it, photos of the plot, the market
you want, and the declarations. Two photos are required and five is the most, with an optional video up to 60
seconds. `admin/farmer.html` reviews it with the photos, the plot pinned next to the market, what they grow, and
the applicant's record as a customer, then approves, rejects or asks for better photos.

This fits `db/schema.sql` without a migration: `farmer_profiles.user_id` is already a unique key on `users`, so an
approval reuses the account and flips `users.role`. What has no columns yet is the evidence itself, the plot and
the crops, and that is flagged on the form. Two requirements also need rewording, FR-002 because Farmer sign-up is
now also an upgrade path, and FR-005 because a Farmer inherits Customer permissions.

## Units belong to the stall

A stall decides how its product is bought: by the kilo, the bunch, the bulb, the bag, or a tray of 30. The
schema already allows it, because `products.unit` is `VARCHAR(20)` with the comment "kg, bó, quả, hộp…", so
nothing here needs a migration.

What English does not give for free is the plural. "tray of 30" guesses to "tray of 30s", which is wrong, so the
product form offers the guess and lets the stall correct it, and shows a live preview of the three places the
unit appears: the price on the tag, the stock line, and what someone ordering one sees. `admin/categories.html`
became **Categories & units**, where an admin curates the picker, sees which units a stall typed itself, fixes a
plural, and merges duplicate spellings so reports do not split "bag" from "Bag". The one missing piece is a
`products.unit_plural` column, proposed to LEAD and flagged on the form.

Every report now carries the unit with the price: `45,000 ₫ / loaf`, `95,000 ₫ / tray of 30`. Quantities are
printed in each product's own unit and are never summed across units, because a kilo of mushrooms and a tray of
eggs are not the same thing. Money still aggregates; quantity does not, and the reports say so.

## Analytics and charts

Farmer and Admin both get the same analytics kit: a period bar (Day / Week / Month / Quarter / Year / Custom,
two dates, and what the period is compared with), stat tiles carrying a signed change against that comparison and
a 12-point sparkline, then charts and tables.

Charts are inline SVG, no library. Colour was decided with the `dataviz` validator against the card surface
`#f1e5cb`, not by eye:

| Pair tested | CVD ΔE | Normal-vision ΔE | Verdict |
|---|---|---|---|
| brand + ink-muted | 0.8 | 6.6 | fails, indistinguishable |
| brand + line-strong | 7.8 | 11.8 | fails the normal-vision floor |
| brand + danger | 1.3 | 19.9 | fails CVD, the classic red/green pair |
| **brand + twine** | **13.9** | **18.4** | **passes, with 3:1 contrast on both surfaces** |

So the period on screen is `brand` and the one before it is `twine`, dashed as well so identity never rests on
colour. Rules followed: one axis and never two; a single hue for every bar in a magnitude breakdown; order states
keep their own badge with glyph and word rather than becoming a colour series; a legend whenever there are two
series; a "Show the numbers" table under every chart; a hover tooltip on every mark.

Two honest gaps. `docs/design-system` has no chart tokens at all, so `twine` is borrowed even though the brand
book calls it decoration only. And MarketLink's palette is deliberately muted, so it fails the validator's chroma
floor no matter which pair is used. Both are flagged on the reports screen for FE1.

The four tiles on the Admin dashboard now lead somewhere: Farmers, Customers and Markets to their management
lists, and Orders to `admin/orders.html`, a new screen with the period bar, a column chart of orders per day
against the period before, breakdowns by state and by market, and the filterable order table.

## Platform revenue

`admin/revenue.html` answers a question the other reports do not: what MarketLink itself earns. The distinction
is the point of the screen and it is stated on it. The markets took 31,900,000 ₫ in September, which the platform
never touches because customers pay their stall in cash. MarketLink earned 2,229,000 ₫ from stalls buying
position, a take rate of 7.0%.

Four sources add up to the total: pinned on a market page, pinned on the home page, listings past the daily
limit, bumps past the monthly limit. The screen carries the daily column chart against the month before, each
source next to its own previous figure, which stalls paid and how much, and a credit ledger of money taken but
not yet spent. Five of eight approved stalls paid anything; the other three sold for free, which is the design.

Bundles are deliberately not a fifth source. A bundle is credit, so revenue is counted where the credit is spent,
and unspent credit is a liability rather than income. That recognition policy is flagged for LEAD, along with the
larger blocker that the SRS rules out a payment gateway at all.

## Settings, themes and the back arrow

`customer/settings.html`, `farmer/settings.html` and `admin/settings.html` share one builder, `PT.settings(role)`:
appearance and language, money and units, notifications, then a role-specific block. `admin/account.html` is the
admin profile with sessions and a log of what that admin changed.

Dark mode is real, not a filter. Every step was re-derived from the same kraft and green hues and measured: all
26 text, status and border pairs pass, the tightest being `board-muted` on `board` at 5.43:1. The chart marks
were re-stepped too, because the light pair collapses on a dark surface; `#8dbb7b` against `#8a7f6d` measures
CVD ΔE 14.6 and normal-vision 16.7 on `#272119`. The sidebar needed its own `--side-raised` token, since
`brand-strong` goes lighter than `board` in dark and would have put light text on light.

The sidebar folds. A small button beside the logo collapses it to a 68px icon rail rather than hiding it
outright, so navigation stays one click away and the work area gains 216px. Count badges move onto the icons,
every item keeps a tooltip, and the choice is remembered per browser. Below 1024px the button disappears,
because there the sidebar is already a drawer.

On the Farmer sidebar, **Shop at the markets** now sits at the foot of the list. It leaves the panel, so it does
not belong above the stall's own work.

All four tiles on the Farmer overview are clickable, the same as Admin: total orders and revenue open the sales
history, awaiting approval opens the incoming orders, and best seller opens the products list. Two tiles share a
destination because a stall has fewer places to go than the platform does.

**Stock for Saturday** was rebuilt. The old row read `12 left of 20 · 8 reserved`, three numbers on one line with
no hierarchy, so nothing told a Farmer at a glance what was nearly gone. Now the sellable number leads at 26px, a
meter fills with what is already reserved, and the row turns to the warning colour under a quarter left and to
danger at zero. Bar tracks across the prototype moved from a tinted block to `surface-sunken` with a hairline, so
they read as a recess in both themes rather than a second coloured bar.

The back arrow now appears only on screens opened from a list, which is `order.html`, `product-form.html`,
`farmer.html` and `market-form.html`. On a screen reached from the sidebar there was nothing to go back to.

## How the platform makes money

Two streams, both aimed at Farmers and neither in the SRS.

**Promoted position.** Three pinned slots on a market page and two on the home page, sold by the day: 15,000 ₫
for a market-page day, 40,000 ₫ for a home-page day, cheaper over three or seven. A market-page day is about 7%
of what a stall takes on one market morning, which is the ratio to hold when prices change. Slots are capped on
purpose, so a full page is never more than a few promoted tags and nobody outbids anyone.

**Listing allowance.** Five new listings a day and ten bumps a month are free, which covers a stall like Cô Tư
Garden that lists three on a busy day. Past that it is 2,000 ₫ a listing and 3,000 ₫ a bump, or a bundle at
50,000 / 150,000 / 400,000 ₫.

`farmer/promote.html` shows the allowance as meters, what is pinned now with views and carts it earned, and the
bundles. `admin/pricing.html` sets every number, the currency, the rounding and the notice period, and has an
"adjust every price" control for inflation that moves them together and rounds to the nearest 1,000 ₫.

The blocker is money itself: the SRS says the application will have no payment gateway. Both screens carry a
warning banner saying credit is arranged with the team and entered by an admin, and a TODO for the new FR, the
tables for prices, credit and transactions with a price history, and the decision on how a Farmer actually pays.

## The four states (FR-084)

Every data screen has to show loading, empty, error and data. The screen already carries the loaded
block, so `PT.states(selector, { label, empty, error })` takes that block, inserts the other three
beside it, and adds one switcher at the foot of the page so all four can be seen without a server.
The switcher is scaffolding for review, not product UI; the real app picks a state from the request.

Pass an array of selectors when a screen has several blocks — a dashboard, a report — and they switch
together, which is what a whole screen loading or failing actually looks like. Only the first selector
carries the empty and error card, so put the topmost block first. Never point it at a tab panel: the
switcher sets `hidden` on every target, so all the panels would open at once. Point it at something
inside the panel, or at the whole tab section.

**All four roles are done**: 41 of the 64 screens carry the four states, which is every screen that
loads data. Farmer and Admin cover both panels end to end. Customer covers the dashboard, cart, order
detail, orders, favorites, notifications, messages and the assistant. Public covers home, markets,
market, products, product, stall, search and map.

On a detail screen the empty state reads as *not found*, because a single record is either there or
it is not: `farmer/order`, `admin/farmer`, `admin/customer`, `admin/order`, `customer/order`,
`public/product`. On `customer/assistant` the error state says the assistant is not answering and
points at search instead, because FR-090 is a SHOULD and shopping must not depend on it.

Forms, settings and sign-in screens are deliberately left out: they have no data to load, so the four
states do not apply to them.

## Closed days and days away

The home page announced that Thảo Điền was shut on 04/10 while no screen could produce that fact.
It now comes from `PT.closures` in `data.js`, and two screens work with it.

**Admin** — `admin/market-form.html` has a **Closed days** panel: the dates a market will not open,
each with its reason, whether customers have been told, and what was chosen for the orders already
placed. Adding one asks for that choice, because nothing in the SRS or the decisions covers it. The
three handlings live in `PT.closureHandling`: move the orders to the next market day, ask each stall
to contact its customers, or cancel them and tell the customers. Moving is the default and is the
kindest, but it assumes the stall sells on the next market day too, and it changes a pickup date and
a cutoff that no decision describes. All of that is flagged on the screen.

**Farmer** — `farmer/slots.html` has **Days you are not selling** for a day the stall will miss while
the market itself is open. This half is less undecided than it looks: declining the orders is an
existing transition under D-04 and returning the stock is D-02, so only the record of the day is
missing. If the market is shut that day the screen says so and asks the stall to do nothing, because
a market closure already stops every order.

Neither has a table. `db/schema.sql` has `markets.operating_days` and nothing for a single date, so
both carry a TODO proposing `market_closures` and `farmer_absences` to LEAD, who owns the schema (R-02).

## Two screens the Admin was missing

A walk through both panels against the feature catalog found the Farmer complete and the Admin short
of three things, with two more lists that were dead ends.

- **`admin/customer.html`** — the catalog asks to *view the list **and the information*** of a customer
  account, and FR-072 opens with *view*, but a name in the list was plain text. The detail screen
  carries their orders across every stall, the reviews they wrote, an account history, and the
  deactivate action with the reason kept on the account. It is the screen where an admin sees a home
  address and a full phone number on one page, so the privacy question already flagged on the list is
  repeated on it, sharper.
- **`admin/order.html`** — every order on the platform was listed with a code that could not be
  opened. The Admin view is deliberately read-only: D-04 gives the transitions to the stall and the
  cancel to the customer, and an admin is in neither list, so the screen shows the items, the full
  `order_status_history` (FR-038), the stall, the customer and the slot, and says in a panel why it
  has no buttons. What it flags is the case nobody has decided: an order stuck in `placed` because
  the stall stopped answering, which the FR-039 job never sweeps.
- **Admin password reset** — `admin/login.html` had no way back in. It now links to the Customer reset
  flow and says plainly that sharing it is a decision nobody has taken, since FR-004 asks for a
  separate admin area and an admin can change what the platform charges.
- **`farmer/history.html`** rows now open the order behind the sale, which `farmer/order.html` already
  rendered.
- **`admin/feedback.html`** rows now open the whole message with an answer box. It is a dialog rather
  than a screen on purpose: FR-081 asks only for the form with its three categories, and what happens
  after a message is sent is still open on `public/feedback.html`.

Edit-in-place lists are not dead ends and were left alone: announcements and categories have Edit and
Save on the row, `farmer/reviews` replies inline, `farmer/stock-week` edits the numbers inline.

## Not in this prototype

No API calls, no real sign-in, no persistence between pages. Real components are TSX in `frontend/src/components/`
using the same `ml-*` classes; start a page from the closest screen here.
