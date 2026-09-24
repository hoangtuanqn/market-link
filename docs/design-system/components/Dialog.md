# Dialog

Confirmation dialog for actions that are hard to undo: cancel order (FR-034), decline order (FR-065), suspend a Farmer (FR-071), delete a product.

- The consumer passes `open`, `title` (a question, ending in ?), `children` (spell out the consequence), `actions` (keep button as `secondary`, confirm as `danger-fill`), `tone="danger"` for `role="alertdialog"`, and `onClose`.
- The app must trap focus inside and close on Esc. `inline` is for previews only.

Preview: [reference gallery](../reference/gallery.html#c-Dialog)
