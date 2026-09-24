package com.techx.intervue.services.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.resources.QueueJob;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.util.Map;
import lombok.AllArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/** LPUSH vào list, RedisJobWorker BRPOP ở đầu kia nên job được xử lý theo thứ tự FIFO. */
@Service
@AllArgsConstructor
public class RedisJobQueue implements JobQueueInterface {

    public static final String QUEUE_KEY = "queue:jobs";

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    @Override
    public void enqueue(String type, Map<String, String> payload) {
        push(new QueueJob(type, payload, 0));
    }

    void push(QueueJob job) {
        try {
            redis.opsForList().leftPush(QUEUE_KEY, objectMapper.writeValueAsString(job));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not add the job to the queue.", e);
        }
    }
}
