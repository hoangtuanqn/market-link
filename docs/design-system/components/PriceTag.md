# PriceTag

A product's price, shown as a yellow tag hand-lettered in marker and hung at -3°.

- The consumer passes `amount` (number, VND), `unit` ("bunch", "kg", "jar"…), `was` (old price, optional), and `size="lg"` on the product detail page.
- Don't pass a pre-formatted string. The component formats with `MarketLink.vnd()`.
- One PriceTag per card. Totals and prices in tables don't use PriceTag; they are plain text in `price` color.
- The tilt stays when `prefers-reduced-motion` is on, because it is a static shape, not motion.

Preview: [reference gallery](../reference/gallery.html#c-PriceTag)
