package com.techx.intervue.config;

import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.ClientOptions;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.SocketOptions;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Value("${spring.data.redis.host:localhost}")
    private String host;

    @Value("${spring.data.redis.port:6379}")
    private int port;

    @Value("${spring.data.redis.password:}")
    private String password;

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        // cấu hình thêm
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());

        RedisSerializer<Object> jsonRedisSerializer =
                GenericJacksonJsonRedisSerializer.create(builder -> {});
        template.setValueSerializer(jsonRedisSerializer);
        template.setHashValueSerializer(jsonRedisSerializer);

        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public RedisClient redisClient() {
        String url =
                password.isBlank()
                        ? "redis://" + host + ":" + port
                        : "redis://:" + password + "@" + host + ":" + port;

        RedisURI uri = RedisURI.create(url);
        uri.setTimeout(Duration.ofSeconds(2));
        RedisClient client = RedisClient.create(uri);
        // Redis chết thì rate limit fail-open (Bucket4jChatRateLimiter). Timeout mặc định của
        // Lettuce là 10s, đủ để mỗi lần gửi tin treo 10 giây trong lúc Redis còn sập — cắt xuống
        // 2s để "mất lớp chống spam" không biến thành "chat đứng hình".
        client.setOptions(
                ClientOptions.builder()
                        .socketOptions(
                                SocketOptions.builder()
                                        .connectTimeout(Duration.ofSeconds(2))
                                        .build())
                        .build());
        return client;
    }

    /**
     * FR-115 / spec §8.4: bucket4j lưu bucket trên Redis qua RedisClient đã có. Khoá là chuỗi nên
     * bọc ProxyManager&lt;byte[]&gt; lại bằng withMapper để service không phải tự đổi kiểu.
     *
     * <p><b>@Lazy là bắt buộc, không phải tối ưu.</b> builderFor(RedisClient) gọi thẳng
     * redisClient.connect(...) — nối ngay lúc tạo bean. Không lười thì Redis chưa lên lúc khởi động
     * sẽ làm hỏng cả context: sản phẩm, đăng nhập, đơn hàng đều chết theo, chứ không riêng chat.
     * Lười thì lần dùng đầu mới nối, và lỗi lúc đó rơi vào nhánh fail-open của
     * Bucket4jChatRateLimiter. RedisDownStartupTest ghim điều này.
     */
    @Lazy
    @Bean
    public ProxyManager<String> chatRateLimitBuckets(RedisClient redisClient) {
        return LettuceBasedProxyManager.builderFor(redisClient)
                .withExpirationStrategy(
                        ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(
                                Duration.ofHours(2)))
                .build()
                .withMapper(key -> key.getBytes(StandardCharsets.UTF_8));
    }
}
