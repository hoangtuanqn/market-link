package com.techx.intervue.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.test.context.TestPropertySource;

/**
 * Before FR-115, Redis was a soft dependency: RedisClient.create(url) and RedisConnectionFactory
 * are both lazy, so the backend still starts when Redis is not up.
 *
 * <p>bucket4j breaks that: LettuceBasedProxyManager.builderFor(RedisClient) calls
 * redisClient.connect(...) directly — connecting immediately, blocking, at bean creation time
 * (checked with javap on the 8.10.1 jar). If that bean is not lazy, a Redis that is down at startup
 * would take down **the whole application**: products, login, orders, everything — not just chat.
 * This test pins that the context can still come up when there is no Redis to connect to.
 */
@SpringBootTest
@TestPropertySource(
        properties = {
            "spring.data.redis.host=redis-that-does-not-exist.invalid",
            "spring.data.redis.port=6399"
        })
class RedisDownStartupTest {

    @Autowired ApplicationContext context;

    @Test
    void theApplicationStartsEvenWhenRedisCannotBeReached() {
        assertThat(context.containsBean("chatRateLimitBuckets")).isTrue();
    }

    /**
     * Do not call getBean(...) here: fetching the bean by name makes Spring build it right away and
     * try to connect to Redis. What must be right is the bean definition itself being marked lazy —
     * that is what lets the context come up in the test above, and what a single removal of @Lazy
     * would break.
     */
    @Test
    void theBucketProxyManagerBeanIsLazySoNothingConnectsAtStartup() {
        ConfigurableListableBeanFactory factory =
                ((ConfigurableApplicationContext) context).getBeanFactory();

        assertThat(factory.getBeanDefinition("chatRateLimitBuckets").isLazyInit()).isTrue();
        // And nobody built it during the whole startup
        assertThat(factory.containsSingleton("chatRateLimitBuckets")).isFalse();
    }
}
