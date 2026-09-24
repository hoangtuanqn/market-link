# StatTile

Stat tile on the Farmer dashboard (Total Orders, Pending Orders, Revenue Summary, best seller — FR-068, FR-069) and the Admin dashboard (FR-070).

- The consumer passes `label`, `value` (formatted string), `note`, `highlight`. Only one tile gets `highlight`: the one that needs action now, usually pending orders.
- Don't add green/red "up x%" arrows without real comparison data.

Preview: [reference gallery](../reference/gallery.html#c-StatTile)
