package com.techx.intervue.modules.notification.push;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import com.techx.intervue.modules.notification.entities.PushSubscription;
import com.techx.intervue.modules.notification.repositories.PushSubscriptionRepository;
import com.techx.intervue.modules.notification.resources.Alert;
import com.techx.intervue.modules.notification.resources.NotificationPayload;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PublicKey;
import java.security.Security;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import nl.martijndwars.webpush.Utils;
import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jce.spec.ECNamedCurveParameterSpec;
import org.bouncycastle.jce.spec.ECPublicKeySpec;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

/**
 * The real send path through the web-push library to a fake push service on the machine, then
 * decrypt per RFC 8291 with the "browser's" key — if the encryption is wrong then a real browser
 * could not read it either.
 */
@SpringBootTest
@TestPropertySource(
        properties = {
            "app.chat.rabbitmq.host=",
            "app.push.vapid-public-key=" + WebPushConfigTest.TEST_PUBLIC,
            "app.push.vapid-private-key=" + WebPushConfigTest.TEST_PRIVATE
        })
class WebPushSenderTest {

    @Autowired WebPushSender sender;
    @Autowired PushSubscriptionRepository subscriptions;
    @Autowired UserRepository users;

    HttpServer server;
    final AtomicReference<byte[]> received = new AtomicReference<>();
    final AtomicReference<String> authorization = new AtomicReference<>();
    volatile int status = 201;
    KeyPair browser;
    byte[] authSecret;
    User owner;

    @BeforeEach
    void setUp() throws Exception {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        KeyPairGenerator gen =
                KeyPairGenerator.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME);
        gen.initialize(ECNamedCurveTable.getParameterSpec("prime256v1"));
        browser = gen.generateKeyPair();
        authSecret = new byte[16];
        new java.security.SecureRandom().nextBytes(authSecret);

        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(
                "/push",
                ex -> {
                    authorization.set(ex.getRequestHeaders().getFirst("Authorization"));
                    received.set(ex.getRequestBody().readAllBytes());
                    ex.sendResponseHeaders(status, -1);
                    ex.close();
                });
        server.start();

        String tag = UUID.randomUUID().toString().substring(0, 8);
        owner =
                users.save(
                        User.builder()
                                .fullName("Push " + tag)
                                .email(tag + "@push.test")
                                .phone(
                                        "04"
                                                + String.format(
                                                        "%08d",
                                                        Math.abs(tag.hashCode()) % 100_000_000))
                                .passwordHash("x")
                                .role(RoleType.CUSTOMER)
                                .build());
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
        users.deleteById(owner.getId());
    }

    private PushSubscription subscribe() {
        return subscriptions.save(
                PushSubscription.builder()
                        .userId(owner.getId())
                        .endpoint(
                                "http://127.0.0.1:"
                                        + server.getAddress().getPort()
                                        + "/push/"
                                        + UUID.randomUUID())
                        .p256dh(
                                b64(
                                        Utils.encode(
                                                (org.bouncycastle.jce.interfaces.ECPublicKey)
                                                        browser.getPublic())))
                        .auth(b64(authSecret))
                        .build());
    }

    private static NotificationPayload payload() {
        return new NotificationPayload(
                5L,
                "farmer_approved",
                "Sạp của bạn đã được duyệt",
                "Cô Tư Garden đã được duyệt.",
                "/farmer",
                Instant.parse("2026-09-26T02:00:00Z"),
                true,
                1,
                new Alert(true, true, true),
                null);
    }

    @Test
    void aDeliveredPushDecryptsToThePayloadAndMarksTheDeviceUsed() throws Exception {
        PushSubscription s = subscribe();

        sender.sendNow(owner.getId(), payload());

        assertThat(authorization.get()).startsWith("vapid t=");
        String json = new String(decrypt(received.get()), StandardCharsets.UTF_8);
        assertThat(json)
                .contains("\"title\":\"Sạp của bạn đã được duyệt\"")
                .contains("\"link\":\"/farmer\"")
                .contains("\"tag\":\"farmer_approved:5\"");
        assertThat(subscriptions.findById(s.getId()).orElseThrow().getLastUsedAt()).isNotNull();
    }

    @Test
    void aGoneSubscriptionIsDeleted() {
        status = 410;
        PushSubscription s = subscribe();

        sender.sendNow(owner.getId(), payload());

        assertThat(subscriptions.findById(s.getId())).isEmpty();
    }

    @Test
    void anotherErrorKeepsTheSubscription() {
        status = 500;
        PushSubscription s = subscribe();

        sender.sendNow(owner.getId(), payload());

        assertThat(subscriptions.findById(s.getId())).isPresent();
    }

    // --- RFC 8291 on the browser side ---

    private byte[] decrypt(byte[] body) throws Exception {
        ByteBuffer in = ByteBuffer.wrap(body);
        byte[] salt = new byte[16];
        in.get(salt);
        in.getInt(); // record size
        byte[] asPublic = new byte[in.get() & 0xff];
        in.get(asPublic);
        byte[] cipherText = new byte[in.remaining()];
        in.get(cipherText);

        byte[] uaPublic =
                Utils.encode((org.bouncycastle.jce.interfaces.ECPublicKey) browser.getPublic());
        KeyAgreement ka = KeyAgreement.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME);
        ka.init(browser.getPrivate());
        ka.doPhase(publicKey(asPublic), true);
        byte[] ecdh = ka.generateSecret();

        byte[] prkKey = hmac(authSecret, ecdh);
        byte[] keyInfo =
                concat("WebPush: info\0".getBytes(StandardCharsets.US_ASCII), uaPublic, asPublic);
        byte[] ikm = hmac(prkKey, concat(keyInfo, new byte[] {1}));
        byte[] prk = hmac(salt, ikm);
        byte[] cek =
                Arrays.copyOf(
                        hmac(
                                prk,
                                concat("Content-Encoding: aes128gcm\0".getBytes(), new byte[] {1})),
                        16);
        byte[] nonce =
                Arrays.copyOf(
                        hmac(prk, concat("Content-Encoding: nonce\0".getBytes(), new byte[] {1})),
                        12);

        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(
                Cipher.DECRYPT_MODE,
                new SecretKeySpec(cek, "AES"),
                new GCMParameterSpec(128, nonce));
        byte[] padded = c.doFinal(cipherText);
        int end = padded.length - 1;
        while (end >= 0 && padded[end] == 0) end--;
        assertThat(padded[end]).as("last-record delimiter").isEqualTo((byte) 2);
        return Arrays.copyOf(padded, end);
    }

    private static PublicKey publicKey(byte[] point) throws Exception {
        ECNamedCurveParameterSpec spec = ECNamedCurveTable.getParameterSpec("prime256v1");
        return KeyFactory.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME)
                .generatePublic(new ECPublicKeySpec(spec.getCurve().decodePoint(point), spec));
    }

    private static byte[] hmac(byte[] key, byte[] data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    private static byte[] concat(byte[]... parts) {
        int n = 0;
        for (byte[] p : parts) n += p.length;
        ByteBuffer b = ByteBuffer.allocate(n);
        for (byte[] p : parts) b.put(p);
        return b.array();
    }

    private static String b64(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
