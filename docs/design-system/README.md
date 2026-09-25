# MarketLink design system · Hang tag

This folder is the source of truth for how MarketLink looks and reads. Every page, prototype and component in `frontend/` follows it. The same system is published as a live design-system artifact; this folder is the copy that ships with the code.

## Files

| Path                                                   | What it is                                                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `docs/design-system/README.md`                         | This file: how to use the system in code, then the brand book (rules)                                 |
| `docs/design-system/tokens.json`                       | All tokens with a usage note each (colors, type, spacing, radius, shadow, size, z-index, breakpoints) |
| `docs/design-system/components/<Name>.md`              | One guide per component: what it is, what the consumer passes, do's and don'ts                        |
| `docs/design-system/reference/gallery.html`            | Every component and 3 reference screens rendered live. Open it in a browser                           |
| `docs/design-system/reference/marketlink-reference.js` | React 18 bundle used only by the gallery. **Not** part of the app                                     |
| `frontend/src/styles/marketlink-theme.css`             | Tokens as CSS variables + Tailwind v4 `@theme` (generated from `tokens.json`)                         |
| `frontend/src/styles/marketlink-components.css`        | The `ml-*` component classes (generated from the design system)                                       |
| `frontend/src/lib/format.ts`                           | `vnd()`, `units()`, `formatDate()`, `formatTime()`, `weekday()`                                       |
| `frontend/public/brand/`                               | `marketlink-mark.svg` (brand ink) and `marketlink-mark-light.svg` (on-board ink)                      |
| `frontend/index.html`                                  | Loads Patrick Hand + Chivo from Google Fonts (Vietnamese subset included)                             |

## Using it in code

1. **Colors only through tokens.** The default Tailwind palette is switched off (`--color-*: initial`), so `bg-white`, `text-zinc-600`, `bg-blue-500` do not exist. Use `bg-surface`, `bg-surface-raised`, `bg-surface-quiet`, `text-ink`, `text-ink-muted`, `border-line-strong`, `bg-brand text-on-brand`, `bg-accent text-on-accent`, `bg-board text-on-board`, `bg-danger-bg text-danger`, `bg-status-ready-bg text-status-ready-ink`… Never write a hex value or `style={{ color: '#…' }}` in a component.
2. **Type through the scale.** `font-hand` + `text-display` / `text-h1` / `text-hand` / `text-tag-price` / `text-tag-price-lg` for handwriting; `font-sans` (default) + `text-h2` / `text-h3` / `text-body-lg` / `text-body` / `text-small` / `text-caption` / `text-overline` / `text-button` / `text-numeric` for print. `text-price` is the price **color**, `text-tag-price` is the price **size**.
3. **Spacing.** Tailwind's 4px step matches the token scale like this:

   | Token     | px  | Tailwind         |
   | --------- | --- | ---------------- |
   | `space-1` | 4   | `p-1`, `gap-1`   |
   | `space-2` | 8   | `p-2`, `gap-2`   |
   | `space-3` | 12  | `p-3`, `gap-3`   |
   | `space-4` | 16  | `p-4`, `gap-4`   |
   | `space-5` | 24  | `p-6`, `gap-6`   |
   | `space-6` | 32  | `p-8`, `gap-8`   |
   | `space-7` | 48  | `p-12`, `gap-12` |
   | `space-8` | 64  | `p-16`, `gap-16` |

   Don't use in-between steps (`p-5`, `p-7`, `gap-10`) or arbitrary values like `p-[18px]`.

4. **Shape.** `rounded-sm` (4px) for controls, `rounded-md` (10px) for tags and cards, `rounded-lg` (16px) for dialogs, `rounded-full` for chips and badges. `shadow-tag` for cards (the 2px paper edge), `shadow-float` for dropdowns and toasts, `shadow-modal` for dialogs. Nothing else.
5. **Breakpoints.** Build mobile-first at 375px, then `md:` (768px) and `2xl:` (1440px). Content container: `mx-auto max-w-(--size-container) px-4 md:px-6` — read the token, never hardcode a width.
6. **Components use the `ml-*` classes.** Each guide in `components/` names its classes and props; the gallery shows the exact markup. Build the React component in `frontend/src/components/` as TSX, put the `ml-*` classes on the markup, and keep the props the guide lists. Use Tailwind utilities only for page layout (grid, flex, gaps, widths), not to restyle a component.
7. **Formatting and copy.** Money, units and dates go through `src/lib/format.ts`. Copy follows the Voice section below: English, sentence case, "you", no emoji, no exclamation marks, always explain why something is locked.
8. **Every data screen** has loading, empty, error and loaded states (FR-084), using `DataState`.
9. **Starting a new page**: open `reference/gallery.html`, find the closest reference screen (`ScreenMarket`, `ScreenFarmer`, `ScreenCartMobile`) and copy its layout.

