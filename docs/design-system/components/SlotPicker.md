# SlotPicker

Picks a pickup time slot within the Farmer's pickup window (FR-032, D-06).

- The consumer passes `legend` (with the date), `slots: [{value, time, booked, max}]`, and `onChange` or `defaultValue`.
- A slot with `booked >= max` is disabled automatically, shows "Fully booked" and strikes through the time. Always show how many places are left so people understand why a slot is locked.

Preview: [reference gallery](../reference/gallery.html#c-SlotPicker)
