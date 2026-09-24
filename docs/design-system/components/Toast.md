# Toast

Short message after an action: added to cart, saved, failed to send.

- The consumer passes `tone` (`success` | `error`), `children`, `actionLabel` + `onAction` (e.g. "Undo", "Try again").
- Toasts sit at the bottom corner (`z-toast`) and hide after 5 seconds. Error toasts don't auto-hide.
- Order failures and out-of-stock errors don't go in a toast; use `Banner tone="danger"` in place.

Preview: [reference gallery](../reference/gallery.html#c-Toast)