Components: [Banner](components/Banner.md), [Button](components/Button.md), [CartGroup](components/CartGroup.md), [ChatMessage](components/ChatMessage.md), [Checkbox](components/Checkbox.md), [Chip](components/Chip.md), [DataState](components/DataState.md), [DataTable](components/DataTable.md), [DayChips](components/DayChips.md), [Dialog](components/Dialog.md), [Field](components/Field.md), [Logo](components/Logo.md), [MapPin](components/MapPin.md), [MarketCard](components/MarketCard.md), [NotificationList](components/NotificationList.md), [OrderStatus](components/OrderStatus.md), [OrderTicket](components/OrderTicket.md), [Pagination](components/Pagination.md), [PriceTag](components/PriceTag.md), [ProductCard](components/ProductCard.md), [QtyStepper](components/QtyStepper.md), [Rating](components/Rating.md), [ReviewCard](components/ReviewCard.md), [SearchBar](components/SearchBar.md), [SiteFooter](components/SiteFooter.md), [SiteHeader](components/SiteHeader.md), [SlotPicker](components/SlotPicker.md), [StallCard](components/StallCard.md), [StatTile](components/StatTile.md), [Tabs](components/Tabs.md), [Toast](components/Toast.md).

Reference screens: [ScreenMarket](components/ScreenMarket.md), [ScreenFarmer](components/ScreenFarmer.md), [ScreenCartMobile](components/ScreenCartMobile.md).

## Changing the system

Change tokens or component styles in the design-system artifact first, then regenerate `tokens.json`, `marketlink-theme.css` and `marketlink-components.css` together. Don't patch the generated CSS by hand, or the code and the design system drift apart.

---

# Brand book

MarketLink connects Farmers at local farmers markets with shoppers who pre-order and pick up at the stall. The visual idea is the **Hang tag**: every product is a punched kraft-paper tag on a string, and its price is hand-lettered in marker on a yellow tag. Everything below follows from that picture: brown paper backgrounds, twine-green ink, yellow for prices, handwriting for what the seller writes, and print type for what the system says.

## Voice

- Write the UI in English, address the user as "you", keep sentences short. Say what will happen: "Your cart will be split into 2 orders at 2 different stalls."
- Name the actual thing on screen: "Vườn Cô Tư · 12 bunches left", not "Product available".
- Keep Vietnamese proper nouns as they are, with diacritics: stall names (Vườn Cô Tư), people (Nguyễn Thị Tư), places (Thảo Điền, Thủ Đức). Translate everything else, including product names ("Củ Chi water spinach", "Green-skin pomelo").
- Handwriting (`font-hand`) is the voice of the stall and the market: market names, prices, "Fresh today", Farmer notes, the dashboard greeting ("Morning, Cô Tư"). Print (`font-sans`) is the voice of the system: buttons, forms, order status, errors, tables. Never set buttons, form labels or error messages in handwriting.
- When an action is locked, always give the reason: "Cutoff passed at 19:00 25/09. To change it, contact the stall directly." Never leave a grey button unexplained.
- Mention paying at the stall wherever a total appears: "Pay at the stall on pickup". There is no payment gateway.
- No emoji, no exclamation marks, no "amazing", "super", "best-in-class". No filler stats like "10,000+ happy customers".
- Use sentence case everywhere. Only `type-overline` (table headers, kickers above headings) is uppercase, and only through CSS; the source string stays in sentence case.
- Formats: money `25,000 ₫` (use `MarketLink.vnd()`), dates `dd/MM/yyyy`, 24-hour time `07:00–07:30`, short weekdays `Mon … Sun`, decimals with a point (4.6), distances `2.4 km`. Unit plurals come from `MarketLink.units()` ("3 bunches", "2 loaves", "1 kg").

