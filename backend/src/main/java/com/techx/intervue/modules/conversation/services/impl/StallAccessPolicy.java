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

/**
 * Spec §8.1. PENDING and REJECTED cannot get here: FarmerService only sets users.role = FARMER on
 * approve, so those two states are still CUSTOMER and are stopped by the role check. SUSPENDED is
 * different — D-09 keeps the role so people can still sign in, so farmer_profiles must be
 * consulted.
 */
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
        // The recipient's role is not checked: a stall replying to a customer goes through here
        // too.
        if (recipient.getStatus() != UserStatus.ACTIVE) {
            throw new ConversationClosedException();
        }
        // D-09: an old thread can still be read (list does not call this), only sending more is
        // blocked. Blocks both
        // directions: a suspended stall does not sell any more, and customers cannot order from it
        // any more either.
        if (!isOpenStall(sender) || !isOpenStall(recipient)) {
            throw new ConversationClosedException();
        }
    }

    /**
     * A non-Farmer is always "open" — two customers messaging each other has nothing to do with
     * stalls.
     */
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
