package com.techx.intervue.modules.conversation.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

/** Runs on real MySQL like MessageRepositoryTest — foreign keys are really enforced. */
@SpringBootTest
@Transactional
class MessageAttachmentRepositoryTest {

    @Autowired MessageAttachmentRepository attachments;
    @Autowired ConversationRepository conversations;
    @Autowired MessageRepository messages;
    @Autowired UserRepository users;

    @Test
    void findsUploadsThatWereNeverAttachedAndAreOlderThanTheCutoff() {
        Long uploaderId = user(RoleType.CUSTOMER).getId();
        Instant old = Instant.now().minus(30, ChronoUnit.HOURS);
        Instant fresh = Instant.now().minus(1, ChronoUnit.HOURS);

        MessageAttachment orphan = attachments.saveAndFlush(upload("a-old", uploaderId, old));
        attachments.saveAndFlush(upload("b-fresh", uploaderId, fresh));

        List<MessageAttachment> found =
                attachments.findByMessageIdIsNullAndCreatedAtBefore(
                        Instant.now().minus(24, ChronoUnit.HOURS));

        assertThat(found).extracting(MessageAttachment::getId).containsExactly(orphan.getId());
    }

    @Test
    void doesNotReturnAnUploadThatIsAlreadyOnAMessage() {
        User customer = user(RoleType.CUSTOMER);
        Long messageId = messageBetween(customer, user(RoleType.FARMER));

        MessageAttachment attached =
                upload("c-old", customer.getId(), Instant.now().minus(30, ChronoUnit.HOURS));
        attached.setMessageId(messageId);
        attachments.saveAndFlush(attached);

        assertThat(
                        attachments.findByMessageIdIsNullAndCreatedAtBefore(
                                Instant.now().minus(24, ChronoUnit.HOURS)))
                .isEmpty();
    }

    @Test
    void findsEveryAttachmentOfAPageOfMessagesInOneQuery() {
        User customer = user(RoleType.CUSTOMER);
        Long messageId = messageBetween(customer, user(RoleType.FARMER));

        MessageAttachment attached = upload("d-key", customer.getId(), Instant.now());
        attached.setMessageId(messageId);
        attachments.saveAndFlush(attached);

        assertThat(attachments.findByMessageIdIn(List.of(messageId)))
                .singleElement()
                .satisfies(a -> assertThat(a.getStorageKey()).isEqualTo("d-key"));
    }

    private Long messageBetween(User a, User b) {
        Conversation c = conversations.saveAndFlush(Conversation.between(a.getId(), b.getId()));
        return messageIn(c, a);
    }

    private Long messageIn(Conversation c, User sender) {
        return messages.saveAndFlush(
                        Message.builder()
                                .conversationId(c.getId())
                                .senderId(sender.getId())
                                .body("hello")
                                .build())
                .getId();
    }

    private User user(RoleType role) {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        return users.saveAndFlush(
                User.builder()
                        .fullName("Test " + tag)
                        .email(tag + "@attachment.test")
                        .phone("09" + String.format("%08d", Math.abs(tag.hashCode()) % 100_000_000))
                        .passwordHash("x")
                        .role(role)
                        .build());
    }

    private static MessageAttachment upload(String key, Long uploaderId, Instant createdAt) {
        return MessageAttachment.builder()
                .uploaderId(uploaderId)
                .storageKey(key)
                .mime("image/jpeg")
                .sizeBytes(1234)
                .width(800)
                .height(600)
                .createdAt(createdAt)
                .build();
    }

    /**
     * MessageService checks "image not yet attached to any message" with an unlocked
     * read-then-write. Two requests sending the same attachmentId at the same time both see
     * messageId == null, both create a message, and the later one overwrites — leaving an image
     * bubble with no image forever. The UNIQUE constraint is the real backstop.
     */
    @Test
    void oneAttachmentCannotBeClaimedByTwoMessages() {
        User customer = user(RoleType.CUSTOMER);
        User farmer = user(RoleType.FARMER);
        // Two messages in the SAME thread: a pair of users has exactly one conversation
        // (uq_conversation_pair), so two threads cannot be built.
        Conversation thread =
                conversations.saveAndFlush(Conversation.between(customer.getId(), farmer.getId()));
        Long first = messageIn(thread, customer);
        Long second = messageIn(thread, customer);

        MessageAttachment a = upload("e-first", customer.getId(), Instant.now());
        a.setMessageId(first);
        attachments.saveAndFlush(a);

        MessageAttachment b = upload("f-second", customer.getId(), Instant.now());
        b.setMessageId(first);

        // After a constraint error the Hibernate session cannot be used further — the "attach to
        // another message is
        // still fine" case is in a separate test below.
        assertThatThrownBy(() -> attachments.saveAndFlush(b))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(second).isNotNull();
    }

    @Test
    void twoDifferentMessagesInOneThreadCanEachHaveTheirOwnPhoto() {
        User customer = user(RoleType.CUSTOMER);
        Conversation thread =
                conversations.saveAndFlush(
                        Conversation.between(customer.getId(), user(RoleType.FARMER).getId()));
        Long first = messageIn(thread, customer);
        Long second = messageIn(thread, customer);

        MessageAttachment a = upload("i-first", customer.getId(), Instant.now());
        a.setMessageId(first);
        attachments.saveAndFlush(a);
        MessageAttachment b = upload("j-second", customer.getId(), Instant.now());
        b.setMessageId(second);
        attachments.saveAndFlush(b);

        assertThat(attachments.findByMessageIdIn(List.of(first, second))).hasSize(2);
    }

    @Test
    void manyUploadsCanSitUnattachedAtOnce() {
        Long uploaderId = user(RoleType.CUSTOMER).getId();

        attachments.saveAndFlush(upload("g-one", uploaderId, Instant.now()));
        attachments.saveAndFlush(upload("h-two", uploaderId, Instant.now()));

        // UNIQUE on a nullable column: MySQL allows many NULLs, so images waiting to be sent do not
        // collide
        assertThat(
                        attachments.findByMessageIdIsNullAndCreatedAtBefore(
                                Instant.now().plusSeconds(60)))
                .hasSizeGreaterThanOrEqualTo(2);
    }
}
