# Rating

Shows a 0–5 rating (`Rating`) and a rating control (`RatingInput`, FR-050/051).

- `Rating`: the consumer passes `value`, `count`.
- `RatingInput`: the consumer passes `legend`, `value` + `onChange` or `defaultValue`. It is 5 real radio buttons, so arrow keys work, and a word for the chosen level ("Good", "Excellent") sits next to the stars.
- Only show `RatingInput` when the order is `completed` and belongs to that customer (D-10).

Preview: [reference gallery](../reference/gallery.html#c-Rating)
