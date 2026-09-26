package com.techx.intervue.modules.order.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/** POST /orders/preview — giỏ hàng client gửi lên để server tách theo stall (D-01). */
public record PreviewRequest(@NotEmpty @Valid List<CartLine> items) {}
