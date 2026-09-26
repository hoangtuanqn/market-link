package com.techx.intervue.modules.notification.services.impl;

import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.realtime.ChatMessageCreatedEvent;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * A chat message → popup for the recipient, not stored (spec §3). A Farmer shows by stall name as
 * in chat. An image has no text: let the renderer translate "… sent a photo" into the recipient's
 * language.
 */
@Component
@RequiredArgsConstructor
public class ChatNotificationListener {

    private static final int PREVIEW = 120;

    private final NotificationServiceInterface notifications;
    private final UserRepository users;
    private final FarmerProfileRepository farmers;

    /**
     * Runs in the afterCommit of the chat transaction: the old transaction's synchronization is
     * still running, so an afterCommit registered now would never be called. REQUIRES_NEW gives
     * dispatch its own transaction so its after-commit push actually runs.
     */
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(ChatMessageCreatedEvent e) {
        User sender = users.findById(e.message().senderId()).orElse(null);
        User recipient = users.findById(e.recipientId()).orElse(null);
        if (sender == null || recipient == null) {
            return;
        }
        String name =
                sender.getRole() == RoleType.FARMER
                        ? farmers.findByUserId(sender.getId())
                                .map(FarmerProfile::getStallName)
                                .orElse(sender.getFullName())
                        : sender.getFullName();
        String base =
                recipient.getRole() == RoleType.FARMER ? "/farmer/messages?c=" : "/messages?c=";
        String text = e.message().kind() == MessageKind.TEXT ? preview(e.message().body()) : null;
        notifications.dispatch(
                List.of(recipient.getId()),
                new NotificationEvent(
                        NotificationKind.MESSAGE,
                        Map.of("sender", name),
                        base + e.conversationId(),
                        e.conversationId(),
                        name,
                        text));
    }

    private static String preview(String body) {
        String s = body == null ? "" : body.strip();
        return s.length() <= PREVIEW ? s : s.substring(0, PREVIEW - 1) + "…";
    }
}
