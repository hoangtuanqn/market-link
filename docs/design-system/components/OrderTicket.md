# OrderTicket

Order summary ticket: order code, stall, status, pickup place and time, tear line, items, total paid on pickup, cutoff line, and actions.

- The consumer passes `code`, `stallName`, `market`, `pickupDate`, `slot`, `items: [{name, qty, price}]`, `status`, `cutoff` (formatted string), `locked` (cutoff passed), `onEdit`, `onCancel`, `onReview`, `onReorder`, and `children` for extra content.
- Edit/Cancel only show while the order is `placed` or `accepted` and not locked (D-05). Cancel must open a confirm `Dialog`.
- Review/Reorder only show once the order is `completed` (FR-037, FR-050).

Preview: [reference gallery](../reference/gallery.html#c-OrderTicket)
