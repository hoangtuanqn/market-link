# ChatMessage

A message in the shopping assistant panel (FR-090, FR-091). Every bot answer carries an "Intent: …" label, so during the demo you can show the judges that the system classifies the intent and then runs a prepared SQL query, instead of letting an LLM write SQL (FR-092).

- The consumer passes `from` (`bot` | `user`), `children`, `time`, `intent`, `suggestions` (array of follow-up prompts shown as Chips), `onSuggest`.
- The bot answers with concrete data (stall, market, how many are left). No filler like "I'd be happy to help".

Preview: [reference gallery](../reference/gallery.html#c-ChatMessage)
