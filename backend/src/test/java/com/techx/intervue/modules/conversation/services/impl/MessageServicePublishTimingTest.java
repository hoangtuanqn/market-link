package com.techx.intervue.modules.conversation.services.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ConversationServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.MessageServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Review finding #2 — hợp đồng của seam (spec 7.5): sự kiện chỉ được phát SAU khi transaction
 * commit. Plan 2 cắm STOMP vào ChatEventPublisherInterface mà không sửa service, nên service phải
 * bảo đảm điều này chứ không phải từng bản cài đặt.
 */
@SpringBootTest
class MessageServicePublishTimingTest {

    @Autowired MessageServiceInterface messageService;
    @Autowired ConversationServiceInterface conversationService;
    @Autowired ConversationRepository conversations;
    @Autowired UserRepository users;
    @Autowired PlatformTransactionManager txManager;

    @MockitoBean ChatEventPublisherInterface events;

    User customer;
    User farmer;
    Conversation thread;

    @BeforeEach
    void setUp() {
        customer = newUser(RoleType.CUSTOMER);
        farmer = newUser(RoleType.FARMER);
        thread = conversations.save(Conversation.between(customer.getId(), farmer.getId()));
    }

    @AfterEach
    void tearDown() {
        conversations.deleteById(thread.getId()); // messages cascade at the DB
        users.deleteById(customer.getId());
        users.deleteById(farmer.getId());
    }

    private User newUser(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return users.save(
                User.builder()
                        .fullName("Test " + tag)
                        .email(tag + "@timing.test")
                        .phone("07" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build());
    }

    @Test
    void messageCreatedIsPublishedOnlyAfterTheTransactionCommits() {
        new TransactionTemplate(txManager)
                .executeWithoutResult(
                        status -> {
                            messageService.send(
                                    customer.getId(),
                                    thread.getId(),
                                    new SendMessageRequest(null, "hello", null, null));
                            verify(events, never()).messageCreated(any(), any());
                        });

        verify(events).messageCreated(any(), any());
    }

    @Test
    void conversationReadIsPublishedOnlyAfterTheTransactionCommits() {
        new TransactionTemplate(txManager)
                .executeWithoutResult(
                        status -> {
                            conversationService.markRead(farmer.getId(), thread.getId());
                            verify(events, never()).conversationRead(any(), any(), any());
                        });

        verify(events).conversationRead(any(), any(), any());
    }
}
