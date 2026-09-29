package com.techx.intervue.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.test.context.TestPropertySource;

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

    @Test
    void theBucketProxyManagerBeanIsLazySoNothingConnectsAtStartup() {
        ConfigurableListableBeanFactory factory =
                ((ConfigurableApplicationContext) context).getBeanFactory();

        assertThat(factory.getBeanDefinition("chatRateLimitBuckets").isLazyInit()).isTrue();
        assertThat(factory.containsSingleton("chatRateLimitBuckets")).isFalse();
    }
}
