package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.user.entities.User;

/**
 * Who may open a thread with whom, who may still send. This is the ONLY place that will read
 * farmer_profiles.approval_status once that table exists (backend roadmap step 3): PENDING →
 * StallNotOpenException, SUSPENDED → ConversationClosedException when sending.
 */
public interface StallAccessPolicyInterface {

    /** The person opening the thread must be an active account. */
    void assertCanStart(User me);

    /** The target of a new thread must be an open stall that accepts messages. */
    void assertCanBeMessaged(User target);

    /**
     * Before every send: the sender is still active, the recipient has not been locked or
     * suspended.
     */
    void assertCanSend(User sender, User recipient);
}
