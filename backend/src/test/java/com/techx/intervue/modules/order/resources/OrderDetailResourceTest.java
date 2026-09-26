package com.techx.intervue.modules.order.resources;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Controller ruling C5-16: {@code customer} must be ABSENT from the JSON when the caller is not the
 * Farmer who owns the order — not {@code "customer": null}. {@code customerNote}/{@code farmerNote}
 * are unaffected: {@code @JsonInclude} sits only on the {@code customer} component, not on the
 * whole record. Serialized through the exact {@code ObjectMapper} bean configuration of {@code
 * AppConfig} — this JSON test proves what the user really receives, not just an accessor call.
 */
class OrderDetailResourceTest {

    private final ObjectMapper mapper =
            new ObjectMapper()
                    .registerModule(new JavaTimeModule())
                    .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static OrderListItemResource summary() {
        return new OrderListItemResource(
                1L,
                "ML-20260926-ABCD",
                "placed",
                10L,
                "Vườn Út Hiền",
                2L,
                "Chợ Bà Chiểu",
                "2026-09-29",
                "07:00",
                "08:00",
                "2026-09-28T18:00:00Z",
                new BigDecimal("39000"),
                1,
                "2026-09-26T02:00:00Z");
    }

    @Test
    void customerIsAbsentFromJsonWhenTheCallerIsNotTheOwningFarmer() throws Exception {
        OrderDetailResource detail =
                new OrderDetailResource(
                        summary(), List.of(), List.of(), true, true, null, null, null);

        String json = mapper.writeValueAsString(detail);

        assertThat(json).doesNotContain("\"customer\"");
        assertThat(json).contains("\"customerNote\":null");
        assertThat(json).contains("\"farmerNote\":null");
    }

    @Test
    void customerIsPresentInJsonWhenTheCallerIsTheOwningFarmer() throws Exception {
        CustomerSummaryResource customer =
                new CustomerSummaryResource(
                        7L, "Nguyễn Văn An", "0900000002", "customer@marketlink.vn");
        OrderDetailResource detail =
                new OrderDetailResource(
                        summary(), List.of(), List.of(), false, false, null, null, customer);

        String json = mapper.writeValueAsString(detail);

        assertThat(json).contains("\"customer\":{");
        assertThat(json).contains("\"userId\":7");
        assertThat(json).contains("\"customerNote\":null");
    }
}