## Color

There is a single theme (`tag`). Every color comes from a token; components contain no hex values.

| Role        | Token                                                         | Used for                                                                                           |
| ----------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Paper       | `surface`                                                     | Public page background: home, market, product pages                                                |
| Light paper | `surface-quiet`                                               | Farmer/Admin dashboards, tables, long forms. Long work sessions on the darker `surface` are tiring |
| Tag face    | `surface-raised`                                              | Cards, product tags, forms, dialogs, dropdowns                                                     |
| Recess      | `surface-sunken`                                              | Image placeholders, the pickup strip in a ticket, table headers                                    |
| Green band  | `board` + `on-board` / `board-muted`                          | Header, footer, platform announcements, highlighted stat tile                                      |
| Twine       | `brand` / `brand-strong` / `on-brand` / `brand-tint`          | Primary buttons, links, selected items, rating stars                                               |
| Price tag   | `accent` / `accent-strong` / `on-accent`                      | `PriceTag` fill, "Fresh today" flag, count badges, stall pins                                      |
| Ink         | `ink`, `ink-muted`                                            | Primary and secondary text                                                                         |
| Rules       | `line` (decorative), `line-strong` (meaningful borders, ≥3:1) | Image borders, tag borders, inputs, tear lines                                                     |

Rules:

- Text on `accent` always uses `on-accent` (dark brown ink). White on yellow does not have enough contrast.
- `ink` and `ink-muted` reach ≥4.5:1 on `surface`, `surface-quiet`, `surface-raised`, `surface-sunken`, `brand-tint` and `highlight`. `on-board` and `board-muted` reach ≥4.5:1 on `board`. All pairs were checked with a script.
- Order states use `status-*-bg` / `status-*-ink` pairs and always carry a word and their own glyph. Never tell states apart by color alone.
- There are 4 feedback pairs: `info-bg`/`info-ink` (explanations), `warning-bg`/`warning-ink` (cutoff approaching, low stock), `danger-bg`/`danger` (errors), and `highlight` (unread notifications, new orders). Don't use `accent` for warnings.
- `twine` is decoration only (the line under the header, the string on the cover), never for text or meaningful borders.
- Keyboard focus: `outline: 2px solid var(--focus); outline-offset: 2px` on every control. `focus` reaches ≥3:1 on every background.

## Type

Two fonts, both on Google Fonts, both with a Vietnamese subset (checked). The UI is in English, but stall, people and place names keep their Vietnamese diacritics, so the subset is still required:

- **Patrick Hand** (`--font-hand`): marker handwriting. Only at 20px and up, except category labels (19px).
- **Chivo** 400/500/700 (`--font-sans`): everything else.

They are loaded in `frontend/index.html` from Google Fonts, which serves the Vietnamese subset automatically. If you self-host them later, include the `vietnamese` subset, or letters like "ệ", "ữ", "ợ" in names fall back to a system font.

The scale lives in the Type section:

- Handwritten: `type-display` 56, `type-h1` 40, `type-price-lg` 36, `type-price` 26, `type-hand` 20.
- Print: `type-h2` 24, `type-h3` 18, `type-body-lg` 18, `type-body` 16, `type-small` 14, `type-caption` 12, `type-overline` 12, `type-button` 15, `type-numeric` 16.

Rules:

- Long text is always `type-body` (16/24). Nothing smaller than 12px.
- Prices, quantities, times and money in tables use `font-variant-numeric: tabular-nums` so number columns line up.
- One large handwritten heading per screen (`type-display` or `type-h1`). Section headings below it use `type-h2` in print.

## Spacing, layout, responsive

- Use the `space-1`…`space-8` scale (4 → 64px). Card padding is `space-4`, gap between cards `space-5`, gap between sections `space-6` or more.
- Content is at most `size-container` wide: 1200px, stepping up to 1360px from 1600px, because a 1200px
  container leaves a lot of paper on a 1920px monitor. Header, footer and content widen together, so
  anything that has to line up with them reads `var(--size-container)`. The header is `size-header` (64px) tall. Minimum touch target is `size-control` (44px); `size-control-sm` (36px) is only for cards and tables.
