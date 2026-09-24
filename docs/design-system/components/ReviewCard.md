# ReviewCard

A customer review with a "Verified purchase" badge and the Farmer's reply (FR-052, FR-053).

- The consumer passes `author`, `date`, `target` (product or stall name), `rating`, `text`, `reply: {by, date, text}`, `verified` (default true), and `actions` (e.g. "Reply" for the Farmer, "Hide" for Admin per FR-074).
- Every review comes from a `completed` order, so the badge is always present. Low-rated reviews get no special color.

Preview: [reference gallery](../reference/gallery.html#c-ReviewCard)
