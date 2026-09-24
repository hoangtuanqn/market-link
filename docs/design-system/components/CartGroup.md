# CartGroup

One group in the cart. Each group is one Farmer, and at checkout each group becomes its own order (D-01) with its own stall, market, pickup time, and total paid at the stall.

- The consumer passes `index` and `of` (order n of total), `stallName`, `market`, `pickup` (empty if not chosen yet), `items: [{name, qty, unit, price, max}]`, `onQty(index, n)`, `onChangeSlot`.
- Always put a `Banner tone="info"` above the groups: "Your cart will be split into N orders at N different stalls."
- The checkout button at the bottom stays disabled until every group has a pickup time, and says which group is missing one.

Preview: [reference gallery](../reference/gallery.html#c-CartGroup)
