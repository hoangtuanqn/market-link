# QtyStepper

Quantity stepper for the cart and for editing an order.

- The consumer passes `value` + `onChange` (controlled) or `defaultValue`, plus `min` (default 1), `max` (the product's available stock), `unit`, and `label` (product name, for screen readers).
- The + button locks at `max` and the note changes to "Max N". It never allows ordering more than the stock (D-02); the server must still check.
- To remove an item, use a separate remove button. The stepper never goes to 0.

Preview: [reference gallery](../reference/gallery.html#c-QtyStepper)
