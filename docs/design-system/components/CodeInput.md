# CodeInput

One-time code entry: the 6-digit code mailed at sign-up (FR-009, `/register/verify`). The admin two-step screen
keeps its single `Field` for now.

- **One real input, six boxes.** A single `<input>` sits transparent over six `surface-raised` boxes, so paste,
  the browser's `one-time-code` autofill and screen readers behave exactly as with any text field. Never split it
  into six inputs.
- Props: `id`, `label` (required, visible), `value`, `onChange`, `onComplete` (called once, when the last digit goes
  in), `length` (default 6), `invalid`, `disabled`, `describedBy`, `ref`.
- Digits only. A pasted `123 456` or `123-456` becomes `123456`; there is no `maxLength` on purpose, or the browser
  would cut a pasted code before the spaces are stripped.
- The box for the next digit shows the 2px `focus` ring while the input has focus. `invalid` turns every border
  `danger`; `disabled` turns the boxes `surface-sunken` with `ink-muted` digits.
- Digits are `font-mono` 28px. No `font-hand`: this is a form control.
- The page owns everything around it: the hint under the boxes (linked with `describedBy`), the error `Banner`
  above, and a submit button that works even though `onComplete` can submit on its own. Clear the value and give
  focus back after a wrong code.
- 44px boxes (48px from `sm`) with 8px gaps fit a 375px screen inside a card with 16px padding.

Used in: `frontend/src/pages/auth/VerifyEmail`. Prototype: `docs/prototype/public/verify-email.html` (`.pt-code`).
