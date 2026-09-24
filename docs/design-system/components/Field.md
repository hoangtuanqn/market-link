# Field

Text input with a label, hint and error message. Used in Customer/Farmer registration, the product form, the feedback form and the review form.

- The consumer passes `label` (required), `required`, `hint`, `error`, and `as` (`input` | `textarea` | `select`; for `select`, pass `<option>` elements as children). All other props go to the input.
- `error` is wired to the input with `aria-describedby` and `aria-invalid`. Only show errors after the field loses focus or on submit, never while the user is typing.
- Error text says how to fix it ("Phone number needs 10 digits"), never just "Invalid".

Preview: [reference gallery](../reference/gallery.html#c-Field)
