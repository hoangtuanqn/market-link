# Tabs

Tabs for switching between groups of the same data, e.g. incoming orders by status on the Farmer dashboard, or sections of the Admin area.

- The consumer passes `label` (the tab group's name, for screen readers), `tabs: [{id, label, count}]`, `value`, `onChange`.
- The selected tab gets a `brand` underline, and its count sits on yellow `accent`. Tabs only filter data within one screen; to go to another page, use a link in `SiteHeader`.

Preview: [reference gallery](../reference/gallery.html#c-Tabs)
