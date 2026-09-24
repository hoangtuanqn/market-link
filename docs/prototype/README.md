# MarketLink prototype

Clickable HTML mockups of every screen for the three roles (Customer, Farmer, Admin), built directly on the
Hang tag design system (`docs/design-system`) and the scope in `.ai/REQUIREMENTS.md`.

## Open it

```bash
# from the repo root
python3 -m http.server 8765
# then open http://localhost:8765/docs/prototype/index.html
```

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

## Not in this prototype

No API calls, no real sign-in, no persistence between pages. Real components are TSX in `frontend/src/components/`
using the same `ml-*` classes; start a page from the closest screen here.
