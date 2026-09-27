# Logo

The brand mark: a market stall seen head-on, standing inside an arch. A striped canvas awning with a
scalloped hem, a counter below it with a bunch of greens, a piece of fruit and a loaf, and a strip of
ground. Next to it, "MarketLink" hand-lettered in Patrick Hand.

- The consumer passes `size` (px, default 30), `to` (when it links somewhere), and `variant`.
- `variant` picks the skin, and it must match what is behind the logo. `light` (cream arch, green
  stall) goes on `board` and every other dark surface; `ink` (green arch, cream stall) goes on paper.
  `ink` is the default, but every place the logo appears today sits on `board`, so those call sites
  pass `light` explicitly. Putting `ink` on `board` makes the arch vanish into the background and
  leaves the stall floating.
- **The mark is the one place in the codebase that carries fixed hex values instead of tokens.** It is
  brand artwork, not interface: it has to look identical in light and dark mode, so it cannot follow
  `data-theme`. Everything else in `frontend/src/` still goes through tokens.
- Standalone files live in `frontend/public/brand/`:
  `marketlink-mark.svg` (`ink`), `marketlink-mark-light.svg` (`light`), and
  `marketlink-mark-mono.svg`, a single-ink version drawn in `currentColor` for embossing, embroidery,
  rubber stamps and black-and-white printing.
- The awning red is the `awning` token (`#a8402b`). It is deliberately a different red from `danger`
  (`#9a2a1f`), so brand artwork and error states never read as the same thing.
- The slogan sits under the logo in the footer: **"Still there when you get there"**, set in `font-hand`
  through the `ml-slogan` class. Its selector is written `.ml-slogan, .ml-footer p.ml-slogan` on purpose —
  a bare `.ml-slogan` loses to `.ml-footer p` and the line drops back to 14px `board-muted`.
  The string lives at `logo.slogan` in `src/locales/<language>/common.json`, translated into all ten
  languages. Never hardcode it; it is the one piece of brand copy that changes with the reader's language.
- Don't round the arch's corners, add a shadow, put it inside a coloured box, or recolour the awning.
  Keep clear space of at least a quarter of the mark's height around it.

Preview: [reference gallery](../reference/gallery.html#c-Logo)
