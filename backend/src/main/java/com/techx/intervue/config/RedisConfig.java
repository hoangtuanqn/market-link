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
        // additional configuration
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
        // If Redis is down, the rate limit fails open (Bucket4jChatRateLimiter). Lettuce's default
        // timeout is
        // 10s, enough to make every message send hang for 10 seconds while Redis is still down —
        // cut it down to
        // 2s so that "lost the anti-spam layer" does not turn into "chat freezes".
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
     * FR-115 / spec §8.4: bucket4j keeps its buckets in Redis through the existing RedisClient. The
     * key is a string, so wrap ProxyManager&lt;byte[]&gt; with withMapper so the service does not
     * have to convert the type itself.
     *
     * <p><b>@Lazy is required, not an optimization.</b> builderFor(RedisClient) calls
     * redisClient.connect(...) directly — it connects the moment the bean is created. Without
     * laziness, a Redis that is not up at startup would break the whole context: products, login,
     * orders all die with it, not just chat. With laziness the first use connects, and the failure
     * at that point falls into the fail-open branch of Bucket4jChatRateLimiter.
     * RedisDownStartupTest pins this down.
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
