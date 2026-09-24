# Banner

In-flow message strip with 4 tones:

- `announce`: platform-wide announcement posted by Admin (FR-077). Goes at the very top, above `SiteHeader`.
- `info`: explanation, e.g. the cart being split into several orders.
- `warning`: cutoff approaching, low stock.
- `danger`: an error that blocks the action.

Usage: the consumer passes `tone`, `title`, `children` (one sentence), `action` (one button, optional), and `onClose` (announce and info only). Never stack more than 2 banners.

Preview: [reference gallery](../reference/gallery.html#c-Banner)
