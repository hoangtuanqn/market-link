package com.techx.intervue.modules.conversation.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hai truy vấn ngữ cảnh của admin (spec §8.3) KHÔNG lọc hidden_at, khác hẳn hai truy vấn mà
 * MessageService.list dùng — admin phải thấy được tin mình vừa ẩn.
 */
@SpringBootTest
@Transactional
class MessageRepositoryContextTest {

    @Autowired MessageRepository messages;
    @Autowired ConversationRepository conversations;
    @Autowired UserRepository users;

    @Test
    void takesAtMostFiveMessagesOnEachSideOfTheReportedOne() {
        Conversation thread = thread();
        List<Long> ids = new ArrayList<>();
        for (int i = 0; i < 13; i++) {
            ids.add(message(thread, "m" + i, null));
        }
        Long middle = ids.get(6);

        assertThat(
                        messages.findByConversationIdAndIdLessThanOrderByIdDesc(
                                thread.getId(), middle, PageRequest.of(0, 5)))
                .hasSize(5)
                .extracting(Message::getId)
                .containsExactly(ids.get(5), ids.get(4), ids.get(3), ids.get(2), ids.get(1));

        assertThat(
                        messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(
                                thread.getId(), middle, PageRequest.of(0, 5)))
                .hasSize(5)
                .extracting(Message::getId)
                .containsExactly(ids.get(7), ids.get(8), ids.get(9), ids.get(10), ids.get(11));
    }

    @Test
    void includesHiddenMessagesUnlikeTheMemberFacingQueries() {
        Conversation thread = thread();
        Long before = message(thread, "hidden one", Instant.now());
        Long middle = message(thread, "reported", null);

        assertThat(
                        messages.findByConversationIdAndIdLessThanOrderByIdDesc(
                                thread.getId(), middle, PageRequest.of(0, 5)))
                .extracting(Message::getId)
                .containsExactly(before);
        // Trong khi truy vấn của người dùng thường thì bỏ nó đi
        assertThat(
                        messages.findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(
                                thread.getId(), middle, PageRequest.of(0, 5)))
                .isEmpty();
    }

    @Test
    void neverCrossesIntoAnotherThread() {
        Conversation mine = thread();
        Conversation other = thread();
        Long middle = message(mine, "reported", null);
        message(other, "someone else's business", null);

        assertThat(
                        messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(
                                mine.getId(), middle, PageRequest.of(0, 5)))
                .isEmpty();
    }

    @Test
    void aThreadShorterThanTheWindowJustReturnsWhatItHas() {
        Conversation thread = thread();
        Long only = message(thread, "the only one", null);

        assertThat(
                        messages.findByConversationIdAndIdLessThanOrderByIdDesc(
                                thread.getId(), only, PageRequest.of(0, 5)))
                .isEmpty();
        assertThat(
                        messages.findByConversationIdAndIdGreaterThanOrderByIdAsc(
                                thread.getId(), only, PageRequest.of(0, 5)))
                .isEmpty();
    }

    private Conversation thread() {
        return conversations.saveAndFlush(
                Conversation.between(
                        user(RoleType.CUSTOMER).getId(), user(RoleType.FARMER).getId()));
    }

    private Long message(Conversation c, String body, Instant hiddenAt) {
        return messages.saveAndFlush(
                        Message.builder()
                                .conversationId(c.getId())
                                .senderId(c.getUserAId())
                                .body(body)
                                .hiddenAt(hiddenAt)
                                .build())
                .getId();
    }

    private User user(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return users.saveAndFlush(
                User.builder()
                        .fullName("Test " + tag)
                        .email(tag + "@context.test")
                        .phone("03" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build());
    }
}
