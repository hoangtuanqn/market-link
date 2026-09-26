package com.techx.intervue.modules.conversation.services.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.realtime.StompChatEventPublisher;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.services.interfaces.ConversationServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.MessageServiceInterface;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
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
 * Review finding #2 — the seam's contract (spec 7.5): an event may only be published AFTER the
 * transaction commits. Plan 2 plugs STOMP into ChatEventPublisherInterface without touching the
 * service, so the service must guarantee this, not each implementation.
 */
@SpringBootTest
class MessageServicePublishTimingTest {

    @Autowired MessageServiceInterface messageService;
    @Autowired ConversationServiceInterface conversationService;
    @Autowired ConversationRepository conversations;
    @Autowired UserRepository users;
    @Autowired FarmerProfileRepository farmerProfiles;
    @Autowired PlatformTransactionManager txManager;

    // Mock the exact concrete class: TypingController / PresenceEventListener inject
    // StompChatEventPublisher,
    // a mock of the interface alone would leave the context without a bean of that type.
    @MockitoBean StompChatEventPublisher events;

    User customer;
    User farmer;
    FarmerProfile farmerProfile;
    Conversation thread;

    @BeforeEach
    void setUp() {
        customer = newUser(RoleType.CUSTOMER);
        farmer = newUser(RoleType.FARMER);
        // StallAccessPolicy looks up farmer_profiles (spec §8.1): a farmer role with no approved
        // row
        // is not an open stall, and send() returns 409.
        farmerProfile = approvedStallFor(farmer);
        thread = conversations.save(Conversation.between(customer.getId(), farmer.getId()));
    }

    @AfterEach
    void tearDown() {
        conversations.deleteById(thread.getId()); // messages cascade at the DB
        farmerProfiles.deleteById(farmerProfile.getId());
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

    private FarmerProfile approvedStallFor(User owner) {
        FarmerProfile profile = new FarmerProfile();
        profile.setUserId(owner.getId());
        profile.setStallName("Timing stall");
        profile.setContactPerson(owner.getFullName());
        profile.setApprovalStatus(ApprovalStatus.APPROVED);
        return farmerProfiles.save(profile);
    }

    @Test
    void messageCreatedIsPublishedOnlyAfterTheTransactionCommits() {
        new TransactionTemplate(txManager)
                .executeWithoutResult(
                        status -> {
                            messageService.send(
                                    customer.getId(),
                                    thread.getId(),
                                    new SendMessageRequest(null, "hello", null, null, null));
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