- Three test widths per FR-080: `bp-mobile` 375px (one column, `space-4` gutter, menu behind the hamburger), `bp-tablet` 768px (two tag columns, filters in a drawer), `bp-desktop` 1440px (three-column tag grid, map alongside). No page may scroll horizontally; only `DataTable` scrolls sideways inside its own frame.
- Stacking: `z-header` 40 < `z-dropdown` 50 < `z-dialog` 100 < `z-toast` 110. Leaflet panes use their own z-index up to 400, so map popups belong inside a Leaflet pane, not layered on top from outside.

## Shape, borders, shadows

- A card is a paper tag: 1.5px `line-strong` border, `radius-md` (10px) corners, and `shadow-card` (a 2px thick bottom edge, no blur).
- `ProductCard` also gets a 14px punched hole in the middle of its top edge. Only `ProductCard` has the hole; adding it elsewhere drains its meaning.
- `OrderTicket` has a dashed tear line with two half-holes at its edges.
- Only `PriceTag` is rotated (-3°). Nothing else rotates.
- Blurred shadows are reserved for floating layers: `shadow-pop` (dropdowns, toasts, the notification list) and `shadow-dialog`.
- Corners: `radius-sm` 4px for controls, `radius-md` 10px for tags, `radius-lg` 16px for dialogs, `radius-pill` for chips, badges and chat bubbles.
- No gradients, no glassmorphism, no cards with a colored left border.

## Imagery

- Use real photos of produce, stalls and markets: shot by the team, or with a clear license credited in the ReadMe. No 3D renders, glossy AI illustrations, or smiling stock models.
- Product photos are 4:3 with `object-fit: cover`: close up, natural light, on wood, bamboo baskets or paper. Without a photo, the tag shows a `surface-sunken` frame with the hand-lettered category. Never use a vegetable icon as a stand-in.
- Sold-out products turn grey. That is the only time a photo gets a filter.

## Icons

- Icons are 1.75px-stroke SVGs with `stroke="currentColor"` on a 16×16 box, bundled in `MarketLink.icons` (order states, lock, clock, search, cart, bell, menu, close, info, alert, megaphone, heart, star, pin).
- For anything else, use **Lucide** (`lucide-react`) with `strokeWidth={1.75}` to match.
- No emoji as icons. No icons in colored circles above headings (the landing-page feature card look).
- The logo lives in the Logos asset group: `marketlink-mark.svg` (`brand` ink) and `marketlink-mark-light.svg` (`on-board` ink, for dark backgrounds). In React, use the `Logo` component.

## Map

- Leaflet + OpenStreetMap (D-12). Markers are `MapPin`, rendered to HTML with `MarketLink.pinHTML(kind, label)` and passed to `L.divIcon`.
- Markets use a square `pin-market` pin, stalls a round `pin-stall` pin: different in both shape and color. The selected pin is larger and gets a `focus` ring.
- "Directions" opens OSM directions in a new tab. `SiteFooter` always carries "Map data © OpenStreetMap contributors", as the OSM license requires.

## States and feedback

- Every data screen has all 4 states (FR-084): loading (`DataState kind="loading"`, a skeleton, never a spinner in the middle of the page), empty (`kind="empty"`, with a suggestion and one action), error (`kind="error"`, with "Try again"), and loaded.
- After a successful action, show a `Toast`. When an error blocks an action, show `Banner tone="danger"` in place. Actions that are hard to undo (cancel order, decline order, suspend a Farmer, delete a product) go through a confirm `Dialog`.
- Motion is limited to 120ms background and border color changes, plus the skeleton pulse. Both turn off under `prefers-reduced-motion`.

## Reference screens

The Screens group has 3 layouts built from the components: the Customer market page (desktop), the Farmer incoming-orders dashboard, and the cart on 375px mobile. When building a new page, start from the closest one.

## What we don't do

No purple-blue gradients. No 16px-rounded cards with a colored left border. No big centered hero text over a blurred photo. No Inter or Roboto. No emoji in front of headings. No three-card "feature" grids with round icons. No handwriting on buttons, forms or error messages. No dark mode until every MUST requirement is done.
