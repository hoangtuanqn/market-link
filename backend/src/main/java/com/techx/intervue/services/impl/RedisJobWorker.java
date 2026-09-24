package com.techx.intervue.services.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.resources.QueueJob;
import com.techx.intervue.services.interfaces.JobHandler;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Một thread nền BRPOP hàng đợi Redis và gọi JobHandler tương ứng. Lỗi thì đẩy lại job, quá
 * MAX_ATTEMPTS lần thì bỏ và ghi log. Tắt bằng app.jobs.worker-enabled=false.
 */
@Slf4j
@Component
public class RedisJobWorker {

    private static final int MAX_ATTEMPTS = 3;
    private static final Duration POLL_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration REDIS_DOWN_BACKOFF = Duration.ofSeconds(5);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final RedisJobQueue queue;
    private final Map<String, JobHandler> handlers;
    private final boolean enabled;

    private volatile boolean running;
    private Thread thread;

    public RedisJobWorker(
            StringRedisTemplate redis,
            ObjectMapper objectMapper,
            RedisJobQueue queue,
            List<JobHandler> handlers,
            @Value("${app.jobs.worker-enabled:true}") boolean enabled) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.queue = queue;
        this.handlers =
                handlers.stream().collect(Collectors.toMap(JobHandler::type, Function.identity()));
        this.enabled = enabled;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        if (!enabled) return;
        running = true;
        thread = Thread.ofPlatform().name("redis-job-worker").daemon().start(this::loop);
        log.info("Job worker đã chạy, handler: {}", handlers.keySet());
    }

    @PreDestroy
    public void stop() {
        running = false;
        if (thread != null) thread.interrupt();
    }

    private void loop() {
        while (running) {
            String raw;
            try {
                raw = redis.opsForList().rightPop(RedisJobQueue.QUEUE_KEY, POLL_TIMEOUT);
            } catch (RuntimeException e) {
                if (!running) return;
                log.warn("Không đọc được hàng đợi Redis: {}", e.getMessage());
                sleep(REDIS_DOWN_BACKOFF);
                continue;
            }
            if (raw != null) process(raw);
        }
    }

    void process(String raw) {
        QueueJob job;
        try {
            job = objectMapper.readValue(raw, QueueJob.class);
        } catch (Exception e) {
            log.error("Bỏ job không đọc được: {}", e.getMessage());
            return;
        }
        JobHandler handler = handlers.get(job.type());
        if (handler == null) {
            log.error("Bỏ job không có handler: {}", job.type());
            return;
        }
        try {
            handler.handle(job.payload());
        } catch (Exception e) {
            int attempts = job.attempts() + 1;
            if (attempts < MAX_ATTEMPTS) {
                log.warn("Job {} lỗi lần {}, thử lại: {}", job.type(), attempts, e.getMessage());
                queue.push(new QueueJob(job.type(), job.payload(), attempts));
            } else {
                log.error("Job {} lỗi {} lần, bỏ qua", job.type(), attempts, e);
            }
        }
    }

    private static void sleep(Duration duration) {
        try {
            Thread.sleep(duration);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
