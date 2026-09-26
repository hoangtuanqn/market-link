# MessageBubble

One message in a conversation between two people (FR-110, FR-115). **Not the same as
[ChatMessage](ChatMessage.md)**, which belongs to the shopping assistant and carries an
"Intent: …" label on every bot answer (FR-092).

- The consumer passes `message` (the API shape), `mine` (is it the reader's own message),
  `senderName`, and `seen` (only meaningful on your own messages).
- `mine` decides the side: the reader's own messages sit on the right on a brand-coloured bubble,
  the other person's on the left on a raised surface.
- A photo message renders the picture instead of text. The picture is fetched with the reader's
  token and shown from a blob URL — the attachment endpoint checks that the reader is in the
  conversation, so a plain `<img src>` would get a 401. The space is reserved from the width and
  height the server returned, so the thread does not jump when the picture arrives.
- The meta line under the bubble is the time, and on your own messages a "Seen" mark once the other
  person has read that far.
- Composed from the existing `ml-msg`, `ml-msg-bot`, `ml-msg-user`, `ml-msg-bubble` and
  `ml-msg-meta` classes. **It adds no CSS of its own**, so it needs no change to the design system
  files. If the design system later grows its own bubble classes, only the class names here change.

Preview: open `/messages` as a customer with at least one conversation — there is no gallery entry
yet.
