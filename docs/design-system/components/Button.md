# Button

Action button with 7 variants:

- `primary`: the main action on the screen. At most one per view.
- `accent`: secondary call to action on a `board` background.
- `secondary`: an action of equal weight.
- `ghost`: link-style, e.g. "Directions", "Reorder".
- `danger`: outlined cancel or decline.
- `danger-fill`: only for the confirm button inside a `Dialog`.
- `onboard`: outlined button on `board`.

Usage:

- The consumer passes `children` (sentence case), `onClick` or `href`, `size="sm"` (36px, only inside cards and tables), `block` (full width, for mobile), and `icon`.
- When a business rule disables a button (cutoff passed, slot full, no pickup time chosen), always show the reason in text right next to it.
- On hover the fill moves to `brand-strong` or `accent-strong`. No scaling, no shadows.

Preview: [reference gallery](../reference/gallery.html#c-Button)
