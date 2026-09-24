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
- From 1600px wide the header, footer and content widen together to 1360px (the design-system token `size-container` stays 1200; LEAD to confirm). The platform announcement moves off the green band onto `highlight`, the pale note colour used for unread notifications, so it reads as a note over the header rather than part of it. Its content lines up with the header and the page.
- Date kickers on Home, Markets and the three dashboards show the real date and time (`<time data-clock>`).
- Public pages render as a guest; add `?as=customer` to see the signed-in header.

## Not in this prototype

No API calls, no real sign-in, no persistence between pages. Real components are TSX in `frontend/src/components/`
using the same `ml-*` classes; start a page from the closest screen here.
