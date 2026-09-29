package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.exceptions.AccountRestrictedException;
import com.techx.intervue.modules.conversation.exceptions.ConversationClosedException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StallAccessPolicy implements StallAccessPolicyInterface {

    private final FarmerProfileRepository farmerProfiles;

    @Override
    public void assertCanStart(User me) {
        if (me.getStatus() != UserStatus.ACTIVE) {
            throw new AccountRestrictedException();
        }
    }

    @Override
    public void assertCanBeMessaged(User target) {
        if (target.getRole() != RoleType.FARMER || target.getStatus() != UserStatus.ACTIVE) {
            throw new StallNotOpenException();
        }
        if (!isOpenStall(target)) {
            throw new StallNotOpenException();
        }
    }

    @Override
    public void assertCanSend(User sender, User recipient) {
        if (sender.getStatus() != UserStatus.ACTIVE) {
            throw new AccountRestrictedException();
        }
        if (recipient.getStatus() != UserStatus.ACTIVE) {
            throw new ConversationClosedException();
        }
        if (!isOpenStall(sender) || !isOpenStall(recipient)) {
            throw new ConversationClosedException();
        }
    }

    private boolean isOpenStall(User user) {
        if (user.getRole() != RoleType.FARMER) {
            return true;
        }
        return farmerProfiles
                .findByUserId(user.getId())
                .map(profile -> profile.getApprovalStatus() == ApprovalStatus.APPROVED)
                .orElse(false);
    }
}
