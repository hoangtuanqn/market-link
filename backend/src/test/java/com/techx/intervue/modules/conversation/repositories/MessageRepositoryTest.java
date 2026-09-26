package com.techx.intervue.modules.conversation.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs on real MySQL (like IntervueApplicationTests / CI). Pins the bug found in the smoke test:
 * reading and sending in the same second, a new message must not be counted as unread if the column
 * is only accurate to the second.
 */
@SpringBootTest
@Transactional
class MessageRepositoryTest {

    @Autowired ConversationRepository conversations;
    @Autowired MessageRepository messages;
    @Autowired UserRepository users;

    private User user(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return users.save(
                User.builder()
                        .fullName("Test " + tag)
                        .email(tag + "@precision.test")
                        .phone("09" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build());
    }

    @Test
    void aMessageSentLaterInTheSameSecondAsTheReadMarkerIsStillUnread() {
        User customer = user(RoleType.CUSTOMER);
        User farmer = user(RoleType.FARMER);
        Conversation c = Conversation.between(customer.getId(), farmer.getId());
        // Both markers round to :00 if the column is only accurate to the second (MySQL rounds, it
        // does not truncate).
        c.markRead(customer.getId(), Instant.parse("2026-09-25T06:00:00.100Z"));
        c = conversations.saveAndFlush(c);

        messages.saveAndFlush(
                Message.builder()
                        .conversationId(c.getId())
                        .senderId(farmer.getId())
                        .body("sent 300ms after the read marker")
                        .createdAt(Instant.parse("2026-09-25T06:00:00.400Z"))
                        .build());

        assertThat(messages.countUnread(customer.getId())).isEqualTo(1);
        assertThat(messages.countUnreadByConversation(customer.getId(), List.of(c.getId())))
                .singleElement()
                .satisfies(row -> assertThat(row.getTotal()).isEqualTo(1L));
    }
}
