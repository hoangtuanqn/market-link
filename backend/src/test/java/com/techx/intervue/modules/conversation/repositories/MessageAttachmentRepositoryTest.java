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

/** Chạy trên MySQL thật như MessageRepositoryTest — khoá ngoại được thi hành thật sự. */
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
     * MessageService kiểm "ảnh chưa gắn tin nào" bằng read-then-write không khoá. Hai request gửi
     * cùng attachmentId cùng lúc đều thấy messageId == null, cả hai tạo tin, và cái sau ghi đè — để
     * lại một bong bóng ảnh vĩnh viễn không có ảnh. Ràng buộc UNIQUE là chốt chặn thật sự.
     */
    @Test
    void oneAttachmentCannotBeClaimedByTwoMessages() {
        User customer = user(RoleType.CUSTOMER);
        User farmer = user(RoleType.FARMER);
        // Hai tin trong CÙNG một thread: một cặp user chỉ có đúng một conversation
        // (uq_conversation_pair), nên không dựng hai thread được.
        Conversation thread =
                conversations.saveAndFlush(Conversation.between(customer.getId(), farmer.getId()));
        Long first = messageIn(thread, customer);
        Long second = messageIn(thread, customer);

        MessageAttachment a = upload("e-first", customer.getId(), Instant.now());
        a.setMessageId(first);
        attachments.saveAndFlush(a);

        MessageAttachment b = upload("f-second", customer.getId(), Instant.now());
        b.setMessageId(first);

        // Sau lỗi ràng buộc, session Hibernate không dùng tiếp được — ca "gắn vào tin khác thì
        // vẫn được" nằm ở test riêng bên dưới.
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

        // UNIQUE trên cột nullable: MySQL cho nhiều NULL, nên ảnh chờ gửi không đụng nhau
        assertThat(
                        attachments.findByMessageIdIsNullAndCreatedAtBefore(
                                Instant.now().plusSeconds(60)))
                .hasSizeGreaterThanOrEqualTo(2);
    }
}
