# SiteHeader

The top bar on `board`, with a dashed `twine` line underneath. The menu changes with the user's role.

- The consumer passes `role` (`guest` | `customer` | `farmer` | `admin`), `active` (key of the current item), `cartCount`, `unread`, `userName`. To set a custom menu, pass `items: [[key, label], …]`.
- Admin and Farmer have their own menus and never share the Customer one (FR-004). The cart only shows for Guest and Customer.
- The current item uses `aria-current="page"` and gets a yellow `accent` underline. Count badges are visual only; the real count is read through each button's `aria-label`.
- Below 768px the menu collapses into the hamburger button. The app builds the drawer that button opens.

Preview: [reference gallery](../reference/gallery.html#c-SiteHeader)
