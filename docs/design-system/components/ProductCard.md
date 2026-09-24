# ProductCard

Product tag. Shaped like a punched paper tag: a round hole in the middle of the top edge, a 4:3 image, a hand-lettered category, name, Farmer · market, yellow price tag, stock, and the main button.

- The consumer passes `name`, `farmer`, `market`, `category`, `price`, `unit`, `stock`, `image`, `imageAlt`, `flag` (e.g. "Fresh today", "Baked at 5am"), `soldOut`, `favorite`, `lowAt` ("low stock" threshold, default 3), and the callbacks `onAdd`, `onFavorite`, `onNotify`.
- When `soldOut`: the image turns grey, a "Sold out" flag shows, and the main button becomes "Notify me when back" (FR-041, restock alert).
- Stock text uses `MarketLink.units()` for English plurals ("12 bunches left", "2 loaves left").
- The card is a fixed 260px wide. Inside a grid, add `className="ml-pcard-fluid"` so it fills the column.
- The long product description belongs on the detail page (FR-022), not on the card.

Preview: [reference gallery](../reference/gallery.html#c-ProductCard)
