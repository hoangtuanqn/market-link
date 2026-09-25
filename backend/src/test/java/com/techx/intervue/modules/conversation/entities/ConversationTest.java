package com.techx.intervue.modules.conversation.entities;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class ConversationTest {

    @Test
    void betweenAlwaysStoresTheSmallerIdFirst() {
        Conversation c = Conversation.between(7L, 3L);

        assertThat(c.getUserAId()).isEqualTo(3L);
        assertThat(c.getUserBId()).isEqualTo(7L);
    }

    @Test
    void betweenRefusesTheSameUserTwice() {
        assertThatThrownBy(() -> Conversation.between(5L, 5L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void membershipAndOtherMemberFollowThePair() {
        Conversation c = Conversation.between(3L, 7L);

        assertThat(c.hasMember(3L)).isTrue();
        assertThat(c.hasMember(7L)).isTrue();
        assertThat(c.hasMember(9L)).isFalse();
        assertThat(c.hasMember(null)).isFalse();
        assertThat(c.otherMember(3L)).isEqualTo(7L);
        assertThat(c.otherMember(7L)).isEqualTo(3L);
    }

    @Test
    void markReadWritesTheColumnOfThatMemberOnly() {
        Conversation c = Conversation.between(3L, 7L);
        Instant at = Instant.parse("2026-09-25T06:00:00Z");

        c.markRead(7L, at);

        assertThat(c.readAtOf(7L)).isEqualTo(at);
        assertThat(c.readAtOf(3L)).isNull();
    }

    @Test
    void noteNewMessageUpdatesPreviewAndTime() {
        Conversation c = Conversation.between(3L, 7L);
        Instant at = Instant.parse("2026-09-25T06:00:00Z");

        c.noteNewMessage("Five bunches left", at);

        assertThat(c.getLastMessageText()).isEqualTo("Five bunches left");
        assertThat(c.getLastMessageAt()).isEqualTo(at);
    }
}
