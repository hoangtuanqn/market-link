package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.user.entities.User;

public interface StallAccessPolicyInterface {

    void assertCanStart(User me);

    void assertCanBeMessaged(User target);

    void assertCanSend(User sender, User recipient);
}
