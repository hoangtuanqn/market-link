package com.techx.intervue.modules.conversation.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Review finding #1: two people act on one thread. A is sending a message (thread already loaded)
 * while B marks it read and commits. When A commits, A's UPDATE must not overwrite the read marker
 * B just saved — otherwise B's badge shows the unread count again for messages B just read.
 */
@SpringBootTest
class ConversationReadMarkerConcurrencyTest {

    @Autowired ConversationRepository conversations;
    @Autowired UserRepository users;
    @Autowired PlatformTransactionManager txManager;

    User a;
    User b;
    Conversation thread;

    @BeforeEach
    void setUp() {
        a = newUser(RoleType.CUSTOMER);
        b = newUser(RoleType.FARMER);
        thread = conversations.save(Conversation.between(a.getId(), b.getId()));
    }

    @AfterEach
    void tearDown() {
        conversations.deleteById(thread.getId());
        users.deleteById(a.getId());
        users.deleteById(b.getId());
    }

    private User newUser(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return users.save(
                User.builder()
                        .fullName("Test " + tag)
                        .email(tag + "@concurrency.test")
                        .phone("08" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build());
    }

    @Test
    void aReadMarkerCommittedByTheOtherMemberSurvivesAConcurrentPreviewUpdate() {
        Instant bReadAt = Instant.parse("2026-09-25T06:00:00Z");
        TransactionTemplate outer = new TransactionTemplate(txManager);
        TransactionTemplate inner = new TransactionTemplate(txManager);
        inner.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        outer.executeWithoutResult(
                status -> {
                    // A: the thread is loaded (managed) BEFORE B reads — like MessageService.send
                    Conversation mine = conversations.findById(thread.getId()).orElseThrow();

                    // B: marks read and commits in a different transaction
                    inner.executeWithoutResult(
                            s2 -> {
                                Conversation theirs =
                                        conversations.findById(thread.getId()).orElseThrow();
                                theirs.markRead(b.getId(), bReadAt);
                                conversations.save(theirs);
                            });

                    // A: only changes the preview then commits
                    mine.noteNewMessage("preview", Instant.parse("2026-09-25T06:00:01Z"));
                    conversations.save(mine);
                });

        Conversation fresh = conversations.findById(thread.getId()).orElseThrow();
        assertThat(fresh.getLastMessageText()).isEqualTo("preview");
        assertThat(fresh.readAtOf(b.getId()))
                .as("B's read marker must not be erased by A's commit")
                .isEqualTo(bReadAt);
    }
}
