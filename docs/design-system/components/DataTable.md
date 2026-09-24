# DataTable

Data table for Farmer and Admin dashboards: incoming orders, Farmer approvals (FR-071), customers (FR-072), markets (FR-073), moderation (FR-074), reports (FR-075), weekly stock template (FR-063).

- The consumer passes `caption`, `columns: [{key, label, align: 'num' | 'actions', render(row)}]`, and `rows` (set `_new: true` on new rows; they get the `highlight` fill).
- Number columns are right-aligned with `tabular-nums`. The actions column uses `Button size="sm"`, at most 2 per row; anything more goes on the detail page.
- Tables sit on `surface-quiet`. On mobile the table scrolls horizontally inside its own frame so the page never overflows.
- Pair with `Pagination` past 20 rows.

Preview: [reference gallery](../reference/gallery.html#c-DataTable)
