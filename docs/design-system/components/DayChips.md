# DayChips

Radio group for choosing a market day, used by the "by day" filter (FR-010, FR-021).

- The consumer passes `legend`, `days: [{value, label, sub, disabled}]`, and `value` + `onChange` (controlled) or `defaultValue`. Labels are short weekday names (`Mon` … `Sun`) with the date as `sub`.
- Days when the market is closed are `disabled` and struck through. Don't hide them.
- This is single choice. For picking several days on the Farmer form (operating days), use `Checkbox` with the same look.

Preview: [reference gallery](../reference/gallery.html#c-DayChips)
