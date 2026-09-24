# NotificationList

In-app notification list, opened from the bell in `SiteHeader` (FR-041, FR-042, D-11).

- The consumer passes `items: [{kind, title, text, time, unread}]`, where `kind` is `accepted` | `declined` | `ready` | `restock` | `announce`, plus `onReadAll`.
- Unread items get the `highlight` fill and a dot; screen readers hear "unread".

Preview: [reference gallery](../reference/gallery.html#c-NotificationList)
