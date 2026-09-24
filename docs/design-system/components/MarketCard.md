# MarketCard

Market card: hand-lettered market name, address, seven weekday cells (market days filled with `brand`), hours, number of stalls, distance, and a save-as-preferred button (FR-010, FR-014).

- The consumer passes `name`, `address`, `openDays` (array of day numbers, 0 = Sunday), `hours`, `stalls`, `distance`, `saved`, `onSave`, `onView`, `onDirections`.
- Market days are told apart by a solid fill plus screen-reader text ("open" / "closed"), not by color alone.

Preview: [reference gallery](../reference/gallery.html#c-MarketCard)
