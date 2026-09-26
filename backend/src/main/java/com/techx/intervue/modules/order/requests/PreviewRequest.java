package com.techx.intervue.modules.order.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/** POST /orders/preview — the cart the client sends up, for the server to split by stall (D-01). */
public record PreviewRequest(@NotEmpty @Valid List<CartLine> items) {}
