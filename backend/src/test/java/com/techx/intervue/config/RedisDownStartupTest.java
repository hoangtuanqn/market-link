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
 * Trước khi có FR-115, Redis là phụ thuộc mềm: RedisClient.create(url) và RedisConnectionFactory
 * đều lười, nên backend vẫn khởi động khi Redis chưa lên.
 *
 * <p>bucket4j phá điều đó: LettuceBasedProxyManager.builderFor(RedisClient) gọi thẳng
 * redisClient.connect(...) — nối ngay, chặn, ngay lúc tạo bean (đã kiểm bằng javap trên jar
 * 8.10.1). Nếu bean đó không lười thì Redis chết lúc khởi động sẽ kéo sập **cả ứng dụng**: sản
 * phẩm, đăng nhập, đơn hàng, tất cả — chứ không riêng chat. Test này ghim rằng context vẫn lên được
 * khi không có Redis nào để nối.
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
     * Không gọi getBean(...) ở đây: lấy bean theo tên thì Spring dựng nó ngay và cố nối Redis. Thứ
     * phải đúng là chính định nghĩa bean được đánh dấu lười — đó là điều giữ cho context lên được ở
     * test trên, và là điều một lần xoá @Lazy sẽ phá.
     */
    @Test
    void theBucketProxyManagerBeanIsLazySoNothingConnectsAtStartup() {
        ConfigurableListableBeanFactory factory =
                ((ConfigurableApplicationContext) context).getBeanFactory();

        assertThat(factory.getBeanDefinition("chatRateLimitBuckets").isLazyInit()).isTrue();
        // Và chưa có ai dựng nó trong suốt quá trình khởi động
        assertThat(factory.containsSingleton("chatRateLimitBuckets")).isFalse();
    }
}
