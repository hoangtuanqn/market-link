package com.techx.intervue.modules.product.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "app.chat.rabbitmq.host=")
class DealsPublicAccessTest {

    @LocalServerPort int port;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> get(String path) throws Exception {
        return http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void anyoneCanReadTheDeals() throws Exception {
        HttpResponse<String> r = get("/api/v1/deals?pageSize=4");

        assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
        assertThat(r.body()).contains("\"success\":true").contains("\"items\"");
    }

    @Test
    void aDayThatIsNotANumberIs400() throws Exception {
        HttpResponse<String> r = get("/api/v1/deals?day=saturday");

        assertThat(r.statusCode()).as(r.body()).isEqualTo(400);
        assertThat(r.body()).contains("VALIDATION_ERROR");
    }

    @Test
    void aStallsOwnDealsNeedASignIn() throws Exception {
        assertThat(get("/api/v1/farmer/deals").statusCode()).isEqualTo(401);
    }
}
